import { GridWeather, riskLevel, RISK_LABELS, RISK_COLORS } from '../../types/weather';
import './Sidebar.css';

interface SidebarProps {
  data: GridWeather[];
  loading: boolean;
  open: boolean;
  onToggle: () => void;
  onLocationClick: (lat: number, lon: number) => void;
}

function ConditionCard({ w, onClick }: { w: GridWeather; onClick: () => void }) {
  const level = riskLevel(w.riskScore);
  const label = RISK_LABELS[level];
  const color = RISK_COLORS[level];
  const iconUrl = `https://api.met.no/images/weathericons/svg/${w.symbolCode}.svg`;

  return (
    <div className="condition-card" onClick={onClick}>
      <div className="condition-card__top">
        <span className="condition-card__name">{w.name}</span>
        <span className="condition-card__badge" style={{ background: color }}>
          {label}
        </span>
      </div>
      <div className="condition-card__details">
        <img
          className="condition-card__icon"
          src={iconUrl}
          alt={w.symbolCode}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="condition-card__detail">
          🌡
          <span className="condition-card__detail-value">
            {w.airTemperature > 0 ? '+' : ''}{w.airTemperature.toFixed(1)}°C
          </span>
        </div>
        <div className="condition-card__detail">
          💨
          <span className="condition-card__detail-value">
            {w.windSpeed.toFixed(0)} m/s
          </span>
        </div>
        {w.precipitationAmount > 0 && (
          <div className="condition-card__detail">
            🌨
            <span className="condition-card__detail-value">
              {w.precipitationAmount.toFixed(1)} mm
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ data, loading, open, onToggle, onLocationClick }: SidebarProps) {

  const sorted = [...data].sort((a, b) => b.riskScore - a.riskScore);
  const dangerous = sorted.filter((w) => riskLevel(w.riskScore) === 'farlig');
  const warnings = sorted.filter((w) => riskLevel(w.riskScore) === 'advarsel');
  const rest = sorted.filter((w) =>
    riskLevel(w.riskScore) === 'forsiktig' || riskLevel(w.riskScore) === 'trygt'
  );

  return (
    <>
      <button
        className={`sidebar__toggle${open ? ' sidebar__toggle--open' : ''}`}
        onClick={onToggle}
        title={open ? 'Skjul panel' : 'Vis panel'}
      >
        {open ? '‹' : '›'}
      </button>

      <div className={`sidebar${open ? '' : ' sidebar--collapsed'}`}>
        <div className="sidebar__header">
          <div className="sidebar__title">Føreforhold</div>
          <div className="sidebar__subtitle">
            {loading
              ? 'Henter data…'
              : `${data.length} lokasjoner lastet`}
          </div>
        </div>

        <div className="sidebar__body">
          {loading && data.length === 0 ? (
            <div className="sidebar__loading">
              <div className="sidebar__spinner" />
              <div>Henter værdata…</div>
            </div>
          ) : (
            <>
              {dangerous.length > 0 && (
                <>
                  <div className="sidebar__section-title">⚠ Farlig</div>
                  {dangerous.map((w) => (
                    <ConditionCard
                      key={`${w.lat},${w.lon}`}
                      w={w}
                      onClick={() => onLocationClick(w.lat, w.lon)}
                    />
                  ))}
                </>
              )}
              {warnings.length > 0 && (
                <>
                  <div className="sidebar__section-title">Advarsel</div>
                  {warnings.map((w) => (
                    <ConditionCard
                      key={`${w.lat},${w.lon}`}
                      w={w}
                      onClick={() => onLocationClick(w.lat, w.lon)}
                    />
                  ))}
                </>
              )}
              {rest.length > 0 && (
                <>
                  <div className="sidebar__section-title">Øvrige</div>
                  {rest.map((w) => (
                    <ConditionCard
                      key={`${w.lat},${w.lon}`}
                      w={w}
                      onClick={() => onLocationClick(w.lat, w.lon)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
