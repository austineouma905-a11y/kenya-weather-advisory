import React from 'react';
import { CROP_DATA } from '../data/cropData';
import { TOP_CROP_PRODUCING_COUNTIES } from '../data/cropProduction';

interface CropScore {
  crop: string;
  score: number;
}

interface CropSuitabilityChartProps {
  cropScores: CropScore[];
}

const CropSuitabilityChart: React.FC<CropSuitabilityChartProps> = ({ cropScores }) => {
  const colors = ['#2f7d32', '#e08a32', '#3977b8', '#9b59a5', '#d65353'];
  const entries = cropScores
    .filter((entry) => Boolean(CROP_DATA[entry.crop]))
    .map((entry, index) => ({ ...entry, score: Math.max(0, entry.score), color: colors[index % colors.length] }));
  const totalScore = entries.reduce((total, entry) => total + entry.score, 0);
  let accumulatedPercent = 0;
  const segments = entries.map((entry) => {
    const start = accumulatedPercent;
    accumulatedPercent += totalScore ? (entry.score / totalScore) * 100 : 0;
    return `${entry.color} ${start}% ${accumulatedPercent}%`;
  });

  return (
    <section className="card crop-suitability-chart" aria-labelledby="crop-suitability-title">
      <div>
        <h2 className="card-title" id="crop-suitability-title">Crop Suitability Distribution</h2>
        <p>Share of combined weather suitability scores, not production volume.</p>
      </div>
      {totalScore > 0 ? (
        <div className="crop-pie-layout">
          <div
            className="crop-pie-chart"
            role="img"
            aria-label={`Crop suitability score distribution: ${entries.map((entry) => `${entry.crop} ${Math.round((entry.score / totalScore) * 100)} percent`).join(', ')}`}
            style={{ background: `conic-gradient(${segments.join(', ')})` }}
          />
          <ul className="crop-pie-legend">
            {entries.map((entry) => (
              <li key={entry.crop}>
                <span className="crop-pie-key" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                <span>{entry.crop}</span>
                <strong>{Math.round((entry.score / totalScore) * 100)}%</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="crop-pie-empty">Crop suitability data is not available right now.</p>
      )}
      <section className="crop-production-section" aria-labelledby="crop-production-title">
        <div className="crop-production-heading">
          <h3 id="crop-production-title">Top producing counties</h3>
          <p>Reported annual production for the leading counties in each crop.</p>
        </div>
        <div className="crop-production-grid">
          {Object.entries(TOP_CROP_PRODUCING_COUNTIES).map(([crop, record]) => (
            <article className="crop-production-item" key={crop}>
              <h4>{crop}</h4>
              <p className="crop-production-period">{record.period}</p>
              <ol>
                {record.counties.map(({ county, tonnes }) => (
                  <li key={county}>
                    <span>{county}</span>
                    <strong>{tonnes.toLocaleString('en-KE', { maximumFractionDigits: 1 })} t</strong>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
        <a
          className="crop-production-source"
          href="https://statistics.kilimo.go.ke/files/bookpage/National_Agriculture_Production_Report_2023-2024.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Source: Ministry of Agriculture and Livestock Development, National Agriculture Production Report 2023–2024
        </a>
      </section>
    </section>
  );
};

export default CropSuitabilityChart;
