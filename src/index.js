import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ReactGA from 'react-ga4'; // ✅ Import Google Analytics

// Initialize Google Analytics with your Measurement ID
ReactGA.initialize('G-H6E1B7PZPM'); // Replace with your actual Measurement ID

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
