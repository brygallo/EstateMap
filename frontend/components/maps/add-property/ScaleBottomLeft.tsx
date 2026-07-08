'use client';

import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

/* ===================== Escala ===================== */
export function ScaleBottomLeft() {
  const map = useMap();
  useEffect(() => {
    const control = L.control.scale({ position: 'bottomleft', metric: true, imperial: false });
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);
  return null;
}
