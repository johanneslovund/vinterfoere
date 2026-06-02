import { useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import { useMap } from 'react-leaflet';
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

interface MapClickProps { onMapClick: (lat: number, lon: number) => void }
function MapClickHandler({ onMapClick }: MapClickProps) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

interface FlyToProps { target: { lat: number; lon: number } | null }
function FlyTo({ target }: FlyToProps) {
  const map = useMap();
  const prev = useRef<typeof target>(null);
  if (target && target !== prev.current) {
    prev.current = target;
    map.flyTo([target.lat, target.lon], 10, { duration: 1.4 });
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
  flyTarget: { lat: number; lon: number } | null;
  routeResult: RouteResult | null;
  onMapClick: (lat: number, lon: number) => void;
  webcams: Webcam[];
}

export function MapView({ data, toggles, onToggle, flyTarget, routeResult, onMapClick, webcams }: MapViewProps) {
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
