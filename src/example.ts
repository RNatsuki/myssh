import { MySsh } from './index';

// Example usage
async function example() {
  try {
    // Create a new SSH connection
    const ssh = new MySsh({
      host: 'example.com',
      port: 22,
      username: 'user',
      password: 'password',
      // Or use key-based authentication:
      // privateKey: require('fs').readFileSync('/path/to/key'),

      // Additional options
      useDefaultKey: true, // Will use ~/.ssh/id_rsa if no other auth method is provided
      timeout: 5000,
      retries: 3,
      retryDelay: 1000,
      logger: console.log, // Enable logging

      // SSH Options (equivalent to command line options like -o StrictHostKeyChecking=no)
      disableStrictHostKeyChecking: true, // Equivalent to -o StrictHostKeyChecking=no
      ignoreKnownHosts: true, // Equivalent to -o UserKnownHostsFile=/dev/null

      // You can also specify custom SSH options
      sshOptions: {
        // Additional custom SSH options can be specified here
        "ServerAliveInterval": "60",
        "ServerAliveCountMax": "3"
      }
    });

    // Connect to the server
    await ssh.connect();

    // Run a command
    const result = await ssh.exec('ls -la');
    console.log(`Command executed with code ${result.code}`);
    console.log(`STDOUT: ${result.stdout}`);
    console.log(`STDERR: ${result.stderr}`);

    // Upload a file
    await ssh.uploadFile('./local/file.txt', '/remote/path/file.txt');
    console.log('File uploaded successfully');

    // Download a file
    await ssh.downloadFile('/remote/path/file.txt', './downloaded-file.txt');
    console.log('File downloaded successfully');

    // Disconnect
    ssh.disconnect();

  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to run the example:
// example();

export { example };
