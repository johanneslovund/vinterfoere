import { useState, useCallback, useRef } from 'react';
import { useWeatherGrid } from './hooks/useWeatherGrid';
import { MapView, MapToggles } from './components/MapView/MapView';
import { SearchPanel } from './components/SearchBar/SearchBar';
import { RouteReport } from './components/RouteReport/RouteReport';
import { LocationPanel } from './components/LocationPanel/LocationPanel';
import { fetchRoute, RouteResult } from './services/routeApi';
import { analyzeRoute, RouteAnalysis } from './services/routeAnalysis';
import { fetchTrafficFlow, TrafficFlow } from './services/trafficFlow';
import { reverseGeocode, nearestWeather } from './services/locationAnalysis';
import { generateLocalAnalysis, generateRouteAnalysis } from './services/localAnalysis';
import { fetchWebcams, Webcam } from './services/webcamService';
import { GridWeather } from './types/weather';
import './styles/global.css';

interface PanelState {
  lat: number
  lon: number
  locationName: string
  weather: GridWeather | null
  traffic: TrafficFlow | null
  aiText: string | null
  aiError: string | null
  aiLoading: boolean
}

export default function App() {
  const { data } = useWeatherGrid();

  const [toggles, setToggles] = useState<MapToggles>({
    traffic: true, vaer: false, fjell: false, elevation: false, webcam: false,
  });
  const [webcams, setWebcams]         = useState<Webcam[]>([]);
  const webcamsFetched = useRef(false);
  const [flyTarget, setFlyTarget]       = useState<{ lat: number; lon: number } | null>(null);
  const [routeResult, setRouteResult]     = useState<RouteResult | null>(null);
  const [routeAnalysis, setRouteAnalysis] = useState<RouteAnalysis | null>(null);
  const [routeAnalysisText, setRouteAnalysisText] = useState<string | undefined>(undefined);
  const [routeFrom, setRouteFrom] = useState<[number,number] | null>(null);
  const [routeTo,   setRouteTo]   = useState<[number,number] | null>(null);
  const [routeToName, setRouteToName] = useState('');
  const [panel, setPanel]               = useState<PanelState | null>(null);

  function onToggle(key: keyof MapToggles) {
    setToggles(t => ({ ...t, [key]: !t[key] }));
    // Lazy-load cameras on first webcam toggle
    if (key === 'webcam' && !webcamsFetched.current) {
      webcamsFetched.current = true;
      fetchWebcams().then(setWebcams).catch(() => {});
    }
  }

  const handleGpsRequest = useCallback((): Promise<[number, number] | null> =>
    new Promise(resolve => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        p => resolve([p.coords.latitude, p.coords.longitude]),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }), []);

  const handleRoute = useCallback(async (
    from: [number, number], to: [number, number],
    fromName = 'Start', toName = 'Mål'
  ) => {
    try {
      const result = await fetchRoute(from, to);
      setRouteResult(result);
      const mid = result.coordinates[Math.floor(result.coordinates.length / 2)];
      setFlyTarget({ lat: mid[0], lon: mid[1] });
      setRouteAnalysis(analyzeRoute(result.coordinates, data));
      setRouteAnalysisText(generateRouteAnalysis(fromName, toName, data, result.coordinates));
      setRouteFrom(from); setRouteTo(to); setRouteToName(toName);
    } catch { /* ignore */ }
  }, [data]);

  const handleClear = useCallback(() => {
    setRouteResult(null); setRouteAnalysis(null); setRouteAnalysisText(undefined);
    setRouteFrom(null); setRouteTo(null); setRouteToName('');
  }, []);

  // Map click → fetch location name, weather, traffic, AI analysis
  const handleMapClick = useCallback(async (lat: number, lon: number) => {
    const wx = nearestWeather(lat, lon, data);

    // Open panel immediately — analysis is local so no loading delay needed
    setPanel({
      lat, lon,
      locationName: `${lat.toFixed(3)}°N ${lon.toFixed(3)}°Ø`,
      weather: wx,
      traffic: null,
      aiText: null,
      aiError: null,
      aiLoading: true, // still show skeleton briefly while geocoding + traffic load
    });

    // Fetch location name + traffic in parallel
    const [name, traffic] = await Promise.all([
      reverseGeocode(lat, lon),
      fetchTrafficFlow(lat, lon),
    ]);

    // Generate analysis instantly — no API call needed
    const analysis = generateLocalAnalysis(name, wx, traffic);
    setPanel(p => p ? {
      ...p,
      locationName: name,
      traffic,
      aiText: analysis,
      aiError: null,
      aiLoading: false,
    } : null);
  }, [data]);

  return (
    <>
      <SearchPanel
        onRoute={handleRoute}
        onClear={handleClear}
        onGpsRequest={handleGpsRequest}
      />

      {routeResult && routeAnalysis && (
        <RouteReport
          analysis={routeAnalysis}
          route={routeResult}
          routeAnalysisText={routeAnalysisText}
          fromCoords={routeFrom}
          toCoords={routeTo}
          toName={routeToName}
          onClose={handleClear}
        />
      )}

      {panel && (
        <LocationPanel
          {...panel}
          aiLoading={panel.aiLoading}
          onClose={() => setPanel(null)}
        />
      )}

      <MapView
        data={data}
        toggles={toggles}
        onToggle={onToggle}
        flyTarget={flyTarget}
        routeResult={routeResult}
        onMapClick={handleMapClick}
        webcams={webcams}
      />
    </>
  );
}
