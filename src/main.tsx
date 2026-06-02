import React from 'react';
import ReactDOM from 'react-dom/client';
import L from 'leaflet';
// leaflet.heat is a legacy global plugin — expose L before it loads
(window as unknown as Record<string, unknown>).L = L;
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
