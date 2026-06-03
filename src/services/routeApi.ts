// ── Types ─────────────────────────────────────────────────────────────────────

export interface FerryStep {
  name: string
  departureName: string
  destinationName: string
  departureLat: number
  departureLon: number
  ferryDurationMin: number
  driveTimeToFerryMin: number
  driveDistanceToFerryKm: number
}

export interface RouteStep {
  instruction: string
  maneuverType: string
  maneuverModifier?: string
  name: string
  distance: number   // metres to next step
  duration: number   // seconds for this step
  lat: number
  lon: number
  mode: string       // 'driving' | 'ferry'
}

export interface AlternateRoute {
  coordinates: [number, number][]
  distanceKm: number
  durationMin: number
}

export interface RouteResult {
  coordinates: [number, number][]
  distanceKm: number
  durationMin: number
  ferries: FerryStep[]
  steps: RouteStep[]
  alternates: AlternateRoute[]
}

// ── Norwegian instruction map (TomTom maneuver → text) ────────────────────────

const NOR: Record<string, string> = {
  DEPART:              'Start',
  ARRIVE:              'Du har nådd destinasjonen',
  ARRIVE_LEFT:         'Du har nådd destinasjonen på venstre side',
  ARRIVE_RIGHT:        'Du har nådd destinasjonen på høyre side',
  TAKE_FERRY:          'Ta fergen',
  TURN_LEFT:           'Sving til venstre',
  TURN_RIGHT:          'Sving til høyre',
  BEAR_LEFT:           'Hold til venstre',
  BEAR_RIGHT:          'Hold til høyre',
  KEEP_LEFT:           'Hold deg til venstre',
  KEEP_RIGHT:          'Hold deg til høyre',
  SHARP_LEFT:          'Skarp venstresving',
  SHARP_RIGHT:         'Skarp høyresving',
  U_TURN_LEFT:         'Snu til venstre',
  U_TURN_RIGHT:        'Snu til høyre',
  STRAIGHT:            'Kjør rett frem',
  FOLLOW:              'Følg veien',
  MOTORWAY_EXIT_LEFT:  'Ta av til venstre',
  MOTORWAY_EXIT_RIGHT: 'Ta av til høyre',
  ROUNDABOUT_LEFT:     'Ta rundkjøringen til venstre',
  ROUNDABOUT_RIGHT:    'Ta rundkjøringen til høyre',
  ROUNDABOUT_CROSS:    'Kjør rett gjennom rundkjøringen',
}

function norInstruction(maneuver: string, street: string): string {
  const base = NOR[maneuver] ?? 'Fortsett'
  return street ? `${base} på ${street}` : base
}

// ── TomTom Routing ────────────────────────────────────────────────────────────

const TT_KEY = import.meta.env.VITE_TOMTOM_KEY as string | undefined

interface TomTomInstruction {
  routeOffsetInMeters: number
  travelTimeInSeconds: number
  point: { latitude: number; longitude: number }
  maneuver: string
  street?: string
  message?: string
}

interface TomTomRoute {
  summary: { lengthInMeters: number; travelTimeInSeconds: number }
  legs: Array<{ points: Array<{ latitude: number; longitude: number }> }>
  guidance?: { instructions: TomTomInstruction[] }
}

async function fetchTomTom(from: [number, number], to: [number, number]): Promise<RouteResult> {
  const url =
    `https://api.tomtom.com/routing/1/calculateRoute/` +
    `${from[0]},${from[1]}:${to[0]},${to[1]}/json` +
    `?key=${TT_KEY}&travelMode=car&traffic=false` +
    `&maxAlternatives=3&instructionsType=coded&language=nb-NO`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`TomTom ${res.status}`)
  const data = await res.json() as { routes: TomTomRoute[] }
  if (!data.routes?.length) throw new Error('No routes returned')

  const primary = data.routes[0]

  // Full geometry: flatten all leg points
  const coordinates: [number, number][] = primary.legs
    .flatMap(l => l.points.map(p => [p.latitude, p.longitude] as [number, number]))

  // Alternates
  const alternates: AlternateRoute[] = data.routes.slice(1).map(r => ({
    coordinates: r.legs.flatMap(l => l.points.map(p => [p.latitude, p.longitude] as [number, number])),
    distanceKm:  r.summary.lengthInMeters / 1000,
    durationMin: r.summary.travelTimeInSeconds / 60,
  }))

  // Parse steps from guidance instructions
  const instructions = primary.guidance?.instructions ?? []
  const steps: RouteStep[] = []
  const ferries: FerryStep[] = []
  let cumTimeSec = 0, cumDistM = 0

  for (let i = 0; i < instructions.length; i++) {
    const ins     = instructions[i]
    const next    = instructions[i + 1]
    const stepDist = next ? next.routeOffsetInMeters - ins.routeOffsetInMeters : 0
    const stepTime = next ? next.travelTimeInSeconds  - ins.travelTimeInSeconds  : 0
    const street  = ins.street ?? ''
    const isFerry = ins.maneuver === 'TAKE_FERRY'

    if (isFerry) {
      const parts = street.split(/\s*[-–]\s*/)
      ferries.push({
        name:                    street,
        departureName:           parts[0]?.trim() ?? street,
        destinationName:         parts[1]?.trim() ?? '',
        departureLat:            ins.point.latitude,
        departureLon:            ins.point.longitude,
        ferryDurationMin:        stepTime / 60,
        driveTimeToFerryMin:     cumTimeSec / 60,
        driveDistanceToFerryKm:  cumDistM / 1000,
      })
    }

    steps.push({
      instruction:      norInstruction(ins.maneuver, street),
      maneuverType:     ins.maneuver,
      maneuverModifier: undefined,
      name:             street,
      distance:         stepDist,
      duration:         stepTime,
      lat:              ins.point.latitude,
      lon:              ins.point.longitude,
      mode:             isFerry ? 'ferry' : 'driving',
    })

    cumTimeSec += stepTime
    cumDistM   += stepDist
  }

  return {
    coordinates,
    distanceKm:  primary.summary.lengthInMeters / 1000,
    durationMin: primary.summary.travelTimeInSeconds / 60,
    ferries,
    steps,
    alternates,
  }
}

// ── OSRM fallback (when no TomTom key) ───────────────────────────────────────

function norFromOsrm(type: string, modifier: string | undefined, name: string): string {
  const road = name ? ` på ${name}` : ''
  if (type === 'depart')  return `Start${road}`
  if (type === 'arrive')  return 'Du har nådd destinasjonen'
  if (type === 'ferry')   return `Ta fergen${name ? ` (${name})` : ''}`
  if (type === 'roundabout' || type === 'rotary') return `Ta rundkjøringen${road}`
  const mod = modifier ?? ''
  if (mod === 'left')         return `Sving til venstre${road}`
  if (mod === 'right')        return `Sving til høyre${road}`
  if (mod === 'slight left')  return `Hold til venstre${road}`
  if (mod === 'slight right') return `Hold til høyre${road}`
  if (mod === 'sharp left')   return `Skarp venstresving${road}`
  if (mod === 'sharp right')  return `Skarp høyresving${road}`
  if (mod === 'uturn')        return `Snu${road}`
  return `Fortsett rett frem${road}`
}

interface OsrmStep {
  mode: string; name: string; duration: number; distance: number
  maneuver: { type: string; modifier?: string; location: [number, number] }
}

async function fetchOsrm(from: [number, number], to: [number, number]): Promise<RouteResult> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}` +
    `?overview=full&geometries=geojson&steps=true&alternatives=3`
  const res = await fetch(url)
  if (!res.ok) throw new Error('OSRM error')
  const data = await res.json() as {
    routes: Array<{
      geometry: { coordinates: [number, number][] }
      distance: number; duration: number
      legs: Array<{ steps: OsrmStep[] }>
    }>
  }
  const route = data.routes[0]
  const ferries: FerryStep[] = []
  const steps:   RouteStep[] = []
  let cumT = 0, cumD = 0

  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      const [lon, lat] = step.maneuver.location
      if (step.mode === 'ferry') {
        const parts = step.name.split(/\s*[-–]\s*/)
        ferries.push({
          name: step.name, departureName: parts[0]?.trim() ?? step.name,
          destinationName: parts[1]?.trim() ?? '',
          departureLon: lon, departureLat: lat,
          ferryDurationMin: step.duration / 60,
          driveTimeToFerryMin: cumT / 60, driveDistanceToFerryKm: cumD / 1000,
        })
      }
      steps.push({
        instruction:  norFromOsrm(step.maneuver.type, step.maneuver.modifier, step.name),
        maneuverType: step.maneuver.type, maneuverModifier: step.maneuver.modifier,
        name: step.name, distance: step.distance, duration: step.duration,
        lat, lon, mode: step.mode,
      })
      cumT += step.duration; cumD += step.distance
    }
  }

  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: route.distance / 1000, durationMin: route.duration / 60,
    ferries, steps,
    alternates: data.routes.slice(1).map(r => ({
      coordinates: r.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
      distanceKm: r.distance / 1000, durationMin: r.duration / 60,
    })),
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchRoute(from: [number, number], to: [number, number]): Promise<RouteResult> {
  if (TT_KEY && TT_KEY !== 'your_tomtom_api_key_here') {
    try { return await fetchTomTom(from, to) }
    catch (e) { console.warn('TomTom routing failed, falling back to OSRM:', e) }
  }
  return fetchOsrm(from, to)
}
