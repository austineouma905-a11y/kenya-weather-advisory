export interface County {
  id: number;
  name: string;
  capital: string;
  latitude: number;
  longitude: number;
  region: string;
  population: number;
  area_sq_km: number;
  code: string;
  timezone: string;
  elevation: number;
  climate_zone: string;
}

export interface WeatherData {
  location: string;
  temp_c: number;
  condition: string;
  humidity: number;
  wind_kph: number;
  precip_mm: number;
  uv: number;
  is_day: number;
  icon_code: number;
}

export interface ForecastDay {
  date: string;
  day: {
    maxtemp_c: number;
    mintemp_c: number;
    totalprecip_mm: number;
    avgtemp_c: number;
    condition: {
      code: number;
    };
  };
}

export interface CropData {
  idealTemp: { min: number; max: number };
  idealRainfall: { min: number; max: number };
  soilMoisture: { min: number; max: number };
  season: string[];
}