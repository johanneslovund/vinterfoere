import { useState, useRef, useEffect, useCallback } from 'react';
import { searchLocations, GeoResult } from '../../services/geocodeApi';
import './SearchBar.css';

function useAddressSearch() {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try { const r = await searchLocations(q); setResults(r); setOpen(r.length > 0); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => search(query), 300);
    return () => { if (debRef.current) clearTimeout(debRef.current); };
  }, [query, search]);

  function clear() { setQuery(''); setResults([]); setOpen(false); }
  return { query, setQuery, results, loading, open, setOpen, clear };
}

interface SearchPanelProps {
  onRoute: (from: [number, number], to: [number, number], fromName: string, toName: string) => void;
  onClear: () => void;
  onGpsRequest: () => Promise<[number, number] | null>;
}

export function SearchPanel({ onRoute, onClear, onGpsRequest }: SearchPanelProps) {
  const from = useAddressSearch();
  const to   = useAddressSearch();

  const [fromCoords, setFromCoords] = useState<[number, number] | null>(null);
  const [toCoords,   setToCoords]   = useState<[number, number] | null>(null);
  const [fromGps,    setFromGps]    = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [routing,    setRouting]    = useState(false);

  const hasContent = !!(from.query || to.query || fromCoords || toCoords);

  function clearAll() {
    setFromGps(false); setFromCoords(null); from.clear();
    setToCoords(null); to.clear();
    onClear();
  }

  const fromRef = useRef<HTMLDivElement>(null);
  const toRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) from.setOpen(false);
      if (toRef.current   && !toRef.current.contains(e.target as Node))   to.setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [from, to]);

  async function handleGps() {
    setGpsLoading(true);
    const c = await onGpsRequest();
    setGpsLoading(false);
    if (c) { setFromGps(true); setFromCoords(c); from.setQuery('Min posisjon'); }
  }

  function selectFrom(r: GeoResult) {
    setFromGps(false); setFromCoords([r.lat, r.lon]);
    from.setQuery(r.shortName); from.setOpen(false);
  }
  function selectTo(r: GeoResult) {
    setToCoords([r.lat, r.lon]); to.setQuery(r.shortName); to.setOpen(false);
  }

  function clearFrom() {
    setFromGps(false); setFromCoords(null); from.clear(); onClear();
  }
  function clearTo() {
    setToCoords(null); to.clear(); onClear();
  }

  async function handleRoute() {
    let startCoords = fromCoords;
    if (!startCoords) {
      setGpsLoading(true);
      const gps = await onGpsRequest();
      setGpsLoading(false);
      if (!gps) return;
      startCoords = gps;
      setFromGps(true); setFromCoords(gps); from.setQuery('Min posisjon');
    }
    if (!toCoords) return;
    setRouting(true);
    const fName = fromGps ? 'Min posisjon' : (from.query || 'Start');
    await onRoute(startCoords, toCoords, fName, to.query || 'Mål');
    setRouting(false);
  }

  const canRoute = !!toCoords;

  return (
    <div className="search-panel">
      {/* FROM */}
      <div className="search-field" ref={fromRef}>
        <span className="search-field__label">Fra</span>
        <span className="search-field__sep" />
        <input
          className="search-field__input"
          placeholder={fromGps ? '' : 'Startsted…'}
          value={from.query}
          onChange={(e) => { setFromCoords(null); setFromGps(false); from.setQuery(e.target.value); }}
          onFocus={() => from.results.length > 0 && from.setOpen(true)}
          autoComplete="off" spellCheck={false}
          style={fromGps ? { color: '#89cff0' } : undefined}
        />
        {from.query
          ? <button className="search-field__clear" onClick={clearFrom}>×</button>
          : <button className="search-field__gps" onClick={handleGps} disabled={gpsLoading}>
              {gpsLoading ? '…' : 'GPS'}
            </button>
        }
        {from.open && !fromGps && (
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

      <span className="search-arrow">›</span>

      {/* TO */}
      <div className="search-field" ref={toRef}>
        <span className="search-field__label">Til</span>
        <span className="search-field__sep" />
        <input
          className="search-field__input"
          placeholder="Søk sted eller vei…"
          value={to.query}
          onChange={(e) => { setToCoords(null); to.setQuery(e.target.value); }}
          onFocus={() => to.results.length > 0 && to.setOpen(true)}
          autoComplete="off" spellCheck={false}
        />
        {to.query && <button className="search-field__clear" onClick={clearTo}>×</button>}
        {to.open && (
          <div className="search-dropdown">
            {to.loading
              ? <div className="search-dropdown__loading">Søker…</div>
              : to.results.map((r, i) => (
                  <div key={i} className="search-dropdown__item" onMouseDown={() => selectTo(r)}>
                    <div className="search-dropdown__main">{r.shortName}</div>
                    <div className="search-dropdown__sub">{r.displayName}</div>
                  </div>
                ))
            }
          </div>
        )}
      </div>

      <button className="search-go" onClick={handleRoute} disabled={!canRoute || routing}>
        {routing ? '…' : 'Beregn rute'}
      </button>

      {hasContent && (
        <button className="search-close" onClick={clearAll} title="Tøm søk">×</button>
      )}

    </div>
  );
}
