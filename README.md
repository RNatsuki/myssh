# MySsh

A simple SSH2 wrapper to simplify SSH connections in TypeScript/JavaScript.

## Installation

```bash
# Using pnpm
pnpm add @rnatsuki/myssh

# Using npm
npm install @rnatsuki/myssh

# Using yarn
yarn add @rnatsuki/myssh
```

## Features

- Simple API for SSH operations
- Support for password and key-based authentication
- Automatic retry mechanism
- File upload/download via SFTP
- Interactive shell support
- TypeScript type definitions
- Support for SSH options (like `-o StrictHostKeyChecking=no`)

## Quick Examples

### Disable Host Key Checking (Equivalent to Command Line SSH)

```typescript
// Equivalent to:
// ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no user@host
const ssh = new MySsh({
  host: 'example.com',
  username: 'user',
  password: 'password',

  // These two options disable host key checking
  disableStrictHostKeyChecking: true,
  ignoreKnownHosts: true
});

await ssh.connect();
const result = await ssh.exec('hostname');
console.log(result.stdout);
ssh.disconnect();
```

## Usage

### Basic Connection

```typescript
import { MySsh } from 'myssh';

const ssh = new MySsh({
  host: 'example.com',
  port: 22,
  username: 'user',
  password: 'password'
});

// Connect to the server
await ssh.connect();

// Execute a command
const result = await ssh.exec('ls -la');
console.log(`Exit code: ${result.code}`);
console.log(`Output: ${result.stdout}`);

// Disconnect
ssh.disconnect();
```

### Using Key-based Authentication

```typescript
import { MySsh } from 'myssh';
import * as fs from 'fs';

const ssh = new MySsh({
  host: 'example.com',
  username: 'user',
  privateKey: fs.readFileSync('/path/to/private/key')
});

await ssh.connect();
// ...
```

### Using Default Key (~/.ssh/id_rsa)

```typescript
const ssh = new MySsh({
  host: 'example.com',
  username: 'user',
  useDefaultKey: true // Will use ~/.ssh/id_rsa automatically
});
```

### File Transfer (SFTP)

```typescript
// Upload a file
await ssh.uploadFile('./local/file.txt', '/remote/path/file.txt');

// Download a file
await ssh.downloadFile('/remote/path/remote-file.txt', './local-file.txt');
```

### Interactive Shell

```typescript
const stream = await ssh.shell();

// Handle data from the shell
stream.on('data', (data) => {
  console.log('SHELL OUTPUT:', data.toString());
});

// Send commands to the shell
stream.write('ls -la\n');

// Close the shell when done
stream.close();
```

### Advanced Options

```typescript
const ssh = new MySsh({
  host: 'example.com',
  username: 'user',
  password: 'password',

  // Connection settings
  timeout: 5000,       // Connection timeout in ms (default: 10000)
  retries: 3,          // Number of retries on connection failure (default: 0)
  retryDelay: 1000,    // Delay between retries in ms (default: 2000)

  // Logging
  logger: console.log,  // Custom logger function

  // SSH options (similar to command-line -o options)
  disableStrictHostKeyChecking: true,  // Equivalent to -o StrictHostKeyChecking=no
  ignoreKnownHosts: true,              // Equivalent to -o UserKnownHostsFile=/dev/null

  // Custom SSH options
  sshOptions: {
    "ServerAliveInterval": "60",      // Keep connection alive
    "ServerAliveCountMax": "3"
  }
});
```

### Command-line Equivalent

The configuration above is equivalent to the following command-line SSH command:

```bash
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ServerAliveInterval=60 -o ServerAliveCountMax=3 user@example.com
```

## API Reference

### `MySsh(config: MySshConfig)`

Creates a new SSH client instance.

#### Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `host` | string | Hostname or IP address (default: 'localhost') |
| `port` | number | Port number (default: 22) |
| `username` | string | SSH username |
| `password` | string | SSH password (optional) |
| `privateKey` | string \| Buffer | Private key for authentication (optional) |
| `useDefaultKey` | boolean | Use ~/.ssh/id_rsa if available (default: false) |
| `timeout` | number | Connection timeout in ms (default: 10000) |
| `retries` | number | Number of connection retries (default: 0) |
| `retryDelay` | number | Delay between retries in ms (default: 2000) |
| `logger` | function | Custom logging function (optional) |
| `disableStrictHostKeyChecking` | boolean | Skip host key verification (equivalent to -o StrictHostKeyChecking=no) |
| `ignoreKnownHosts` | boolean | Don't use known_hosts file (equivalent to -o UserKnownHostsFile=/dev/null) |
| `sshOptions` | object | Custom SSH options as key-value pairs (equivalent to -o options) |

### Methods

- `connect()`: Connect to the SSH server
- `exec(command: string)`: Execute a command and return result
- `uploadFile(src: string, dest: string)`: Upload a file via SFTP
- `downloadFile(src: string, dest: string)`: Download a file via SFTP
- `shell()`: Get an interactive shell
- `disconnect()`: Close the SSH connection

## License

ISC
