'use client';

import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

// Expone la instancia del mapa hacia afuera.
export function MapController({ onMapReady }: { onMapReady: (map: any) => void }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
}
