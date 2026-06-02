import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { GridWeather } from '../../types/weather';

function riskToColor(score: number): string {
  if (score < 0.25) return '#2196f3';
  if (score < 0.5) return '#66bb6a';
  if (score < 0.75) return '#ff9800';
  return '#f44336';
}

// Canvas-based circles for guaranteed visibility — avoids SVG z-index quirks
export function HeatmapLayer({ data }: { data: GridWeather[] }) {
  const map = useMap();
  const rendererRef = useRef<L.Canvas | null>(null);
  const layersRef = useRef<L.CircleMarker[]>([]);

  useEffect(() => {
    if (!rendererRef.current) {
      rendererRef.current = L.canvas({ padding: 0.5 });
    }
    const renderer = rendererRef.current;

    // Remove old circles
    layersRef.current.forEach((c) => map.removeLayer(c));
    layersRef.current = [];

    if (data.length === 0) return;

    data.forEach((w) => {
      const color = riskToColor(w.riskScore);
      const circle = L.circleMarker([w.lat, w.lon], {
        renderer,
        radius: 55,
        fillColor: color,
        fillOpacity: 0.38,
        color: color,
        weight: 1,
        opacity: 0.15,
      });
      circle.addTo(map);
      layersRef.current.push(circle);
    });

    return () => {
      layersRef.current.forEach((c) => map.removeLayer(c));
      layersRef.current = [];
    };
  }, [data, map]);

  return null;
}
