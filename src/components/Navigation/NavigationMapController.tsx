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

// ── Angle helpers ─────────────────────────────────────────────────────────────
function smoothAngle(current: number, target: number, factor: number): number {
  let diff = target - current
  while (diff >  180) diff -= 360
  while (diff < -180) diff += 360
  return (current + diff * factor + 360) % 360
}

// ── Haversine distance (metres) ───────────────────────────────────────────────
function distM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Dead reckoning: extrapolate position from last fix ────────────────────────
function deadReckon(
  lat: number, lon: number, speedMs: number, bearingDeg: number, elapsedSec: number
): [number, number] {
  if (elapsedSec <= 0 || speedMs < 0.3) return [lat, lon]
  const dist = Math.min(speedMs * elapsedSec, 500) // cap at 500m
  const R = 6371000
  const brRad  = bearingDeg * Math.PI / 180
  const latRad = lat * Math.PI / 180
  const lonRad = lon * Math.PI / 180
  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(dist / R) +
    Math.cos(latRad) * Math.sin(dist / R) * Math.cos(brRad)
  )
  const newLonRad = lonRad + Math.atan2(
    Math.sin(brRad) * Math.sin(dist / R) * Math.cos(latRad),
    Math.cos(dist / R) - Math.sin(latRad) * Math.sin(newLatRad)
  )
  return [newLatRad * 180 / Math.PI, newLonRad * 180 / Math.PI]
}

// ── Navigation marker icon ────────────────────────────────────────────────────
function makeNavIcon(): L.DivIcon {
  return L.divIcon({
    className: 'nav-marker',
    html: `<svg width="44" height="44" viewBox="0 0 44 44" style="overflow:visible">
      <circle cx="22" cy="22" r="14" fill="rgba(66,133,244,0.12)" stroke="rgba(66,133,244,0.3)" stroke-width="1"/>
      <path class="nav-arrow" d="M22,6 L18,22 L22,18 L26,22 Z"
        fill="rgba(66,133,244,0.85)"
        transform="rotate(0,22,22)"/>
      <circle cx="22" cy="22" r="8" fill="white"/>
      <circle cx="22" cy="22" r="6" fill="#4285F4"/>
    </svg>`,
    iconSize:   [44, 44],
    iconAnchor: [22, 22],
  })
}

// ── Component ─────────────────────────────────────────────────────────────────
export function NavigationMapController({ steps, onUpdate, onArrive }: Props) {
  const map = useMap()

  const gpsFixRef      = useRef({ lat: 0, lon: 0, speedMs: 0, bearing: 0, ts: 0, valid: false })
  const smoothBearing  = useRef(0)   // interpolated bearing at 60fps
  const compassBearing = useRef(0)   // device compass fallback
  const watchId        = useRef<number | null>(null)
  const rafId          = useRef<number | null>(null)
  const markerRef      = useRef<L.Marker | null>(null)
  const lastTouchRef   = useRef(0)
  const lastNavUpd     = useRef(0)
  const speedBufRef    = useRef<number[]>([])
  const zoomThrottle   = useRef(0)
  // Track last map-set position to avoid redundant calls
  const lastSetPos     = useRef<[number,number]>([0,0])

  // Device orientation → compass fallback
  useEffect(() => {
    const h = (e: DeviceOrientationEvent) => {
      const raw = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
      const b   = raw != null ? raw : e.alpha != null ? (360 - e.alpha) % 360 : null
      if (b != null) compassBearing.current = smoothAngle(compassBearing.current, b, 0.08)
    }
    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }
    if (typeof DOE.requestPermission === 'function') {
      DOE.requestPermission?.().then(p => { if (p === 'granted') window.addEventListener('deviceorientation', h, true) }).catch(() => {})
    } else {
      window.addEventListener('deviceorientation', h, true)
    }
    return () => window.removeEventListener('deviceorientation', h, true)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation || !steps.length) return

    // Touch pause detection
    const container = map.getContainer()
    const onTouch = () => { lastTouchRef.current = Date.now() }
    container.addEventListener('touchstart', onTouch, { passive: true })
    container.addEventListener('touchmove',  onTouch, { passive: true })
    map.on('dragstart', onTouch)
    map.on('zoomstart', onTouch)

    // ── 60fps requestAnimationFrame loop ──────────────────────────────────────
    const loop = () => {
      const fix = gpsFixRef.current
      if (fix.valid) {
        const now     = Date.now()
        const elapsed = (now - fix.ts) / 1000

        // Dead-reckoned position (approximation between GPS fixes)
        const [eLat, eLon] = deadReckon(fix.lat, fix.lon, fix.speedMs, fix.bearing, elapsed)

        // Per-frame smooth bearing interpolation
        smoothBearing.current = smoothAngle(smoothBearing.current, fix.bearing, 0.06)

        // ── Update marker (no React, pure DOM) ────────────────────────────────
        if (!markerRef.current) {
          markerRef.current = L.marker([eLat, eLon], { icon: makeNavIcon(), zIndexOffset: 900 }).addTo(map)
        } else {
          markerRef.current.setLatLng([eLat, eLon])
        }
        // Rotate direction arrow via SVG attribute — no icon recreation
        const arrow = markerRef.current.getElement()?.querySelector('.nav-arrow')
        if (arrow) arrow.setAttribute('transform', `rotate(${smoothBearing.current.toFixed(1)},22,22)`)

        // ── Move map at 60fps when user is not interacting ────────────────────
        const userIdle = now - lastTouchRef.current > 4000

        if (userIdle) {
          // Only call setView when position changed enough (avoid pointless calls < 0.5m)
          const [pLat, pLon] = lastSetPos.current
          if (distM(pLat, pLon, eLat, eLon) > 0.3) {
            lastSetPos.current = [eLat, eLon]
            // Immediate (non-animated) repositioning — Leaflet just updates CSS transforms
            // This is the same underlying mechanism as animated pan, just per-frame
            map.setView([eLat, eLon], map.getZoom(), {
              animate: false,
              noMoveStart: true,
            } as L.ZoomPanOptions)
          }
        }
      }

      rafId.current = requestAnimationFrame(loop)
    }
    rafId.current = requestAnimationFrame(loop)

    // ── GPS watch: receives real fixes ────────────────────────────────────────
    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lon, speed, heading: gpsHeading } = pos.coords
        const now = Date.now()

        // Smooth incoming position
        const prev = gpsFixRef.current
        const sLat = prev.valid ? prev.lat * 0.55 + lat * 0.45 : lat
        const sLon = prev.valid ? prev.lon * 0.55 + lon * 0.45 : lon

        // Rolling speed average
        const rawMs = speed && speed > 0.5 ? speed : 0
        speedBufRef.current.push(rawMs)
        if (speedBufRef.current.length > 5) speedBufRef.current.shift()
        const avgMs = speedBufRef.current.reduce((s,v) => s+v,0) / speedBufRef.current.length

        // Bearing: GPS above 8 km/h, compass below
        const kmh = avgMs * 3.6
        const targetBearing = gpsHeading != null && !isNaN(gpsHeading) && kmh > 8
          ? gpsHeading
          : compassBearing.current
        gpsFixRef.current.bearing = smoothAngle(gpsFixRef.current.bearing || 0, targetBearing, kmh > 8 ? 0.35 : 0.1)

        gpsFixRef.current = {
          lat: sLat, lon: sLon,
          speedMs: avgMs,
          bearing: gpsFixRef.current.bearing,
          ts: now,
          valid: true,
        }

        // NavInfo updates throttled ~1/sec
        if (now - lastNavUpd.current > 900) {
          lastNavUpd.current = now
          const stepIdx = findCurrentStep(sLat, sLon, steps)
          const remDist = remainingDistance(sLat, sLon, steps, stepIdx)
          const remMin  = avgMs > 0.5 ? remDist / avgMs / 60 : 0
          const eta     = new Date(now + (avgMs > 0.5 ? remDist / avgMs * 1000 : 0))
            .toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })

          onUpdate({ stepIdx, remainDist: remDist, remainMin: remMin, eta, bearing: gpsFixRef.current.bearing })

          // Dynamic zoom (every 3s max)
          const userIdle = now - lastTouchRef.current > 4000
          if (userIdle && now - zoomThrottle.current > 3000) {
            const distToNext = steps[stepIdx]?.distance ?? remDist
            const z = distToNext < 80 ? 18 : distToNext < 200 ? 17 : distToNext < 600 ? 16
              : distToNext < 3000 ? 15 : distToNext < 10000 ? 14 : 13
            if (Math.abs(map.getZoom() - z) >= 1) {
              zoomThrottle.current = now
              map.setZoom(z, { animate: true })
            }
          }

          if (stepIdx >= steps.length - 2 && remDist < 50) onArrive()
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    )

    return () => {
      if (rafId.current)   cancelAnimationFrame(rafId.current)
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current)
      markerRef.current?.remove()
      markerRef.current = null
      container.removeEventListener('touchstart', onTouch)
      container.removeEventListener('touchmove',  onTouch)
      map.off('dragstart', onTouch)
      map.off('zoomstart', onTouch)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps])

  return null
}
