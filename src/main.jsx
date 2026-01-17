import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';
import { initSentry } from './sentry';
import './index.css';

// Initialize Sentry before rendering
initSentry();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);
