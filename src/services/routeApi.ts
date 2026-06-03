export interface FerryStep {
  name: string               // e.g. "Jektavik - Hodnanes"
  departureName: string      // first part: "Jektavik"
  destinationName: string    // second part: "Hodnanes"
  departureLat: number
  departureLon: number
  ferryDurationMin: number   // crossing time
  driveTimeToFerryMin: number // drive time from route start to this ferry
  driveDistanceToFerryKm: number
}

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lon]
  distanceKm: number;
  durationMin: number;
  ferries: FerryStep[];
}

interface OsrmStep {
  mode: string;
  name: string;
  duration: number;
  distance: number;
  maneuver: { location: [number, number] };
}

export async function fetchRoute(
  from: [number, number],
  to: [number, number]
): Promise<RouteResult> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from[1]},${from[0]};${to[1]},${to[0]}` +
    `?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Kunne ikke hente rute');
  const data = await res.json() as {
    routes: Array<{
      geometry: { coordinates: [number, number][] };
      distance: number;
      duration: number;
      legs: Array<{ steps: OsrmStep[] }>;
    }>;
  };
  const route = data.routes[0];

  // Parse ferry steps with cumulative time/distance
  const ferries: FerryStep[] = [];
  let cumTimeSec = 0;
  let cumDistM   = 0;

  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      if (step.mode === 'ferry') {
        const parts = step.name.split(/\s*[-–]\s*/);
        ferries.push({
          name:                    step.name,
          departureName:           parts[0]?.trim() ?? step.name,
          destinationName:         parts[1]?.trim() ?? '',
          departureLon:            step.maneuver.location[0],
          departureLat:            step.maneuver.location[1],
          ferryDurationMin:        step.duration / 60,
          driveTimeToFerryMin:     cumTimeSec / 60,
          driveDistanceToFerryKm:  cumDistM / 1000,
        });
      }
      cumTimeSec += step.duration;
      cumDistM   += step.distance;
    }
  }

  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm:  route.distance / 1000,
    durationMin: route.duration / 60,
    ferries,
  };
}
