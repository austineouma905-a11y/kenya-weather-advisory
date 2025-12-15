import React from 'react';

interface Alert {
  headline: string;
  description: string;
  severity: string;
}

interface AlertCardProps {
  alerts: Alert[];
}

const AlertCard: React.FC<AlertCardProps> = ({ alerts }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="card alert-card">
      <div className="card-header">
        <h2 className="card-title alert-header">Weather Alerts</h2>
        <i className="fas fa-exclamation-triangle card-icon"></i>
      </div>
      
      <div>
        {alerts.map((alert, index) => (
          <div key={index} className="alert-item">
            <i className="fas fa-exclamation-circle alert-icon"></i>
            <div className="alert-content">
              <h4>{alert.headline}</h4>
              <p>{alert.description}</p>
              <small>Severity: {alert.severity}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertCard;