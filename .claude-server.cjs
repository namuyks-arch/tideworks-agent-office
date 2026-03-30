const { spawn } = require('child_process');
const path = require('path');

const projectDir = path.join(__dirname);
const child = spawn('npm', ['run', 'dev', '--', '-p', '3003'], {
  cwd: projectDir,
  stdio: 'inherit',
  shell: true,
});

child.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGTERM', () => child.kill());
process.on('SIGINT', () => child.kill());
