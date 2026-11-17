import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles/App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import WeatherCard from './components/WeatherCard';
import AdvisoryCard from './components/AdvisoryCard';
import ForecastCard from './components/ForecastCard';
import SoilCard from './components/SoilCard';
import AlertCard from './components/AlertCard';
import CropsCard from './components/CropsCard';
import CropSuitabilityChart from './components/CropSuitabilityChart';
import Footer from './components/Footer';
import TemperatureTrendCard from './components/TemperatureTrendCard';
import { kenyanCounties } from './data/counties';
import { CROP_DATA } from './data/cropData';
import { WeatherData, ForecastDay, HourlyForecast, SoilMoistureData, TemperatureTrendDay } from './data/types';

import { fetchForecastForCounty, fetchSoilMoistureForCounty, fetchTemperatureTrendForCounty, fetchWeatherForCounty } from './services/WeatherService';
import { getObservedTemperatureRange, recordObservedTemperature } from './services/ObservedTemperatureService';

interface WeatherAlert {
  headline: string;
  description: string;
  severity: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

const addObservedRangeForToday = (
  days: TemperatureTrendDay[],
  today: string | null,
  countyName: string
): TemperatureTrendDay[] => {
  if (!today) return days;
  const observedRange = getObservedTemperatureRange(countyName, today);
  if (!observedRange) return days;
  return days.map((day) => day.date === today ? {
    ...day,
    ...observedRange,
    isPreviousWeek: false,
    isReanalysis: false,
    isObserved: true,
  } : day);
};

const nearestCounty = (location: UserLocation) => kenyanCounties.reduce((nearest, county) => {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const distance = (candidate: typeof county) => {
    const latitudeDelta = toRadians(candidate.latitude - location.latitude);
    const longitudeDelta = toRadians(candidate.longitude - location.longitude);
    return latitudeDelta ** 2 + longitudeDelta ** 2
      * Math.cos(toRadians((candidate.latitude + location.latitude) / 2)) ** 2;
  };
  return distance(county) < distance(nearest) ? county : nearest;
});

const App: React.FC = () => {
  const [selectedCounty, setSelectedCounty] = useState<string>('Nairobi');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastDay[]>([]);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [soilMoistureData, setSoilMoistureData] = useState<SoilMoistureData | null>(null);
  const [soilMoistureError, setSoilMoistureError] = useState<string | null>(null);
  const [temperatureTrend, setTemperatureTrend] = useState<TemperatureTrendDay[]>([]);
  const [temperatureTrendError, setTemperatureTrendError] = useState<string | null>(null);
  const [advisoryLevel, setAdvisoryLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [advisories, setAdvisories] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [cropScores, setCropScores] = useState<Array<{crop: string; score: number}>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => localStorage.getItem('weather-alerts-enabled') === 'true');
  const [notificationStatus, setNotificationStatus] = useState<string>('');

  const [useMockData, setUseMockData] = useState<boolean>(true); // Start with mock data
  const [apiError, setApiError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationReady, setLocationReady] = useState<boolean>(false);
  const [locationMessage, setLocationMessage] = useState<string>('');
  const [locationNeedsAction, setLocationNeedsAction] = useState<boolean>(false);

  useEffect(() => {
    if (!isSubscribed || useMockData || !forecastData.length || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const coldForecast = forecastData.find(day => day.day.mintemp_c <= 15);
    if (!coldForecast) return;

    const alertKey = `cold-weather-alert:${selectedCounty}:${coldForecast.date}`;
    if (localStorage.getItem(alertKey)) return;

    const dateLabel = new Date(`${coldForecast.date}T00:00:00`).toLocaleDateString('en-KE', {
      weekday: 'long', month: 'long', day: 'numeric'
    });
    new Notification(`Cold weather alert for ${selectedCounty}`, {
      body: `The forecast low on ${dateLabel} is ${coldForecast.day.mintemp_c.toFixed(1)}°C. Protect sensitive crops and livestock.`,
      tag: alertKey
    });
    localStorage.setItem(alertKey, 'sent');
    setNotificationStatus(`Cold weather alert sent for ${selectedCounty}.`);
  }, [forecastData, isSubscribed, selectedCounty, useMockData]);

  useEffect(() => {
    if (!notificationStatus) return;
    const timeout = window.setTimeout(() => setNotificationStatus(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [notificationStatus]);

  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationMessage('This browser does not provide device location. Showing Nairobi weather.');
      setLocationNeedsAction(true);
      setLocationReady(true);
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setLocationMessage('Location access requires a secure HTTPS connection. Showing Nairobi weather.');
      setLocationNeedsAction(true);
      setLocationReady(true);
      return;
    }

    setLocationNeedsAction(false);
    setLocationMessage('Requesting your device location…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = { latitude: coords.latitude, longitude: coords.longitude };
        const withinKenyaRegion = location.latitude >= -5.5 && location.latitude <= 5.5
          && location.longitude >= 33.5 && location.longitude <= 42.5;

        if (!withinKenyaRegion) {
          setLocationMessage('Your location is outside the Kenya service area. Showing Nairobi weather.');
          setLocationReady(true);
          return;
        }

        const county = nearestCounty(location);
        setUserLocation(location);
        setSelectedCounty(county.name);
        setLocationMessage(`Using your current location near ${county.name}.`);
        setLocationReady(true);
      },
      (error) => {
        if (error.code === 1) {
          setLocationMessage('Location access is blocked. Allow location for this site in your browser settings, then try again.');
        } else if (error.code === 2) {
          setLocationMessage('Your device could not determine its location. Check that Location Services are on, then try again.');
        } else {
          setLocationMessage('The location request timed out. Try again to load nearby weather.');
        }
        setLocationNeedsAction(true);
        setLocationReady(true);
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 15000 }
    );
  }, []);

  // Generate mock weather data
  const generateMockWeatherData = (countyName: string): WeatherData => {
    const county = kenyanCounties.find(c => c.name === countyName);
    const baseTemp = county?.climate_zone.includes('Tropical') ? 28 : 
                    county?.climate_zone.includes('Arid') ? 32 : 
                    county?.climate_zone.includes('Temperate') ? 22 : 25;
    
    return {
      location: countyName,
      temp_c: baseTemp + Math.random() * 4 - 2, // Random variation
      condition: getRandomCondition(),
      humidity: 60 + Math.random() * 30,
      wind_kph: 5 + Math.random() * 20,
      precip_mm: Math.random() * 10,
      uv: null,
      is_day: 1,
      icon_code: getRandomIconCode()
    };
  };

  const getRandomCondition = (): string => {
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Clear'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  };

  const getRandomIconCode = (): number => {
    const codes = [1000, 1003, 1006, 1063, 1180];
    return codes[Math.floor(Math.random() * codes.length)];
  };

  const generateMockForecast = (): ForecastDay[] => {
    const forecast: ForecastDay[] = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        day: {
          maxtemp_c: 25 + Math.random() * 5,
          mintemp_c: 15 + Math.random() * 5,
          totalprecip_mm: Math.random() * 8,
          precipitation_probability: Math.random() * 100,
          avgtemp_c: 20 + Math.random() * 5,
          condition: { code: getRandomIconCode() }
        }
      });
    }
    return forecast;
  };

  // Calculate crop scores from air temperature and recent rainfall only.
  const calculateCropScores = (weather: WeatherData): Array<{crop: string; score: number}> => {
    const scores = Object.keys(CROP_DATA).map(cropName => {
      const crop = CROP_DATA[cropName];
      let score = 0;
      
      // Temperature score (40% weight)
      if (weather.temp_c >= crop.idealTemp.min && weather.temp_c <= crop.idealTemp.max) {
        score += 4;
      } else if (Math.abs(weather.temp_c - crop.idealTemp.min) < 5 || 
                Math.abs(weather.temp_c - crop.idealTemp.max) < 5) {
        score += 2;
      }
      
      // Rainfall score (30% weight)
      if (weather.precip_mm > 0 && weather.precip_mm <= 15) {
        score += 3;
      }
      
      return { crop: cropName, score: Math.round((score / 7) * 10) };
    });
    
    return scores;
  };

  // Generate advisories based on real weather data
  const generateAdvisories = (weather: WeatherData): {level: 'low' | 'medium' | 'high', advisories: string[]} => {
    const advisories: string[] = [];
    let level: 'low' | 'medium' | 'high' = 'low';
    
    // Check for heavy rain
    if (weather.precip_mm > 10) {
      level = 'high';
      advisories.push('Heavy rain expected. Delay field work and check drainage.');
    } else if (weather.precip_mm > 5) {
      level = 'medium';
      advisories.push('Moderate rain expected. Good time for planting.');
    } else if (weather.precip_mm < 1) {
      advisories.push('Low rainfall. Consider irrigation for sensitive crops.');
    }
    
    // Check for extreme temperatures
    if (weather.temp_c > 35) {
      level = 'high';
      advisories.push('Extreme heat. Water crops in early morning or late evening.');
    } else if (weather.temp_c > 30) {
      level = 'medium';
      advisories.push('High temperatures. Increase watering frequency.');
    } else if (weather.temp_c < 10) {
      level = 'medium';
      advisories.push('Cold temperatures. Protect sensitive crops.');
    }
    
    // Check for strong winds
    if (weather.wind_kph > 30) {
      level = 'high';
      advisories.push('Strong winds. Secure structures and protect young plants.');
    } else if (weather.wind_kph > 20) {
      advisories.push('Windy conditions. Good for pollination but monitor soil moisture.');
    }
    
    // Check humidity
    if (weather.humidity > 80) {
      advisories.push('High humidity. Monitor for fungal diseases.');
    } else if (weather.humidity < 40) {
      advisories.push('Low humidity. Increase irrigation and use mulch.');
    }
    
    if (advisories.length === 0) {
      advisories.push('Optimal farming conditions.');
      advisories.push('Good time for planting and field maintenance.');
    }
    
    return { level, advisories };
  };

  // Generate alerts based on real weather data
  const generateAlerts = (weather: WeatherData): WeatherAlert[] => {
    const alerts: WeatherAlert[] = [];
    
    if (weather.temp_c > 35) {
      alerts.push({
        headline: 'Extreme Heat Warning',
        description: 'Temperatures exceeding 35°C may cause heat stress to crops and livestock.',
        severity: 'High'
      });
    }
    
    if (weather.wind_kph > 40) {
      alerts.push({
        headline: 'Strong Wind Warning',
        description: 'High winds may damage crops, trees, and agricultural structures.',
        severity: 'High'
      });
    }
    
    if (weather.precip_mm > 20) {
      alerts.push({
        headline: 'Heavy Rainfall Alert',
        description: 'Heavy rain may cause flooding, soil erosion, and waterlogging.',
        severity: 'High'
      });
    }
    
    if (weather.humidity > 90) {
      alerts.push({
        headline: 'High Humidity Alert',
        description: 'Extreme humidity increases risk of fungal diseases and pest outbreaks.',
        severity: 'Medium'
      });
    }
    
    return alerts;
  };

  // Fetch real weather data using One Call API
  const fetchRealWeatherData = async (countyName: string, location?: UserLocation | null) => {
    console.log(`🔄 Fetching weather data for: ${countyName}`);
    setIsLoading(true);
    setApiError(null);
    setTemperatureTrendError(null);
    
    const county = kenyanCounties.find(c => c.name === countyName);
    if (!county) {
      console.error(`❌ County not found: ${countyName}`);
      setUseMockData(true);
      fetchMockWeatherData(countyName);
      return;
    }

    const requestCounty = location
      ? { ...county, latitude: location.latitude, longitude: location.longitude }
      : county;
    
    console.log(`📍 Using county data:`, {
      name: county.name,
      lat: requestCounty.latitude,
      lon: requestCounty.longitude
    });
    
    const trendPromise = fetchTemperatureTrendForCounty(requestCounty)
      .then(({ days, today }) => ({ days, today, error: null as string | null }))
      .catch((error: unknown) => ({
        days: [] as TemperatureTrendDay[],
        today: null,
        error: error instanceof Error ? error.message : 'Weekly temperature trend is unavailable.',
      }));
    const soilMoisturePromise = fetchSoilMoistureForCounty(requestCounty)
      .then((data) => ({ data, error: null as string | null }))
      .catch((error: unknown) => ({
        data: null,
        error: error instanceof Error ? error.message : 'Modelled soil-water data is unavailable.',
      }));
    setSoilMoistureData(null);
    setSoilMoistureError(null);

    try {

      // Fetch current weather
      console.time('⏱️ Current weather fetch');
      const currentWeather = await fetchWeatherForCounty(countyName, requestCounty);
      recordObservedTemperature(
        countyName,
        currentWeather.temp_c,
        currentWeather.observed_at ?? Math.floor(Date.now() / 1000)
      );
      console.timeEnd('⏱️ Current weather fetch');
      console.log('✅ Current weather data:', currentWeather);
      
      // Fetch five-day and near-term forecast from the 5-day/3-hour endpoint
      console.time('⏱️ Forecast fetch (One Call)');
      const forecast = await fetchForecastForCounty(requestCounty);
      console.timeEnd('⏱️ Forecast fetch (One Call)');
      console.log('📅 Forecast data received:', forecast.days.length, 'days');
      
      // Do not fabricate missing live forecast days; the card displays placeholders.
      const trendResult = await trendPromise;
      const soilResult = await soilMoisturePromise;
      const finalTemperatureTrend = addObservedRangeForToday(trendResult.days, trendResult.today, countyName);
      const finalForecast = [...forecast.days];
      
      // Sort by date to ensure correct order
      finalForecast.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log('✅ Final 3-day forecast:', finalForecast.map(f => ({
        date: f.date,
        max: f.day.maxtemp_c.toFixed(1),
        min: f.day.mintemp_c.toFixed(1),
        rain: f.day.totalprecip_mm.toFixed(1)
      })));
      
      // Process the data
      const { level, advisories } = generateAdvisories(currentWeather);
      const weatherAlerts = generateAlerts(currentWeather);
      const scores = calculateCropScores(currentWeather);
      
      console.log('🧮 Calculated data:', {
        advisoryLevel: level,
        advisoriesCount: advisories.length,
        alertsCount: weatherAlerts.length
      });
      
      setWeatherData(currentWeather);
      setForecastData(finalForecast);
      setHourlyForecast(forecast.hours);
      setTemperatureTrend(finalTemperatureTrend);
      setTemperatureTrendError(trendResult.error);
      setSoilMoistureData(soilResult.data);
      setSoilMoistureError(soilResult.error);
      setAdvisoryLevel(level);
      setAdvisories(advisories);
      setAlerts(weatherAlerts);
      setCropScores(scores);
      setUseMockData(false);
      setIsLoading(false);
      
      console.log('🎉 State updated successfully with real API data');
      
    } catch (error: unknown) {
      const trendResult = await trendPromise;
      const soilResult = await soilMoisturePromise;
      setTemperatureTrend(addObservedRangeForToday(trendResult.days, trendResult.today, countyName));
      setTemperatureTrendError(trendResult.error);
      setSoilMoistureData(soilResult.data);
      setSoilMoistureError(soilResult.error);
      const message = error instanceof Error ? error.message : 'Failed to fetch weather data';
      console.error('Weather API error:', error);
      setApiError(message);
      setUseMockData(true);
      fetchMockWeatherData(countyName);
    }
  };

  // Keep the latest fetch implementation available without restarting the refresh timer
  // every time this component renders.
  const fetchWeatherDataRef = useRef(fetchRealWeatherData);
  fetchWeatherDataRef.current = fetchRealWeatherData;

  // Fallback to mock data
  const fetchMockWeatherData = (countyName: string) => {
    console.log(`🔄 Using mock data for: ${countyName}`);
    const mockWeather = generateMockWeatherData(countyName);
    const mockForecast = generateMockForecast();
    const { level, advisories } = generateAdvisories(mockWeather);
    const mockAlerts = generateAlerts(mockWeather);
    const scores = calculateCropScores(mockWeather);
    
    setWeatherData(mockWeather);
    setForecastData(mockForecast);
    setHourlyForecast([]);
    setSoilMoistureData(null);
    setSoilMoistureError('Live soil-water data is unavailable while using sample weather data.');
    setAdvisoryLevel(level);
    setAdvisories(advisories);
    setAlerts(mockAlerts);
    setCropScores(scores);
    setIsLoading(false);
  };

  // Ask for the browser's location on entry, then use the nearest county name for display.
  useEffect(() => {
    requestCurrentLocation();
  }, [requestCurrentLocation]);

  // Initial fetch
  useEffect(() => {
    console.log('🚀 App component mounted');
    
    if (!locationReady) return;
    fetchWeatherDataRef.current(selectedCounty, userLocation);
    
    // Refresh data every 10 minutes
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing weather data...');
      fetchWeatherDataRef.current(selectedCounty, userLocation);
    }, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [selectedCounty, locationReady, userLocation]);

  const handleCountySelect = (countyName: string) => {
    setUserLocation(null);
    setLocationMessage(`Showing weather for ${countyName}.`);
    console.log(`📍 County selected: ${countyName}`);
    setSelectedCounty(countyName);
  };

  const handleSubscribe = async () => {
    if (isSubscribed) {
      localStorage.removeItem('weather-alerts-enabled');
      setIsSubscribed(false);
      setNotificationStatus('Weather alerts turned off.');
      return;
    }

    if (!('Notification' in window)) {
      setNotificationStatus('This browser does not support notifications.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem('weather-alerts-enabled', 'true');
      setIsSubscribed(true);
      setNotificationStatus(`Weather alerts enabled for ${selectedCounty}. Cold alerts are sent when forecast lows reach 15°C or below.`);
    } else {
      setNotificationStatus('Notifications are blocked. Allow them in your browser site settings to receive weather alerts.');
    }
  };

  const handleRetryAPI = () => {
    console.log('🔄 Retrying API connection...');
    fetchRealWeatherData(selectedCounty, userLocation);
  };

  if (isLoading) {
    return (
      <div className="container">
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '1.5rem',
          color: 'var(--primary-color)',
          textAlign: 'center'
        }}>
          <i className="fas fa-cloud-sun" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
          <div>{locationReady ? `Loading weather data for ${selectedCounty}...` : 'Checking your location...'}</div>
          <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {locationReady ? 'Fetching current weather and forecast' : 'Allow location access to show nearby weather'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container">
      <Header onSubscribe={handleSubscribe} isSubscribed={isSubscribed} notificationStatus={notificationStatus} />
      <Sidebar 
        selectedCounty={selectedCounty}
        onCountySelect={handleCountySelect}
      />
      
      <main className="main-content">
        {locationMessage && (
          <div className="card" role="status" style={{
            gridColumn: '1 / -1',
            backgroundColor: '#e8f5e9',
            borderLeft: '5px solid var(--primary-color)'
          }}>
            <p>{locationMessage}</p>
            {locationNeedsAction && (
              <button
                type="button"
                onClick={requestCurrentLocation}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.55rem 0.9rem',
                  border: 0,
                  borderRadius: 'var(--border-radius)',
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                <i className="fas fa-location-crosshairs" aria-hidden="true"></i> Use my location
              </button>
            )}
          </div>
        )}

        {apiError && (
          <div className="card" style={{
            gridColumn: '1 / -1',
            backgroundColor: '#fff3e0',
            borderLeft: '5px solid var(--accent-color)'
          }}>
            <div className="card-header">
              <h2 className="card-title"><i className="fas fa-exclamation-triangle"></i> API Connection Issue</h2>
            </div>
            <p>{apiError}</p>
            <p>Showing clearly labelled sample data. Check your API key and internet connection.</p>
            <button 
              onClick={handleRetryAPI}
              style={{
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--border-radius)',
                marginTop: '1rem',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-sync-alt"></i> Retry Connection
            </button>
          </div>
        )}
        
        {useMockData && !apiError && (
          <div className="card" style={{
            gridColumn: '1 / -1',
            backgroundColor: '#e8f5e9',
            borderLeft: '5px solid var(--primary-color)'
          }}>
            <div className="card-header">
              <h2 className="card-title"><i className="fas fa-info-circle"></i> Demonstration Mode</h2>
            </div>
            <p>Using sample data because live weather data is not configured.</p>
          </div>
        )}
        
        {weatherData && (
          <WeatherCard 
            weatherData={weatherData}
            location={selectedCounty}
          />
        )}
        
        {forecastData.length > 0 && (
          <ForecastCard forecastData={forecastData} hourlyData={hourlyForecast} />
        )}

        <AdvisoryCard 
          level={advisoryLevel}
          advisories={advisories}
        />
        
        <SoilCard data={soilMoistureData} error={soilMoistureError} />
        
        <AlertCard alerts={alerts} />
        
        <CropsCard cropScores={cropScores} />
        <TemperatureTrendCard
          countyName={selectedCounty}
          days={temperatureTrend}
          error={temperatureTrendError}
        />
        <CropSuitabilityChart cropScores={cropScores} />
      </main>
      </div>
      <Footer />
    </>
  );
};

export default App;

