import React, { useState, useEffect } from 'react';

interface HeaderProps {
  onSubscribe: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSubscribe }) => {
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      // Format date
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const dateString = now.toLocaleDateString('en-KE', options);
      setCurrentDate(dateString);
      
      // Format time
      const timeString = now.toLocaleTimeString('en-KE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      setCurrentTime(timeString + ' EAT');
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <header>
      <div className="logo">
        <i className="fas fa-seedling logo-icon"></i>
        <div className="logo-text">
          <h1>Kenya Agricultural Weather Advisory</h1>
          <p>Weather insights for farmers</p>
        </div>
      </div>
      <div className="date-display">
        <div className="current-date">{currentDate}</div>
        <div className="current-time">{currentTime}</div>
        <button className="subscribe-btn" onClick={onSubscribe}>
          <i className="fas fa-bell"></i>
          Subscribe to Alerts
        </button>
      </div>
    </header>
  );
};

export default Header;
