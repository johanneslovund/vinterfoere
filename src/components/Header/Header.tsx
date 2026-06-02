import './Header.css';

interface HeaderProps {
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
}

export function Header({ lastUpdated, loading, onRefresh }: HeaderProps) {
  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__brand-icon">❄</span>
        Vinterføre
      </div>

      <div className="header__spacer" />

      {timeStr && (
        <div className="header__status">
          <div className={`header__status-dot${loading ? ' header__status-dot--loading' : ''}`} />
          {loading ? 'Oppdaterer…' : `Sist oppdatert ${timeStr}`}
        </div>
      )}
      {!timeStr && loading && (
        <div className="header__status">
          <div className="header__status-dot header__status-dot--loading" />
          Henter værdata…
        </div>
      )}

      <button className="header__toggle" onClick={onRefresh} title="Oppdater nå">
        Oppdater
      </button>
    </header>
  );
}
