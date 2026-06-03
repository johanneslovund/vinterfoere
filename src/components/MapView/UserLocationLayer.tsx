import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

function makeLocationIcon(heading: number | null): L.DivIcon {
  const hasBearing = heading !== null;
  const rot = heading ?? 0;

  const svg = `
    <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      ${hasBearing ? `
      <!-- Direction cone -->
      <path
        d="M30,4 L22,30 L30,24 L38,30 Z"
        fill="rgba(66,133,244,0.75)"
        transform="rotate(${rot}, 30, 30)"
      />` : ''}
      <!-- Accuracy pulse ring -->
      <circle cx="30" cy="30" r="14" fill="rgba(66,133,244,0.15)"
        stroke="rgba(66,133,244,0.3)" stroke-width="1"/>
      <!-- White border -->
      <circle cx="30" cy="30" r="9" fill="white"/>
      <!-- Blue dot -->
      <circle cx="30" cy="30" r="7" fill="#4285F4"/>
    </svg>`;

  return L.divIcon({
    className: '',
    html: svg,
    iconSize:   [60, 60],
    iconAnchor: [30, 30],
  });
}

export function UserLocationLayer() {
  const map         = useMap();
  const markerRef   = useRef<L.Marker | null>(null);
  const circleRef   = useRef<L.Circle | null>(null);
  const headingRef  = useRef<number | null>(null);
  const watchId     = useRef<number | null>(null);

  // Update icon in place without recreating the marker
  const updateIcon = () => {
    if (markerRef.current) {
      markerRef.current.setIcon(makeLocationIcon(headingRef.current));
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) return;

    // ── Device orientation for compass heading ────────────────────────────────
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // `alpha` = compass heading (0 = North). We want bearing from North, clockwise.
      // iOS: webkitCompassHeading is already clockwise from North.
      // Android: alpha = CCW from North → bearing = 360 - alpha
      const raw = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading;
      if (raw !== undefined && raw !== null) {
        headingRef.current = raw;
      } else if (e.alpha !== null) {
        headingRef.current = (360 - e.alpha) % 360;
      }
      updateIcon();
    };

    function addOrientationListener() {
      const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<string>;
      };
      if (typeof DOE.requestPermission === 'function') {
        // iOS 13+: request on first user touch (permission API requires user gesture)
        const handler = () => {
          DOE.requestPermission?.()
            .then(perm => { if (perm === 'granted') window.addEventListener('deviceorientation', handleOrientation, true); })
            .catch(() => {});
          document.removeEventListener('touchstart', handler);
          document.removeEventListener('click', handler);
        };
        document.addEventListener('touchstart', handler, { once: true });
        document.addEventListener('click',      handler, { once: true });
      } else {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }
    addOrientationListener();

    // ── Geolocation watch ─────────────────────────────────────────────────────
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon, accuracy, heading } = pos.coords;

        // GPS heading overrides orientation when available and moving
        if (heading !== null && !isNaN(heading)) {
          headingRef.current = heading;
        }

        if (!markerRef.current) {
          // First fix — create marker and accuracy circle
          markerRef.current = L.marker([lat, lon], {
            icon: makeLocationIcon(headingRef.current),
            zIndexOffset: 900,
          }).addTo(map);

          circleRef.current = L.circle([lat, lon], {
            radius: accuracy,
            color: '#4285F4',
            fillColor: '#4285F4',
            fillOpacity: 0.08,
            weight: 1,
            opacity: 0.35,
          }).addTo(map);
        } else {
          const latlng: L.LatLngExpression = [lat, lon];
          markerRef.current.setLatLng(latlng);
          circleRef.current?.setLatLng(latlng);
          circleRef.current?.setRadius(accuracy);
          updateIcon();
        }
      },
      () => { /* permission denied or unavailable — fail silently */ },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
    );

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      window.removeEventListener('deviceorientation', handleOrientation, true);
      markerRef.current?.remove();
      circleRef.current?.remove();
      markerRef.current = null;
      circleRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
