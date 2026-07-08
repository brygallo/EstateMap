'use client';

import { useMapEvents, Marker } from 'react-leaflet';

export function PointLocationPicker({
  selectedLocation,
  onLocationChange,
}: {
  selectedLocation?: { lat: number; lng: number } | null;
  onLocationChange?: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  if (!selectedLocation) return null;
  return <Marker position={[selectedLocation.lat, selectedLocation.lng]} />;
}
