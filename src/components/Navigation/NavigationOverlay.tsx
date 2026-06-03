import { useState, useEffect } from 'react'
import { RouteStep } from '../../services/routeApi'
import { NavInfo } from './NavigationMapController'
import { FerryAnalysis } from '../../services/ferryService'
import { maneuverArrow, fmtDistance } from '../../services/navigationService'
import './NavigationOverlay.css'

function fmtClock(d: Date) {
  return d.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  steps:           RouteStep[]
  navInfo:         NavInfo | null
  ferryAnalyses?:  FerryAnalysis[]
  routeStartTime?: Date
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onStop:          () => void
}

export function NavigationOverlay({ steps, navInfo, ferryAnalyses, routeStartTime }: Props) {
  const [ferrySkips, setFerrySkips] = useState<number[]>([]);
  const ferryIdx = 0;
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(id);
  }, []);

  if (!steps.length) return null

  const idx      = navInfo?.stepIdx ?? 0
  const step     = steps[idx]
  const nextStep = steps[idx + 1]

  return (
    <div className="nav-overlay">
      {/* ── Block 1: Current instruction + next step ── */}
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
          {nextStep && (
            <div className="nav-instruction__next">
              Deretter: {maneuverArrow(nextStep.maneuverType, nextStep.maneuverModifier)}{' '}
              {nextStep.instruction}
            </div>
          )}
        </div>
        {navInfo?.bearing !== null && navInfo?.bearing !== undefined && (
          <svg className="nav-compass-mini" width="28" height="28" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="12" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
            <polygon points="14,4 11,16 14,13 17,16" fill="#e53935"
              transform={`rotate(${navInfo.bearing}, 14, 14)`}/>
            <polygon points="14,24 11,12 14,15 17,12" fill="rgba(255,255,255,0.4)"
              transform={`rotate(${navInfo.bearing}, 14, 14)`}/>
          </svg>
        )}
      </div>

      {/* ── Block 2: Ferry progress line ── */}
      {ferryAnalyses && ferryAnalyses.length > 0 && (() => {
        const fa = ferryAnalyses[ferryIdx];
        const elapsed = routeStartTime
          ? (now.getTime() - routeStartTime.getTime()) / 60000 : 0;
        let remainingToFerryMin: number;
        if (navInfo && navInfo.remainDist > 0 && navInfo.remainMin > 0) {
          const speedMs    = navInfo.remainDist / (navInfo.remainMin * 60);
          const ferryDistM = fa.ferry.driveDistanceToFerryKm * 1000;
          const drivenM    = Math.min(ferryDistM, elapsed / fa.ferry.driveTimeToFerryMin * ferryDistM);
          const remFerryM  = Math.max(0, ferryDistM - drivenM);
          remainingToFerryMin = speedMs > 0 ? remFerryM / speedMs / 60 : 0;
        } else {
          remainingToFerryMin = Math.max(0, fa.ferry.driveTimeToFerryMin - elapsed);
        }

        const liveEta  = new Date(now.getTime() + remainingToFerryMin * 60 * 1000);
        const upcoming = fa.departures.filter(
          d => d.time >= new Date(liveEta.getTime() - 2 * 60 * 1000)
        );
        const skip   = ferrySkips[ferryIdx] ?? 0;
        let target   = upcoming[skip] ?? upcoming[0];
        if (!target) return null;

        const minEarly    = (target.time.getTime() - liveEta.getTime()) / 60000;
        const canMiss     = minEarly < 0 && minEarly > -25;
        const canSkipNext = upcoming.length > skip + 1;
        const canSkipPrev = skip > 0;
        const LIMIT       = fa.speedLimitKmh ?? 80;

        let excessSpeed: number | null = null;
        if (canMiss) {
          const hrs = (target.time.getTime() - now.getTime()) / 3600000;
          if (hrs > 0) {
            const req = fa.ferry.driveDistanceToFerryKm / hrs;
            const excess = Math.round(req - LIMIT);
            if (excess > 0 && req <= LIMIT + 40) excessSpeed = excess;
          }
        }

        // Auto-skip if excess > 15 km/h above limit
        if (canMiss && (excessSpeed === null || excessSpeed > 15) && canSkipNext && skip === 0) {
          target = upcoming[1];
        }

        const margin    = Math.round(minEarly);
        const fillPct   = Math.max(3, Math.min(97, 50 + (minEarly / 20) * 47));
        const fillColor = minEarly >= 8  ? '#4caf50'
          : minEarly >= 2  ? '#8bc34a'
          : minEarly >= -1 ? '#78909c'
          : minEarly >= -6 ? '#ef9a9a'
          : '#f44336';

        return (
          <div className="nav-ferry-line">
            {/* Left: previous ferry button */}
            <button
              className={`nav-ferry-line__arrow${!canSkipPrev ? ' nav-ferry-line__arrow--hidden' : ''}`}
              onClick={() => { if (canSkipPrev) { const n=[...ferrySkips]; n[ferryIdx]--; setFerrySkips(n); }}}
              disabled={!canSkipPrev}
            >‹</button>

            {/* Centre: ferry info */}
            <div className="nav-ferry-line__centre">
              <div className="nav-ferry-line__labels">
                <span>⛴ {fa.ferry.name} · {fmtClock(target.time)}</span>
                <span style={{ color: fillColor, fontWeight: 700 }}>
                  {margin >= 0 ? `+${margin} min` : canMiss && excessSpeed ? `+${excessSpeed} km/t over grensen` : `${margin} min`}
                </span>
              </div>
              <div className="nav-ferry-line__track">
                <div className="nav-ferry-line__fill" style={{ width: `${fillPct}%`, background: fillColor }} />
                <div className="nav-ferry-line__marker" style={{ left: '50%' }} />
              </div>
            </div>

            {/* Right: next ferry button */}
            <button
              className={`nav-ferry-line__arrow${!canSkipNext ? ' nav-ferry-line__arrow--hidden' : ''}`}
              onClick={() => { if (canSkipNext) { const n=[...ferrySkips]; n[ferryIdx]=(n[ferryIdx]??0)+1; setFerrySkips(n); }}}
              disabled={!canSkipNext}
            >›</button>
          </div>
        );
      })()}
    </div>
  )
}
