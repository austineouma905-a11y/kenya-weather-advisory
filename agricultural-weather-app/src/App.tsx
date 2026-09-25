import React, { useState, useEffect } from 'react';
import './styles/App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import WeatherCard from './components/WeatherCard';
import AdvisoryCard from './components/AdvisoryCard';
import ForecastCard from './components/ForecastCard';
import SoilCard from './components/SoilCard';
import AlertCard from './components/AlertCard';
import CropsCard from './components/CropsCard';
import Footer from './components/Footer';
import { kenyanCounties } from './data/counties';
import { CROP_DATA } from './data/cropData';
import { WeatherData, ForecastDay } from './data/types';

import { fetchForecastForCounty, fetchWeatherForCounty } from './services/WeatherService';

interface WeatherAlert {
  headline: string;
  description: string;
  severity: string;
}

const App: React.FC = () => {
  const [selectedCounty, setSelectedCounty] = useState<string>('Nairobi');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastDay[]>([]);
  const [soilMoisture, setSoilMoisture] = useState<number>(65);
  const [advisoryLevel, setAdvisoryLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [advisories, setAdvisories] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [cropScores, setCropScores] = useState<Array<{crop: string; score: number}>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

  const [useMockData, setUseMockData] = useState<boolean>(true); // Start with mock data
  const [apiError, setApiError] = useState<string | null>(null);

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
      uv: Math.floor(1 + Math.random() * 10),
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
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      forecast.push({
        date: date.toISOString().split('T')[0],
        day: {
          maxtemp_c: 25 + Math.random() * 5,
          mintemp_c: 15 + Math.random() * 5,
          totalprecip_mm: Math.random() * 8,
          avgtemp_c: 20 + Math.random() * 5,
          condition: { code: getRandomIconCode() }
        }
      });
    }
    return forecast;
  };

  // Calculate crop scores based on real weather data
  const calculateCropScores = (weather: WeatherData, estimatedSoilMoisture: number): Array<{crop: string; score: number}> => {
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
      
      // Soil moisture is estimated separately; humidity is not a soil measurement.
      if (estimatedSoilMoisture >= crop.soilMoisture.min && estimatedSoilMoisture <= crop.soilMoisture.max) {
        score += 3;
      } else if (Math.abs(estimatedSoilMoisture - crop.soilMoisture.min) < 10 ||
                Math.abs(estimatedSoilMoisture - crop.soilMoisture.max) < 10) {
        score += 1;
      }
      
      // Rainfall score (30% weight)
      if (weather.precip_mm > 0 && weather.precip_mm <= 15) {
        score += 3;
      }
      
      return { crop: cropName, score };
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

  // Calculate soil moisture based on real weather
  const calculateSoilMoisture = (weather: WeatherData): number => {
    let moisture = 50; // Base moisture
    
    // Adjust based on recent rainfall
    if (weather.precip_mm > 15) moisture += 30;
    else if (weather.precip_mm > 10) moisture += 20;
    else if (weather.precip_mm > 5) moisture += 15;
    else if (weather.precip_mm > 2) moisture += 10;
    else if (weather.precip_mm < 1) moisture -= 15;
    
    // Adjust based on temperature (evaporation)
    if (weather.temp_c > 30) moisture -= 15;
    else if (weather.temp_c > 25) moisture -= 10;
    else if (weather.temp_c < 15) moisture += 5;
    
    // Adjust based on wind (drying effect)
    if (weather.wind_kph > 25) moisture -= 10;
    else if (weather.wind_kph > 15) moisture -= 5;
    
    // Adjust based on humidity
    if (weather.humidity > 80) moisture += 10;
    else if (weather.humidity < 40) moisture -= 10;
    
    // Ensure within bounds
    return Math.min(95, Math.max(15, Math.round(moisture)));
  };

  const getSoilCondition = (moisture: number): string => {
    if (moisture > 85) return 'Soil is saturated. High risk of waterlogging.';
    if (moisture > 70) return 'Soil moisture is excellent for most crops.';
    if (moisture > 55) return 'Soil moisture is adequate.';
    if (moisture > 40) return 'Soil is moderately dry. Consider irrigation soon.';
    if (moisture > 25) return 'Soil is dry. Irrigation recommended.';
    return 'Soil is very dry. Immediate irrigation required.';
  };

  const getSoilAdvisories = (moisture: number): string[] => {
    if (moisture > 85) {
      return [
        'Delay all irrigation activities',
        'Improve drainage systems',
        'Avoid field work in wet conditions'
      ];
    } else if (moisture > 70) {
      return [
        'Ideal conditions for planting',
        'Minimal irrigation needed',
        'Good time for fertilizer application'
      ];
    } else if (moisture > 55) {
      return [
        'Adequate soil moisture',
        'Monitor soil conditions daily',
        'Plan irrigation for next 3-4 days'
      ];
    } else if (moisture > 40) {
      return [
        'Schedule irrigation in 1-2 days',
        'Use mulch to conserve moisture',
        'Water in early morning or evening'
      ];
    } else if (moisture > 25) {
      return [
        'Irrigate immediately',
        'Use drip irrigation for efficiency',
        'Consider drought-resistant varieties'
      ];
    } else {
      return [
        'Emergency irrigation required',
        'Prioritize water for high-value crops',
        'Consult agricultural extension officer'
      ];
    }
  };

  // Fetch real weather data using One Call API
  const fetchRealWeatherData = async (countyName: string) => {
    console.log(`🔄 Fetching weather data for: ${countyName}`);
    setIsLoading(true);
    setApiError(null);
    
    const county = kenyanCounties.find(c => c.name === countyName);
    if (!county) {
      console.error(`❌ County not found: ${countyName}`);
      setUseMockData(true);
      fetchMockWeatherData(countyName);
      return;
    }
    
    console.log(`📍 Using county data:`, {
      name: county.name,
      lat: county.latitude,
      lon: county.longitude
    });
    
    try {
      // Fetch current weather
      console.time('⏱️ Current weather fetch');
      const currentWeather = await fetchWeatherForCounty(countyName, county);
      console.timeEnd('⏱️ Current weather fetch');
      console.log('✅ Current weather data:', currentWeather);
      
      // Fetch 3-day forecast using One Call API
      console.time('⏱️ Forecast fetch (One Call)');
      const forecast = await fetchForecastForCounty(county);
      console.timeEnd('⏱️ Forecast fetch (One Call)');
      console.log('📅 Forecast data received:', forecast.length, 'days');
      
      // Do not fabricate missing live forecast days; the card displays placeholders.
      const finalForecast = [...forecast];
      
      // Sort by date to ensure correct order
      finalForecast.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      console.log('✅ Final 3-day forecast:', finalForecast.map(f => ({
        date: f.date,
        max: f.day.maxtemp_c.toFixed(1),
        min: f.day.mintemp_c.toFixed(1),
        rain: f.day.totalprecip_mm.toFixed(1)
      })));
      
      // Process the data
      const moisture = calculateSoilMoisture(currentWeather);
      const { level, advisories } = generateAdvisories(currentWeather);
      const weatherAlerts = generateAlerts(currentWeather);
      const scores = calculateCropScores(currentWeather, moisture);
      
      console.log('🧮 Calculated data:', {
        soilMoisture: moisture,
        advisoryLevel: level,
        advisoriesCount: advisories.length,
        alertsCount: weatherAlerts.length
      });
      
      setWeatherData(currentWeather);
      setForecastData(finalForecast);
      setSoilMoisture(moisture);
      setAdvisoryLevel(level);
      setAdvisories(advisories);
      setAlerts(weatherAlerts);
      setCropScores(scores);
      setUseMockData(false);
      setIsLoading(false);
      
      console.log('🎉 State updated successfully with real API data');
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch weather data';
      console.error('Weather API error:', error);
      setApiError(message);
      setUseMockData(true);
      fetchMockWeatherData(countyName);
    }
  };

  // Fallback to mock data
  const fetchMockWeatherData = (countyName: string) => {
    console.log(`🔄 Using mock data for: ${countyName}`);
    const mockWeather = generateMockWeatherData(countyName);
    const mockForecast = generateMockForecast();
    const moisture = calculateSoilMoisture(mockWeather);
    const { level, advisories } = generateAdvisories(mockWeather);
    const mockAlerts = generateAlerts(mockWeather);
    const scores = calculateCropScores(mockWeather, moisture);
    
    setWeatherData(mockWeather);
    setForecastData(mockForecast);
    setSoilMoisture(moisture);
    setAdvisoryLevel(level);
    setAdvisories(advisories);
    setAlerts(mockAlerts);
    setCropScores(scores);
    setIsLoading(false);
  };

  // Initial fetch
  useEffect(() => {
    console.log('🚀 App component mounted');
    
    fetchRealWeatherData(selectedCounty);
    
    // Refresh data every 10 minutes
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing weather data...');
      fetchRealWeatherData(selectedCounty);
    }, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [selectedCounty]);

  const handleCountySelect = (countyName: string) => {
    console.log(`📍 County selected: ${countyName}`);
    setSelectedCounty(countyName);
  };

  const handleSubscribe = () => {
    setIsSubscribed(!isSubscribed);
    alert(`You have ${isSubscribed ? 'unsubscribed from' : 'subscribed to'} weather alerts for ${selectedCounty}!`);
  };

  const handleRetryAPI = () => {
    console.log('🔄 Retrying API connection...');
    fetchRealWeatherData(selectedCounty);
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
          <div>Loading weather data for {selectedCounty}...</div>
          <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Fetching real-time data from OpenWeather API
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header onSubscribe={handleSubscribe} />
      <Sidebar 
        selectedCounty={selectedCounty}
        onCountySelect={handleCountySelect}
      />
      
      <main className="main-content">
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
          <ForecastCard forecastData={forecastData} />
        )}
        
        <AdvisoryCard 
          level={advisoryLevel}
          advisories={advisories}
        />
        
        <SoilCard 
          soilMoisture={soilMoisture}
          condition={getSoilCondition(soilMoisture)}
          advisories={getSoilAdvisories(soilMoisture)}
        />
        
        <AlertCard alerts={alerts} />
        
        <CropsCard cropScores={cropScores} />
      </main>
      
      <Footer onChangeApiKey={() => {
        alert('Copy .env.example to .env.local, add REACT_APP_OPENWEATHER_API_KEY, then restart the app.');
      }} />
    </div>
  );
};

export default App;
