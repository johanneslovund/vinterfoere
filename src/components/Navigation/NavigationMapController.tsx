import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { RouteStep } from '../../services/routeApi'
import { findCurrentStep, remainingDistance } from '../../services/navigationService'

export interface NavInfo {
  stepIdx:    number
  remainDist: number
  remainMin:  number
  eta:        string
  bearing:    number | null
}

interface Props {
  steps:    RouteStep[]
  onUpdate: (info: NavInfo) => void
  onArrive: () => void
}

export function NavigationMapController({ steps, onUpdate, onArrive }: Props) {
  const map           = useMap()
  const watchId       = useRef<number | null>(null)
  const bearingRef    = useRef<number | null>(null)
  // Track when user last touched the map so we don't fight their input
  const lastTouchRef  = useRef(0)

  // Device orientation → compass heading (for the UI compass indicator only)
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const raw = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading
      if (raw !== undefined && raw !== null) {
        bearingRef.current = raw
      } else if (e.alpha !== null) {
        bearingRef.current = (360 - e.alpha) % 360
      }
    }
    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>
    }
    if (typeof DOE.requestPermission === 'function') {
      DOE.requestPermission?.()
        .then(p => { if (p === 'granted') window.addEventListener('deviceorientation', handler, true) })
        .catch(() => {})
    } else {
      window.addEventListener('deviceorientation', handler, true)
    }
    return () => window.removeEventListener('deviceorientation', handler, true)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation || !steps.length) return

    // ── Interaction detection via touch events on container ──────────────────
    const container = map.getContainer()
    const onTouch = () => { lastTouchRef.current = Date.now() }

    container.addEventListener('touchstart', onTouch, { passive: true })
    container.addEventListener('touchmove',  onTouch, { passive: true })
    map.on('dragstart', onTouch)
    map.on('zoomstart', onTouch)

    // ── GPS watch ─────────────────────────────────────────────────────────────
    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lon, speed, heading: gpsHeading } = pos.coords

        // GPS heading overrides compass when moving
        if (gpsHeading !== null && !isNaN(gpsHeading) && (speed ?? 0) > 0.5) {
          bearingRef.current = gpsHeading
        }

        // ── Navigation metrics ──────────────────────────────────────────────
        const stepIdx  = findCurrentStep(lat, lon, steps)
        const remDist  = remainingDistance(lat, lon, steps, stepIdx)
        const speedMs  = speed && speed > 1 ? speed : 80 / 3.6
        const remMin   = remDist / speedMs / 60
        const etaDate  = new Date(Date.now() + remDist / speedMs * 1000)
        const eta      = etaDate.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })

        onUpdate({ stepIdx, remainDist: remDist, remainMin: remMin, eta, bearing: bearingRef.current })

        // ── Auto-pan only when user hasn't touched the map in 6 seconds ───────
        const userIdleMs = Date.now() - lastTouchRef.current
        if (userIdleMs > 6000) {
          // Only pan if position is outside the inner 40% of viewport
          const bounds  = map.getBounds()
          const latSpan = (bounds.getNorth() - bounds.getSouth()) * 0.30
          const lonSpan = (bounds.getEast()  - bounds.getWest())  * 0.30
          const inner   = L.latLngBounds(
            [bounds.getSouth() + latSpan, bounds.getWest() + lonSpan],
            [bounds.getNorth() - latSpan, bounds.getEast() - lonSpan]
          )
          if (!inner.contains([lat, lon])) {
            map.panTo([lat, lon], { animate: true, duration: 0.8, noMoveStart: true })
          }
        }

        // Auto-end on arrival
        if (stepIdx >= steps.length - 2 && remDist < 50) onArrive()
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    )

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      container.removeEventListener('touchstart', onTouch)
      container.removeEventListener('touchmove',  onTouch)
      map.off('dragstart', onTouch)
      map.off('zoomstart', onTouch)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps])

  return null
}
