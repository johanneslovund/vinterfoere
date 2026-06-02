export interface GeoResult {
  displayName: string;
  shortName: string;
  lat: number;
  lon: number;
}

export async function searchLocations(query: string): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '6',
    countrycodes: 'no',
    'accept-language': 'no',
    addressdetails: '1',
  });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { 'User-Agent': 'Vinterføre/1.0' } }
  );
  const data = await res.json() as Array<{
    display_name: string;
    address?: { road?: string; city?: string; town?: string; village?: string; municipality?: string };
    lat: string;
    lon: string;
  }>;
  return data.map((r) => {
    const a = r.address ?? {};
    const short = a.road ?? a.city ?? a.town ?? a.village ?? a.municipality ?? r.display_name.split(',')[0];
    return {
      displayName: r.display_name,
      shortName: short,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    };
  });
}
