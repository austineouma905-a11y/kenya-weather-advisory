import axios from 'axios';
import { ForecastDay, WeatherData } from '../data/types';

const API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

interface CountyCoordinates {
  name: string;
  latitude: number;
  longitude: number;
}

interface ForecastItem {
  dt_txt: string;
  main: { temp: number };
  weather: Array<{ id: number }>;
  rain?: { '3h'?: number };
}

const requireApiKey = (): string => {
  if (!API_KEY) {
    throw new Error('Weather API key is not configured. Add REACT_APP_OPENWEATHER_API_KEY to .env.local.');
  }
  return API_KEY;
};

const msToKph = (metresPerSecond: number): number => metresPerSecond * 3.6;

const mapWeatherCode = (openWeatherCode: number): number => {
  if (openWeatherCode >= 200 && openWeatherCode <= 232) return 1273;
  if (openWeatherCode >= 300 && openWeatherCode <= 321) return 1063;
  if (openWeatherCode >= 500 && openWeatherCode <= 531) return 1180;
  if (openWeatherCode >= 600 && openWeatherCode <= 622) return 1204;
  if (openWeatherCode >= 701 && openWeatherCode <= 781) return 1006;
  if (openWeatherCode === 800) return 1000;
  if (openWeatherCode >= 801 && openWeatherCode <= 804) return 1003;
  return 1000;
};

export const fetchWeatherForCounty = async (countyName: string, county: CountyCoordinates): Promise<WeatherData> => {
  const response = await axios.get(`${BASE_URL}/weather`, {
    params: { lat: county.latitude, lon: county.longitude, appid: requireApiKey(), units: 'metric' },
  });
  const data = response.data;
  const now = data.dt ?? Math.floor(Date.now() / 1000);

  return {
    location: countyName,
    temp_c: data.main.temp,
    condition: data.weather[0].description,
    humidity: data.main.humidity,
    wind_kph: msToKph(data.wind.speed),
    precip_mm: data.rain?.['1h'] ?? 0,
    // The current-weather endpoint does not provide UV; avoid inventing a value.
    uv: 0,
    is_day: !data.sys?.sunrise || !data.sys?.sunset || (now >= data.sys.sunrise && now < data.sys.sunset) ? 1 : 0,
    icon_code: mapWeatherCode(data.weather[0].id),
  };
};

/** Groups OpenWeather's standard 5-day/3-hour forecast into three calendar days. */
export const fetchForecastForCounty = async (county: CountyCoordinates): Promise<ForecastDay[]> => {
  const response = await axios.get(`${BASE_URL}/forecast`, {
    params: { lat: county.latitude, lon: county.longitude, appid: requireApiKey(), units: 'metric' },
  });
  const items: ForecastItem[] = response.data.list ?? [];
  const grouped = new Map<string, ForecastItem[]>();

  items.forEach((item) => {
    const date = item.dt_txt.slice(0, 10);
    grouped.set(date, [...(grouped.get(date) ?? []), item]);
  });

  return Array.from(grouped.entries()).slice(0, 3).map(([date, readings]) => {
    const temperatures = readings.map((reading) => reading.main.temp);
    const representative = readings[Math.floor(readings.length / 2)];
    return {
      date,
      day: {
        maxtemp_c: Math.max(...temperatures),
        mintemp_c: Math.min(...temperatures),
        totalprecip_mm: readings.reduce((total, reading) => total + (reading.rain?.['3h'] ?? 0), 0),
        avgtemp_c: temperatures.reduce((total, temperature) => total + temperature, 0) / temperatures.length,
        condition: { code: mapWeatherCode(representative.weather[0].id) },
      },
    };
  });
};
