// Pure UI overlay — no useMap(), safe to use anywhere
import { RouteStep } from '../../services/routeApi'
import { NavInfo } from './NavigationMapController'
import { maneuverArrow, fmtDistance, fmtDuration } from '../../services/navigationService'
import './NavigationOverlay.css'

interface Props {
  steps:   RouteStep[]
  navInfo: NavInfo | null
  onStop:  () => void
}

export function NavigationOverlay({ steps, navInfo, onStop }: Props) {
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
