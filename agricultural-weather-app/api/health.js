module.exports = (_req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ ok: true, version: 'weather-proxy-v6', configured: Boolean(process.env.OPENWEATHER_API_KEY) }));
};
