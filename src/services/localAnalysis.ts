import { GridWeather, riskLevel } from '../types/weather'
import { TrafficFlow } from './trafficFlow'

// Norway winter tyre season: Nov 1 → first Sunday after Easter (approx. late March–late April).
// Practically: month 11–12 and month 1–4 are winter season; May–Oct are summer.
function isWinterTyreSeason(): boolean {
  const m = new Date().getMonth() + 1 // 1-12
  return m <= 4 || m >= 11
}

function tempDesc(t: number): string {
  if (t > 5)   return 'mildt'
  if (t > 1)   return 'kjølig'
  if (t > -1)  return 'rundt frysepunktet'
  if (t > -5)  return 'kaldt'
  if (t > -10) return 'bittert kaldt'
  return 'ekstremkaldt'
}

function windDesc(w: number): string {
  if (w > 20) return 'sterk storm'
  if (w > 15) return 'sterk vind'
  if (w > 10) return 'frisk bris'
  if (w > 5)  return 'moderat vind'
  return 'svak vind'
}

function symDesc(sym: string): string {
  const s = sym.toLowerCase()
  if (s.includes('heavysnow') || s.includes('blizzard')) return 'kraftig snøfall'
  if (s.includes('lightsnow'))  return 'lett snøfall'
  if (s.includes('snow'))       return 'snøfall'
  if (s.includes('sleet'))      return 'sludd'
  if (s.includes('heavyrain'))  return 'kraftig regn'
  if (s.includes('lightrain'))  return 'lett regn'
  if (s.includes('rain'))       return 'regn'
  if (s.includes('drizzle'))    return 'yr'
  if (s.includes('fog'))        return 'tåke'
  if (s.includes('cloudy'))     return 'overskyet'
  if (s.includes('partly'))     return 'delvis skyet'
  return 'klarvær'
}

function risks(wx: GridWeather): string[] {
  const r: string[] = []
  const s = wx.symbolCode.toLowerCase()
  const t = wx.airTemperature
  const w = wx.windSpeed

  if (s.includes('snow') || s.includes('blizzard'))
    r.push('Snø på veibanen gir redusert friksjon — bruk riktig fart')
  if (s.includes('sleet') || (s.includes('rain') && t < 2))
    r.push('Isfare: sludd/regn ved temperaturer nær null er ekstremt glatt')
  if (t >= -2 && t <= 2 && wx.precipitationAmount > 0)
    r.push('Kritisk temperaturintervall (±2°C) med nedbør — høy risiko for svart is')
  if (t >= -2 && t <= 2 && wx.precipitationAmount === 0)
    r.push('Temperatur nær frysepunktet — kan forekomme svart is på broer og skyggefulle partier')
  if (w > 15)
    r.push('Sterk vind kan skape snøfokk og redusere sikt betraktelig')
  if (w > 10 && (s.includes('snow') || s.includes('sleet')))
    r.push('Vind og nedbør kombinert reduserer sikt og friksjon')
  if (s.includes('fog'))
    r.push('Tåke gir sterkt redusert sikt — bruk tåkelys og reduser fart')
  if (t < -15)
    r.push('Svært lave temperaturer kan påvirke dekk og bremsevæske')
  if (r.length === 0)
    r.push('Ingen kritiske risikoer identifisert under gjeldende forhold')
  return r.slice(0, 3)
}

function recommendation(wx: GridWeather, traffic: TrafficFlow | null): string {
  const level = riskLevel(wx.riskScore)
  const hasTrafficDelay = traffic && traffic.congestionPct > 40
  const hasClosure = traffic?.roadClosure

  if (hasClosure) return 'Veien er stengt — velg alternativ rute.'

  switch (level) {
    case 'farlig':
      return 'Frarådes å kjøre — utsett reisen til forholdene bedres.'
    case 'advarsel':
      return hasTrafficDelay
        ? 'Kjør svært forsiktig og beregn god tid — trafikkforsinkelse og vanskelige kjøreforhold.'
        : 'Kjør svært forsiktig med god avstand og redusert fart.'
    case 'forsiktig':
      return hasTrafficDelay
        ? 'Vær forsiktig og beregn ekstra reisetid pga. trafikkforsinkelse.'
        : 'Kjør forsiktig — reduser fart og øk avstanden til forankjørende.'
    default:
      if (hasTrafficDelay)
        return 'Gode kjøreforhold, men noe trafikkforsinkelse — beregn litt ekstra tid.'
      return isWinterTyreSeason()
        ? 'Gode kjøreforhold. Ha alltid vinterdekk og tilpass farten til forholdene.'
        : 'Gode kjøreforhold. Tilpass farten til forholdene.'
  }
}

function overallSummary(wx: GridWeather): string {
  const level = riskLevel(wx.riskScore)
  const weather = symDesc(wx.symbolCode)
  const temp = tempDesc(wx.airTemperature)
  const wind = windDesc(wx.windSpeed)

  const safetyText = {
    trygt:     'Kjøreforholdene er generelt gode',
    forsiktig: 'Kjøreforholdene krever forsiktighet',
    advarsel:  'Kjøreforholdene er krevende',
    farlig:    'Kjøreforholdene er farlige',
  }[level]

  return `${safetyText}. Det er ${weather} med ${temp} temperatur (${wx.airTemperature.toFixed(1)}°C) og ${wind} (${wx.windSpeed.toFixed(0)} m/s).`
}

// ── Route analysis ───────────────────────────────────────────────────────────

export function generateRouteAnalysis(
  fromName: string,
  toName: string,
  gridData: GridWeather[],
  routeCoords: [number, number][]
): string {
  if (gridData.length === 0 || routeCoords.length === 0) {
    return '**Ruteanalyse**\nIngen data tilgjengelig for denne ruten.'
  }

  // Sample route every ~8th point for performance
  const sample = routeCoords.filter((_, i) => i % 8 === 0)

  // Find all grid points close to the route
  const nearby: GridWeather[] = []
  for (const w of gridData) {
    if (sample.some(([lat, lon]) => Math.hypot(w.lat - lat, w.lon - lon) < 0.55)) {
      nearby.push(w)
    }
  }
  if (nearby.length === 0) return '**Ruteanalyse**\nIngen værstasjoner langs ruten.'

  const sorted = [...nearby].sort((a, b) => b.riskScore - a.riskScore)
  const worst = sorted[0]
  const avgScore = nearby.reduce((s, w) => s + w.riskScore, 0) / nearby.length
  const overallLevel = riskLevel(worst.riskScore * 0.6 + avgScore * 0.4)

  const hasSnow  = nearby.some(w => w.symbolCode.includes('snow'))
  const hasSleet = nearby.some(w => w.symbolCode.includes('sleet'))
  const hasIce   = nearby.some(w => w.airTemperature < 2 && w.precipitationAmount > 0)
  const maxWind  = Math.max(...nearby.map(w => w.windSpeed))
  const tempMin  = Math.min(...nearby.map(w => w.airTemperature))
  const tempMax  = Math.max(...nearby.map(w => w.airTemperature))

  const safetyText = {
    trygt:     'Ruten har generelt gode kjøreforhold',
    forsiktig: 'Ruten krever forsiktighet på deler av strekningen',
    advarsel:  'Ruten har krevende kjøreforhold på flere steder',
    farlig:    'Ruten har farlige kjøreforhold — vurder alternativ rute',
  }[overallLevel]

  // Worst spots
  const dangerSpots = sorted
    .filter(w => w.riskScore > 0.35)
    .slice(0, 3)
    .map(w => `• **${w.name}**: ${symDesc(w.symbolCode)}, ${w.airTemperature.toFixed(1)}°C, ${w.windSpeed.toFixed(0)} m/s`)
    .join('\n')

  // Conditions summary
  const conditions: string[] = []
  if (hasSnow)  conditions.push('snø')
  if (hasSleet) conditions.push('sludd')
  if (hasIce)   conditions.push('isfare')
  if (maxWind > 10) conditions.push(`vind opp til ${maxWind.toFixed(0)} m/s`)
  const condStr = conditions.length
    ? `Registrerte forhold: ${conditions.join(', ')}.`
    : 'Ingen kritiske nedbørsforhold langs ruten.'

  // Recommendation
  const rec = (() => {
    switch (overallLevel) {
      case 'farlig':   return 'Frarådes å kjøre denne ruten nå — vent til forholdene bedres.'
      case 'advarsel': return 'Kjør svært forsiktig, særlig gjennom de markerte farlige strekningene.'
      case 'forsiktig': return isWinterTyreSeason()
        ? 'Kjør forsiktig med vinterdekk og god avstand til forankjørende.'
        : 'Kjør forsiktig og tilpass farten til forholdene.'
      default: return isWinterTyreSeason()
        ? 'Gode kjøreforhold langs ruten. Bruk vinterdekk og tilpass farten.'
        : 'Gode kjøreforhold langs ruten. Tilpass farten til forholdene.'
    }
  })()

  return [
    `**Ruteanalyse: ${fromName} → ${toName}**\n${safetyText}. Temperatur langs ruten: ${tempMin.toFixed(1)}°C til ${tempMax.toFixed(1)}°C.`,
    dangerSpots ? `**Farlige strekninger**\n${dangerSpots}` : null,
    `**Forhold langs ruten**\n${condStr}`,
    `**Anbefaling**\n${rec}`,
  ].filter(Boolean).join('\n\n')
}

// ── Point analysis ────────────────────────────────────────────────────────────

export function generateLocalAnalysis(
  locationName: string,
  wx: GridWeather | null,
  traffic: TrafficFlow | null
): string {
  if (!wx) {
    return `**Overordnet vurdering**\nIngen værdata tilgjengelig for ${locationName}.\n\n**Anbefaling**\nSjekk lokale værmeldinger før avreise.`
  }

  const summary = overallSummary(wx)
  const riskList = risks(wx)
  const rec = recommendation(wx, traffic)

  let trafficNote = ''
  if (traffic) {
    if (traffic.roadClosure) {
      trafficNote = '\n\n**Trafikk**\n⛔ Veien er meldt stengt.'
    } else if (traffic.congestionPct > 60) {
      trafficNote = `\n\n**Trafikk**\nKraftig forsinkelse — ${traffic.congestionPct}% under normal hastighet (${traffic.currentSpeed} km/t av normalt ${traffic.freeFlowSpeed} km/t).`
    } else if (traffic.congestionPct > 25) {
      trafficNote = `\n\n**Trafikk**\nNoe forsinkelse — ${traffic.congestionPct}% under normal hastighet.`
    }
  }

  return [
    `**Overordnet vurdering**\n${summary}`,
    `**Viktigste risikoer**\n${riskList.map(r => `• ${r}`).join('\n')}`,
    `**Anbefaling**\n${rec}`,
    trafficNote,
  ].filter(Boolean).join('\n\n')
}
