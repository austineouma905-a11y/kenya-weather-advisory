import React from 'react';

interface FooterProps {
  onChangeApiKey: () => void;
}

const Footer: React.FC<FooterProps> = ({ onChangeApiKey }) => {
  return (
    <footer>
      <p>Kenya Agricultural Weather Advisory System &copy; {new Date().getFullYear()} | Demonstration Version</p>
      <div className="footer-links">
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          onChangeApiKey(); 
        }}>
          <i className="fas fa-key"></i> API Integration Info
        </a>
        <a href="https://www.weatherapi.com/" target="_blank" rel="noreferrer">
          <i className="fas fa-cloud"></i> WeatherAPI
        </a>
        <a href="#" onClick={(e) => { 
          e.preventDefault(); 
          alert('This is a demonstration version using sample data.'); 
        }}>
          <i className="fas fa-info-circle"></i> About Demo
        </a>
      </div>
    </footer>
  );
};

export default Footer;