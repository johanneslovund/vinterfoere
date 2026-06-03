import { useEffect, useState } from 'react';
import './SplashScreen.css';

interface Props {
  /** Called at 3 s — tells the map to start its zoom animation */
  onReveal: () => void;
}

export function SplashScreen({ onReveal }: Props) {
  const [bgOut,   setBgOut]   = useState(false);
  const [logoOut, setLogoOut] = useState(false);
  const [done,    setDone]    = useState(false);

  useEffect(() => {
    // 3 s → fade background, start map zoom
    const t1 = setTimeout(() => { setBgOut(true); onReveal(); }, 3000);
    // 3.9 s → fade logo
    const t2 = setTimeout(() => setLogoOut(true), 3900);
    // 4.9 s → unmount entirely
    const t3 = setTimeout(() => setDone(true), 4900);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onReveal]);

  if (done) return null;

  return (
    <div className="splash">
      <div className={`splash__bg${bgOut ? ' splash__bg--out' : ''}`} />
      <img
        src={`${import.meta.env.BASE_URL}logo.png`}
        alt="FerdPilot"
        className={`splash__logo${logoOut ? ' splash__logo--out' : ''}`}
      />
    </div>
  );
}
