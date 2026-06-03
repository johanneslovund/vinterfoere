import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { RouteStep } from '../../services/routeApi'
import { findCurrentStep, remainingDistance } from '../../services/navigationService'

export interface NavInfo {
  stepIdx:    number
  remainDist: number   // metres
  remainMin:  number
  eta:        string
}

interface Props {
  steps:    RouteStep[]
  onUpdate: (info: NavInfo) => void
  onArrive: () => void
}

// Runs INSIDE MapContainer — safe to use useMap()
export function NavigationMapController({ steps, onUpdate, onArrive }: Props) {
  const map     = useMap()
  const watchId = useRef<number | null>(null)

  useEffect(() => {
    if (!navigator.geolocation || !steps.length) return

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon, speed } = pos.coords
        const stepIdx  = findCurrentStep(lat, lon, steps)
        const remDist  = remainingDistance(lat, lon, steps, stepIdx)
        const speedMs  = speed && speed > 1 ? speed : 80 / 3.6
        const remSec   = remDist / speedMs
        const remMin   = remSec / 60
        const etaDate  = new Date(Date.now() + remSec * 1000)
        const eta      = etaDate.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })

        onUpdate({ stepIdx, remainDist: remDist, remainMin: remMin, eta })

        // Pan map to follow user
        map.panTo([lat, lon], { animate: true, duration: 0.5 })

        // Auto-end on arrival
        if (stepIdx >= steps.length - 2 && remDist < 50) onArrive()
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000 }
    )

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps])

  return null
}
