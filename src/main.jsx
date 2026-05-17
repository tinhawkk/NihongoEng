import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

// Global error suppressor for third-party extensions
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message === 'Failed to fetch') {
    // Suppress red console errors caused by extensions like AdBlock/IDM blocking the request
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
