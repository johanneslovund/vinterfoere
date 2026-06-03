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

      {/* Ferry banners — live ETAs */}
      {ferryAnalyses && ferryAnalyses.map((fa, i) => {
        const now     = new Date();
        const elapsed = routeStartTime
          ? (now.getTime() - routeStartTime.getTime()) / 60000 : 0;
        const remaining = Math.max(0, fa.ferry.driveTimeToFerryMin - elapsed);
        const liveEta   = new Date(now.getTime() + remaining * 60 * 1000);

        // Apply skip offset
        const skip      = ferrySkips[i] ?? 0;
        const upcoming  = fa.departures.filter(d =>
          d.time >= new Date(liveEta.getTime() - 2 * 60 * 1000)
        );
        const target    = upcoming[skip] ?? upcoming[0];
        if (!target) return null;

        const minEarly  = (target.time.getTime() - liveEta.getTime()) / 60000;
        const willMiss  = minEarly < 0 && minEarly > -25;
        const isGood    = minEarly >= 0;
        const canSkip   = upcoming.length > skip + 1;

        let reqSpeed: number | null = null;
        if (willMiss && !skip) {
          const hrs = (target.time.getTime() - now.getTime()) / 3600000;
          if (hrs > 0) { const r = fa.ferry.driveDistanceToFerryKm / hrs; if (r <= 120) reqSpeed = Math.round(r); }
        }

        return (
          <div key={i} className={`nav-ferry-card${isGood ? ' nav-ferry-card--ok' : ''}`}>
            {/* Ferry name + next departure */}
            <div className="nav-ferry-card__header">
              <span className="nav-ferry-card__name">⛴ {fa.ferry.name}</span>
              <span className="nav-ferry-card__dep">{fmtClock(target.time)} → {target.destination}</span>
            </div>

            {/* Status */}
            {isGood ? (
              <div className="nav-ferry-card__status nav-ferry-card__status--ok">
                ✓ Rekker ferjen — ankommer <strong>{Math.round(minEarly)} min</strong> tidlig
              </div>
            ) : willMiss && reqSpeed ? (
              <div className="nav-ferry-card__status nav-ferry-card__status--warn">
                Gå glipp — kjør <strong>{reqSpeed} km/t</strong> snitt for å rekke
              </div>
            ) : (
              <div className="nav-ferry-card__status">
                Neste avgang kl. {fmtClock(target.time)}
              </div>
            )}

            {/* "Ta neste ferje" option */}
            {canSkip && (
              <button
                className="nav-ferry-card__skip"
                onClick={() => {
                  const next = [...ferrySkips];
                  next[i] = (next[i] ?? 0) + 1;
                  setFerrySkips(next);
                }}
              >
                Ta neste ferje ({fmtClock(upcoming[skip + 1].time)})
              </button>
            )}
            {skip > 0 && (
              <button className="nav-ferry-card__skip nav-ferry-card__skip--reset"
                onClick={() => { const n=[...ferrySkips]; n[i]=0; setFerrySkips(n); }}>
                Tilbake til {fmtClock(upcoming[0].time)}
              </button>
            )}
          </div>
        );
      })}

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
