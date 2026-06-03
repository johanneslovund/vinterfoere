import { Polyline } from 'react-leaflet';
import { AlternateRoute } from '../../services/routeApi';

interface RouteLayerProps {
  coordinates:  [number, number][];
  gridData:     import('../../types/weather').GridWeather[];
  alternates?:  AlternateRoute[];
  onSelectAlt?: (alt: AlternateRoute) => void;
}

export function RouteLayer({ coordinates, alternates, onSelectAlt }: RouteLayerProps) {
  if (coordinates.length === 0) return null;

  return (
    <>
      {/* Alternate routes — grey dashed, tappable to select */}
      {alternates?.map((alt, i) => (
        <Polyline key={`alt-${i}`}
          positions={alt.coordinates}
          pathOptions={{ color: '#78909c', weight: 5, opacity: 0.5, dashArray: '8 5' }}
          eventHandlers={{ click: () => onSelectAlt?.(alt) }}
        />
      ))}
      {/* Active route shadow */}
      <Polyline positions={coordinates}
        pathOptions={{ color: '#000', weight: 10, opacity: 0.28 }} />
      {/* Active route — Google Maps blue */}
      <Polyline positions={coordinates}
        pathOptions={{ color: '#4285F4', weight: 6, opacity: 0.95 }} />
    </>
  );
}
