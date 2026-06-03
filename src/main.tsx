import React from 'react';
import ReactDOM from 'react-dom/client';
import L from 'leaflet';
(window as unknown as Record<string, unknown>).L = L;
import 'leaflet-rotate';   // patches L.Map with setBearing / touchRotate
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
