'use client';

import { useMapEvents } from 'react-leaflet';
import { useEffect, useCallback } from 'react';
import { padBounds } from './utils';

// Rastrea los límites del mapa y filtra las propiedades visibles.
export function MapBoundsTracker({
  properties,
  onVisiblePropertiesChange,
  onBoundsChange,
}: {
  properties: any[];
  onVisiblePropertiesChange: (properties: any[]) => void;
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      updateVisibleProperties();
      reportBounds();
    },
    zoomend: () => {
      updateVisibleProperties();
      reportBounds();
    },
  });

  const reportBounds = useCallback(() => {
    if (!onBoundsChange) return;
    const b = padBounds(map.getBounds());
    onBoundsChange({
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth(),
    });
  }, [map, onBoundsChange]);

  // Report the initial viewport bounds once the map is mounted.
  useEffect(() => {
    reportBounds();
  }, [reportBounds]);

  const updateVisibleProperties = useCallback(() => {
    const bounds = map.getBounds();
    const visible = properties.filter((property) => {
      const lat = Number(property.latitude);
      const lng = Number(property.longitude);

      // Check if property has polygon
      if (property.polygon) {
        let coordinates;

        // Handle GeoJSON format
        if (property.polygon.coordinates?.[0]) {
          coordinates = property.polygon.coordinates[0];
          // Check if any point of the polygon is within the map bounds
          // GeoJSON uses [lng, lat] format, but Leaflet uses [lat, lng]
          const hasVertexInBounds = coordinates.some((point: any) => {
            const [pointLng, pointLat] = point;
            return bounds.contains([Number(pointLat), Number(pointLng)]);
          });
          if (hasVertexInBounds) return true;
        }
        // Handle simple array format [[lat, lng], ...]
        else if (Array.isArray(property.polygon) && property.polygon.length >= 3) {
          coordinates = property.polygon;
          // Simple format already uses [lat, lng]
          const hasVertexInBounds = coordinates.some((point: any) => {
            const [pointLat, pointLng] = point;
            return bounds.contains([Number(pointLat), Number(pointLng)]);
          });
          if (hasVertexInBounds) return true;
        }
      }

      // Always fall back to the property marker/centroid. Some polygons can
      // cover or touch the viewport while all vertices sit outside it, and
      // production data commonly stores both polygon and latitude/longitude.
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return bounds.contains([lat, lng]);
      }

      return false;
    });
    onVisiblePropertiesChange(visible);
  }, [map, properties, onVisiblePropertiesChange]);

  // Initial update
  useEffect(() => {
    updateVisibleProperties();
  }, [properties, updateVisibleProperties]);

  return null;
}
