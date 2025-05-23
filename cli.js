#!/usr/bin/env node

/**
 * Command-line tool for making SSH connections using MySsh
 * This script demonstrates using the library in a way equivalent to:
 * ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no user@host
 */

const { MySsh } = require('./dist/index');
const readline = require('readline');

// Create command-line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask for connection details
function promptForInput(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  try {
    console.log('MySsh Command Line Tool');
    console.log('======================');
    console.log('This tool demonstrates connections with disabled host key checking');
    console.log('(equivalent to ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no)\n');

    // Get connection info
    const host = await promptForInput('Host: ');
    const port = await promptForInput('Port [22]: ') || '22';
    const username = await promptForInput('Username: ');
    const usePassword = (await promptForInput('Use password (y/n) [y]: ') || 'y').toLowerCase() === 'y';

    // SSH configuration
    const sshConfig = {
      host,
      port: parseInt(port, 10),
      username,

      // Equivalent to -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
      disableStrictHostKeyChecking: true,
      ignoreKnownHosts: true,

      // Enable logging
      logger: (msg) => console.log(`[SSH] ${msg}`),

      // Connection settings
      timeout: 10000,
      retries: 1,
      retryDelay: 2000
    };

    // Handle authentication
    if (usePassword) {
      const password = await promptForInput('Password: ');
      sshConfig.password = password;
    } else {
      console.log('Using default key from ~/.ssh/id_rsa');
      sshConfig.useDefaultKey = true;
    }

    // Create SSH connection
    console.log(`\nConnecting to ${username}@${host}:${port}...`);
    const ssh = new MySsh(sshConfig);

    // Connect
    await ssh.connect();
    console.log('Connected successfully!\n');

    // Interactive command loop
    console.log('Enter SSH commands (type "exit" to quit):');

    let running = true;
    while (running) {
      const command = await promptForInput('> ');

      if (command.toLowerCase() === 'exit') {
        running = false;
        continue;
      }

      if (!command) continue;

      try {
        const result = await ssh.exec(command);
        if (result.stdout) console.log(result.stdout.trimEnd());
        if (result.stderr) console.error('STDERR:', result.stderr.trimEnd());
        if (result.code !== 0) console.log(`Exit code: ${result.code}`);
      } catch (error) {
        console.error('Error executing command:', error.message);
      }
    }

    // Disconnect
    ssh.disconnect();
    console.log('Disconnected from server.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

// Run the program
main();
