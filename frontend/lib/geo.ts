import type { Property } from '@/lib/types';

export type LatLngPoint = { lat: number; lng: number };

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const distanceKm = (a: LatLngPoint, b: LatLngPoint) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const getPropertyPoint = (property: Property): LatLngPoint | null => {
  if (typeof property.latitude === 'number' && typeof property.longitude === 'number') {
    return { lat: property.latitude, lng: property.longitude };
  }

  if (Array.isArray(property.polygon) && property.polygon.length > 0) {
    const totals = property.polygon.reduce(
      (acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
      { lat: 0, lng: 0 }
    );
    return {
      lat: totals.lat / property.polygon.length,
      lng: totals.lng / property.polygon.length,
    };
  }

  return null;
};

export const getPropertyDistanceKm = (location: LatLngPoint | null, property: Property) => {
  if (!location) return null;
  const point = getPropertyPoint(property);
  if (!point) return null;
  const distance = distanceKm(location, point);
  return Number.isFinite(distance) ? distance : null;
};

export const formatDistance = (distance: number | null) => {
  if (distance == null) return null;
  if (distance < 1) return `${Math.max(50, Math.round(distance * 1000 / 50) * 50)} m`;
  if (distance < 10) return `${distance.toFixed(1).replace('.0', '')} km`;
  return `${Math.round(distance)} km`;
};
