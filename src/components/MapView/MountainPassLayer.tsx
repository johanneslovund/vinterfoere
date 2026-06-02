import { CircleMarker, Tooltip } from 'react-leaflet';
import { MOUNTAIN_PASSES, PASS_VISIBILITY_ALTITUDE } from '../../services/mountainPasses';
import { GridWeather, riskLevel, RISK_COLORS } from '../../types/weather';

function nearestWeather(lat: number, lon: number, grid: GridWeather[]): GridWeather | null {
  if (!grid.length) return null;
  let best = grid[0];
  let bestD = Infinity;
  for (const w of grid) {
    const d = Math.hypot(w.lat - lat, w.lon - lon);
    if (d < bestD) { bestD = d; best = w; }
  }
  return best;
}

interface Props {
  gridData: GridWeather[];
}

export function MountainPassLayer({ gridData }: Props) {
  return (
    <>
      {MOUNTAIN_PASSES.filter((p) => p.altitude >= PASS_VISIBILITY_ALTITUDE).map((pass) => {
        const wx = nearestWeather(pass.lat, pass.lon, gridData);
        const score = wx?.riskScore ?? 0;
        const level = riskLevel(score);
        const color = RISK_COLORS[level];

        return (
          <CircleMarker
            key={pass.name}
            center={[pass.lat, pass.lon]}
            radius={8}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.92,
              color: '#fff',
              weight: 1.5,
            }}
          >
            <Tooltip className="vf-tooltip" permanent={false}>
              <strong>{pass.name}</strong><br />
              {pass.road} · {pass.altitude} m.o.h.
              {wx && (
                <>
                  <br />
                  {wx.airTemperature > 0 ? '+' : ''}{wx.airTemperature.toFixed(1)}°C
                  {' · '}{wx.windSpeed.toFixed(0)} m/s
                </>
              )}
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
