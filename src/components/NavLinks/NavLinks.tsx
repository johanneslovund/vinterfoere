import './NavLinks.css';

export interface NavLinksProps {
  fromCoords?: [number, number] | null;
  toCoords:    [number, number];
  toName?:     string;
}

export function NavLinks({ fromCoords, toCoords, toName }: NavLinksProps) {
  const [tLat, tLon] = toCoords;
  const name = encodeURIComponent(toName || 'Destinasjon');

  const googleUrl = fromCoords
    ? `https://www.google.com/maps/dir/${fromCoords[0]},${fromCoords[1]}/${tLat},${tLon}`
    : `https://www.google.com/maps/dir//${tLat},${tLon}`;

  const appleUrl = fromCoords
    ? `https://maps.apple.com/?saddr=${fromCoords[0]},${fromCoords[1]}&daddr=${tLat},${tLon}&dirflg=d`
    : `https://maps.apple.com/?daddr=${tLat},${tLon}&dirflg=d`;

  const teslaUrl =
    `https://www.tesla.com/_ak/www.tesla.com/api/tesla-navigation` +
    `?destination=${tLat},${tLon}&name=${name}`;

  const links = [
    { label: 'Google Maps',   url: googleUrl },
    { label: 'Apple Maps',    url: appleUrl  },
    { label: 'Send til Tesla', url: teslaUrl  },
  ];

  return (
    <div className="nav-links">
      {links.map(({ label, url }) => (
        <a
          key={label}
          className="nav-link"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </a>
      ))}
    </div>
  );
}
