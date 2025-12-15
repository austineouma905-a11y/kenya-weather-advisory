import React from 'react';
import { ForecastDay } from '../data/types';

interface ForecastCardProps {
  forecastData: ForecastDay[];
}

const ForecastCard: React.FC<ForecastCardProps> = ({ forecastData }) => {
  const getWeatherIconClass = (code: number) => {
    if (code === 1000) return 'fa-sun';
    if (code === 1003) return 'fa-cloud-sun';
    if (code === 1006) return 'fa-cloud';
    if (code === 1063) return 'fa-cloud-rain';
    if (code === 1180) return 'fa-cloud-showers-heavy';
    if (code === 1204) return 'fa-snowflake';
    if (code === 1273 || code === 1276) return 'fa-bolt';
    return 'fa-cloud';
  };

  const getDayName = (dateString: string, index: number) => {
    if (index === 0) return 'Today';
    
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return dayName.substring(0, 3);
  };

  // Format precipitation to 2 decimal places, show 0.00 if 0
  const formatPrecipitation = (mm: number): string => {
    if (mm === 0) return '0.00';
    return mm.toFixed(2);
  };

  // Ensure we only show 3 days
  const displayForecast = forecastData.slice(0, 3);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">3-Day Forecast</h2>
        <i className="fas fa-calendar-alt card-icon"></i>
      </div>
      
      <div className="forecast-container">
        {displayForecast.map((day, index) => {
          const iconClass = getWeatherIconClass(day.day.condition.code);
          const dayName = getDayName(day.date, index);
          const precipitation = formatPrecipitation(day.day.totalprecip_mm);
          
          return (
            <div key={`${day.date}-${index}`} className="forecast-day">
              <div className="day-name">{dayName}</div>
              <i className={`fas ${iconClass} forecast-icon`}></i>
              <div className="day-temp">
                {Math.round(day.day.maxtemp_c)}° / {Math.round(day.day.mintemp_c)}°
              </div>
              <div className="day-rain">{precipitation} mm</div>
            </div>
          );
        })}
        
        {/* If we have less than 3 days, show placeholder */}
        {displayForecast.length < 3 && (
          <>
            {Array.from({ length: 3 - displayForecast.length }).map((_, index) => (
              <div key={`placeholder-${index}`} className="forecast-day" style={{ opacity: 0.5 }}>
                <div className="day-name">--</div>
                <i className="fas fa-cloud forecast-icon"></i>
                <div className="day-temp">--° / --°</div>
                <div className="day-rain">0.00 mm</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default ForecastCard;