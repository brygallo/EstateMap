/**
 * Servicio de Geocodificación Inversa
 * Convierte coordenadas (lat, lng) en direcciones usando OpenStreetMap Nominatim
 */

export interface GeocodingResult {
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  displayName?: string;
  latitude: number;
  longitude: number;
}

/**
 * Obtiene la dirección a partir de coordenadas usando Nominatim (OpenStreetMap)
 * @param lat Latitud
 * @param lng Longitud
 * @returns Información de la ubicación
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
  try {
    // Usar Nominatim de OpenStreetMap (gratuito, sin API key)
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=es`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EstateMap/1.0', // Nominatim requiere un User-Agent
      },
    });

    if (!response.ok) {
      console.error('Error en geocodificación:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data || data.error) {
      console.error('Error en respuesta de geocodificación:', data?.error);
      return null;
    }

    // Extraer información de la dirección
    const address = data.address || {};

    // Determinar la ciudad (puede venir en diferentes campos)
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      '';

    // Determinar la provincia/estado
    const province =
      address.state ||
      address.province ||
      address.region ||
      '';

    // Construir dirección simplificada
    const roadAddress = [
      address.road,
      address.house_number,
    ].filter(Boolean).join(' ');

    const result: GeocodingResult = {
      address: roadAddress || address.suburb || address.neighbourhood || '',
      city: city,
      province: province,
      country: address.country || '',
      postalCode: address.postcode || '',
      displayName: data.display_name || '',
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
    };

    console.log('Geocodificación exitosa:', result);
    return result;
  } catch (error) {
    console.error('Error en geocodificación inversa:', error);
    return null;
  }
}

/**
 * Calcula el centro de un polígono
 * @param polygon Array de coordenadas [[lat, lng], ...]
 * @returns Coordenadas del centro {lat, lng}
 */
export function getPolygonCenter(polygon: [number, number][]): { lat: number; lng: number } | null {
  if (!polygon || polygon.length === 0) {
    return null;
  }

  let sumLat = 0;
  let sumLng = 0;

  polygon.forEach(([lat, lng]) => {
    sumLat += lat;
    sumLng += lng;
  });

  return {
    lat: sumLat / polygon.length,
    lng: sumLng / polygon.length,
  };
}

/**
 * Obtiene la dirección del centro de un polígono
 * @param polygon Array de coordenadas [[lat, lng], ...]
 * @returns Información de la ubicación
 */
export async function reverseGeocodePolygon(polygon: [number, number][]): Promise<GeocodingResult | null> {
  const center = getPolygonCenter(polygon);

  if (!center) {
    return null;
  }

  return reverseGeocode(center.lat, center.lng);
}
