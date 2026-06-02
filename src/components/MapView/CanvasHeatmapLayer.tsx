import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { GridWeather } from '../../types/weather';

// Colour stops for the heatmap: [0→blue, 0.4→green, 0.65→yellow, 0.85→orange, 1→red]
function heatColor(t: number): [number, number, number] {
  const stops: Array<[number, [number, number, number]]> = [
    [0.00, [33,  150, 243]],
    [0.35, [76,  175, 80 ]],
    [0.60, [255, 235, 59 ]],
    [0.80, [255, 152, 0  ]],
    [1.00, [244, 67,  54 ]],
  ];
  for (let i = 1; i < stops.length; i++) {
    const [t0, c0] = stops[i - 1];
    const [t1, c1] = stops[i];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return [
        Math.round(c0[0] + f * (c1[0] - c0[0])),
        Math.round(c0[1] + f * (c1[1] - c0[1])),
        Math.round(c0[2] + f * (c1[2] - c0[2])),
      ];
    }
  }
  return [244, 67, 54];
}

class CanvasHeatmap extends L.Layer {
  private _canvas: HTMLCanvasElement | null = null;
  private _data: GridWeather[] = [];
  private _leafletMap: L.Map | null = null;

  setData(data: GridWeather[]) {
    this._data = data;
    if (this._leafletMap) this._redraw();
  }

  onAdd(map: L.Map) {
    this._leafletMap = map;
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
    map.getPanes().overlayPane!.appendChild(canvas);
    this._canvas = canvas;
    this._resize();
    map.on('moveend zoomend resize', this._onMove, this);
    this._redraw();
    return this;
  }

  onRemove(map: L.Map) {
    this._canvas?.remove();
    this._canvas = null;
    map.off('moveend zoomend resize', this._onMove, this);
    this._leafletMap = null;
    return this;
  }

  private _onMove() { this._resize(); this._redraw(); }

  private _resize() {
    if (!this._canvas || !this._leafletMap) return;
    const size = this._leafletMap.getSize();
    this._canvas.width  = size.x;
    this._canvas.height = size.y;
    const pos = this._leafletMap.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, pos);
  }

  private _redraw() {
    if (!this._canvas || !this._leafletMap || this._data.length === 0) return;

    const ctx = this._canvas.getContext('2d')!;
    const W = this._canvas.width;
    const H = this._canvas.height;
    ctx.clearRect(0, 0, W, H);

    const zoom = this._leafletMap.getZoom();
    // radius in pixels — bigger at lower zoom
    const radius = Math.max(30, 120 - zoom * 8);

    // Build intensity canvas
    const tmp = document.createElement('canvas');
    tmp.width = W; tmp.height = H;
    const tctx = tmp.getContext('2d')!;
    tctx.clearRect(0, 0, W, H);

    for (const w of this._data) {
      const pt = this._leafletMap.latLngToContainerPoint([w.lat, w.lon]);
      if (pt.x < -radius || pt.x > W + radius) continue;
      if (pt.y < -radius || pt.y > H + radius) continue;

      const grad = tctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
      grad.addColorStop(0,   `rgba(0,0,0,${(w.riskScore * 0.9).toFixed(3)})`);
      grad.addColorStop(0.4, `rgba(0,0,0,${(w.riskScore * 0.4).toFixed(3)})`);
      grad.addColorStop(1,   'rgba(0,0,0,0)');
      tctx.fillStyle = grad;
      tctx.fillRect(pt.x - radius, pt.y - radius, radius * 2, radius * 2);
    }

    // Colorise
    const src = tctx.getImageData(0, 0, W, H);
    const dst = ctx.createImageData(W, H);
    for (let i = 0; i < src.data.length; i += 4) {
      const intensity = src.data[i + 3] / 255;
      if (intensity < 0.01) continue;
      const [r, g, b] = heatColor(intensity);
      dst.data[i]     = r;
      dst.data[i + 1] = g;
      dst.data[i + 2] = b;
      dst.data[i + 3] = Math.round(intensity * 210);
    }
    ctx.putImageData(dst, 0, 0);
  }
}

interface Props { data: GridWeather[] }

export function CanvasHeatmapLayer({ data }: Props) {
  const map = useMap();
  const layerRef = useRef<CanvasHeatmap | null>(null);

  useEffect(() => {
    if (!layerRef.current) {
      layerRef.current = new CanvasHeatmap();
      layerRef.current.addTo(map);
    }
    layerRef.current.setData(data);
    return () => {
      layerRef.current?.remove();
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    layerRef.current?.setData(data);
  }, [data]);

  return null;
}
