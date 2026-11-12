import React from 'react';
import { TemperatureTrendDay } from '../data/types';

interface TemperatureTrendCardProps {
  countyName: string;
  days: TemperatureTrendDay[];
  error?: string | null;
}

const chartWidth = 760;
const chartHeight = 300;
const plot = { left: 54, right: 20, top: 20, bottom: 48 };

const TemperatureTrendCard: React.FC<TemperatureTrendCardProps> = ({ countyName, days, error }) => {
  const completeWeek = days.length === 7;
  const allTemperatures = days.flatMap((day) => [day.high_c, day.low_c]);
  const dataMin = allTemperatures.length ? Math.min(...allTemperatures) : 0;
  const dataMax = allTemperatures.length ? Math.max(...allTemperatures) : 1;
  // Give the vertical axis some breathing room so daily highs and lows don't
  // look farther apart than their actual temperature difference.
  const minTemperature = Math.floor((dataMin - 5) / 5) * 5;
  const maxTemperature = Math.ceil((dataMax + 5) / 5) * 5 || minTemperature + 1;
  const plotWidth = chartWidth - plot.left - plot.right;
  const plotHeight = chartHeight - plot.top - plot.bottom;
  const daySpacing = 76;
  const pointSpan = Math.min(plotWidth, daySpacing * Math.max(days.length - 1, 0));
  const barWidth = 14;
  const barGap = 4;
  const chartBottom = plot.top + plotHeight;
  const firstPointX = plot.left + barWidth + barGap / 2;
  const xFor = (index: number) => firstPointX + (pointSpan * index) / Math.max(days.length - 1, 1);
  const yFor = (temperature: number) => plot.top
    + ((maxTemperature - temperature) / (maxTemperature - minTemperature)) * plotHeight;
  const formatDay = (date: string) => new Intl.DateTimeFormat('en', {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

  return (
    <section className="card temperature-trend-card" aria-labelledby="temperature-trend-title">
      <div className="card-header">
        <div>
          <h2 className="card-title" id="temperature-trend-title">Weekly Temperature Trend - {countyName}</h2>
          <p className="temperature-trend-subtitle">Daily highs and lows, Monday to Sunday · °C</p>
        </div>
        <i className="fas fa-chart-line card-icon" aria-hidden="true"></i>
      </div>

      {error ? (
        <p role="status" className="temperature-trend-message">{error}</p>
      ) : !completeWeek ? (
        <p role="status" className="temperature-trend-message">Weekly temperature data is not available right now.</p>
      ) : (
        <>
          <div className="temperature-chart-legend" aria-label="Chart legend">
            <span><i className="temperature-legend-high" aria-hidden="true"></i> Daily high</span>
            <span><i className="temperature-legend-low" aria-hidden="true"></i> Daily low</span>
            <span className="temperature-chart-source">Model-based history and forecast · Open-Meteo</span>
          </div>
          <div className="temperature-trend-content">
            <div className="temperature-chart-scroll">
              <svg
                className="temperature-chart"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label={`Daily high and low temperatures for ${countyName}, Monday through Sunday`}
              >
                <desc>Daily high and low temperatures in Celsius by weekday. Orange bars show daily highs and green bars show daily lows.</desc>
                {Array.from({ length: 5 }, (_, index) => {
                  const value = maxTemperature - ((maxTemperature - minTemperature) * index) / 4;
                  const y = yFor(value);
                  return (
                    <g key={`grid-${index}`}>
                      <line x1={plot.left} x2={chartWidth - plot.right} y1={y} y2={y} className="temperature-grid-line" />
                      <text x={plot.left - 10} y={y + 4} textAnchor="end" className="temperature-axis-label">
                        {Math.round(value)}°
                      </text>
                    </g>
                  );
                })}
                {days.map((day, index) => (
                  <g key={day.date}>
                    <rect
                      x={xFor(index) - barWidth - barGap / 2}
                      y={yFor(day.high_c)}
                      width={barWidth}
                      height={chartBottom - yFor(day.high_c)}
                      rx="3"
                      className="temperature-bar-high"
                    >
                      <title>{`${formatDay(day.date)} high: ${day.high_c.toFixed(1)}°C`}</title>
                    </rect>
                    <rect
                      x={xFor(index) + barGap / 2}
                      y={yFor(day.low_c)}
                      width={barWidth}
                      height={chartBottom - yFor(day.low_c)}
                      rx="3"
                      className="temperature-bar-low"
                    >
                      <title>{`${formatDay(day.date)} low: ${day.low_c.toFixed(1)}°C`}</title>
                    </rect>
                    <text x={xFor(index)} y={chartHeight - 15} textAnchor="middle" className="temperature-axis-label">
                      {formatDay(day.date)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="temperature-summary">
              <h3 className="temperature-summary-title">Weekly summary</h3>
              <table className="temperature-summary-table">
                <thead>
                  <tr><th scope="col">Day</th><th scope="col">High</th><th scope="col">Low</th></tr>
                </thead>
                <tbody>
                  {days.map((day) => (
                    <tr key={day.date}>
                      <th scope="row">{formatDay(day.date)}</th>
                      <td className="temperature-summary-high">{Math.round(day.high_c)}°</td>
                      <td className="temperature-summary-low">{Math.round(day.low_c)}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default TemperatureTrendCard;
