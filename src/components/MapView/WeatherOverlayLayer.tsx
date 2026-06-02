import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { GridWeather } from '../../types/weather';

// Returns [r, g, b, maxAlpha] for a given weather condition
function weatherColor(sym: string, temp: number, precip: number): [number, number, number, number] {
  const s = sym.toLowerCase();

  // Snow / blizzard — white/blue
  if (s.includes('snow') || s.includes('blizzard')) {
    const intensity = Math.min(1, 0.5 + precip * 0.3);
    return [210, 230, 255, Math.round(intensity * 160)];
  }

  // Sleet or freezing rain — amber warning
  if (s.includes('sleet') || (s.includes('rain') && temp < 2)) {
    return [255, 190, 50, 150];
  }

  // Heavy/moderate rain — blue
  if (s.includes('heavyrain') || s.includes('rain')) {
    const intensity = Math.min(1, 0.4 + precip * 0.2);
    return [50, 120, 255, Math.round(intensity * 140)];
  }

  // Light rain / drizzle
  if (s.includes('drizzle') || s.includes('lightrain')) {
    return [100, 160, 255, 100];
  }

  // Fog — grey-white
  if (s.includes('fog')) {
    return [200, 210, 220, 110];
  }

  // Heavy cloud cover
  if (s.includes('cloudy') && !s.includes('partly') && !s.includes('fair')) {
    return [130, 145, 160, 70];
  }

  // Partly cloudy / fair
  if (s.includes('partly') || s.includes('fair')) {
    return [150, 175, 200, 40];
  }

  // Clear sky — very faint tint so the toggle visibly does something
  return [180, 210, 240, 18];
}

class WeatherCanvas extends L.Layer {
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

    const zoom   = this._leafletMap.getZoom();
    const radius = Math.max(30, 115 - zoom * 8);

    for (const w of this._data) {
      const pt = this._leafletMap.latLngToContainerPoint([w.lat, w.lon]);
      if (pt.x < -radius || pt.x > W + radius) continue;
      if (pt.y < -radius || pt.y > H + radius) continue;

      const [r, g, b, maxA] = weatherColor(w.symbolCode, w.airTemperature, w.precipitationAmount);
      if (maxA < 5) continue;

      const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
      grad.addColorStop(0,   `rgba(${r},${g},${b},${(maxA / 255).toFixed(3)})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${(maxA * 0.5 / 255).toFixed(3)})`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(pt.x - radius, pt.y - radius, radius * 2, radius * 2);
    }
  }
}

interface Props { data: GridWeather[] }

export function WeatherOverlayLayer({ data }: Props) {
  const map      = useMap();
  const layerRef = useRef<WeatherCanvas | null>(null);

  useEffect(() => {
    layerRef.current = new WeatherCanvas();
    layerRef.current.addTo(map);
    if (data.length > 0) layerRef.current.setData(data);
    return () => { layerRef.current?.remove(); layerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (data.length > 0) layerRef.current?.setData(data);
  }, [data]);

  return null;
}
