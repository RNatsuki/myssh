 import { Client, ClientChannel, ConnectConfig } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface MySshConfig extends ConnectConfig {
  /**
   * Use private key from ~/.ssh/id_rsa by default if no other authentication method is specified
   */
  useDefaultKey?: boolean;
  /**
   * Timeout for connection in milliseconds (default: 10000)
   */
  timeout?: number;
  /**
   * Automatically retry connection (default: 0 - no retry)
   */
  retries?: number;
  /**
   * Delay between retries in milliseconds (default: 2000)
   */
  retryDelay?: number;
  /**
   * Custom logger function
   */
  logger?: (message: string) => void;
  /**
   * Disable strict host key checking (equivalent to -o StrictHostKeyChecking=no)
   */
  disableStrictHostKeyChecking?: boolean;
  /**
   * Don't use the known hosts file (equivalent to -o UserKnownHostsFile=/dev/null)
   */
  ignoreKnownHosts?: boolean;
  /**
   * Custom SSH options in the format of -o OptionName=value
   */
  sshOptions?: { [key: string]: string };
}

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * MySsh - A simple SSH2 wrapper to simplify SSH connections
 */
export class MySsh {
  private client: Client;
  private config: MySshConfig;
  private connected: boolean = false;
  private logger: (message: string) => void;

  /**
   * Create a new MySsh instance
   * @param config SSH connection configuration
   */  constructor(config: MySshConfig) {
    this.client = new Client();

    // Apply default configuration
    this.config = {
      host: 'localhost',
      port: 22,
      timeout: 10000,
      retries: 0,
      retryDelay: 2000,
      ...config
    };

    // Setup logger
    this.logger = this.config.logger || ((message: string) => {
      // By default, don't log anything
    });

    // Apply SSH Options for StrictHostKeyChecking and UserKnownHostsFile
    if (!this.config.sshOptions) {
      this.config.sshOptions = {};
    }

    // Handle disableStrictHostKeyChecking
    if (this.config.disableStrictHostKeyChecking) {
      this.config.sshOptions.StrictHostKeyChecking = 'no';
      this.logger('Disabled strict host key checking');
    }

    // Handle ignoreKnownHosts
    if (this.config.ignoreKnownHosts) {
      this.config.sshOptions.UserKnownHostsFile = '/dev/null';
      this.logger('Ignoring known hosts file');
    }

    // Load default SSH key if no authentication method is specified
    if (this.config.useDefaultKey &&
        !this.config.password &&
        !this.config.privateKey &&
        !this.config.agent) {
      try {
        const defaultKeyPath = path.join(os.homedir(), '.ssh', 'id_rsa');
        if (fs.existsSync(defaultKeyPath)) {
          this.config.privateKey = fs.readFileSync(defaultKeyPath);
          this.logger(`Using default SSH key: ${defaultKeyPath}`);
        }
      } catch (error) {
        this.logger(`Failed to load default SSH key: ${error}`);
      }
    }
  }

  /**
   * Connect to the SSH server
   */
  public async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    let retries = 0;
    const maxRetries = this.config.retries || 0;

    while (retries <= maxRetries) {
      try {
        await this._connect();
        this.connected = true;
        return;
      } catch (error) {
        retries++;
        if (retries > maxRetries) {
          throw error;
        }

        this.logger(`Connection failed (${retries}/${maxRetries}), retrying in ${this.config.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }
  }

  /**
   * Execute a command on the remote server
   * @param command Command to execute
   * @param options Optional parameters
   * @returns Promise with command result
   */
  public async exec(command: string): Promise<CommandResult> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise<CommandResult>((resolve, reject) => {      this.client.exec(command, (err, stream) => {
        if (err) {
          return reject(err);
        }

        let stdout = '';
        let stderr = '';
        let code = 0;

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on('close', (exitCode: number) => {
          code = exitCode || 0;
          resolve({ code, stdout, stderr });
        });

        stream.on('error', (err: Error) => {
          reject(err);
        });
      });
    });
  }

  /**
   * Copy a file from local to remote
   * @param src Local file path
   * @param dest Remote file path
   */  public async uploadFile(src: string, dest: string): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise<void>((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          return reject(err);
        }

        const readStream = fs.createReadStream(src);
        const writeStream = sftp.createWriteStream(dest);

        writeStream.on('close', () => {
          resolve();
        });

        writeStream.on('error', (err: Error) => {
          reject(err);
        });

        readStream.pipe(writeStream);
      });
    });
  }

  /**
   * Copy a file from remote to local
   * @param src Remote file path
   * @param dest Local file path
   */  public async downloadFile(src: string, dest: string): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise<void>((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          return reject(err);
        }

        const readStream = sftp.createReadStream(src);
        const writeStream = fs.createWriteStream(dest);

        writeStream.on('finish', () => {
          resolve();
        });

        writeStream.on('error', (err: Error) => {
          reject(err);
        });

        readStream.pipe(writeStream);
      });
    });
  }

  /**
   * Get an interactive shell
   * @returns Promise with shell stream
   */
  public async shell(): Promise<ClientChannel> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise<ClientChannel>((resolve, reject) => {
      this.client.shell((err, stream) => {
        if (err) {
          return reject(err);
        }
        resolve(stream);
      });
    });
  }

  /**
   * Disconnect from the SSH server
   */
  public disconnect(): void {
    if (this.connected) {
      this.client.end();
      this.connected = false;
    }
  }
  /**
   * Internal connect method
   */
  private _connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.client.removeAllListeners();
        reject(new Error(`Connection timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      this.client.on('ready', () => {
        clearTimeout(timeout);
        this.logger(`Connected to ${this.config.host}:${this.config.port}`);
        resolve();
      });

      this.client.on('error', (err) => {
        clearTimeout(timeout);
        this.logger(`Connection error: ${err.message}`);
        reject(err);
      });

      // Apply SSH options to the connection configuration
      const connectConfig: ConnectConfig = { ...this.config };

      // Add SSH options if specified
      if (this.config.sshOptions && Object.keys(this.config.sshOptions).length > 0) {
        this.logger(`Applying SSH options: ${JSON.stringify(this.config.sshOptions)}`);
        connectConfig.algorithms = connectConfig.algorithms || {};

        // Handle specific SSH options
        if (this.config.sshOptions.StrictHostKeyChecking === 'no') {
          // When strict host key checking is disabled, allow any host key algorithm
          connectConfig.hostVerifier = () => true;
        }
      }

      this.client.connect(connectConfig);
    });
  }
}

// Default export for convenience
export default MySsh;
