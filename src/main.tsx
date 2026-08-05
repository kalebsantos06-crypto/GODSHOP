import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Force template update for Karen and Pix
const templateKeys = [
  'auto_template_3_days', 'auto_template_day_of', 'auto_template_overdue',
  'auto_template_registration', 'auto_template_order_confirmed', 'auto_template_order_preparing',
  'auto_template_order_ready', 'auto_template_order_on_way', 'auto_template_order_delivered',
  'auto_template_guarantee_sent', 'auto_template_order_thank_you'
];
templateKeys.forEach(key => {
  const val = localStorage.getItem(key);
  if (val && !val.includes('Karen')) {
    localStorage.removeItem(key);
  }
});

// Intercept and suppress benign HMR / WebSocket errors that may cause screen overlays or crashes
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const isWebSocketError = reason && (
      String(reason).includes('WebSocket') || 
      String(reason).includes('websocket') ||
      String(reason.message).includes('WebSocket') ||
      String(reason.message).includes('websocket')
    );
    if (isWebSocketError) {
      event.preventDefault();
      console.warn('Suppressing unhandled WebSocket rejection:', reason);
    }
  });

  window.addEventListener('error', (event) => {
    const isWebSocketError = event.message && (
      event.message.includes('WebSocket') || 
      event.message.includes('websocket')
    );
    if (isWebSocketError) {
      event.preventDefault();
      console.warn('Suppressing unhandled WebSocket error:', event.message);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


