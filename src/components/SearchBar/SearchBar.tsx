import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { searchLocations, GeoResult } from '../../services/geocodeApi';
import { MicIcon } from '../Icons/Icons';
import { MicOverlay } from '../MicOverlay/MicOverlay';
import { speak, stopSpeaking, handleVoiceQuery, VoiceContext } from '../../services/voiceQuery';
import './SearchBar.css';

// ── shared address-search hook ────────────────────────────────────────────────
function useAddressSearch() {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const debRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressRef = useRef(false);  // prevents dropdown reopening after selection

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const r = await searchLocations(q);
      setResults(r);
      if (!suppressRef.current) setOpen(r.length > 0);
      suppressRef.current = false;
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => search(query), 120);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [query, search]);

  function clear() { setQuery(''); setResults([]); setOpen(false); suppressRef.current = false; }
  function suppressNextOpen() { suppressRef.current = true; }
  return { query, setQuery, results, loading, open, setOpen, clear, suppressNextOpen };
}

// ── props ─────────────────────────────────────────────────────────────────────
interface SearchPanelProps {
  onRoute: (from: [number, number], to: [number, number], fromName: string, toName: string) => void;
  onClear: () => void;
  onGpsRequest: () => Promise<[number, number] | null>;
  voiceContext?: VoiceContext;
}

// ── component ─────────────────────────────────────────────────────────────────
export function SearchPanel({ onRoute, onClear, onGpsRequest, voiceContext }: SearchPanelProps) {
  const dest = useAddressSearch();                   // Phase 1 — destination search
  const from = useAddressSearch();                   // Phase 2 — start point search

  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [fromCoords, setFromCoords] = useState<[number, number] | null>(null);
  const [fromGps,    setFromGps]    = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [routing,    setRouting]    = useState(false);

  const pillRef    = useRef<HTMLDivElement>(null);
  const fromRef    = useRef<HTMLDivElement>(null);
  const [micOpen,    setMicOpen]    = useState(false);
  const [micStatus,  setMicStatus]  = useState<'listening'|'processing'|'speaking'|'idle'>('idle');
  const [micText,    setMicText]    = useState('');
  const [micResp,    setMicResp]    = useState('');

  // Speech recognition (Norwegian, browser API)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnySpeech = any;

  const recognition = useMemo<AnySpeech>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return null;
    const r = new Ctor();
    r.lang = 'no-NO';
    r.continuous = false;
    r.interimResults = false;
    return r;
  }, []);

  function openMic() {
    if (!recognition) return;
    setMicOpen(true); setMicText(''); setMicResp(''); setMicStatus('listening');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript as string;
      setMicText(text);
      setMicStatus('processing');

      // Check if it's a voice query (question) or an address search
      const reply = voiceContext ? handleVoiceQuery(text, voiceContext) : null;

      if (reply) {
        setMicResp(reply);
        setMicStatus('speaking');
        speak(reply);
        // Auto-close after reply finishes
        const words = reply.split(' ').length;
        setTimeout(() => { setMicOpen(false); stopSpeaking(); }, Math.max(4000, words * 420));
      } else {
        // Treat as address — fill search field and close overlay
        dest.setQuery(text);
        setMicStatus('idle');
        setTimeout(() => setMicOpen(false), 600);
      }
    };
    recognition.onerror = () => { setMicStatus('idle'); setTimeout(() => setMicOpen(false), 1000); };
    recognition.onend   = () => { if (micStatus === 'listening') setMicStatus('idle'); };
    recognition.start();
  }

  function closeMic() {
    recognition?.stop();
    stopSpeaking();
    setMicOpen(false);
    setMicStatus('idle');
  }

  // Phase: 'pill' = single search bar, 'expanded' = full route panel
  const phase = destCoords ? 'expanded' : 'pill';

  // Close dropdowns on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) dest.setOpen(false);
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) from.setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dest, from]);

  function selectDest(r: GeoResult) {
    dest.suppressNextOpen();   // prevent debounce from reopening dropdown
    dest.setQuery(r.shortName);
    dest.setOpen(false);
    setDestCoords([r.lat, r.lon]);
    // Default start = Min Posisjon — clear search state, GPS mode shown from state
    if (!fromCoords && !fromGps) {
      setFromGps(true);
      from.clear();   // don't set query — prevents autocomplete from firing
    }
  }

  function selectFrom(r: GeoResult) {
    from.suppressNextOpen();
    from.setQuery(r.shortName);
    from.setOpen(false);
    setFromCoords([r.lat, r.lon]);
    setFromGps(false);
  }

  async function handleGps() {
    setGpsLoading(true);
    const c = await onGpsRequest();
    setGpsLoading(false);
    if (c) { setFromGps(true); setFromCoords(c); from.clear(); }
  }

  async function handleRoute() {
    if (!destCoords) return;
    let start = fromCoords;
    if (!start) {
      setGpsLoading(true);
      const gps = await onGpsRequest();
      setGpsLoading(false);
      if (!gps) return;
      start = gps;
      setFromGps(true); setFromCoords(gps); from.clear();
    }
    setRouting(true);
    await onRoute(start, destCoords, fromGps ? 'Min posisjon' : (from.query || 'Start'), dest.query);
    setRouting(false);
  }

  function clearAll() {
    dest.clear(); from.clear();
    setDestCoords(null); setFromCoords(null); setFromGps(false);
    onClear();
  }

  // ── Mic overlay (shown over everything when recording) ───────────────────
  const micOverlayEl = micOpen ? (
    <MicOverlay
      status={micStatus}
      transcript={micText}
      response={micResp}
      onClose={closeMic}
      onStop={closeMic}
    />
  ) : null;

  // ── Phase 1: single pill ────────────────────────────────────────────────────
  if (phase === 'pill') {
    return (
      <>
      {micOverlayEl}
      <div className="search-pill-wrap" ref={pillRef}>
        <div className="search-pill">
          <img
            src={`${import.meta.env.BASE_URL}icon.png`}
            alt="FerdPilot"
            className="search-pill__logo"
          />
          <input
            className="search-pill__input"
            type="text"
            placeholder="Søk her"
            value={dest.query}
            onChange={(e) => { dest.setQuery(e.target.value); }}
            onFocus={() => dest.results.length > 0 && dest.setOpen(true)}
            autoComplete="off"
            spellCheck={false}
          />
          {dest.query
            ? <button className="search-pill__clear" onClick={() => dest.clear()}>×</button>
            : recognition && (
              <button
                className="search-pill__mic"
                onClick={openMic}
                title="Taleinndata"
              >
                <MicIcon size={17} />
              </button>
            )
          }
        </div>

        {dest.open && (
          <div className="search-dropdown" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0 }}>
            {dest.loading
              ? <div className="search-dropdown__loading">Søker…</div>
              : dest.results.map((r, i) => (
                  <div key={i} className="search-dropdown__item" onMouseDown={() => selectDest(r)}>
                    <div className="search-dropdown__main">{r.shortName}</div>
                    <div className="search-dropdown__sub">{r.displayName}</div>
                  </div>
                ))
            }
          </div>
        )}
      </div>
      </>
    );
  }

  // ── Phase 2: expanded panel (destination set) ───────────────────────────────
  return (
    <>
    {micOverlayEl}
    <div className="search-panel">
      {/* Destination row — always filled */}
      <div className="search-field" style={{ borderColor: 'rgba(137,207,240,0.3)' }}>
        <span className="search-field__label">Til</span>
        <span className="search-field__sep" />
        <input
          className="search-field__input"
          value={dest.query}
          onChange={(e) => { dest.setQuery(e.target.value); if (!e.target.value) { setDestCoords(null); onClear(); } }}
          onFocus={() => { /* don't re-open on focus after selection */ }}
          autoComplete="off" spellCheck={false}
          style={{ color: '#89cff0' }}
        />
        {dest.open && (
          <div className="search-dropdown">
            {dest.results.map((r, i) => (
              <div key={i} className="search-dropdown__item" onMouseDown={() => selectDest(r)}>
                <div className="search-dropdown__main">{r.shortName}</div>
                <div className="search-dropdown__sub">{r.displayName}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Start row — when in GPS mode show label; tap × to switch to text */}
      <div className="search-field" ref={fromRef}>
        <span className="search-field__label">Fra</span>
        <span className="search-field__sep" />
        {fromGps ? (
          /* GPS chip — × is right next to the text */
          <div className="search-gps-chip">
            <span>{gpsLoading ? 'Henter posisjon…' : 'Min posisjon'}</span>
            <button className="search-gps-chip__x"
              onClick={() => { setFromGps(false); setFromCoords(null); from.clear(); }}>×</button>
          </div>
        ) : (
          <input
            className="search-field__input"
            placeholder="Startsted…"
            value={from.query}
            onChange={(e) => { setFromCoords(null); from.setQuery(e.target.value); }}
            onFocus={() => from.results.length > 0 && from.setOpen(true)}
            autoComplete="off" spellCheck={false}
          />
        )}
        {!fromGps && (from.query
            ? <button className="search-field__clear" onClick={() => { setFromCoords(null); from.clear(); }}>×</button>
            : <button className="search-field__gps" onClick={handleGps} disabled={gpsLoading}>
                {gpsLoading ? '…' : 'GPS'}
              </button>
        )}
        {from.open && (
          <div className="search-dropdown">
            {from.loading
              ? <div className="search-dropdown__loading">Søker…</div>
              : from.results.map((r, i) => (
                  <div key={i} className="search-dropdown__item" onMouseDown={() => selectFrom(r)}>
                    <div className="search-dropdown__main">{r.shortName}</div>
                    <div className="search-dropdown__sub">{r.displayName}</div>
                  </div>
                ))
            }
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="search-actions">
        <button className="search-go" onClick={handleRoute} disabled={routing}>
          {routing ? 'Beregner…' : 'Beregn rute'}
        </button>
        <button className="search-close" onClick={clearAll} title="Tøm søk">×</button>
      </div>
    </div>
    </>
  );
}

// ── Navigation status bar (replaces both search bar AND NavDestPill) ──────────
interface NavStatusBarProps {
  destination: string;
  remainDist?: number;
  remainMin?: number;
  eta?: string;
  onStop: () => void;
}

export function NavStatusBar({ destination, remainDist, remainMin, eta, onStop }: NavStatusBarProps) {
  const fmtDist = (m: number) => m >= 1000 ? `${(m/1000).toFixed(0)} km` : `${Math.round(m)} m`;
  const fmtTime = (min: number) => {
    if (!min) return '--';
    if (min < 60) return `${Math.round(min)} min`;
    return `${Math.floor(min/60)}t ${Math.round(min%60)}m`;
  };

  return (
    <>
      {/* Top bar: destination + metrics */}
      <div className="nav-status-bar">
        <div className="nav-status-bar__dest">{destination || 'Navigerer…'}</div>
        <div className="nav-status-bar__sep" />
        <div className="nav-status-bar__item">
          <span className="nav-status-bar__val">{remainDist ? fmtDist(remainDist) : '--'}</span>
          <span className="nav-status-bar__lbl">Igjen</span>
        </div>
        <div className="nav-status-bar__sep" />
        <div className="nav-status-bar__item">
          <span className="nav-status-bar__val">{fmtTime(remainMin ?? 0)}</span>
          <span className="nav-status-bar__lbl">Tid</span>
        </div>
        <div className="nav-status-bar__sep" />
        <div className="nav-status-bar__item">
          <span className="nav-status-bar__val">{eta || '--:--'}</span>
          <span className="nav-status-bar__lbl">ETA</span>
        </div>
      </div>

      {/* Stop button — large, bottom-right, easy to reach while driving */}
      <button className="nav-stop-fab" onClick={onStop} aria-label="Stopp navigasjon">
        ✕
      </button>
    </>
  );
}
