import React from 'react';

interface FooterProps {
  onChangeApiKey: () => void;
}

const Footer: React.FC<FooterProps> = ({ onChangeApiKey }) => {
  return (
    <footer>
      <p>Kenya Agricultural Weather Advisory System &copy; {new Date().getFullYear()}</p>
      <div className="footer-links">
        <button type="button" onClick={onChangeApiKey}>
          <i className="fas fa-key"></i> API Integration Info
        </button>
        <a href="https://www.weatherapi.com/" target="_blank" rel="noreferrer">
          <i className="fas fa-cloud"></i> WeatherAPI
        </a>
        <button type="button" onClick={() => alert('This is a demonstration version using sample data.')}>
          <i className="fas fa-info-circle"></i> About Demo
        </button>
      </div>
    </footer>
  );
};

export default Footer;
