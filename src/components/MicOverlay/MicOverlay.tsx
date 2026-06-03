import './MicOverlay.css';
import { MicIcon } from '../Icons/Icons';

interface Props {
  status:   'listening' | 'processing' | 'speaking' | 'idle';
  transcript: string;
  response:   string;
  onClose:  () => void;
  onStop:   () => void;
}

const STATUS_LABEL: Record<Props['status'], string> = {
  listening:  'Lytter…',
  processing: 'Analyserer…',
  speaking:   'Svarer…',
  idle:       'Trykk for å stoppe',
};

export function MicOverlay({ status, transcript, response, onClose, onStop }: Props) {
  return (
    <div className="mic-overlay">
      <button className="mic-overlay__close" onClick={onClose}>✕</button>

      {/* Pulsing ring + mic button */}
      <div className="mic-overlay__ring">
        <button className="mic-overlay__btn" onClick={onStop} aria-label="Stopp opptak">
          <MicIcon size={36} />
        </button>
      </div>

      <div className="mic-overlay__status">{STATUS_LABEL[status]}</div>

      {transcript && (
        <div className="mic-overlay__text">"{transcript}"</div>
      )}

      {response && (
        <div className="mic-overlay__response">{response}</div>
      )}
    </div>
  );
}
