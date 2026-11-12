import axios from 'axios';
import { ForecastDay, TemperatureTrendDay, WeatherData } from '../data/types';

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

  return {
    location: countyName,
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

/** Groups the server-proxied 5-day/3-hour forecast into three calendar days. */
export const fetchForecastForCounty = async (county: CountyCoordinates): Promise<ForecastDay[]> => {
  const data = await requestWeather<{ list?: ForecastItem[] }>('/api/forecast', county);
  const items: ForecastItem[] = data.list ?? [];
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

export const fetchTemperatureTrendForCounty = async (county: CountyCoordinates): Promise<TemperatureTrendDay[]> => {
  const data = await requestWeather<{ days?: TemperatureTrendDay[] }>('/api/temperature-week', county);
  if (!Array.isArray(data.days)) {
    throw new Error('The weekly trend route is missing. Restart the weather server with npm start.');
  }
  return data.days ?? [];
};
