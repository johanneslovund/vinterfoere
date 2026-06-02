import { useState } from 'react'
import './MapStyleSelector.css'

export type MapStyle = 'dark' | 'light' | 'satellite'

export const MAP_TILES: Record<MapStyle, { url: string; attribution: string }> = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>',
  },
}

const LABELS: Record<MapStyle, string> = {
  dark:      'Mørk',
  light:     'Lys',
  satellite: 'Satellitt',
}

interface Props {
  value: MapStyle
  onChange: (s: MapStyle) => void
}

export function MapStyleSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="map-style">
      <button
        className="map-style__btn"
        onClick={() => setOpen(o => !o)}
        title="Kartvisning"
      >
        {value === 'dark' ? '🌙' : value === 'light' ? '☀️' : '🛰'}
      </button>

      {open && (
        <div className="map-style__menu">
          {(Object.keys(LABELS) as MapStyle[]).map(s => (
            <button
              key={s}
              className={`map-style__option${value === s ? ' map-style__option--active' : ''}`}
              onClick={() => { onChange(s); setOpen(false); }}
            >
              {s === 'dark' ? '🌙' : s === 'light' ? '☀️' : '🛰'} {LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
