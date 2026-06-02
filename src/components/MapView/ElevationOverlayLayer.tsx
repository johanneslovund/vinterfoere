import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { GridWeather } from '../../types/weather';

// AWS Terrarium tiles — free, no key, CORS enabled
// elevation (m) = (R × 256 + G + B/256) − 32768
const TERRAIN_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

// ── Hypsometric ramp ────────────────────────────────────────────────────────
// [elevation, r, g, b]  — alpha is applied separately after temperature blend
const ELEV_RAMP: Array<[number, number, number, number]> = [
  [  -1,   0,   0,   0],
  [   0,  20,  60, 120],
  [ 100,  50, 130, 190],
  [ 300,  80, 175, 130],
  [ 600, 160, 195,  80],
  [ 900, 220, 200,  50],
  [1200, 230, 140,  40],
  [1600, 210,  70,  40],
  [2000, 180,  40,  40],
  [2500, 240, 240, 255],
];

function elevRgb(elev: number): [number, number, number] {
  if (elev < 0) return [0, 0, 0];
  for (let i = 1; i < ELEV_RAMP.length; i++) {
    if (elev <= ELEV_RAMP[i][0]) {
      const f = (elev - ELEV_RAMP[i-1][0]) / (ELEV_RAMP[i][0] - ELEV_RAMP[i-1][0]);
      return [
        Math.round(ELEV_RAMP[i-1][1] + f * (ELEV_RAMP[i][1] - ELEV_RAMP[i-1][1])),
        Math.round(ELEV_RAMP[i-1][2] + f * (ELEV_RAMP[i][2] - ELEV_RAMP[i-1][2])),
        Math.round(ELEV_RAMP[i-1][3] + f * (ELEV_RAMP[i][3] - ELEV_RAMP[i-1][3])),
      ];
    }
  }
  return [240, 240, 255];
}

// ── Temperature tint ─────────────────────────────────────────────────────────
// Returns [r, g, b, blendStrength 0–1]
function tempTint(temp: number): [number, number, number, number] {
  if (temp < -15) return [180, 210, 255, 0.45]; // deep freeze — strong ice blue
  if (temp < -5)  return [150, 190, 255, 0.30]; // cold — blue tint
  if (temp < 0)   return [200, 225, 255, 0.20]; // below freezing — light blue
  if (temp < 2)   return [255, 210,  60, 0.35]; // danger zone (near-zero w/ precip risk) — amber
  if (temp < 8)   return [255, 255, 200, 0.10]; // cool — barely any shift
  return                  [255, 200, 120, 0.12]; // warm — faint warm tint
}

function blendRgb(
  [er, eg, eb]: [number, number, number],
  [tr, tg, tb, strength]: [number, number, number, number]
): [number, number, number] {
  return [
    Math.round(er + strength * (tr - er)),
    Math.round(eg + strength * (tg - eg)),
    Math.round(eb + strength * (tb - eb)),
  ];
}

// ── Temperature lookup helpers ────────────────────────────────────────────────

// Tile coords → lat/lon for a given pixel offset
function pixelLatLon(
  tx: number, ty: number, tz: number,
  px: number, py: number, tileSize: number
): [number, number] {
  const n   = Math.pow(2, tz);
  const lon = (tx + px / tileSize) / n * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (ty + py / tileSize) / n)));
  return [latRad * 180 / Math.PI, lon];
}

function nearestTemp(lat: number, lon: number, grid: GridWeather[]): number {
  let best = 5; // default mild if no data
  let bestD = Infinity;
  for (const w of grid) {
    const d = Math.hypot(w.lat - lat, w.lon - lon);
    if (d < bestD) { bestD = d; best = w.airTemperature; }
  }
  return best;
}

// Build a coarse temperature grid for the tile (17×17 samples, bilinear interpolated)
function buildTempSamples(
  tx: number, ty: number, tz: number,
  grid: GridWeather[],
  tileSize: number,
  steps: number
): number[][] {
  const samples: number[][] = [];
  for (let sy = 0; sy <= steps; sy++) {
    samples[sy] = [];
    for (let sx = 0; sx <= steps; sx++) {
      const [lat, lon] = pixelLatLon(tx, ty, tz, sx / steps * tileSize, sy / steps * tileSize, tileSize);
      samples[sy][sx] = nearestTemp(lat, lon, grid);
    }
  }
  return samples;
}

function sampleTemp(samples: number[][], px: number, py: number, tileSize: number, steps: number): number {
  const sx = (px / tileSize) * steps;
  const sy = (py / tileSize) * steps;
  const gx = Math.min(Math.floor(sx), steps - 1);
  const gy = Math.min(Math.floor(sy), steps - 1);
  const fx = sx - gx, fy = sy - gy;
  return (
    samples[gy    ][gx    ] * (1 - fx) * (1 - fy) +
    samples[gy    ][gx + 1] * fx       * (1 - fy) +
    samples[gy + 1][gx    ] * (1 - fx) * fy       +
    samples[gy + 1][gx + 1] * fx       * fy
  );
}

// ── GridLayer ─────────────────────────────────────────────────────────────────

class ElevTempGridLayer extends L.GridLayer {
  private _weatherData: GridWeather[] = [];

  setWeatherData(data: GridWeather[]) {
    this._weatherData = data;
    if (data.length > 0) this.redraw();
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const size    = this.getTileSize();
    const W       = size.x;
    const H       = size.y;
    const canvas  = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;

    const weatherSnap = [...this._weatherData]; // snapshot to avoid race

    const url = TERRAIN_URL
      .replace('{z}', String(coords.z))
      .replace('{x}', String(coords.x))
      .replace('{y}', String(coords.y));

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, W, H);
      const src = ctx.getImageData(0, 0, W, H);

      // Build coarse temperature grid (16 steps = 17×17 samples per tile)
      const STEPS = 16;
      const tempSamples = weatherSnap.length > 0
        ? buildTempSamples(coords.x, coords.y, coords.z, weatherSnap, W, STEPS)
        : null;

      const out = ctx.createImageData(W, H);
      for (let py = 0; py < H; py++) {
        for (let px = 0; px < W; px++) {
          const i   = (py * W + px) * 4;
          const r   = src.data[i];
          const g   = src.data[i + 1];
          const b   = src.data[i + 2];
          const elev = (r * 256 + g + b / 256) - 32768;

          if (elev < 0) { out.data[i + 3] = 0; continue; }

          const eRgb  = elevRgb(elev);

          // Blend with temperature if data available
          let finalRgb = eRgb;
          if (tempSamples) {
            const temp  = sampleTemp(tempSamples, px, py, W, STEPS);
            const tint  = tempTint(temp);
            finalRgb    = blendRgb(eRgb, tint);
          }

          // Alpha: stronger at higher elevations
          const alpha = Math.min(220, 120 + elev * 0.06);

          out.data[i]     = finalRgb[0];
          out.data[i + 1] = finalRgb[1];
          out.data[i + 2] = finalRgb[2];
          out.data[i + 3] = Math.round(alpha);
        }
      }

      ctx.putImageData(out, 0, 0);
      done(undefined, canvas);
    };

    img.onerror = () => done(new Error('tile error'), canvas);
    img.src = url;
    return canvas;
  }
}

// ── React wrapper ─────────────────────────────────────────────────────────────

interface Props { data: GridWeather[] }

export function ElevationOverlayLayer({ data }: Props) {
  const map     = useMap();
  const layerRef = useRef<ElevTempGridLayer | null>(null);

  useEffect(() => {
    layerRef.current = new ElevTempGridLayer({
      tileSize: 256,
      opacity: 1,
      zIndex: 300,
      minZoom: 3,
      maxZoom: 14,
      updateWhenIdle: false,
    });
    layerRef.current.addTo(map);
    return () => { layerRef.current?.remove(); layerRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push updated weather data whenever it arrives
  useEffect(() => {
    if (data.length > 0) layerRef.current?.setWeatherData(data);
  }, [data]);

  return null;
}
