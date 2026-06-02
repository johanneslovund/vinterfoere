import { GridWeather, riskLevel, RiskLevel, RISK_LABELS } from '../types/weather';

export interface DangerSpot {
  name: string;
  riskScore: number;
  level: RiskLevel;
  airTemperature: number;
  symbolCode: string;
  windSpeed: number;
}

export interface RouteAnalysis {
  overallLevel: RiskLevel;
  overallScore: number;
  overallLabel: string;
  dangerSpots: DangerSpot[];
  tempMin: number;
  tempMax: number;
  hasSnow: boolean;
  hasSleet: boolean;
  hasIceRisk: boolean;
  recommendation: string;
}

const RECOMMENDATION: Record<RiskLevel, string> = {
  trygt:     'Gode kjøreforhold. Ha alltid vinterdekk.',
  forsiktig: 'Kjør forsiktig. Lavere fart kan være nødvendig.',
  advarsel:  'Vær ekstra forsiktig. Vurder å utsette reisen.',
  farlig:    'Frarådes å kjøre. Vent til forholdene bedres.',
};

export function analyzeRoute(
  routeCoords: [number, number][],
  gridData: GridWeather[]
): RouteAnalysis | null {
  if (routeCoords.length === 0 || gridData.length === 0) return null;

  // Sample route every ~10th point to keep it fast
  const sample = routeCoords.filter((_, i) => i % 10 === 0);

  // For each grid point, check if it's within ~60 km of the route
  const nearby: GridWeather[] = [];
  for (const w of gridData) {
    const close = sample.some(([lat, lon]) => {
      const dLat = w.lat - lat;
      const dLon = w.lon - lon;
      return Math.sqrt(dLat * dLat + dLon * dLon) < 0.55; // ~55 km
    });
    if (close) nearby.push(w);
  }

  if (nearby.length === 0) return null;

  const sorted = [...nearby].sort((a, b) => b.riskScore - a.riskScore);
  const maxScore = sorted[0].riskScore;
  const avgScore = nearby.reduce((s, w) => s + w.riskScore, 0) / nearby.length;
  const compositeScore = maxScore * 0.6 + avgScore * 0.4;

  const dangerSpots: DangerSpot[] = sorted
    .filter((w) => w.riskScore > 0.35)
    .slice(0, 4)
    .map((w) => ({
      name: w.name,
      riskScore: w.riskScore,
      level: riskLevel(w.riskScore),
      airTemperature: w.airTemperature,
      symbolCode: w.symbolCode,
      windSpeed: w.windSpeed,
    }));

  const temps = nearby.map((w) => w.airTemperature);
  const hasSnow  = nearby.some((w) => w.symbolCode.includes('snow'));
  const hasSleet = nearby.some((w) => w.symbolCode.includes('sleet'));
  const hasIceRisk = nearby.some(
    (w) => w.airTemperature < 2 && w.precipitationAmount > 0
  );

  const level = riskLevel(compositeScore);

  return {
    overallLevel: level,
    overallScore: compositeScore,
    overallLabel: RISK_LABELS[level],
    dangerSpots,
    tempMin: Math.min(...temps),
    tempMax: Math.max(...temps),
    hasSnow,
    hasSleet,
    hasIceRisk,
    recommendation: RECOMMENDATION[level],
  };
}
