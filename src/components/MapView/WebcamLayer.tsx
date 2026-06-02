import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { Webcam } from '../../services/webcamService'

const CLUSTER_STYLE = `
.webcam-cluster {
  background: rgba(8,11,20,0.78) !important;
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(137,207,240,0.5) !important;
  border-radius: 50% !important;
  color: #89cff0 !important;
  font-weight: 700 !important;
  font-size: 12px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 2px 12px rgba(0,0,0,0.45) !important;
}
.webcam-cluster div {
  background: transparent !important;
  color: #89cff0 !important;
  font-weight: 700 !important;
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 50% !important;
  border: none !important;
  box-shadow: none !important;
}
.webcam-popup .leaflet-popup-content-wrapper {
  background: rgba(8,11,20,0.90) !important;
  backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.55) !important;
  color: #e6edf3 !important;
  padding: 0 !important;
}
.webcam-popup .leaflet-popup-tip {
  background: rgba(8,11,20,0.90) !important;
}
.webcam-popup .leaflet-popup-close-button {
  color: rgba(255,255,255,0.4) !important;
  font-size: 18px !important;
  right: 10px !important;
  top: 8px !important;
}
`

function injectStyle() {
  if (document.getElementById('webcam-cluster-style')) return
  const s = document.createElement('style')
  s.id = 'webcam-cluster-style'
  s.textContent = CLUSTER_STYLE
  document.head.appendChild(s)
}

function makeCameraIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:rgba(8,11,20,0.72);
      backdrop-filter:blur(10px);
      border:1px solid rgba(137,207,240,0.5);
      border-radius:7px;
      padding:3px 7px;
      font-size:13px;
      color:#89cff0;
      box-shadow:0 2px 10px rgba(0,0,0,0.4);
    ">🎥</div>`,
    iconSize:    [28, 22],
    iconAnchor:  [14, 11],
    popupAnchor: [0, -14],
  })
}

function buildPopup(cam: Webcam): string {
  const title = cam.orientation
    ? `${cam.name} – ${cam.orientation}`
    : cam.name
  const roadBadge = cam.road
    ? `<span style="background:rgba(137,207,240,0.15);border:1px solid rgba(137,207,240,0.3);
        border-radius:4px;padding:1px 7px;font-size:10px;font-weight:700;color:#89cff0;
        margin-left:6px">${cam.road}</span>`
    : ''

  // Add cache-busting timestamp so image refreshes each time popup opens
  const imgSrc = `${cam.imageUrl}?t=${Date.now()}`

  return `
    <div style="font-family:system-ui,sans-serif;width:280px;padding:12px">
      <div style="font-weight:700;font-size:13px;margin-bottom:10px;
          color:#e6edf3;display:flex;align-items:center;gap:4px">
        🎥 ${title}${roadBadge}
      </div>
      <div style="border-radius:8px;overflow:hidden;background:#000;line-height:0;
          border:1px solid rgba(255,255,255,0.08)">
        <img
          src="${imgSrc}"
          alt="${cam.name}"
          style="width:100%;max-height:180px;object-fit:cover;display:block"
          onerror="this.parentElement.innerHTML='<div style=\\'padding:24px;text-align:center;color:rgba(255,255,255,0.3);font-size:12px\\'>Bilde ikke tilgjengelig</div>'"
        />
      </div>
      <div style="margin-top:8px;font-size:10px;color:rgba(255,255,255,0.3);text-align:right">
        Klikk for å oppdatere bildet
      </div>
    </div>
  `
}

interface Props { cameras: Webcam[] }

export function WebcamLayer({ cameras }: Props) {
  const map        = useMap()
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const icon       = useRef(makeCameraIcon())

  useEffect(() => {
    injectStyle()

    const cluster = (L as typeof L & {
      markerClusterGroup: (opts: object) => L.MarkerClusterGroup
    }).markerClusterGroup({
      iconCreateFunction: (c: L.MarkerCluster) => L.divIcon({
        className: 'webcam-cluster',
        html: `<div>${c.getChildCount()}</div>`,
        iconSize: [36, 36],
      }),
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    })

    cluster.addTo(map)
    clusterRef.current = cluster

    return () => {
      cluster.remove()
      clusterRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster || cameras.length === 0) return

    cluster.clearLayers()

    const markers = cameras.map(cam => {
      const marker = L.marker([cam.lat, cam.lon], { icon: icon.current })
      marker.bindPopup(buildPopup(cam), {
        className: 'webcam-popup',
        maxWidth: 310,
        minWidth: 280,
      })
      // Refresh image each time popup opens
      marker.on('popupopen', () => {
        marker.getPopup()?.setContent(buildPopup(cam))
      })
      return marker
    })

    cluster.addLayers(markers)
  }, [cameras])

  return null
}
