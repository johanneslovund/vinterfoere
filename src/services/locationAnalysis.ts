import { GridWeather, riskLevel, RISK_LABELS } from '../types/weather'
import { TrafficFlow } from './trafficFlow'

function nearestWeather(lat: number, lon: number, grid: GridWeather[]): GridWeather | null {
  if (!grid.length) return null
  let best = grid[0], bestD = Infinity
  for (const w of grid) {
    const d = Math.hypot(w.lat - lat, w.lon - lon)
    if (d < bestD) { bestD = d; best = w }
  }
  return best
}

function buildPrompt(
  lat: number,
  lon: number,
  locationName: string,
  wx: GridWeather | null,
  traffic: TrafficFlow | null
): string {
  const wxBlock = wx ? `
Temperatur: ${wx.airTemperature.toFixed(1)}°C
Vind: ${wx.windSpeed.toFixed(0)} m/s
Nedbør: ${wx.precipitationAmount.toFixed(1)} mm
Værsymbol: ${wx.symbolCode}
Risikoscore: ${(wx.riskScore * 100).toFixed(0)} % (${RISK_LABELS[riskLevel(wx.riskScore)]})` : 'Ingen værdata tilgjengelig'

  const trafficBlock = traffic ? `
Gjeldende hastighet: ${traffic.currentSpeed} km/t
Fri-flyt hastighet: ${traffic.freeFlowSpeed} km/t
Forsinkelse vs normaltrafikk: ${traffic.congestionPct} %
Veisperring: ${traffic.roadClosure ? 'Ja' : 'Nei'}
Tillit til data: ${(traffic.confidence * 100).toFixed(0)} %` : 'Ingen trafikkdata tilgjengelig'

  return `Du er en norsk vegvesen-ekspert og vurderingsanalytiker for vinterføre.

Analyser kjøreforholdene på dette stedet og gi en kortfattet, nyttig analyse på norsk.

STED: ${locationName} (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°Ø)

VÆRFORHOLD:${wxBlock}

TRAFIKKFORHOLD:${trafficBlock}

Gi en analyse med disse delene (kort og presis):
1. **Overordnet vurdering** – er det trygt å kjøre? (1-2 setninger)
2. **Viktigste risikoer** – hva sjåfører bør være oppmerksomme på (2-3 punkter)
3. **Anbefaling** – konkret råd til bilistene (1 setning)

Svar BARE med analysen, ingen innledning.`
}

export interface LocationAnalysis {
  locationName: string
  weather: GridWeather | null
  traffic: TrafficFlow | null
  aiText: string | null
  aiError: string | null
  loading: boolean
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=no`,
      { headers: { 'User-Agent': 'Vinterføre/1.0' } }
    )
    const data = await res.json() as {
      address?: { road?: string; city?: string; town?: string; village?: string; county?: string }
      display_name?: string
    }
    const a = data.address ?? {}
    return a.road ?? a.city ?? a.town ?? a.village ?? a.county ?? data.display_name?.split(',')[0] ?? 'Ukjent sted'
  } catch {
    return `${lat.toFixed(3)}°N, ${lon.toFixed(3)}°Ø`
  }
}

export async function fetchAiAnalysis(
  lat: number,
  lon: number,
  locationName: string,
  wx: GridWeather | null,
  traffic: TrafficFlow | null
): Promise<{ text: string | null; error: string | null }> {
  const prompt = buildPrompt(lat, lon, locationName, wx, traffic)
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const data = await res.json() as { analysis?: string; error?: string }
    if (!res.ok || data.error) return { text: null, error: data.error ?? 'Ukjent feil' }
    return { text: data.analysis ?? '', error: null }
  } catch (e) {
    return { text: null, error: String(e) }
  }
}

export { nearestWeather, buildPrompt }
