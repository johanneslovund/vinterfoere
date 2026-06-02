import './ElevationLegend.css';

const LABELS = [
  { elev: '2500 m', top: true },
  { elev: '2000 m', top: false },
  { elev: '1600 m', top: false },
  { elev: '1200 m', top: false },
  { elev: '900 m',  top: false },
  { elev: '600 m',  top: false },
  { elev: '300 m',  top: false },
  { elev: '100 m',  top: false },
  { elev: '0 m',    top: false },
];

export function ElevationLegend({ offset = false }: { offset?: boolean }) {
  return (
    <div className="elev-legend" style={offset ? { left: 138 } : undefined}>
      <div className="elev-legend__bar" />
      <div className="elev-legend__labels">
        {LABELS.map(({ elev }) => (
          <div key={elev} className="elev-legend__label">
            <div className="elev-legend__tick" />
            {elev}
          </div>
        ))}
      </div>
    </div>
  );
}
