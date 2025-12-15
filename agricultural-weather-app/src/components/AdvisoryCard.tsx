import React from 'react';

interface AdvisoryCardProps {
  level: 'low' | 'medium' | 'high';
  advisories: string[];
}

const AdvisoryCard: React.FC<AdvisoryCardProps> = ({ level, advisories }) => {
  const getAdvisoryText = (level: string) => {
    switch (level) {
      case 'high':
        return 'Current conditions require immediate attention. Consider postponing field activities.';
      case 'medium':
        return 'Conditions require careful planning and monitoring.';
      default:
        return 'Favorable farming conditions.';
    }
  };

  const levelClass = `level-${level}`;
  const levelText = level.toUpperCase();

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Farm Advisory</h2>
        <i className="fas fa-clipboard-list card-icon"></i>
      </div>
      
      <div className={`advisory-level ${levelClass}`}>
        {levelText} ALERT
      </div>
      <p>{getAdvisoryText(level)}</p>
      
      <ul className="advisory-list">
        {advisories.map((advisory, index) => (
          <li key={index}>
            <i className="fas fa-info-circle"></i>
            {advisory}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdvisoryCard;