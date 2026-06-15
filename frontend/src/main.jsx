import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Global Fetch Interceptor to handle expired or invalid authentication tokens (auto-logout)
const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401 || response.status === 403) {
    const url = args[0];
    if (typeof url === 'string' && (url.startsWith('/api') || url.includes('/api/'))) {
      console.warn('Authentication token invalid or expired. Logging out...');
      localStorage.removeItem('token');
      localStorage.removeItem('gym_token');
      localStorage.removeItem('user');
      localStorage.removeItem('loginTime');
      window.location.reload();
    }
  }
  return response;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
