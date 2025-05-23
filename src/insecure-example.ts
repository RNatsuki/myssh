// Example showing how to use MySsh with options equivalent to:
// ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no user@host
import { MySsh } from './index';

async function insecureConnectionExample(): Promise<void> {
  // Create a new SSH connection with insecure settings
  // WARNING: This disables host key checking, which can expose you to man-in-the-middle attacks.
  // Only use these settings in development or controlled environments.
  const ssh = new MySsh({
    host: 'your-ssh-server.com',
    port: 22,
    username: 'your-username',
    // Password or key authentication
    // password: 'your-password',
    useDefaultKey: true,

    // Disable host key checking (equivalent to command-line options)
    disableStrictHostKeyChecking: true, // -o StrictHostKeyChecking=no
    ignoreKnownHosts: true,            // -o UserKnownHostsFile=/dev/null

    // Optional: verbose logging
    logger: (message: string) => console.log(`[SSH] ${message}`)
  });

  try {
    console.log('Connecting with disabled host key checking...');
    await ssh.connect();

    // Run a simple command
    console.log('Running command: hostname');
    const result = await ssh.exec('hostname');
    console.log(`Host: ${result.stdout.trim()}`);

    // Disconnect
    ssh.disconnect();
    console.log('Disconnected successfully');

  } catch (error: any) {
    console.error('Connection error:', error.message);
  }
}

// Main info message
console.log('This example demonstrates how to use MySsh with options equivalent to:');
console.log('ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no user@host');
console.log('\nTo run the example, edit the connection details and uncomment the following line');
// Uncomment to run the example
// insecureConnectionExample();

export { insecureConnectionExample };
