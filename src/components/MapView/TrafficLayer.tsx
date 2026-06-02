import { TileLayer } from 'react-leaflet';

const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_KEY as string | undefined;

// TomTom traffic flow tiles — requires Traffic API to be enabled on your key
// at developer.tomtom.com → Apps → your app → enable "Traffic" product
const TRAFFIC_URL = TOMTOM_KEY
  ? `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`
  : null;

interface TrafficLayerProps {
  visible: boolean;
}

export function TrafficLayer({ visible }: TrafficLayerProps) {
  if (!visible || !TRAFFIC_URL) return null;

  return (
    <TileLayer
      url={TRAFFIC_URL}
      opacity={0.7}
      attribution='Trafikk &copy; <a href="https://tomtom.com">TomTom</a>'
      maxZoom={18}
      // If tiles 404/401 silently fail — no crash
      errorTileUrl="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    />
  );
}
