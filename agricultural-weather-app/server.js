const http = require('http');
const fs = require('fs');
const path = require('path');
const counties = require('./counties.json');

const appRoot = __dirname;
const buildRoot = path.join(appRoot, 'build');
const port = Number(process.env.PORT || 5001);
const host = process.env.HOST || '127.0.0.1';
const serverVersion = 'weather-proxy-v2';

// Load local secrets for development without adding a dotenv dependency.
// Existing process environment values take precedence over .env.local.
const envFile = path.join(appRoot, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const apiKey = process.env.OPENWEATHER_API_KEY;
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

const proxyWeather = async (req, res, endpoint, url) => {
  const countyName = url.searchParams.get('county');
  const county = countyName ? counties.find((entry) => entry.name === countyName) : null;
  const latitude = url.searchParams.has('lat') ? Number(url.searchParams.get('lat')) : county?.latitude;
  const longitude = url.searchParams.has('lon') ? Number(url.searchParams.get('lon')) : county?.longitude;
  // Keep the proxy limited to Kenya while allowing precise browser geolocation.
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -5.5 || latitude > 5.5 || longitude < 33.5 || longitude > 42.5) {
    return sendJson(res, 400, { error: 'Provide a valid location in Kenya.' });
  }
  if (!apiKey) return sendJson(res, 503, { error: 'Weather service is not configured on the server.' });

  const upstream = new URL(`https://api.openweathermap.org/data/2.5/${endpoint}`);
  upstream.searchParams.set('lat', latitude);
  upstream.searchParams.set('lon', longitude);
  upstream.searchParams.set('units', 'metric');
  upstream.searchParams.set('appid', apiKey);

  try {
    const response = await fetch(upstream);
    const body = await response.text();
    if (!response.ok) {
      let providerMessage = '';
      try {
        const providerBody = JSON.parse(body);
        providerMessage = providerBody.message || '';
      } catch (_error) {
        // Use the status below when the provider returns a non-JSON error.
      }

      let message = providerMessage || `Weather provider returned HTTP ${response.status}.`;
      if (response.status === 401) {
        message = 'OpenWeather rejected the server API key. Check that OPENWEATHER_API_KEY is valid and active.';
      } else if (response.status === 403) {
        message = 'The OpenWeather account does not have access to this weather endpoint.';
      } else if (response.status === 429) {
        message = 'The OpenWeather request limit has been reached. Try again later.';
      } else if (response.status >= 500) {
        message = 'OpenWeather is temporarily unavailable. Try again shortly.';
      }

      return sendJson(res, response.status, { error: message });
    }
    res.writeHead(response.status, {
      'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (_error) {
    sendJson(res, 502, { error: 'Could not reach the weather provider.' });
  }
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
  res.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(actualPath)] || 'application/octet-stream',
  });
  fs.createReadStream(actualPath).pipe(res);
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, version: serverVersion, configured: Boolean(apiKey) });
  }
  const apiRoute = url.pathname.match(/^\/api\/(weather|forecast)$/);
  if (req.method === 'GET' && apiRoute) {
    return proxyWeather(req, res, apiRoute[1], url);
  }
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
