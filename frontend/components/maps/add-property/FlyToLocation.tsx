'use client';

import { useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';

/* ===================== FlyToLocation ===================== */
export function FlyToLocation({ center, zoom }: { center?: [number, number]; zoom?: number }) {
  const map = useMap();
  const hasFlownRef = useRef(false);

  useEffect(() => {
    // Solo volar una vez cuando se obtiene la ubicación
    if (center && zoom && !hasFlownRef.current) {
      hasFlownRef.current = true;

      // Small delay to ensure map is fully loaded
      setTimeout(() => {
        map.flyTo(center, zoom, {
          duration: 1.5,
        });
      }, 500);
    }
  }, [center, zoom, map]);

  return null;
}
