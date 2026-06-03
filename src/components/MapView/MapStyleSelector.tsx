import { useState } from 'react'
import { MoonIcon, SunIcon, SatelliteIcon } from '../Icons/Icons'
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

function StyleIcon({ style }: { style: MapStyle }) {
  if (style === 'dark')      return <MoonIcon size={15} />
  if (style === 'light')     return <SunIcon  size={15} />
  return <SatelliteIcon size={15} />
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
        <StyleIcon style={value} />
      </button>

      {open && (
        <div className="map-style__menu">
          {(Object.keys(LABELS) as MapStyle[]).map(s => (
            <button
              key={s}
              className={`map-style__option${value === s ? ' map-style__option--active' : ''}`}
              onClick={() => { onChange(s); setOpen(false); }}
            >
              <StyleIcon style={s} /> {LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
