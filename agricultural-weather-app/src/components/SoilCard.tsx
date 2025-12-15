import React from 'react';

interface SoilCardProps {
  soilMoisture: number;
  condition: string;
  advisories: string[];
}

const SoilCard: React.FC<SoilCardProps> = ({ soilMoisture, condition, advisories }) => {
  let moistureStatus = '';
  if (soilMoisture > 80) moistureStatus = 'Saturated';
  else if (soilMoisture > 60) moistureStatus = 'Optimal';
  else if (soilMoisture > 40) moistureStatus = 'Moderately Dry';
  else moistureStatus = 'Dry';

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Soil Conditions</h2>
        <i className="fas fa-mountain card-icon"></i>
      </div>
      
      <div className="detail-item" style={{ marginBottom: '1rem' }}>
        <i className="fas fa-tint detail-icon"></i>
        <div className="detail-value">{soilMoisture}%</div>
        <div className="detail-label">Soil Moisture ({moistureStatus})</div>
      </div>
      
      <p>{condition}</p>
      
      <div className="advisory-list" style={{ marginTop: '1rem' }}>
        {advisories.map((advisory, index) => (
          <li key={index}>
            <i className="fas fa-info-circle"></i>
            {advisory}
          </li>
        ))}
      </div>
    </div>
  );
};

export default SoilCard;