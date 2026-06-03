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

      {/* Next step hint */}
      {nextStep && (
        <div className="nav-next">
          Deretter: {maneuverArrow(nextStep.maneuverType, nextStep.maneuverModifier)}{' '}
          {nextStep.instruction}
        </div>
      )}
    </div>
  )
}
