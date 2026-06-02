export type WarningSeverity = 'Moderate' | 'Severe' | 'Extreme';

export interface WeatherWarning {
  id: string;
  title: string;
  description: string;
  severity: WarningSeverity;
  awarenessType: string;
  from: string;
  to: string;
  coordinates: number[][][]; // GeoJSON polygon rings
}

const SEVERITY_COLOR: Record<WarningSeverity, string> = {
  Moderate: '#ffeb3b',
  Severe:   '#ff9800',
  Extreme:  '#f44336',
};

export function warningColor(severity: WarningSeverity) {
  return SEVERITY_COLOR[severity] ?? '#ffeb3b';
}

export async function fetchWeatherWarnings(): Promise<WeatherWarning[]> {
  const res = await fetch(
    'https://api.met.no/weatherapi/metalerts/2.0/all.json?lang=no'
  );
  if (!res.ok) return [];

  const geojson = await res.json() as {
    features: Array<{
      properties: {
        id: string;
        title: string;
        description: string;
        severity: string;
        awareness_type: string;
        interval: [string, string];
      };
      geometry: {
        type: string;
        coordinates: number[][][] | number[][][][];
      } | null;
    }>;
  };

  return geojson.features
    .filter((f) => f.geometry !== null)
    .map((f) => {
      const p = f.properties;
      const coords =
        f.geometry!.type === 'MultiPolygon'
          ? (f.geometry!.coordinates as number[][][][])[0]
          : (f.geometry!.coordinates as number[][][]);

      return {
        id: p.id,
        title: p.title ?? '',
        description: p.description ?? '',
        severity: (p.severity as WarningSeverity) ?? 'Moderate',
        awarenessType: p.awareness_type ?? '',
        from: p.interval?.[0] ?? '',
        to: p.interval?.[1] ?? '',
        coordinates: coords,
      };
    });
}
