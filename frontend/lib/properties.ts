/**
 * Server-side helpers to fetch and normalize properties for SEO pages.
 *
 * These run on the server (sitemap, landing pages, property detail) and must be
 * resilient: the API may return a plain array or a paginated `{ results: [] }`
 * object, and it may be unreachable at build time.
 */

import { getServerApiUrl } from './api-url';

const API_URL = getServerApiUrl();
// Se normaliza quitando cualquier `/` final para evitar el doble slash `//`
// cuando se concatena `${SITE_URL}${path}` (el env de producción puede venir
// con slash final, p. ej. `https://geopropiedadesecuador.com/`).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://geopropiedadesecuador.com'
).replace(/\/+$/, '');
export const SITE_NAME = 'Geo Propiedades Ecuador';

// Tipo de dominio único: reexportamos el canónico de `./types` para no mantener
// dos formas de `Property` que se desincronizan (antes esta copia tenía
// `id: number | string` y le faltaban campos como `polygon`/`floors`).
export type { Property, PropertyImage } from './types';
import type { Property } from './types';

function normalizeList(data: unknown): Property[] {
  if (Array.isArray(data)) {
    return data as Property[];
  }
  if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
    return (data as any).results as Property[];
  }
  return [];
}

interface GetPropertiesOptions {
  includeImages?: boolean;
  pageSize?: number;
  revalidate?: number;
}

/**
 * Fetch every publicly listed property. Returns `[]` on any failure so pages
 * degrade gracefully instead of crashing the build/request.
 */
export async function getProperties({
  includeImages = false,
  pageSize = 2000,
  revalidate = 3600,
}: GetPropertiesOptions = {}): Promise<Property[]> {
  try {
    // The list endpoint is paginated. SEO pages need broad inventory metadata,
    // but images make the response too large for Next's fetch cache, so they
    // are opt-in and used only for small featured grids / image sitemap routes.
    const params = new URLSearchParams({
      page_size: String(pageSize),
      include_images: includeImages ? '1' : '0',
    });
    const res = await fetch(`${API_URL}/properties/?${params.toString()}`, {
      next: { revalidate, tags: ['properties'] },
    });
    if (!res.ok) return [];
    return normalizeList(await res.json());
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
}

export type PropertyGroup = {
  city: string;
  province: string;
  property_type: string;
  status: string;
  count: number;
};

export type PropertySummary = {
  total: number;
  by_status: Record<string, number>;
  by_property_type: Record<string, number>;
  by_city: { name: string; province: string; count: number }[];
  by_province: { name: string; count: number }[];
  groups: PropertyGroup[];
};

const EMPTY_SUMMARY: PropertySummary = {
  total: 0,
  by_status: {},
  by_property_type: {},
  by_city: [],
  by_province: [],
  groups: [],
};

/**
 * Inventory totals counted by the database.
 *
 * Counting the array returned by `getProperties` silently under-reports: the
 * list endpoint caps `page_size` at 2000, so once the catalogue passed that
 * mark every counter on the site froze at 2000. These aggregates always cover
 * the full inventory and cost one small request instead of a full download.
 */
export async function getPropertySummary(
  filters: Record<string, string> = {},
  revalidate = 3600,
): Promise<PropertySummary> {
  try {
    const query = new URLSearchParams(filters).toString();
    const res = await fetch(`${API_URL}/properties/summary/${query ? `?${query}` : ''}`, {
      next: { revalidate, tags: ['properties'] },
    });
    if (!res.ok) return EMPTY_SUMMARY;
    const data = await res.json();
    if (!data || typeof data !== 'object') return EMPTY_SUMMARY;
    return { ...EMPTY_SUMMARY, ...data } as PropertySummary;
  } catch (error) {
    console.error('Error fetching property summary:', error);
    return EMPTY_SUMMARY;
  }
}

export type LocationCatalog = {
  cities: { name: string; slug: string; province: string }[];
  provinces: { name: string; slug: string }[];
};

const EMPTY_CATALOG: LocationCatalog = { cities: [], provinces: [] };

/**
 * Stable list of the country's provinces and cantons, independent of what is
 * currently listed.
 *
 * `getCities`/`getProvinces` derive their values from the live inventory, so a
 * canton whose listings all expire vanishes and its landing page starts
 * answering 404 — dropping a URL Google had already indexed. This catalogue
 * lets those pages tell "no stock right now" apart from "no such place".
 * Returns an empty catalogue on failure, which keeps the previous behaviour.
 */
export async function getLocationCatalog(revalidate = 86400): Promise<LocationCatalog> {
  try {
    const res = await fetch(`${API_URL}/properties/catalog/`, {
      next: { revalidate, tags: ['catalog'] },
    });
    if (!res.ok) return EMPTY_CATALOG;
    const data = await res.json();
    if (!Array.isArray(data)) return EMPTY_CATALOG;

    // Deduped by slug: province values stored on properties vary in casing
    // ("MORONA SANTIAGO" vs "Morona Santiago"), which would otherwise yield the
    // same location twice.
    const cities = new Map<string, LocationCatalog['cities'][number]>();
    const provinces = new Map<string, LocationCatalog['provinces'][number]>();
    for (const entry of data) {
      const province = (entry?.province || '').trim();
      if (!province) continue;
      const provinceSlug = slugify(province);
      if (provinceSlug && !provinces.has(provinceSlug)) {
        provinces.set(provinceSlug, { name: province, slug: provinceSlug });
      }
      for (const city of entry?.cities || []) {
        const name = (city || '').trim();
        const citySlug = name ? slugify(name) : '';
        if (citySlug && !cities.has(citySlug)) {
          cities.set(citySlug, { name, slug: citySlug, province });
        }
      }
    }
    return { cities: [...cities.values()], provinces: [...provinces.values()] };
  } catch (error) {
    console.error('Error fetching location catalog:', error);
    return EMPTY_CATALOG;
  }
}

interface GetFeaturedPropertiesOptions {
  type?: string;
  status?: string;
  city?: string;
  province?: string;
  limit?: number;
  revalidate?: number;
}

export interface NearbyProperty extends Property {
  distanceKm: number;
}

function distanceInKm(latA: number, lngA: number, latB: number, lngB: number): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = radians(latB - latA);
  const deltaLng = radians(lngB - lngA);
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(latA)) * Math.cos(radians(latB)) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

/** Obtiene las propiedades geográficamente más próximas para una ficha. */
export async function getNearbyProperties(
  property: Pick<Property, 'id' | 'latitude' | 'longitude'>,
  limit = 4
): Promise<NearbyProperty[]> {
  const latitude = Number(property.latitude);
  const longitude = Number(property.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

  try {
    // Ventana de unos 50 km; la distancia exacta se calcula después con Haversine.
    const latitudeDelta = 0.45;
    const longitudeDelta = 0.45 / Math.max(Math.cos((latitude * Math.PI) / 180), 0.2);
    const params = new URLSearchParams({
      bbox: [longitude - longitudeDelta, latitude - latitudeDelta, longitude + longitudeDelta, latitude + latitudeDelta].join(','),
      page_size: '60',
      include_images: '1',
    });
    const response = await fetch(`${API_URL}/properties/?${params.toString()}`, {
      next: { revalidate: 300, tags: ['properties'] },
    });
    if (!response.ok) return [];

    return normalizeList(await response.json())
      .filter((candidate) =>
        // An id-less candidate would render as `/propiedad/null`, a link only
        // crawlers ever follow — it cost ~180 requests answered with 404.
        candidate.id != null &&
        candidate.id !== property.id &&
        Number.isFinite(Number(candidate.latitude)) &&
        Number.isFinite(Number(candidate.longitude))
      )
      .map((candidate) => ({
        ...candidate,
        distanceKm: distanceInKm(latitude, longitude, Number(candidate.latitude), Number(candidate.longitude)),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching nearby properties:', error);
    return [];
  }
}

/**
 * Fetch a small page of properties WITH images, for the "Propiedades
 * destacadas" grid on SEO landing pages. Unlike `getProperties`, this always
 * requests `include_images=1`; the page size stays small (default 8) so the
 * response is cheap enough to include images. Returns `[]` on any failure so
 * callers can fall back to the image-less full list.
 */
export async function getFeaturedProperties({
  type,
  status,
  city,
  province,
  limit = 8,
  revalidate = 3600,
}: GetFeaturedPropertiesOptions = {}): Promise<Property[]> {
  try {
    const params = new URLSearchParams({
      page_size: String(limit),
      include_images: '1',
    });
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (city) params.set('city', city);
    if (province) params.set('province', province);

    const res = await fetch(`${API_URL}/properties/?${params.toString()}`, {
      next: { revalidate, tags: ['properties'] },
    });
    if (!res.ok) return [];
    return normalizeList(await res.json());
  } catch (error) {
    console.error('Error fetching featured properties:', error);
    return [];
  }
}

export async function getProperty(id: string): Promise<Property | null> {
  try {
    const res = await fetch(`${API_URL}/properties/${id}/`, {
      next: { revalidate: 300, tags: ['properties', `property-${id}`] },
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as Property;
  } catch (error) {
    console.error('Error fetching property:', error);
    return null;
  }
}

/**
 * Serialize an object for a JSON-LD <script> tag, escaping `<` so that
 * user-controlled fields (titles, descriptions) can't break out of the script
 * element (e.g. via a literal `</script>`).
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// --- Labels ---------------------------------------------------------------

export function getPropertyTypeLabel(type?: string): string {
  const labels: Record<string, string> = {
    house: 'Casa',
    land: 'Terreno',
    apartment: 'Departamento',
    commercial: 'Local comercial',
    other: 'Propiedad',
  };
  return labels[type || ''] || 'Propiedad';
}

export function getStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    for_sale: 'En venta',
    for_rent: 'En alquiler',
    inactive: 'Inactivo',
  };
  return labels[status || ''] || status || '';
}

export const PROPERTY_SCHEMA_TYPE: Record<string, string> = {
  house: 'SingleFamilyResidence',
  apartment: 'Apartment',
  land: 'LandParcel',
  commercial: 'CommercialProperty',
  other: 'Residence',
};

// --- Formatting -----------------------------------------------------------

export function formatPrice(price?: number | string | null): string {
  const value = Number.parseFloat(String(price ?? ''));
  if (!Number.isFinite(value)) return 'Precio a consultar';
  return `$${value.toLocaleString('es-EC')}`;
}

export function formatArea(area?: number | string | null): string {
  const value = Number.parseFloat(String(area ?? ''));
  if (!Number.isFinite(value)) return '';
  return `${Math.round(value)} m²`;
}

export function getMainImageUrl(property: Property, baseUrl = SITE_URL): string {
  const main =
    property.images?.find((img) => img.is_main) || property.images?.[0];
  const url = main?.image || '/opengraph-image';
  return url.startsWith('http') ? url : `${baseUrl}${url}`;
}

// --- Slugs ----------------------------------------------------------------

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Unique cities present in the data, sorted, with a URL-safe slug. */
export function getCities(
  properties: Property[]
): { name: string; slug: string; count: number }[] {
  const map = new Map<string, { name: string; slug: string; count: number }>();
  for (const p of properties) {
    const name = (p.city || '').trim();
    if (!name) continue;
    const slug = slugify(name);
    if (!slug) continue;
    const existing = map.get(slug);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(slug, { name, slug, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Same shape as `getCities`, but counted server-side over the whole inventory.
 *
 * The API groups by the raw stored value, so the same canton arrives split
 * across spellings ("QUITO" / "Quito"); merging by slug collapses them.
 */
export function citiesFromSummary(
  summary: PropertySummary
): { name: string; slug: string; count: number }[] {
  const map = new Map<string, { name: string; slug: string; count: number }>();
  for (const row of summary.by_city) {
    const name = (row.name || '').trim();
    const slug = name ? slugify(name) : '';
    if (!slug) continue;
    const existing = map.get(slug);
    if (existing) {
      existing.count += row.count;
    } else {
      map.set(slug, { name, slug, count: row.count });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Provinces counted server-side over the whole inventory. */
export function provincesFromSummary(
  summary: PropertySummary
): { name: string; slug: string; count: number }[] {
  const map = new Map<string, { name: string; slug: string; count: number }>();
  for (const row of summary.by_province) {
    const name = (row.name || '').trim();
    const slug = name ? slugify(name) : '';
    if (!slug) continue;
    const existing = map.get(slug);
    if (existing) {
      existing.count += row.count;
    } else {
      map.set(slug, { name, slug, count: row.count });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Unique provinces present in the data, sorted, with a URL-safe slug. */
export function getProvinces(
  properties: Property[]
): { name: string; slug: string; count: number }[] {
  const map = new Map<string, { name: string; slug: string; count: number }>();
  for (const p of properties) {
    const name = (p.province || '').trim();
    if (!name) continue;
    const slug = slugify(name);
    if (!slug) continue;
    const existing = map.get(slug);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(slug, { name, slug, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
