import { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GridWeather, riskLevel, RISK_COLORS, RISK_LABELS } from '../../types/weather';
import { CanvasHeatmapLayer } from './CanvasHeatmapLayer';
import { TrafficLayer } from './TrafficLayer';
import { RouteLayer } from './RouteLayer';
import { MountainPassLayer } from './MountainPassLayer';
import { RainViewerLayer } from './RainViewerLayer';
import { ElevationOverlayLayer } from './ElevationOverlayLayer';
import { WebcamLayer } from './WebcamLayer';
import { Webcam } from '../../services/webcamService';
import { Legend } from '../Legend/Legend';
import { ElevationLegend } from '../Legend/ElevationLegend';
import { WeatherLegend } from '../Legend/WeatherLegend';
import { RouteResult } from '../../services/routeApi';
import './MapView.css';

const isTouchDevice = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

interface MapClickProps { onMapClick: (lat: number, lon: number) => void }
function MapClickHandler({ onMapClick }: MapClickProps) {
  useMapEvents({
    // Desktop: regular click
    click(e) {
      if (!isTouchDevice()) onMapClick(e.latlng.lat, e.latlng.lng);
    },
    // Mobile/tablet: long press fires contextmenu in Leaflet
    contextmenu(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Red pin marker for selected location — uses a custom DivIcon via imperative Leaflet
function PinMarker({ lat, lon }: { lat: number; lon: number }) {
  const map   = useMap();
  const ref   = useRef<L.Marker | null>(null);

  useEffect(() => {
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:20px;height:26px;
        background:linear-gradient(145deg,#ff5555,#cc0000);
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 3px 12px rgba(0,0,0,0.55);
        border:2px solid rgba(255,255,255,0.7);
      "></div>`,
      iconSize:   [20, 26],
      iconAnchor: [10, 26],
    });
    const marker = L.marker([lat, lon], { icon }).addTo(map);
    ref.current = marker;
    return () => { marker.remove(); };
  }, [lat, lon, map]);

  return null;
}

interface FlyToProps {
  target: { lat: number; lon: number; zoom?: number; duration?: number } | null;
}
function FlyTo({ target }: FlyToProps) {
  const map = useMap();
  const prev = useRef<typeof target>(null);
  if (target && target !== prev.current) {
    prev.current = target;
    map.flyTo(
      [target.lat, target.lon],
      target.zoom ?? 10,
      { duration: target.duration ?? 1.4 }
    );
  }
  return null;
}

export interface MapToggles {
  traffic: boolean;
  vaer: boolean;
  fjell: boolean;
  elevation: boolean;
  webcam: boolean;
}

interface MapViewProps {
  data: GridWeather[];
  toggles: MapToggles;
  onToggle: (key: keyof MapToggles) => void;
  flyTarget: { lat: number; lon: number; zoom?: number; duration?: number } | null;
  routeResult: RouteResult | null;
  onMapClick: (lat: number, lon: number) => void;
  webcams: Webcam[];
  pinLocation: { lat: number; lon: number } | null;
}

export function MapView({ data, toggles, onToggle, flyTarget, routeResult, onMapClick, webcams, pinLocation }: MapViewProps) {
  return (
    <div className="map-container">
      <MapContainer center={[65.0, 15.0]} zoom={5}
        style={{ height: '100%', width: '100%' }} zoomControl>
        <MapClickHandler onMapClick={onMapClick} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19} subdomains="abcd"
        />

        {toggles.elevation && <ElevationOverlayLayer data={data} />}
        <TrafficLayer visible={toggles.traffic} />
        <CanvasHeatmapLayer data={data} />
        {toggles.vaer  && <RainViewerLayer />}
        {toggles.fjell  && <MountainPassLayer gridData={data} />}
        {toggles.webcam && <WebcamLayer cameras={webcams} />}
{routeResult && <RouteLayer coordinates={routeResult.coordinates} gridData={data} />}

        {data.map((w) => {
          const level = riskLevel(w.riskScore);
          return (
            <CircleMarker key={`${w.lat},${w.lon}`} center={[w.lat, w.lon]} radius={5}
              pathOptions={{ fillColor: RISK_COLORS[level], fillOpacity: 0.9, color: '#000', weight: 1 }}>
              <Tooltip className="vf-tooltip">
                <strong>{w.name}</strong><br />
                {RISK_LABELS[level]} — {(w.riskScore * 100).toFixed(0)}% risiko<br />
                {w.airTemperature > 0 ? '+' : ''}{w.airTemperature.toFixed(1)}°C
                &nbsp;·&nbsp;{w.windSpeed.toFixed(0)} m/s
                {w.precipitationAmount > 0 && <> · {w.precipitationAmount.toFixed(1)} mm</>}
              </Tooltip>
            </CircleMarker>
          );
        })}

        {pinLocation && <PinMarker lat={pinLocation.lat} lon={pinLocation.lon} />}
        <FlyTo target={flyTarget} />
      </MapContainer>

      {/* Toggle strip */}
      <div className="map-toggles">
        <button
          className={`map-toggle-btn${toggles.traffic ? ' map-toggle-btn--active' : ''}`}
          onClick={() => onToggle('traffic')}>
          {toggles.traffic ? 'Skjul trafikk' : 'Trafikk'}
        </button>
        <button
          className={`map-toggle-btn${toggles.vaer ? ' map-toggle-btn--active' : ''}`}
          onClick={() => onToggle('vaer')}>
          Vær
        </button>
        <button
          className={`map-toggle-btn${toggles.fjell ? ' map-toggle-btn--active' : ''}`}
          onClick={() => onToggle('fjell')}>
          Fjelloverganger
        </button>
        <button
          className={`map-toggle-btn${toggles.elevation ? ' map-toggle-btn--active' : ''}`}
          onClick={() => onToggle('elevation')}>
          Høydekart
        </button>
        <button
          className={`map-toggle-btn${toggles.webcam ? ' map-toggle-btn--active' : ''}`}
          onClick={() => onToggle('webcam')}>
          Webcam
        </button>
      </div>

      {toggles.vaer      && <WeatherLegend  offset={false} />}
      {toggles.elevation && <ElevationLegend offset={toggles.vaer} />}
      <Legend />
    </div>
  );
}
