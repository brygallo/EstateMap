import type { Property } from '@/lib/types';

/**
 * Mueve el mapa hacia una propiedad: si tiene polígono, encuadra sus límites
 * con el máximo zoom; si solo tiene punto, vuela al marcador. Acepta el
 * polígono en formato GeoJSON o en el formato simple `[[lat, lng], ...]`.
 */
export function flyToProperty(map: any, property: Property): void {
  if (!map) return;

  try {
    const polygon = property.polygon as any;
    if (polygon) {
      let coordinates: number[][] | undefined;

      // GeoJSON: coordinates[0] es [[lng, lat], ...]
      if (polygon.coordinates && Array.isArray(polygon.coordinates[0])) {
        coordinates = polygon.coordinates[0];
      }
      // Formato simple [[lat, lng], ...] -> convertir a [lng, lat]
      else if (Array.isArray(polygon) && polygon.length >= 3) {
        coordinates = polygon.map((coord: number[]) => [coord[1], coord[0]]);
      }

      if (coordinates && coordinates.length >= 3) {
        const lats = coordinates.map((coord) => coord[1]);
        const lngs = coordinates.map((coord) => coord[0]);
        const bounds = [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ];
        map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 20, duration: 1.5 });
        return;
      }
    }

    if (property.latitude && property.longitude) {
      map.flyTo([property.latitude, property.longitude], 17, { duration: 1.5 });
    }
  } catch (error) {
    console.error('Error moving map:', error);
  }
}
