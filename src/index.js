import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ReactGA from 'react-ga4'; // ✅ Import Google Analytics

// Initialize Google Analytics with environment variable
ReactGA.initialize(process.env.REACT_APP_GA_MEASUREMENT_ID || 'G-H6E1B7PZPM');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
