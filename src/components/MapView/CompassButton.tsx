import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import './CompassButton.css';

interface Props {
  bearing: number | null;   // current heading from GPS/compass
  lockMode: 'north' | 'heading';
  onToggle: () => void;
}

// CompassButton — shows current bearing, tap to toggle lock-north / follow-heading
export function CompassButton({ bearing, lockMode, onToggle }: Props) {
  const map     = useMap();
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = map as any;
    if (typeof m.setBearing !== 'function') return;

    if (lockMode === 'north') {
      m.setBearing(0);
    } else if (bearing !== null && bearing !== prevRef.current) {
      prevRef.current = bearing;
      m.setBearing(-bearing);   // leaflet-rotate: negative = CCW = map rotates to face heading
    }
  }, [bearing, lockMode, map]);

  const deg = bearing ?? 0;

  return (
    <button
      className={`compass-btn${lockMode === 'heading' ? ' compass-btn--active' : ''}`}
      onClick={onToggle}
      title={lockMode === 'north' ? 'Følg retning' : 'Lås nord'}
    >
      <svg width="36" height="36" viewBox="0 0 36 36">
        {/* Outer ring */}
        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        {/* Single red needle pointing North — no duplicate white needle */}
        <g transform={`rotate(${-deg}, 18, 18)`}>
          {/* North tip (red, filled) */}
          <path d="M18,5 L15,18 L18,15 L21,18 Z" fill="#e53935"/>
          {/* South tail (same shape, dimmer) */}
          <path d="M18,31 L15,18 L18,21 L21,18 Z" fill="rgba(255,255,255,0.22)"/>
        </g>
        {/* N label */}
        <text x="18" y="4.5" textAnchor="middle" fontSize="5.5" fill="rgba(255,255,255,0.45)"
          fontFamily="system-ui" fontWeight="700">N</text>
      </svg>
      {lockMode === 'heading' && (
        <div className="compass-btn__dot" />
      )}
    </button>
  );
}
