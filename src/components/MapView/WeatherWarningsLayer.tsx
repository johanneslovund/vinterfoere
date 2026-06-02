import { useEffect, useState } from 'react';
import { Polygon, Tooltip } from 'react-leaflet';
import { fetchWeatherWarnings, WeatherWarning, warningColor } from '../../services/weatherWarnings';

export function WeatherWarningsLayer() {
  const [warnings, setWarnings] = useState<WeatherWarning[]>([]);

  useEffect(() => {
    fetchWeatherWarnings().then(setWarnings).catch(() => {});
    const id = setInterval(() => {
      fetchWeatherWarnings().then(setWarnings).catch(() => {});
    }, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {warnings.map((w) =>
        w.coordinates.map((ring, ri) => {
          const positions = ring.map(([lng, lat]) => [lat, lng] as [number, number]);
          const color = warningColor(w.severity);
          return (
            <Polygon
              key={`${w.id}-${ri}`}
              positions={positions}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.12,
                weight: 1.5,
                opacity: 0.7,
                dashArray: '4 4',
              }}
            >
              <Tooltip className="vf-tooltip" sticky>
                <strong>{w.title}</strong><br />
                {w.description}
              </Tooltip>
            </Polygon>
          );
        })
      )}
    </>
  );
}
