import axios from 'axios';
import { ForecastDay, HourlyForecast, SoilMoistureData, TemperatureTrendDay, WeatherData } from '../data/types';

interface CountyCoordinates {
  name: string;
  latitude: number;
  longitude: number;
}

interface ForecastItem {
  dt: number;
  dt_txt: string;
  main: { temp: number };
  weather: Array<{ id: number }>;
  rain?: { '3h'?: number };
  pop?: number;
}

interface ForecastResponse {
  city?: { timezone?: number };
  list?: ForecastItem[];
}

interface CountyForecast {
  days: ForecastDay[];
  hours: HourlyForecast[];
}

const requestWeather = async <T,>(url: string, county: CountyCoordinates): Promise<T> => {
  try {
    const response = await axios.get<T>(url, {
      params: { lat: county.latitude, lon: county.longitude },
    });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const responseError = error.response?.data as { error?: unknown; message?: unknown } | undefined;
      const serverMessage = typeof responseError?.error === 'string'
        ? responseError.error
        : typeof responseError?.message === 'string' ? responseError.message : null;
      if (serverMessage) throw new Error(serverMessage);
      if (!error.response) {
        throw new Error('The weather server is not responding. Restart the app with npm start.');
      }
      throw new Error(`Weather service returned HTTP ${error.response.status}.`);
    }
    throw error;
  }
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
  const data = await requestWeather<any>('/api/weather', county);
  const now = data.dt ?? Math.floor(Date.now() / 1000);
  const timezoneOffset = Number(data.timezone) || 0;
  const formatLocalTime = (timestamp?: number): string | null => {
    if (!timestamp) return null;
    const local = new Date((timestamp + timezoneOffset) * 1000);
    const hour = local.getUTCHours();
    const minute = local.getUTCMinutes().toString().padStart(2, '0');
    return `${((hour + 11) % 12) + 1}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  return {
    location: countyName,
    observed_at: now,
    sunrise_local: formatLocalTime(data.sys?.sunrise),
    sunset_local: formatLocalTime(data.sys?.sunset),
    temp_c: data.main.temp,
    condition: data.weather[0].description,
    humidity: data.main.humidity,
    wind_kph: msToKph(data.wind.speed),
    precip_mm: data.rain?.['1h'] ?? 0,
    uv: typeof data.uv_index === 'number' ? data.uv_index : null,
    is_day: !data.sys?.sunrise || !data.sys?.sunset || (now >= data.sys.sunrise && now < data.sys.sunset) ? 1 : 0,
    icon_code: mapWeatherCode(data.weather[0].id),
  };
};

/** Groups the server-proxied 5-day/3-hour forecast into local days and near-term periods. */
export const fetchForecastForCounty = async (county: CountyCoordinates): Promise<CountyForecast> => {
  const data = await requestWeather<ForecastResponse>('/api/forecast', county);
  const items: ForecastItem[] = data.list ?? [];
  const timezoneOffset = data.city?.timezone ?? 0;
  const grouped = new Map<string, ForecastItem[]>();

  items.forEach((item) => {
    const date = new Date((item.dt + timezoneOffset) * 1000).toISOString().slice(0, 10);
    grouped.set(date, [...(grouped.get(date) ?? []), item]);
  });

  const days = Array.from(grouped.entries()).slice(0, 5).map(([date, readings]) => {
    const temperatures = readings.map((reading) => reading.main.temp);
    const representative = readings[Math.floor(readings.length / 2)];
    const probabilities = readings.map((reading) => reading.pop).filter((probability): probability is number => Number.isFinite(probability));
    return {
      date,
      day: {
        maxtemp_c: Math.max(...temperatures),
        mintemp_c: Math.min(...temperatures),
        totalprecip_mm: readings.reduce((total, reading) => total + (reading.rain?.['3h'] ?? 0), 0),
        precipitation_probability: probabilities.length ? Math.max(...probabilities) * 100 : null,
        avgtemp_c: temperatures.reduce((total, temperature) => total + temperature, 0) / temperatures.length,
        condition: { code: mapWeatherCode(representative.weather[0].id) },
      },
    };
  });

  const currentTime = Date.now() / 1000;
  const hours = items
    .filter((item) => item.dt > currentTime)
    .slice(0, 5)
    .map((item) => {
      const local = new Date((item.dt + timezoneOffset) * 1000);
      const hour = local.getUTCHours();
      const minute = local.getUTCMinutes().toString().padStart(2, '0');
      return {
        time: `${((hour + 11) % 12) + 1}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`,
        temp_c: item.main.temp,
        precipitation_probability: Number.isFinite(item.pop) ? (item.pop as number) * 100 : null,
        precipitation_mm: item.rain?.['3h'] ?? 0,
        condition_code: mapWeatherCode(item.weather[0].id),
      };
    });

  return { days, hours };
};

export interface TemperatureTrendResponse {
  days: TemperatureTrendDay[];
  today: string;
}

export const fetchTemperatureTrendForCounty = async (county: CountyCoordinates): Promise<TemperatureTrendResponse> => {
  const data = await requestWeather<{ days?: TemperatureTrendDay[]; today?: string }>('/api/temperature-week', county);
  if (!Array.isArray(data.days)) {
    throw new Error('The weekly trend route is missing. Restart the weather server with npm start.');
  }
  if (typeof data.today !== 'string') {
    throw new Error('The weekly temperature route did not return the local date. Restart the weather server with npm start.');
  }
  return { days: data.days, today: data.today };
};

export const fetchSoilMoistureForCounty = async (county: CountyCoordinates): Promise<SoilMoistureData> => {
  const data = await requestWeather<SoilMoistureData>('/api/soil-moisture', county);
  if (typeof data.timestamp !== 'string') {
    throw new Error('The soil-water service returned incomplete data.');
  }
  return data;
};
