import { Client, ClientChannel, ConnectConfig } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface MySshConfig extends ConnectConfig {
  useDefaultKey?: boolean;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  logger?: (message: string) => void;
  disableStrictHostKeyChecking?: boolean;
  ignoreKnownHosts?: boolean;
  sshOptions?: { [key: string]: string };
}

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Connection timeout after ${timeout}ms`)), timeout);
    })
  ]);
}

export class MySsh {
  private client: Client;
  private config: MySshConfig;
  private connected = false;
  private logger: (msg: string) => void;

  constructor(config: MySshConfig) {
    this.client = new Client();

    this.config = {
      host: 'localhost',
      port: 22,
      timeout: 10000,
      retries: 0,
      retryDelay: 2000,
      ...config
    };

    this.logger = this.config.logger || (() => {});

    if (!this.config.sshOptions) this.config.sshOptions = {};
    if (this.config.disableStrictHostKeyChecking) {
      this.config.sshOptions.StrictHostKeyChecking = 'no';
      this.logger('Disabled strict host key checking');
    }

    if (this.config.ignoreKnownHosts) {
      this.config.sshOptions.UserKnownHostsFile = '/dev/null';
      this.logger('Ignoring known hosts file');
    }

    if (
      this.config.useDefaultKey &&
      !this.config.password &&
      !this.config.privateKey &&
      !this.config.agent
    ) {
      try {
        const defaultKeyPath = path.join(os.homedir(), '.ssh', 'id_rsa');
        if (fs.existsSync(defaultKeyPath)) {
          this.config.privateKey = fs.readFileSync(defaultKeyPath);
          this.logger(`Using default SSH key: ${defaultKeyPath}`);
        }
      } catch (err) {
        this.logger(`Error loading default key: ${err}`);
      }
    }
  }

  public async connect(): Promise<void> {
    if (this.connected) return;

    const retries = this.config.retries ?? 0;
    const retryDelay = this.config.retryDelay ?? 2000;
    const timeout = this.config.timeout ?? 10000;

    let attempt = 0;
    while (attempt <= retries) {
      try {
        await withTimeout(this._connectOnce(), timeout);
        this.connected = true;
        return;
      } catch (err) {
        attempt++;
        this.logger(`Connection attempt ${attempt} failed: ${(err as Error).message}`);
        if (attempt > retries) throw err;
        await delay(retryDelay);
      }
    }
  }

  private _connectOnce(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const client = this.client;

      client
        .once('ready', () => {
          this.logger(`SSH ready at ${this.config.host}:${this.config.port}`);
          resolve();
        })
        .once('error', (err) => {
          this.logger(`SSH error: ${err.message}`);
          reject(err);
        })
        .once('end', () => this.logger(`SSH connection ended`))
        .once('close', () => this.logger(`SSH connection closed`));

      const connectConfig: ConnectConfig = { ...this.config };

      if (this.config.sshOptions?.StrictHostKeyChecking === 'no') {
        connectConfig.hostVerifier = () => true;
      }

      client.connect(connectConfig);
    });
  }

  public async exec(command: string): Promise<CommandResult> {
    if (!this.connected) await this.connect();

    return new Promise<CommandResult>((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) return reject(err);

        let stdout = '';
        let stderr = '';

        stream.on('data', (data: any) => (stdout += data.toString()));
        stream.stderr.on('data', (data) => (stderr += data.toString()));
        stream.on('close', (code: number) => {
          resolve({ code: code ?? 0, stdout, stderr });
        });
        stream.on('error', reject);
      });
    });
  }

  public async uploadFile(src: string, dest: string): Promise<void> {
    if (!this.connected) await this.connect();

    return new Promise<void>((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) return reject(err);
        const rs = fs.createReadStream(src);
        const ws = sftp.createWriteStream(dest);
        rs.pipe(ws);
        ws.on('close', resolve);
        ws.on('error', reject);
      });
    });
  }

  public async downloadFile(src: string, dest: string): Promise<void> {
    if (!this.connected) await this.connect();

    return new Promise<void>((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) return reject(err);
        const rs = sftp.createReadStream(src);
        const ws = fs.createWriteStream(dest);
        rs.pipe(ws);
        ws.on('finish', resolve);
        ws.on('error', reject);
      });
    });
  }

  public async shell(): Promise<ClientChannel> {
    if (!this.connected) await this.connect();

    return new Promise((resolve, reject) => {
      this.client.shell((err, stream) => {
        if (err) return reject(err);
        resolve(stream);
      });
    });
  }

  public disconnect(): void {
    try {
      if (this.connected) {
        this.client.end();
        this.connected = false;
      }
    } catch (err) {
      this.logger(`Error on disconnect: ${(err as Error).message}`);
    }
  }
}

export default MySsh;
