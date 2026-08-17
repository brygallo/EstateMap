import type { Property } from '@/lib/types';

export type LatLngPoint = { lat: number; lng: number };

export type PropertyMapCamera =
  | { mode: 'center'; center: [number, number]; zoom: number }
  | {
      mode: 'bounds';
      bounds: [[number, number], [number, number]];
      maxZoom: number;
    };

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// Ecuador continental + Galápagos, con un margen pequeño para no descartar
// puntos cerca de costa/frontera. Evita clusters fantasma por coordenadas
// corruptas o lat/lng invertidos.
export const isPointInEcuadorBounds = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  ((lat >= -5.45 && lat <= 1.9 && lng >= -81.35 && lng <= -74.75) ||
    (lat >= -1.75 && lat <= 1.85 && lng >= -92.2 && lng <= -88.45));

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
  const latitude = Number(property.latitude);
  const longitude = Number(property.longitude);
  if (isPointInEcuadorBounds(latitude, longitude)) {
    return { lat: latitude, lng: longitude };
  }

  const polygon = property.polygon;
  const ring = Array.isArray(polygon)
    ? polygon.map(([lat, lng]) => [Number(lat), Number(lng)] as const)
    : polygon?.coordinates?.[0]?.map(([lng, lat]) => [Number(lat), Number(lng)] as const) || [];
  const validPoints = ring.filter(([lat, lng]) => isPointInEcuadorBounds(lat, lng));
  if (validPoints.length > 1) {
    const [firstLat, firstLng] = validPoints[0];
    const [lastLat, lastLng] = validPoints[validPoints.length - 1];
    if (firstLat === lastLat && firstLng === lastLng) validPoints.pop();
  }

  if (validPoints.length > 0) {
    const totals = validPoints.reduce(
      (acc, [lat, lng]) => ({ lat: acc.lat + lat, lng: acc.lng + lng }),
      { lat: 0, lng: 0 }
    );
    const point = {
      lat: totals.lat / validPoints.length,
      lng: totals.lng / validPoints.length,
    };
    return isPointInEcuadorBounds(point.lat, point.lng) ? point : null;
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

/**
 * Keeps the selected listing at the visual center while leaving enough
 * geographic context to reveal nearby inventory.
 */
export const getPropertyMapCamera = (
  selected: LatLngPoint,
  nearbyPoints: LatLngPoint[]
): PropertyMapCamera => {
  if (nearbyPoints.length === 0) {
    return { mode: 'center', center: [selected.lng, selected.lat], zoom: 12 };
  }

  const latitudeRadius = Math.max(
    0.008,
    ...nearbyPoints.map((point) => Math.abs(point.lat - selected.lat))
  );
  const longitudeRadius = Math.max(
    0.008,
    ...nearbyPoints.map((point) => Math.abs(point.lng - selected.lng))
  );

  return {
    mode: 'bounds',
    bounds: [
      [selected.lng - longitudeRadius, selected.lat - latitudeRadius],
      [selected.lng + longitudeRadius, selected.lat + latitudeRadius],
    ],
    maxZoom: 14,
  };
};

export interface PropertyViewportDecision {
  zoom: number;
  count: number;
  radiusKm: number | null;
  nearestKm: number | null;
}

/**
 * Escoge el encuadre más cercano que todavía muestra suficiente oferta.
 * En móvil requiere menos resultados porque el viewport y el listado son menores.
 */
export const getPropertyViewportDecision = (
  location: LatLngPoint,
  properties: Property[],
  mobile = false
): PropertyViewportDecision => {
  const distances = properties
    .map((property) => {
      const point = getPropertyPoint(property);
      return point ? distanceKm(location, point) : null;
    })
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .sort((a, b) => a - b);

  if (distances.length === 0) {
    return { zoom: 10, count: 0, radiusKm: null, nearestKm: null };
  }

  const desired = mobile ? 4 : 7;
  const bands = [
    { radiusKm: 2, zoom: 15 },
    { radiusKm: 5, zoom: 14 },
    { radiusKm: 12, zoom: 13 },
    { radiusKm: 30, zoom: 12 },
    { radiusKm: 70, zoom: 11 },
    { radiusKm: 150, zoom: 9.5 },
  ];

  for (const band of bands) {
    const count = distances.filter((distance) => distance <= band.radiusKm).length;
    if (count >= desired) {
      return { ...band, count, nearestKm: distances[0] };
    }
  }

  const nearest = distances[0];
  const fallback =
    bands.find((band) => nearest <= band.radiusKm) ||
    { radiusKm: 300, zoom: 8 };
  return {
    ...fallback,
    count: distances.filter((distance) => distance <= fallback.radiusKm).length,
    nearestKm: nearest,
  };
};
