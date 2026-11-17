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

const getKenyaDateText = (date) => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
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

  const todayText = getKenyaDateText(new Date());
  const today = new Date(`${todayText}T00:00:00Z`);
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  const previousMonday = new Date(monday);
  previousMonday.setUTCDate(monday.getUTCDate() - 7);
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);

  const upstream = new URL('https://archive-api.open-meteo.com/v1/archive');
  upstream.searchParams.set('latitude', coordinates.latitude);
  upstream.searchParams.set('longitude', coordinates.longitude);
  upstream.searchParams.set('start_date', previousMonday.toISOString().slice(0, 10));
  upstream.searchParams.set('end_date', yesterday.toISOString().slice(0, 10));
  upstream.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
  upstream.searchParams.set('models', 'ecmwf_ifs');
  upstream.searchParams.set('timezone', 'auto');

  try {
    const response = await fetch(upstream, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return sendJson(res, 502, { error: 'Could not load historical temperature analysis.' });
    const data = await response.json();
    if (!Array.isArray(data.daily?.time)) {
      return sendJson(res, 502, { error: 'The weather provider returned incomplete weekly data.' });
    }

    const valuesByDate = new Map(data.daily.time.map((date, index) => [date, {
      high: data.daily.temperature_2m_max?.[index],
      low: data.daily.temperature_2m_min?.[index],
    }]));
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + index);
      const dateText = date.toISOString().slice(0, 10);
      const isPreviousWeek = dateText >= todayText;
      if (isPreviousWeek) date.setUTCDate(date.getUTCDate() - 7);
      const sourceDate = date.toISOString().slice(0, 10);
      const values = valuesByDate.get(sourceDate);
      if (!Number.isFinite(values?.high) || !Number.isFinite(values?.low)) return null;
      return {
        date: dateText,
        high_c: values.high,
        low_c: values.low,
        isReanalysis: true,
        ...(isPreviousWeek ? { isPreviousWeek: true } : {}),
      };
    }).filter(Boolean);

    return sendJson(res, 200, { timezone: data.timezone, today: todayText, source: 'Open-Meteo ECMWF IFS analysis', days });
  } catch (_error) {
    return sendJson(res, 502, { error: 'Could not reach the historical temperature provider.' });
  }
};

const createSoilMoistureHandler = () => async (req, res) => {
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
  upstream.searchParams.set('hourly', 'soil_moisture_0_to_7cm,soil_moisture_7_to_28cm,soil_moisture_28_to_100cm');
  upstream.searchParams.set('past_hours', '3');
  upstream.searchParams.set('forecast_hours', '1');
  upstream.searchParams.set('timezone', 'UTC');

  try {
    const response = await fetch(upstream, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return sendJson(res, 502, { error: 'Could not load modelled soil-water data.' });
    const data = await response.json();
    const hourly = data.hourly;
    if (!Array.isArray(hourly?.time) || !hourly.time.length) {
      return sendJson(res, 502, { error: 'The soil-water provider returned incomplete data.' });
    }

    const now = Date.now();
    let index = -1;
    hourly.time.forEach((time, candidateIndex) => {
      if (Date.parse(`${time}Z`) <= now) index = candidateIndex;
    });
    if (index < 0) return sendJson(res, 502, { error: 'No current soil-water timestep is available.' });

    const valueAt = (name) => Number.isFinite(hourly[name]?.[index]) ? hourly[name][index] : null;
    return sendJson(res, 200, {
      timestamp: `${hourly.time[index]}Z`,
      surface_m3_m3: valueAt('soil_moisture_0_to_7cm'),
      upper_root_m3_m3: valueAt('soil_moisture_7_to_28cm'),
      lower_root_m3_m3: valueAt('soil_moisture_28_to_100cm'),
      source: 'Open-Meteo weather-model soil moisture',
    });
  } catch (_error) {
    return sendJson(res, 502, { error: 'Could not reach the soil-water provider.' });
  }
};

module.exports = { createWeatherHandler, createTemperatureWeekHandler, createSoilMoistureHandler };
