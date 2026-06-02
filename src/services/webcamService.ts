export interface Webcam {
  id: string        // e.g. "0529007_1"
  lat: number
  lon: number
  name: string      // station name
  road: string      // e.g. "E6"
  orientation: string
  imageUrl: string  // https://kamera.atlas.vegvesen.no/api/images/{id}
  videoUrl: string  // m3u8 stream (may be empty)
}

const API_URL =
  'https://road-weather-and-view.atlas.vegvesen.no' +
  '/weather-information/measurement-sites?sort=lastUpdated'

const HEADERS = {
  'X-System-ID': 'Vinterfoere',
  'Accept': 'application/vnd.svv.v1+json; charset=utf-8',
}

interface RawSite {
  id: string
  name: string
  location: {
    geometry: { coordinates: [number, number] }  // [lon, lat]
    road: { number: string }
  }
  cameras: Array<{
    id: string
    orientationDescription?: string
    stillImageUrl: string
    videoUrl?: string
  }>
}

export async function fetchWebcams(): Promise<Webcam[]> {
  const res = await fetch(API_URL, { headers: HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as { measurementSites: RawSite[] }
  const cameras: Webcam[] = []

  for (const site of data.measurementSites ?? []) {
    if (!site.cameras?.length) continue
    const [lon, lat] = site.location.geometry.coordinates
    if (lat < 50 || lat > 80) continue

    for (const cam of site.cameras) {
      if (!cam.stillImageUrl) continue
      cameras.push({
        id:          cam.id,
        lat, lon,
        name:        site.name,
        road:        site.location.road.number,
        orientation: cam.orientationDescription ?? '',
        imageUrl:    cam.stillImageUrl,
        videoUrl:    cam.videoUrl ?? '',
      })
    }
  }

  return cameras
}
