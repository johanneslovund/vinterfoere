import { RISK_COLORS, RISK_LABELS } from '../../types/weather';
import './Legend.css';

export function Legend() {
  return (
    <div className="legend">
      <div className="legend__title">Risikokart</div>
      <div className="legend__gradient" />
      <div className="legend__labels">
        <span>Trygt</span>
        <span>Farlig</span>
      </div>

      <div className="legend__divider" />

      <div className="legend__items">
        {(Object.entries(RISK_LABELS) as [keyof typeof RISK_LABELS, string][]).map(([key, label]) => (
          <div key={key} className="legend__item">
            <div className="legend__dot" style={{ background: RISK_COLORS[key] }} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
