import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/App.css';
import App from './App';

// Add Font Awesome CDN
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
document.head.appendChild(link);

// Add Google Fonts
const fontLink1 = document.createElement('link');
fontLink1.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500&display=swap';
fontLink1.rel = 'stylesheet';
document.head.appendChild(fontLink1);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);