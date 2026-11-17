import React from 'react';
import { ForecastDay, HourlyForecast } from '../data/types';

interface ForecastCardProps {
  forecastData: ForecastDay[];
  hourlyData: HourlyForecast[];
}

const ForecastCard: React.FC<ForecastCardProps> = ({ forecastData, hourlyData }) => {
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

  const formatProbability = (probability: number | null) => (
    probability === null ? '—' : `${Math.round(probability)}%`
  );
  const formatDay = (date: string, index: number) => index === 0
    ? 'Today'
    : new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

  return (
    <div className="card forecast-card">
      <div className="card-header">
        <h2 className="card-title">5-Day Forecast</h2>
        <i className="fas fa-calendar-alt card-icon" aria-hidden="true"></i>
      </div>

      {hourlyData.length > 0 && (
        <section className="hourly-forecast" aria-labelledby="hourly-forecast-title">
          <h3 id="hourly-forecast-title">Next 15 hours · 3-hour intervals</h3>
          <div className="hourly-forecast-scroll">
            {hourlyData.map((period) => (
              <div className="hourly-forecast-period" key={period.time}>
                <strong>{period.time}</strong>
                <span>{Math.round(period.temp_c)}°C</span>
                <span><i className="fas fa-cloud-rain" aria-hidden="true"></i> {formatProbability(period.precipitation_probability)}</span>
                <small>{period.precipitation_mm.toFixed(1)} mm</small>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="forecast-container">
        {forecastData.map((day, index) => (
          <div key={day.date} className="forecast-day">
            <div className="day-name">{formatDay(day.date, index)}</div>
            <i className={`fas ${getWeatherIconClass(day.day.condition.code)} forecast-icon`} aria-hidden="true"></i>
            <div className="day-temp">{Math.round(day.day.maxtemp_c)}° / {Math.round(day.day.mintemp_c)}°C</div>
            <div className="day-rain-probability">
              <i className="fas fa-cloud-rain" aria-hidden="true"></i> {formatProbability(day.day.precipitation_probability)} rain chance
            </div>
            <div className="day-rain">{day.day.totalprecip_mm.toFixed(1)} mm forecast</div>
          </div>
        ))}
      </div>
      <p className="forecast-data-note">Rain chances and amounts are forecasts, not observed rainfall.</p>
    </div>
  );
};

export default ForecastCard;
