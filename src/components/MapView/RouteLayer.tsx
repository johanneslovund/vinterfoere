import { Polyline } from 'react-leaflet';
import { GridWeather, riskLevel, RISK_COLORS } from '../../types/weather';

function nearestRiskScore(lat: number, lon: number, grid: GridWeather[]): number {
  if (grid.length === 0) return 0;
  let minDist = Infinity;
  let score = 0;
  for (const w of grid) {
    const d = Math.hypot(w.lat - lat, w.lon - lon);
    if (d < minDist) { minDist = d; score = w.riskScore; }
  }
  return score;
}

interface Segment {
  coords: [number, number][];
  color: string;
}

function buildSegments(coords: [number, number][], grid: GridWeather[]): Segment[] {
  if (coords.length < 2) return [];
  const segments: Segment[] = [];
  let current: [number, number][] = [coords[0]];
  let currentLevel = riskLevel(nearestRiskScore(coords[0][0], coords[0][1], grid));

  for (let i = 1; i < coords.length; i++) {
    const level = riskLevel(nearestRiskScore(coords[i][0], coords[i][1], grid));
    if (level !== currentLevel) {
      segments.push({ coords: [...current], color: RISK_COLORS[currentLevel] });
      current = [coords[i - 1], coords[i]];
      currentLevel = level;
    } else {
      current.push(coords[i]);
    }
  }
  segments.push({ coords: current, color: RISK_COLORS[currentLevel] });
  return segments;
}

interface RouteLayerProps {
  coordinates: [number, number][];
  gridData: GridWeather[];
}

export function RouteLayer({ coordinates, gridData }: RouteLayerProps) {
  if (coordinates.length === 0 || gridData.length === 0) return null;
  const segments = buildSegments(coordinates, gridData);

  return (
    <>
      {/* Drop shadow */}
      <Polyline
        positions={coordinates}
        pathOptions={{ color: '#000', weight: 10, opacity: 0.35 }}
      />
      {/* Colored risk segments */}
      {segments.map((seg, i) => (
        <Polyline
          key={i}
          positions={seg.coords}
          pathOptions={{ color: seg.color, weight: 6, opacity: 0.95 }}
        />
      ))}
    </>
  );
}
