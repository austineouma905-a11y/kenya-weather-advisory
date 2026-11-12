const http = require('http');
const fs = require('fs');
const path = require('path');
const { createWeatherHandler } = require('./weatherProxy');

const appRoot = __dirname;
const buildRoot = path.join(appRoot, 'build');
const port = Number(process.env.PORT || 5001);
const host = process.env.HOST || '127.0.0.1';
const serverVersion = 'weather-proxy-v2';

// Load local secrets for development. Existing environment variables take precedence.
const envFile = path.join(appRoot, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.replace(/^\uFEFF/, '').match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

const serveStatic = (req, res, pathname) => {
  if (!fs.existsSync(buildRoot)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Build the frontend first with npm run build.');
  }

  const requestedPath = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const filePath = path.resolve(buildRoot, `.${requestedPath}`);
  if (!filePath.startsWith(`${buildRoot}${path.sep}`) && filePath !== path.join(buildRoot, 'index.html')) {
    res.writeHead(400);
    return res.end('Bad request.');
  }

  const actualPath = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    ? filePath
    : path.join(buildRoot, 'index.html');
  res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(actualPath)] || 'application/octet-stream' });
  fs.createReadStream(actualPath).pipe(res);
};

const handlers = {
  weather: createWeatherHandler('weather'),
  forecast: createWeatherHandler('forecast'),
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      version: serverVersion,
      configured: Boolean(process.env.OPENWEATHER_API_KEY),
    });
  }
  const apiRoute = url.pathname.match(/^\/api\/(weather|forecast)$/);
  if (apiRoute) return handlers[apiRoute[1]](req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  serveStatic(req, res, url.pathname);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
    console.error(`Port ${port} is already in use; the frontend can use the server already listening there.`);
    process.exit(2);
  }
  console.error(`Weather server failed: ${error.message}`);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Weather app server listening at http://${host}:${port}`);
});
