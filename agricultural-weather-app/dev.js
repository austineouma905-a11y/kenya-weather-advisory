const { spawn } = require('child_process');
const path = require('path');

const appRoot = __dirname;
const children = [];
let shuttingDown = false;

const stopChildren = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach((child) => {
    if (child && child.exitCode === null) child.kill();
  });
  process.exitCode = exitCode;
};

const start = (label, script) => {
  const childEnv = label === 'Weather server'
    ? { ...process.env, PORT: '5001', HOST: '127.0.0.1' }
    : process.env;
  const child = spawn(process.execPath, [script], {
    cwd: appRoot,
    env: childEnv,
    stdio: 'inherit',
  });
  children.push(child);
  child.on('error', (error) => {
    console.error(`${label} failed to start: ${error.message}`);
    stopChildren(1);
  });
  child.on('exit', (code) => {
    if (label === 'Weather server' && code === 2 && !shuttingDown) {
      fetch('http://127.0.0.1:5001/api/health')
        .then((response) => response.json())
        .then((health) => {
          if (health.version === 'weather-proxy-v3' && health.configured) {
            console.log('Using the current weather server already listening on port 5001.');
            return;
          }
          console.error('An outdated or unconfigured weather server is using port 5001. Stop it, then run npm start again.');
          stopChildren(1);
        })
        .catch(() => {
          console.error('Another service is using port 5001. Stop it, then run npm start again.');
          stopChildren(1);
        });
      return;
    }
    if (!shuttingDown && code !== 0) {
      console.error(`${label} stopped unexpectedly.`);
      stopChildren(code || 1);
    }
  });
};

process.on('SIGINT', () => stopChildren(0));
process.on('SIGTERM', () => stopChildren(0));

console.log('Starting the frontend and private weather server...');
start('Weather server', path.join(appRoot, 'server.js'));
start('React development server', path.join(appRoot, 'node_modules', 'react-scripts', 'scripts', 'start.js'));
