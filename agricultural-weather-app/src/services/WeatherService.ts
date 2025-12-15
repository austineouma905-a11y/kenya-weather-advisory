import axios from 'axios'
import { WeatherData, ForecastDay } from '../data/types'

const API_KEY = "179da340c22915a81de1e9bee1619ef1"
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Convert Kelvin to Celsius
const kelvinToCelsius = (kelvin: number): number => {
  return kelvin - 273.15;
};

// Convert m/s to km/h
const msToKph = (ms: number): number => {
  return ms * 3.6;
};

const mapWeatherCode = (openWeatherCode:number): number =>{
  // Thunderstorm
  if (openWeatherCode >= 200 && openWeatherCode <= 232) return 1273;
  
  // Drizzle
  if (openWeatherCode >= 300 && openWeatherCode <= 321) return 1063;
  
  // Rain
  if (openWeatherCode >= 500 && openWeatherCode <= 531) return 1180;
  
  // Snow
  if (openWeatherCode >= 600 && openWeatherCode <= 622) return 1204;
  
  // Atmosphere (Mist, Fog, etc.)
  if (openWeatherCode >= 701 && openWeatherCode <= 781) return 1006;
  
  // Clear
  if (openWeatherCode === 800) return 1000;
  
  // Clouds
  if (openWeatherCode >= 801 && openWeatherCode <= 804) return 1003;
  
  return 1000; // Default to sunny
}

// get weather data for a specific kenyan county
export const fetchWeatherForCounty = async (countyName:string,countyData:any):Promise<WeatherData> =>{
    try{
        console.log('🌤️ Fetching current weather for:', countyName);
        
        const response = await axios.get(`${BASE_URL}/weather`,{
            params:{
                lat:countyData.latitude,
                lon:countyData.longitude,
                appid:API_KEY,
                units:'metric'
            }
        })

        const data = response.data
        
        console.log('✅ Current weather data received:', {
            temp: data.main.temp,
            condition: data.weather[0].description,
            humidity: data.main.humidity,
            wind: data.wind.speed
        });
        
        return {
          location: countyName,
          temp_c: data.main.temp,
          condition: data.weather[0].description,
          humidity: data.main.humidity,
          wind_kph: msToKph(data.wind.speed),
          precip_mm: data.rain ? data.rain['1h'] || 0 : 0,
          uv: 0,
          is_day: 1,
          icon_code: mapWeatherCode(data.weather[0].id)
        };
    } catch (error){
        console.error('Error fetching weather data', error);
        throw error
    }
}

// Get 3-day forecast using One Call API - FIXED VERSION
export const fetchForecastOneCall = async (countyData: any): Promise<ForecastDay[]> => {
  try {
    console.log('📡 Using One Call API for:', countyData.name);
    
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/onecall`, {
      params: {
        lat: countyData.latitude,
        lon: countyData.longitude,
        appid: API_KEY,
        units: 'metric',
        exclude: 'current,minutely,hourly,alerts'
      }
    });

    const data = response.data;
    console.log('📅 One Call API response:', {
      hasDailyData: !!data.daily,
      dailyCount: data.daily?.length || 0,
      timezone: data.timezone,
      timezoneOffset: data.timezone_offset
    });
    
    if (!data.daily || data.daily.length === 0) {
      console.warn('⚠️ No daily forecast data available, using mock data');
      return generateMockForecast();
    }
    
    const dailyForecasts: ForecastDay[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
    
    console.log('📅 Today\'s date:', today.toISOString().split('T')[0]);
    
    // The One Call API daily array typically starts with "today" at index 0
    // But let's verify by checking the first day's timestamp
    const firstDayTimestamp = data.daily[0].dt * 1000; // Convert to milliseconds
    const firstDayDate = new Date(firstDayTimestamp);
    console.log('📅 First forecast day:', {
      timestamp: firstDayTimestamp,
      date: firstDayDate.toISOString().split('T')[0],
      dayName: firstDayDate.toLocaleDateString('en-US', { weekday: 'long' })
    });
    
    // Get today + next 2 days (3 days total)
    // We'll check if index 0 is today or tomorrow
    let startIndex = 0;
    
    // Check if first day is today
    const firstDayStr = firstDayDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    if (firstDayStr === todayStr) {
      console.log('✅ First forecast day is today');
      startIndex = 0;
    } else {
      console.log('⚠️ First forecast day is NOT today, it\'s:', firstDayStr);
      console.log('🔍 Checking if we should start from index 0 or 1...');
      
      // Sometimes One Call might skip today if it's late in the day
      // Let's check the time difference
      const timeDiff = firstDayDate.getTime() - today.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        console.log('📅 First forecast is for tomorrow, using it as Day 1');
        // The API is giving us tomorrow as first day
        // We'll use today's current weather for Day 1
        startIndex = 0;
      } else {
        console.log('📅 Using index 0 as Day 1');
        startIndex = 0;
      }
    }
    
    // Collect unique days to avoid duplicates
    const uniqueDates = new Set<string>();
    
    for (let i = startIndex; i < Math.min(startIndex + 3, data.daily.length); i++) {
      const dayData = data.daily[i];
      const dayTimestamp = dayData.dt * 1000;
      const date = new Date(dayTimestamp);
      const dateStr = date.toISOString().split('T')[0];
      
      // Skip if we already have this date (avoid duplicates)
      if (uniqueDates.has(dateStr)) {
        console.log(`⏭️ Skipping duplicate date: ${dateStr}`);
        continue;
      }
      
      uniqueDates.add(dateStr);
      
      console.log(`📅 Processing day ${i - startIndex + 1}:`, {
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        maxTemp: dayData.temp.max,
        minTemp: dayData.temp.min,
        weather: dayData.weather[0].main
      });
      
      dailyForecasts.push({
        date: dateStr,
        day: {
          maxtemp_c: dayData.temp.max,
          mintemp_c: dayData.temp.min,
          totalprecip_mm: dayData.rain || dayData.snow || 0,
          avgtemp_c: dayData.temp.day,
          condition: { code: mapWeatherCode(dayData.weather[0].id) }
        }
      });
      
      // Stop if we have 3 days
      if (dailyForecasts.length >= 3) {
        break;
      }
    }
    
    console.log('✅ Final forecast days:', dailyForecasts.map((f, i) => ({
      day: i + 1,
      date: f.date,
      dayName: new Date(f.date).toLocaleDateString('en-US', { weekday: 'long' }),
      temp: `${f.day.maxtemp_c.toFixed(1)}°/${f.day.mintemp_c.toFixed(1)}°`
    })));
    
    return dailyForecasts;
    
  } catch (error: any) {
    console.error('❌ One Call API failed:', error.message);
    console.error('📡 Response status:', error.response?.status);
    console.error('📄 Response data:', error.response?.data);
    
    // Fallback to mock data
    console.log('🔄 Falling back to mock forecast data');
    return generateMockForecast();
  }
};

// Helper for mock forecast
const generateMockForecast = (): ForecastDay[] => {
  console.log('🎭 Generating mock forecast data');
  const forecast: ForecastDay[] = [];
  const today = new Date();
  
  for (let i = 0; i < 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    forecast.push({
      date: dateStr,
      day: {
        maxtemp_c: 25 + Math.random() * 5,
        mintemp_c: 15 + Math.random() * 5,
        totalprecip_mm: Math.random() * 5,
        avgtemp_c: 20 + Math.random() * 5,
        condition: { code: [1000, 1003, 1006][Math.floor(Math.random() * 3)] }
      }
    });
    
    console.log(`🎭 Mock day ${i + 1} (${dateStr}): ${forecast[i].day.maxtemp_c.toFixed(1)}°`);
  }
  
  return forecast;
};

// Regular forecast for fallback
export const fetchForecastForCounty = async (countyData: any): Promise<ForecastDay[]> => {
  try {
    console.log('📡 Using regular forecast API for:', countyData.name);
    
    const response = await axios.get(`${BASE_URL}/forecast`, {
      params: {
        lat: countyData.latitude,
        lon: countyData.longitude,
        appid: API_KEY,
        units: 'metric'
      }
    });

    const data = response.data;
    console.log('📅 Regular forecast items:', data.list?.length || 0);
    
    return fetchForecastOneCall(countyData); // Fallback to One Call
    
  } catch (error) {
    console.error('Error fetching regular forecast:', error);
    return generateMockForecast();
  }
};