export interface Hazard {
  id: number
  lat: number
  lon: number
  type: 'speed_camera' | 'road_closure' | 'landslide'
  label: string
  emoji: string
}

const HEADERS = { 'X-Client': 'Vinterfoere', 'Accept': 'application/json' }
const BASE    = 'https://nvdbapiles.atlas.vegvesen.no/vegobjekter'

function parseLatLon(wkt: string): [number, number] | null {
  const m = wkt.match(/POINT(?:\s+Z)?\s*\(([^)]+)\)/)
  if (!m) return null
  const [a, b] = m[1].trim().split(/\s+/).map(parseFloat)
  const lat = (a >= 50 && a <= 80) ? a : b
  const lon = (a >= 50 && a <= 80) ? b : a
  if (lat < 50 || lat > 80) return null
  return [lat, lon]
}

async function fetchType(
  typeId: number,
  type: Hazard['type'],
  emoji: string,
  label: string,
  pages = 2
): Promise<Hazard[]> {
  const result: Hazard[] = []
  let url: string | null = `${BASE}/${typeId}?inkluder=geometri&srid=wgs84&antall=500`
  let page = 0

  while (url && page < pages) {
    page++
    try {
      const res = await fetch(url, { headers: HEADERS })
      if (!res.ok) break
      const data = await res.json() as {
        objekter: Array<{ id: number; geometri?: { wkt: string } }>
        metadata?: { neste?: { href: string } }
      }
      for (const obj of data.objekter ?? []) {
        const coords = parseLatLon(obj.geometri?.wkt ?? '')
        if (!coords) continue
        result.push({ id: obj.id, lat: coords[0], lon: coords[1], type, emoji, label })
      }
      url = data.metadata?.neste?.href ?? null
    } catch { break }
  }
  return result
}

export async function fetchHazards(): Promise<Hazard[]> {
  const [cameras, closures, landslides] = await Promise.all([
    fetchType(162, 'speed_camera',  '📸', 'Fartsovervåkning', 1),
    fetchType(607, 'road_closure',  '🚧', 'Vegsperring',       1),
    fetchType(445, 'landslide',     '⚠️', 'Skredfare',        1),
  ])
  return [...cameras, ...closures, ...landslides]
}
