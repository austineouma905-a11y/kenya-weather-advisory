import React from 'react';
import { SoilMoistureData } from '../data/types';

interface SoilCardProps {
  data: SoilMoistureData | null;
  error: string | null;
}

const SoilCard: React.FC<SoilCardProps> = ({ data, error }) => {
  const layers = data ? [
    { label: 'Surface soil · 0–7 cm', value: data.surface_m3_m3 },
    { label: 'Upper root zone · 7–28 cm', value: data.upper_root_m3_m3 },
    { label: 'Deeper root zone · 28–100 cm', value: data.lower_root_m3_m3 },
  ].filter((layer): layer is { label: string; value: number } => layer.value !== null) : [];
  const measuredAt = data?.timestamp
    ? new Intl.DateTimeFormat('en-KE', {
      timeZone: 'Africa/Nairobi',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(data.timestamp))
    : null;

  return (
    <div className="card soil-card">
      <div className="card-header">
        <h2 className="card-title">Modelled Soil Water</h2>
        <i className="fas fa-mountain card-icon" aria-hidden="true"></i>
      </div>

      {error ? (
        <p role="status" className="soil-data-message">Soil-water model data is unavailable: {error}</p>
      ) : layers.length ? (
        <>
          <div className="soil-layer-list">
            {layers.map(({ label, value }) => (
              <div className="soil-layer" key={label}>
                <span>{label}</span>
                <strong>{value.toFixed(3)} m³/m³</strong>
              </div>
            ))}
          </div>
          <p className="soil-data-note">
            Modelled volumetric water content, not a farm sensor reading. Values vary with soil type and local field conditions; use a field check before deciding to irrigate.
          </p>
          <p className="soil-data-source">Source: Open-Meteo weather model{measuredAt ? ` · Updated ${measuredAt} EAT` : ''}</p>
        </>
      ) : (
        <p role="status" className="soil-data-message">Loading modelled soil-water data…</p>
      )}
    </div>
  );
};

export default SoilCard;
