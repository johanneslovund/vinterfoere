export interface GeoResult {
  displayName: string;
  shortName: string;
  lat: number;
  lon: number;
}

// Entur geocoder — Norwegian-optimised, instant autocomplete, no key needed
export async function searchLocations(query: string): Promise<GeoResult[]> {
  if (query.trim().length < 1) return [];
  const params = new URLSearchParams({
    text:   query,
    size:   '8',
    lang:   'no',
  });
  const res = await fetch(
    `https://api.entur.io/geocoder/v1/autocomplete?${params}`,
    { headers: { 'ET-Client-Name': 'Vinterfoere-App' } }
  );
  if (!res.ok) return [];
  const data = await res.json() as {
    features: Array<{
      geometry: { coordinates: [number, number] };
      properties: {
        id?: string;
        name?: string;
        label?: string;
        locality?: string;
        county?: string;
      };
    }>;
  };
  return data.features.map(f => {
    const p = f.properties;
    const [lon, lat] = f.geometry.coordinates;
    return {
      displayName: p.label ?? p.name ?? '',
      shortName:   p.name ?? p.label?.split(',')[0] ?? '',
      lat,
      lon,
    };
  });
}
