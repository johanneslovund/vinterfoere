import './WeatherLegend.css';

// RainViewer uses a dBZ-based colour scale: blue=light, green=moderate, yellow/red=heavy
const CONDITIONS = [
  { label: 'Kraftig nedbør', bg: 'rgb(220,  50,  50)' },
  { label: 'Moderat regn',   bg: 'rgb(255, 160,   0)' },
  { label: 'Lett regn',      bg: 'rgb(255, 240,  30)' },
  { label: 'Svak nedbør',    bg: 'rgb( 80, 200,  80)' },
  { label: 'Yr / dugg',      bg: 'rgb( 50, 160, 255)' },
  { label: 'Ingen nedbør',   bg: 'rgba(255,255,255,0.08)' },
];

export function WeatherLegend({ offset = false }: { offset?: boolean }) {
  return (
    <div className="wx-legend" style={offset ? { left: 138 } : undefined}>
      <div className="wx-legend__title">Nedbør (radar)</div>
      <div className="wx-legend__bar">
        {CONDITIONS.map(({ bg }) => (
          <div key={bg} className="wx-legend__swatch" style={{ background: bg }} />
        ))}
      </div>
      <div className="wx-legend__labels">
        {CONDITIONS.map(({ label }) => (
          <div key={label} className="wx-legend__label">
            <div className="wx-legend__tick" />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
