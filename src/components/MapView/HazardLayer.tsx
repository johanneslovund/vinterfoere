import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { Hazard } from '../../services/hazardService'

function makeHazardIcon(emoji: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      font-size:18px;line-height:1;
      filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6));
      cursor:pointer;
    ">${emoji}</div>`,
    iconSize:    [22, 22],
    iconAnchor:  [11, 11],
    popupAnchor: [0, -14],
  })
}

interface Props { hazards: Hazard[] }

export function HazardLayer({ hazards }: Props) {
  const map      = useMap()
  const groupRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    groupRef.current = L.layerGroup().addTo(map)
    return () => { groupRef.current?.remove(); groupRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const group = groupRef.current
    if (!group || hazards.length === 0) return
    group.clearLayers()

    hazards.forEach(h => {
      const icon = makeHazardIcon(h.emoji)
      const marker = L.marker([h.lat, h.lon], { icon })
      marker.bindPopup(`
        <div style="font-family:system-ui;color:#e6edf3;font-size:13px;padding:4px 2px">
          <strong>${h.emoji} ${h.label}</strong>
        </div>
      `, { className: 'vf-tooltip', maxWidth: 180 })
      group.addLayer(marker)
    })
  }, [hazards])

  return null
}
