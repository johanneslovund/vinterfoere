import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { RouteStep } from '../../services/routeApi'
import { findCurrentStep, remainingDistance } from '../../services/navigationService'

export interface NavInfo {
  stepIdx:    number
  remainDist: number   // metres
  remainMin:  number   // TomTom-route-based estimate, smoothed
  eta:        string
  bearing:    number | null
}

interface Props {
  steps:    RouteStep[]
  onUpdate: (info: NavInfo) => void
  onArrive: () => void
}

// Smooth angle transitions through wrap-around (0°/360° boundary)
function smoothBearing(current: number, target: number, factor = 0.15): number {
  let diff = target - current
  while (diff >  180) diff -= 360
  while (diff < -180) diff += 360
  return (current + diff * factor + 360) % 360
}

export function NavigationMapController({ steps, onUpdate, onArrive }: Props) {
  const map           = useMap()
  const watchId       = useRef<number | null>(null)
  const lastTouchRef  = useRef(0)
  const bearingRef    = useRef<number | null>(null)
  const lastUpdateRef = useRef(0)          // throttle UI updates
  const smoothPosRef  = useRef<[number,number] | null>(null)  // low-pass GPS position
  // Rolling speed buffer for smoothed speed estimate
  const speedBufRef   = useRef<number[]>([])

  // Device orientation → compass heading (only when GPS heading unavailable)
  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      const raw = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading
      if (raw !== undefined && raw !== null) {
        if (bearingRef.current === null) {
          bearingRef.current = raw
        } else {
          bearingRef.current = smoothBearing(bearingRef.current, raw, 0.1)
        }
      } else if (e.alpha !== null) {
        const b = (360 - e.alpha) % 360
        if (bearingRef.current === null) bearingRef.current = b
        else bearingRef.current = smoothBearing(bearingRef.current, b, 0.1)
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

    // User touch detection — pause auto-pan while interacting
    const container = map.getContainer()
    const onTouch = () => { lastTouchRef.current = Date.now() }
    container.addEventListener('touchstart', onTouch, { passive: true })
    container.addEventListener('touchmove',  onTouch, { passive: true })
    map.on('dragstart', onTouch)
    map.on('zoomstart', onTouch)

    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lon, speed, heading: gpsHeading } = pos.coords

        // ── GPS heading: only trust it above 8 km/h, smooth transition ────────
        const speedKmh = (speed ?? 0) * 3.6
        if (gpsHeading !== null && !isNaN(gpsHeading) && speedKmh > 8) {
          if (bearingRef.current === null) bearingRef.current = gpsHeading
          else bearingRef.current = smoothBearing(bearingRef.current, gpsHeading, 0.25)
        }

        // ── Low-pass filter GPS position (reduces jitter) ─────────────────────
        const prev = smoothPosRef.current
        const smoothLat = prev ? prev[0] * 0.6 + lat * 0.4 : lat
        const smoothLon = prev ? prev[1] * 0.6 + lon * 0.4 : lon
        smoothPosRef.current = [smoothLat, smoothLon]

        // ── Navigation metrics ────────────────────────────────────────────────
        const stepIdx = findCurrentStep(smoothLat, smoothLon, steps)
        const remDist = remainingDistance(smoothLat, smoothLon, steps, stepIdx)

        // Smoothed speed: rolling buffer of last 5 readings, ignore < 1 m/s
        const rawSpeedMs = speed && speed > 1 ? speed : 80 / 3.6
        speedBufRef.current.push(rawSpeedMs)
        if (speedBufRef.current.length > 5) speedBufRef.current.shift()
        const avgSpeedMs = speedBufRef.current.reduce((s,v) => s+v, 0) / speedBufRef.current.length

        const remMin  = remDist / avgSpeedMs / 60
        const etaDate = new Date(Date.now() + remDist / avgSpeedMs * 1000)
        const eta     = etaDate.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })

        // ── Throttle UI updates to ~1 per second ─────────────────────────────
        const now = Date.now()
        if (now - lastUpdateRef.current > 900) {
          lastUpdateRef.current = now
          onUpdate({ stepIdx, remainDist: remDist, remainMin: remMin, eta, bearing: bearingRef.current })
        }

        // ── Auto-pan only when idle + outside inner 35% ───────────────────────
        const userIdleMs = now - lastTouchRef.current
        if (userIdleMs > 6000) {
          const bounds  = map.getBounds()
          const latSpan = (bounds.getNorth() - bounds.getSouth()) * 0.325
          const lonSpan = (bounds.getEast()  - bounds.getWest())  * 0.325
          const inner   = L.latLngBounds(
            [bounds.getSouth() + latSpan, bounds.getWest() + lonSpan],
            [bounds.getNorth() - latSpan, bounds.getEast() - lonSpan]
          )
          if (!inner.contains([smoothLat, smoothLon])) {
            map.panTo([smoothLat, smoothLon], { animate: true, duration: 1.2, noMoveStart: true })
          }
        }

        // ── Dynamic zoom ──────────────────────────────────────────────────────
        const distToNext = steps[stepIdx]?.distance ?? remDist
        const targetZoom = distToNext < 80 ? 18 : distToNext < 200 ? 17
          : distToNext < 600 ? 16 : distToNext < 3000 ? 15
          : distToNext < 10000 ? 14 : 13

        if (Math.abs(map.getZoom() - targetZoom) >= 1 && userIdleMs > 6000) {
          map.setZoom(targetZoom, { animate: true })
        }

        // ── CompassButton bearing update (map rotation) ───────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const m = map as any
        if (typeof m.setBearing === 'function' && bearingRef.current !== null) {
          // Only rotate map when heading-lock is externally requested
          // (controlled by the CompassButton component)
        }

        // Auto-arrive
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
