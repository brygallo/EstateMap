/**
 * Tipos compartidos del dominio para el frontend.
 *
 * Centralizar estos tipos elimina los `any` dispersos por el mapa, el modal y
 * los filtros, y hace que un cambio en la forma de una propiedad se propague
 * como error de compilación en vez de un bug en runtime.
 */

export type PropertyType = 'house' | 'land' | 'apartment' | 'commercial' | 'other';
export type PropertyStatus = 'for_sale' | 'for_rent' | 'inactive';

export interface PropertyImage {
  id?: number;
  image: string;
  thumbnail?: string | null;
  is_main?: boolean;
  uploaded_at?: string;
  file_size?: number;
  file_size_kb?: number;
  original_filename?: string;
}

/**
 * El backend serializa el polígono a `[[lat, lng], ...]` para el frontend, pero
 * en algunos flujos todavía puede llegar como GeoJSON. Aceptamos ambas formas.
 */
export type LatLng = [number, number];
export type PropertyPolygon =
  | LatLng[]
  | { type: string; coordinates: number[][][] }
  | null;

export interface Property {
  id: number;
  title?: string;
  description?: string;
  property_type: PropertyType | string;
  status: PropertyStatus | string;
  address?: string;
  city?: string;
  province?: string;
  latitude?: number | null;
  longitude?: number | null;
  polygon?: PropertyPolygon;
  show_measurements?: boolean;
  area?: number | string | null;
  built_area?: number | string | null;
  rooms?: number;
  bathrooms?: number;
  parking_spaces?: number;
  floors?: number | null;
  furnished?: boolean;
  year_built?: number | null;
  price: number | string;
  is_negotiable?: boolean;
  images?: PropertyImage[];
  owner?: number | null;
  owner_username?: string;
  contact_phone?: string;
  created_at?: string;
  updated_at?: string;
}

/** Propietario tal como lo expone el endpoint `/properties/owners/`. */
export interface Owner {
  id: number;
  username: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  is_staff?: boolean;
  is_email_verified?: boolean;
}

/** Estado de los filtros del mapa (lo que el usuario elige en la UI). */
export interface PropertyFilters {
  search: string;
  propertyType: string;
  status: string;
  minPrice: number;
  maxPrice: number;
  minArea: number;
  maxArea: number;
  rooms: string;
  bathrooms: string;
  userId: string;
}

/** Bounding box del mapa visible, en grados. */
export interface MapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Respuesta paginada estándar de DRF. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
