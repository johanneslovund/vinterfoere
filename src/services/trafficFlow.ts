const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY as string | undefined

export interface TrafficFlow {
  currentSpeed: number     // km/h
  freeFlowSpeed: number    // km/h
  confidence: number       // 0–1
  roadClosure: boolean
  congestionPct: number    // 0–100 % delay vs free flow
}

export async function fetchTrafficFlow(lat: number, lon: number): Promise<TrafficFlow | null> {
  if (!TOMTOM_KEY) return null
  try {
    const url =
      `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json` +
      `?key=${TOMTOM_KEY}&point=${lat.toFixed(5)},${lon.toFixed(5)}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json() as {
      flowSegmentData: {
        currentSpeed: number
        freeFlowSpeed: number
        confidence: number
        roadClosure: boolean
      }
    }
    const d = data.flowSegmentData
    const congestionPct = d.freeFlowSpeed > 0
      ? Math.max(0, Math.round((1 - d.currentSpeed / d.freeFlowSpeed) * 100))
      : 0
    return { ...d, congestionPct }
  } catch {
    return null
  }
}
