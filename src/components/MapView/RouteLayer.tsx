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
      {/* Alternate routes — solid, lower opacity, wide invisible click zone */}
      {alternates?.map((alt, i) => (
        <React.Fragment key={`alt-${i}`}>
          {/* Invisible thick hit area for easy tap */}
          <Polyline positions={alt.coordinates}
            pathOptions={{ color: 'transparent', weight: 18, opacity: 0 }}
            eventHandlers={{ click: () => onSelectAlt?.(alt) }}
          />
          {/* Visual line */}
          <Polyline positions={alt.coordinates}
            pathOptions={{ color: '#546e7a', weight: 5, opacity: 0.5 }}
            eventHandlers={{ click: () => onSelectAlt?.(alt) }}
          />
        </React.Fragment>
      ))}

      {/* Active route shadow */}
      <Polyline positions={coordinates}
        pathOptions={{ color: '#000', weight: 10, opacity: 0.28 }} />
      {/* Active route — FerdPilot brand blue */}
      <Polyline positions={coordinates}
        pathOptions={{ color: '#1a6bb5', weight: 6, opacity: 0.95 }} />
      {/* Inner highlight */}
      <Polyline positions={coordinates}
        pathOptions={{ color: '#89cff0', weight: 2, opacity: 0.45 }} />
    </>
  );
}

// Need React.Fragment
import React from 'react';
