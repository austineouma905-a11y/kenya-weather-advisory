import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer>
      <p>&copy; {new Date().getFullYear()} Kenya Agricultural Weather Advisory · @OSTO254</p>
      <div className="footer-links">
        <a href="https://openweathermap.org/" target="_blank" rel="noreferrer">
          Weather data: OpenWeather
        </a>
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          UV estimate: Open-Meteo
        </a>
      </div>
    </footer>
  );
};

export default Footer;
