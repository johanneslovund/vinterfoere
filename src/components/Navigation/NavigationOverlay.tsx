// Pure UI overlay — no useMap(), safe to use anywhere
import { RouteStep } from '../../services/routeApi'
import { NavInfo } from './NavigationMapController'
import { FerryAnalysis } from '../../services/ferryService'
import { maneuverArrow, fmtDistance, fmtDuration } from '../../services/navigationService'
import './NavigationOverlay.css'

interface Props {
  steps:          RouteStep[]
  navInfo:        NavInfo | null
  ferryAnalyses?: FerryAnalysis[]
  routeStartTime?: Date
  onStop:         () => void
}

function fmtClock(d: Date) {
  return d.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
}

export function NavigationOverlay({ steps, navInfo, ferryAnalyses, routeStartTime, onStop }: Props) {
  const now = new Date();
  if (!steps.length) return null

  const idx      = navInfo?.stepIdx ?? 0
  const step     = steps[idx]
  const nextStep = steps[idx + 1]

  const distToNext = step?.distance ?? 0
  const remainDist = navInfo?.remainDist ?? 0
  const remainMin  = navInfo?.remainMin  ?? 0
  const eta        = navInfo?.eta        ?? '--:--'

  return (
    <div className="nav-overlay">
      {/* Main instruction card */}
      <div className="nav-instruction">
        <div className="nav-instruction__arrow">
          {step ? maneuverArrow(step.maneuverType, step.maneuverModifier) : '▶'}
        </div>
        <div className="nav-instruction__text">
          <div className="nav-instruction__distance">
            {fmtDistance(distToNext)}
          </div>
          <div className="nav-instruction__desc">
            {step?.instruction ?? 'Beregner…'}
          </div>
        </div>
        <button className="nav-instruction__stop" onClick={onStop}>
          Stopp
        </button>
      </div>

      {/* Status bar */}
      <div className="nav-status">
        <div className="nav-status__item">
          <span className="nav-status__value">{fmtDistance(remainDist)}</span>
          <span className="nav-status__label">Gjenstår</span>
        </div>
        <div className="nav-status__divider" />
        <div className="nav-status__item">
          <span className="nav-status__value">{fmtDuration(remainMin)}</span>
          <span className="nav-status__label">Tid</span>
        </div>
        <div className="nav-status__divider" />
        <div className="nav-status__item">
          <span className="nav-status__value">{eta}</span>
          <span className="nav-status__label">ETA</span>
        </div>
      </div>

      {/* Ferry banners — live ETAs during navigation */}
      {ferryAnalyses && ferryAnalyses.map((fa, i) => {
        const elapsed = routeStartTime
          ? (now.getTime() - routeStartTime.getTime()) / 60000 : 0;
        const remaining = Math.max(0, fa.ferry.driveTimeToFerryMin - elapsed);
        const liveEta   = new Date(now.getTime() + remaining * 60 * 1000);
        const nextFerry = fa.departures.find(d => d.time >= new Date(liveEta.getTime() - 2 * 60 * 1000));
        if (!nextFerry) return null;
        const minEarly  = (nextFerry.time.getTime() - liveEta.getTime()) / 60000;
        const willMiss  = minEarly < 0 && minEarly > -20;

        let reqSpeed: number | null = null;
        if (willMiss) {
          const hrs = (nextFerry.time.getTime() - now.getTime()) / 3600000;
          if (hrs > 0) { const r = fa.ferry.driveDistanceToFerryKm / hrs; if (r <= 120) reqSpeed = Math.round(r); }
        }

        return (
          <div key={i} className={`nav-ferry${willMiss ? ' nav-ferry--warn' : ''}`}>
            <div className="nav-ferry__name">⛴ {fa.ferry.name}</div>
            {willMiss && reqSpeed ? (
              <div className="nav-ferry__msg">
                Gå glipp av {fmtClock(nextFerry.time)} — kjør <strong>{reqSpeed} km/t</strong>
              </div>
            ) : (
              <div className="nav-ferry__msg">
                Rekker {fmtClock(nextFerry.time)} — ankommer {Math.round(minEarly)} min tidlig
              </div>
            )}
          </div>
        );
      })}

      {/* Next step hint + compass bearing */}
      <div className="nav-bottom-row">
        {nextStep && (
          <div className="nav-next">
            Deretter: {maneuverArrow(nextStep.maneuverType, nextStep.maneuverModifier)}{' '}
            {nextStep.instruction}
          </div>
        )}
        {navInfo?.bearing !== null && navInfo?.bearing !== undefined && (
          <div className="nav-compass" title={`${Math.round(navInfo.bearing)}°`}>
            <svg width="28" height="28" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="12" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"/>
              <polygon
                points="14,4 11,18 14,15 17,18"
                fill="#e53935"
                transform={`rotate(${navInfo.bearing}, 14, 14)`}
              />
              <polygon
                points="14,24 11,10 14,13 17,10"
                fill="rgba(255,255,255,0.4)"
                transform={`rotate(${navInfo.bearing}, 14, 14)`}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
