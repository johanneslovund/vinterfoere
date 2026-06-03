import { useState, useEffect, useCallback, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Canvas-based tile layer that manually clamps zoom to 2–12.
// Never requests tiles outside that range — eliminates "Zoom Level Not Supported".
class RainTileLayer extends L.GridLayer {
  private _tileUrl = '';

  setUrl(url: string) {
    this._tileUrl = url;
    this.redraw();
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const size   = this.getTileSize().x;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx    = canvas.getContext('2d')!;

    // Clamp to native range 2–12
    const MIN_Z = 2, MAX_Z = 12;
    const nativeZ = Math.min(MAX_Z, Math.max(MIN_Z, coords.z));
    const scale   = Math.pow(2, coords.z - nativeZ);   // >1 when zoomed in
    const nativeX = Math.floor(coords.x / scale);
    const nativeY = Math.floor(coords.y / scale);

    const url = this._tileUrl
      .replace('{z}', String(nativeZ))
      .replace('{x}', String(nativeX))
      .replace('{y}', String(nativeY));

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        if (scale > 1) {
          // Zoomed past native max: crop the sub-tile portion and magnify
          const srcFrac = 1 / scale;
          const srcX = (coords.x % scale) * srcFrac * 256;
          const srcY = (coords.y % scale) * srcFrac * 256;
          const srcW = srcFrac * 256;
          ctx.drawImage(img, srcX, srcY, srcW, srcW, 0, 0, size, size);
        } else {
          ctx.drawImage(img, 0, 0, size, size);
        }
      } catch { /* cors/empty tile */ }
      done(undefined, canvas);
    };
    img.onerror = () => done(undefined, canvas);   // transparent on error
    img.src = url;
    return canvas;
  }
}

export function RainViewerLayer() {
  const map        = useMap();
  const layerRef   = useRef<RainTileLayer | null>(null);
  const [, setVer] = useState(0); // force re-render unused

  const load = useCallback(async () => {
    try {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      if (!res.ok) return;
      const data = await res.json() as { radar: { past: Array<{ path: string }> } };
      const frames = data.radar?.past ?? [];
      if (!frames.length) return;

      const path = frames[frames.length - 1].path;
      const url  = `https://tilecache.rainviewer.com${path}/256/{z}/{x}/{y}/6/1_1.png`;

      if (!layerRef.current) {
        layerRef.current = new RainTileLayer({ opacity: 0.65, tileSize: 256, zIndex: 400,
          attribution: 'Nedbørradar &copy; <a href="https://www.rainviewer.com">RainViewer</a>' });
        layerRef.current.addTo(map);
      }
      layerRef.current.setUrl(url);
      setVer(v => v + 1);
    } catch { /* silent */ }
  }, [map]);

  useEffect(() => {
    load();
    const id = setInterval(load, 10 * 60 * 1000);
    return () => {
      clearInterval(id);
      layerRef.current?.remove();
      layerRef.current = null;
    };
  }, [load]);

  return null;
}
