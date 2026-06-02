import './Legend.css';

// Vertical gradient bar — top = farlig (red), bottom = trygt (blue)
const LABELS = [
  { label: 'Farlig'   },
  { label: 'Advarsel' },
  { label: 'Forsiktig'},
  { label: 'Trygt'    },
];

export function Legend() {
  return (
    <div className="legend">
      <div className="legend__bar" />
      <div className="legend__labels">
        {LABELS.map(({ label }) => (
          <div key={label} className="legend__label">
            <div className="legend__tick" />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
