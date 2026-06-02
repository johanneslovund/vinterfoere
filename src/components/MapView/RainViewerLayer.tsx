import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export function RainViewerLayer() {
  const map      = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);

  const load = useCallback(async () => {
    try {
      const res  = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      if (!res.ok) return;
      const data = await res.json() as {
        radar: { past: Array<{ path: string }> };
      };
      const frames = data.radar?.past ?? [];
      if (!frames.length) return;

      const path = frames[frames.length - 1].path;
      const url  = `https://tilecache.rainviewer.com${path}/256/{z}/{x}/{y}/6/1_1.png`;

      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }

      layerRef.current = L.tileLayer(url, {
        opacity:        0.6,
        tileSize:       256,
        minNativeZoom:  2,
        maxNativeZoom:  12,
        zIndex:         400,
        attribution:    'Nedbørradar &copy; <a href="https://www.rainviewer.com">RainViewer</a>',
      }).addTo(map);

    } catch { /* silent */ }
  }, [map]);

  useEffect(() => {
    load();
    const id = setInterval(load, 10 * 60 * 1000);
    return () => {
      clearInterval(id);
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [load, map]);

  return null;
}
