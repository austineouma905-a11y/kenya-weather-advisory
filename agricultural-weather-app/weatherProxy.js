const counties = require('./counties.json');

const sendJson = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const fetchUvIndex = async (latitude, longitude) => {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('current', 'uv_index');
  url.searchParams.set('timezone', 'auto');

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.current?.uv_index === 'number' ? data.current.uv_index : null;
  } catch (_error) {
    return null;
  }
};

const getKenyaCoordinates = (url) => {
  const countyName = url.searchParams.get('county');
  const county = countyName ? counties.find((entry) => entry.name === countyName) : null;
  const latitude = url.searchParams.has('lat') ? Number(url.searchParams.get('lat')) : county?.latitude;
  const longitude = url.searchParams.has('lon') ? Number(url.searchParams.get('lon')) : county?.longitude;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -5.5 || latitude > 5.5 || longitude < 33.5 || longitude > 42.5) return null;
  return { latitude, longitude };
};

const createWeatherHandler = (endpoint) => async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const url = new URL(req.url, 'http://localhost');
  const coordinates = getKenyaCoordinates(url);
  if (!coordinates) {
    return sendJson(res, 400, { error: 'Provide a valid location in Kenya.' });
  }
  const { latitude, longitude } = coordinates;
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return sendJson(res, 503, { error: 'Weather service is not configured on the server.' });

  const upstream = new URL(`https://api.openweathermap.org/data/2.5/${endpoint}`);
  upstream.searchParams.set('lat', latitude);
  upstream.searchParams.set('lon', longitude);
  upstream.searchParams.set('units', 'metric');
  upstream.searchParams.set('appid', apiKey);

  try {
    const uvIndexPromise = endpoint === 'weather'
      ? fetchUvIndex(latitude, longitude)
      : Promise.resolve(null);
    const response = await fetch(upstream, { signal: AbortSignal.timeout(10000) });
    const body = await response.text();
    if (!response.ok) {
      let providerMessage = '';
      try {
        providerMessage = JSON.parse(body).message || '';
      } catch (_error) {
        // Use the HTTP status when the provider does not return JSON.
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

    if (endpoint === 'weather') {
      const weatherData = JSON.parse(body);
      weatherData.uv_index = await uvIndexPromise;
      return sendJson(res, response.status, weatherData);
    }

    res.statusCode = response.status;
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(body);
  } catch (_error) {
    sendJson(res, 502, { error: 'Could not reach the weather provider.' });
  }
};

const createTemperatureWeekHandler = () => async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'Method not allowed.' });
  }

  const url = new URL(req.url, 'http://localhost');
  const coordinates = getKenyaCoordinates(url);
  if (!coordinates) return sendJson(res, 400, { error: 'Provide a valid location in Kenya.' });

  const upstream = new URL('https://api.open-meteo.com/v1/forecast');
  upstream.searchParams.set('latitude', coordinates.latitude);
  upstream.searchParams.set('longitude', coordinates.longitude);
  upstream.searchParams.set('current', 'temperature_2m');
  upstream.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
  upstream.searchParams.set('past_days', '6');
  upstream.searchParams.set('forecast_days', '7');
  upstream.searchParams.set('timezone', 'auto');

  try {
    const response = await fetch(upstream, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return sendJson(res, 502, { error: 'Could not load the weekly temperature trend.' });
    const data = await response.json();
    const todayText = data.current?.time?.slice(0, 10);
    if (!todayText || !Array.isArray(data.daily?.time)) {
      return sendJson(res, 502, { error: 'The weather provider returned incomplete weekly data.' });
    }

    // Use the provider's local date, then return this local calendar week Monday through Sunday.
    const today = new Date(`${todayText}T00:00:00Z`);
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const mondayText = monday.toISOString().slice(0, 10);
    const sundayText = sunday.toISOString().slice(0, 10);

    const days = data.daily.time.flatMap((date, index) => {
      const high = data.daily.temperature_2m_max?.[index];
      const low = data.daily.temperature_2m_min?.[index];
      if (date < mondayText || date > sundayText || !Number.isFinite(high) || !Number.isFinite(low)) return [];
      return [{ date, high_c: high, low_c: low }];
    });

    return sendJson(res, 200, { timezone: data.timezone, source: 'Open-Meteo', days });
  } catch (_error) {
    return sendJson(res, 502, { error: 'Could not reach the temperature forecast provider.' });
  }
};

module.exports = { createWeatherHandler, createTemperatureWeekHandler };
