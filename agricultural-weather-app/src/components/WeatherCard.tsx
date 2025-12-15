import React from 'react';
import { WeatherData } from '../data/types';

interface WeatherCardProps {
  weatherData: WeatherData;
  location: string;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ weatherData, location }) => {
  const getWeatherIconClass = (code: number, isDay: number) => {
    if (code === 1000) return isDay ? 'fa-sun' : 'fa-moon';
    if (code === 1003) return isDay ? 'fa-cloud-sun' : 'fa-cloud-moon';
    if (code >= 1006 && code <= 1030) return 'fa-cloud';
    if (code >= 1063 && code <= 1201) return 'fa-cloud-rain';
    if (code >= 1204 && code <= 1237) return 'fa-snowflake';
    if (code >= 1240 && code <= 1264) return 'fa-cloud-showers-heavy';
    if (code === 1273 || code === 1276 || code === 1279 || code === 1282) return 'fa-bolt';
    return 'fa-cloud';
  };

  const iconClass = getWeatherIconClass(weatherData.icon_code, weatherData.is_day);

  return (
    <div className="card weather-display">
      <div className="card-header">
        <h2 className="card-title">Current Weather - {location}</h2>
        <i className="fas fa-cloud-sun card-icon"></i>
      </div>
      
      <div className="current-weather">
        <div className="temp-display">
          <div className="temp-value">{Math.round(weatherData.temp_c)}°</div>
          <div className="temp-unit">C</div>
        </div>
        <div className="weather-condition">
          <i className={`fas ${iconClass} condition-icon`}></i>
          <div className="condition-text">{weatherData.condition}</div>
        </div>
      </div>
      
      <div className="weather-details">
        <div className="detail-item">
          <i className="fas fa-tint detail-icon"></i>
          <div className="detail-value">{weatherData.humidity}%</div>
          <div className="detail-label">Humidity</div>
        </div>
        <div className="detail-item">
          <i className="fas fa-wind detail-icon"></i>
          <div className="detail-value">{Math.round(weatherData.wind_kph)} km/h</div>
          <div className="detail-label">Wind Speed</div>
        </div>
        <div className="detail-item">
          <i className="fas fa-cloud-rain detail-icon"></i>
          <div className="detail-value">{weatherData.precip_mm} mm</div>
          <div className="detail-label">Precipitation</div>
        </div>
        <div className="detail-item">
          <i className="fas fa-sun detail-icon"></i>
          <div className="detail-value">{weatherData.uv}</div>
          <div className="detail-label">UV Index</div>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;