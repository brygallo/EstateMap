'use client';

import { useMap } from 'react-leaflet';
import { useEffect } from 'react';

export function MapRefBinder({ onMapReady }: { onMapReady: (map: any) => void }) {
  const map = useMap();

  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
}
