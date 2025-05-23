// Simple test script for the MySsh wrapper
const { MySsh } = require('./dist/index');

// Sample configuration equivalent to:
// ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no user@host
async function testInsecureConnection() {
  const host = 'your-ssh-server.com'; // Change this to your server
  const username = 'your-username';    // Change this to your username

  console.log(`Connecting to ${username}@${host} with disabled host checking...`);

  const ssh = new MySsh({
    host: host,
    port: 22,
    username: username,
    // Add your authentication method:
    // password: 'your-password',
    // Or use key:
    useDefaultKey: true,

    // Disable strict host checking
    disableStrictHostKeyChecking: true,
    ignoreKnownHosts: true,

    // Enable logging
    logger: (msg) => console.log(`[SSH] ${msg}`)
  });

  try {
    // Connect
    await ssh.connect();
    console.log('Connected successfully.');

    // Run commands
    console.log('\nExecuting command: "hostname"');
    const result1 = await ssh.exec('hostname');
    console.log(`Result (exit code ${result1.code}):`);
    console.log(result1.stdout);

    console.log('\nExecuting command: "uname -a"');
    const result2 = await ssh.exec('uname -a');
    console.log(`Result (exit code ${result2.code}):`);
    console.log(result2.stdout);

    // Disconnect
    ssh.disconnect();
    console.log('\nDisconnected successfully');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Instructions
console.log('MySsh Test Script');
console.log('----------------');
console.log('This script demonstrates using MySsh with disabled host key checking');
console.log('equivalent to: ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no user@host');
console.log('\nTo run the test:');
console.log('1. Edit this file to set your server hostname and username');
console.log('2. Set your authentication (password or key)');
console.log('3. Uncomment the following line\n');

// Uncomment to run the test
// testInsecureConnection();
