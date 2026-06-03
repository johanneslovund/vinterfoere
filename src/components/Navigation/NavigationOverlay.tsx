import { useState } from 'react'
import { RouteStep } from '../../services/routeApi'
import { NavInfo } from './NavigationMapController'
import { FerryAnalysis } from '../../services/ferryService'
import { maneuverArrow, fmtDistance, fmtDuration } from '../../services/navigationService'
import './NavigationOverlay.css'

function fmtClock(d: Date) {
  return d.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  steps:           RouteStep[]
  navInfo:         NavInfo | null
  ferryAnalyses?:  FerryAnalysis[]
  routeStartTime?: Date
  onStop:          () => void
}

export function NavigationOverlay({ steps, navInfo, ferryAnalyses, routeStartTime, onStop }: Props) {
  // Per-ferry skip offsets: user can choose a later departure
  const [ferrySkips, setFerrySkips] = useState<number[]>([]);
  // Only show the first ferry (index 0) at a time to minimize clutter
  const ferryIdx = 0;

  if (!steps.length) return null

  const idx      = navInfo?.stepIdx ?? 0
  const step     = steps[idx]
  const nextStep = steps[idx + 1]

  return (
    <div className="nav-overlay">
      {/* Main instruction card */}
      <div className="nav-instruction">
        <div className="nav-instruction__arrow">
          {step ? maneuverArrow(step.maneuverType, step.maneuverModifier) : '▶'}
        </div>
        <div className="nav-instruction__text">
          <div className="nav-instruction__distance">
            {fmtDistance(step?.distance ?? 0)}
          </div>
          <div className="nav-instruction__desc">
            {step?.instruction ?? 'Beregner…'}
          </div>
        </div>
        <button className="nav-instruction__stop" onClick={onStop}>Stopp</button>
      </div>

      {/* Ferry thin bar — only first ferry, minimal clutter */}
      {ferryAnalyses && ferryAnalyses.length > 0 && (() => {
        const fa  = ferryAnalyses[ferryIdx];
        const now = new Date();
        const elapsed   = routeStartTime
          ? (now.getTime() - routeStartTime.getTime()) / 60000 : 0;
        const remaining = Math.max(0, fa.ferry.driveTimeToFerryMin - elapsed);
        const liveEta   = new Date(now.getTime() + remaining * 60 * 1000);

        const upcoming = fa.departures.filter(
          d => d.time >= new Date(liveEta.getTime() - 2 * 60 * 1000)
        );
        const skip   = ferrySkips[ferryIdx] ?? 0;
        let target   = upcoming[skip] ?? upcoming[0];
        if (!target) return null;

        const minEarly   = (target.time.getTime() - liveEta.getTime()) / 60000;
        const isGood     = minEarly >= 0;
        const canMiss    = minEarly < 0 && minEarly > -25;
        const canSkip    = upcoming.length > skip + 1;
        const LIMIT      = fa.speedLimitKmh ?? 80;

        // Calculate excess speed needed
        let excessSpeed: number | null = null;
        if (canMiss) {
          const hrs = (target.time.getTime() - now.getTime()) / 3600000;
          if (hrs > 0) {
            const req = fa.ferry.driveDistanceToFerryKm / hrs;
            const excess = Math.round(req - LIMIT);
            if (excess > 0 && req <= LIMIT + 40) excessSpeed = excess;
          }
        }

        // Auto-skip if excess > 15 km/h above limit — user can't realistically make it
        if (canMiss && (excessSpeed === null || excessSpeed > 15) && canSkip && skip === 0) {
          const autoSkipFerries = [...ferrySkips];
          autoSkipFerries[ferryIdx] = 1;
          // Use next ferry as the display target
          target = upcoming[1];
          const newMin = (target.time.getTime() - liveEta.getTime()) / 60000;
          return (
            <div className="nav-ferry-bar nav-ferry-bar--next">
              <span className="nav-ferry-bar__name">⛴ {fa.ferry.name}</span>
              <span className="nav-ferry-bar__dep">{fmtClock(target.time)}</span>
              <span className="nav-ferry-bar__status">Neste (+{Math.round(newMin)} min margin)</span>
              <button className="nav-ferry-bar__btn"
                onClick={() => { const n=[...ferrySkips]; n[ferryIdx]=0; setFerrySkips(n); }}>
                Forrige
              </button>
            </div>
          );
        }

        return (
          <div className={`nav-ferry-bar${isGood ? ' nav-ferry-bar--ok' : canMiss ? ' nav-ferry-bar--warn' : ''}`}>
            <span className="nav-ferry-bar__name">⛴ {fa.ferry.name}</span>
            <span className="nav-ferry-bar__dep">{fmtClock(target.time)}</span>
            <span className="nav-ferry-bar__status">
              {isGood
                ? `+${Math.round(minEarly)} min`
                : canMiss && excessSpeed
                  ? `+${excessSpeed} km/t over grensen`
                  : ''}
            </span>
            {canSkip && !isGood && (
              <button className="nav-ferry-bar__btn"
                onClick={() => { const n=[...ferrySkips]; n[ferryIdx]=(n[ferryIdx]??0)+1; setFerrySkips(n); }}>
                Neste ferje
              </button>
            )}
            {skip > 0 && (
              <button className="nav-ferry-bar__btn nav-ferry-bar__btn--reset"
                onClick={() => { const n=[...ferrySkips]; n[ferryIdx]=0; setFerrySkips(n); }}>
                ← Tilbake
              </button>
            )}
          </div>
        );
      })()}

      {/* Status bar */}
      <div className="nav-status">
        <div className="nav-status__item">
          <span className="nav-status__value">{fmtDistance(navInfo?.remainDist ?? 0)}</span>
          <span className="nav-status__label">Gjenstår</span>
        </div>
        <div className="nav-status__divider" />
        <div className="nav-status__item">
          <span className="nav-status__value">{fmtDuration(navInfo?.remainMin ?? 0)}</span>
          <span className="nav-status__label">Tid</span>
        </div>
        <div className="nav-status__divider" />
        <div className="nav-status__item">
          <span className="nav-status__value">{navInfo?.eta ?? '--:--'}</span>
          <span className="nav-status__label">ETA</span>
        </div>
      </div>

      {/* Next step + compass */}
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
              <polygon points="14,4 11,18 14,15 17,18" fill="#e53935"
                transform={`rotate(${navInfo.bearing}, 14, 14)`}/>
              <polygon points="14,24 11,10 14,13 17,10" fill="rgba(255,255,255,0.4)"
                transform={`rotate(${navInfo.bearing}, 14, 14)`}/>
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
