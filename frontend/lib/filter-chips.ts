import {
  AREA_MAX,
  AREA_MIN,
  PRICE_MAX,
  PRICE_MIN,
} from '@/hooks/usePropertyFilters';
import { getPropertyTypeLabel, getStatusLabel } from '@/lib/property-labels';
import type { Owner, PropertyFilters } from '@/lib/types';

/**
 * One active filter, ready to be shown as a chip. `patch` is the change that
 * removes it, so every surface that renders chips (the sidebar header and the
 * overlay on top of the map) clears them the same way.
 */
export interface FilterChip {
  key: string;
  label: string;
  patch: Partial<PropertyFilters>;
}

// es-EC keeps SSR and client formatting identical (avoids hydration diffs).
const money = (value: number) => `$${value.toLocaleString('es-EC')}`;
const squareMeters = (value: number) => `${value.toLocaleString('es-EC')} m²`;

/**
 * Active filters as chips, in the order they read best. The search term is
 * included: the sidebar drops it because it already has its own input, but on
 * the map it is otherwise invisible.
 */
export function buildFilterChips(filters: PropertyFilters, owners: Owner[] = []): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.search) {
    chips.push({ key: 'search', label: `«${filters.search}»`, patch: { search: '' } });
  }
  if (filters.propertyType !== 'all') {
    chips.push({
      key: 'type',
      label: getPropertyTypeLabel(filters.propertyType),
      patch: { propertyType: 'all' },
    });
  }
  if (filters.status !== 'all') {
    chips.push({
      key: 'status',
      label: getStatusLabel(filters.status),
      patch: { status: 'all' },
    });
  }
  if (filters.province !== 'all') {
    chips.push({
      key: 'province',
      label: filters.province,
      // Dropping the province drops the city too — the city depends on it.
      patch: { province: 'all', city: 'all' },
    });
  }
  if (filters.city !== 'all') {
    chips.push({ key: 'city', label: filters.city, patch: { city: 'all' } });
  }
  if (filters.userId !== 'all') {
    const owner = owners.find((o) => String(o.id) === String(filters.userId));
    chips.push({
      key: 'user',
      label: owner ? owner.username : 'Usuario',
      patch: { userId: 'all' },
    });
  }
  if (filters.rooms !== 'all') {
    chips.push({ key: 'rooms', label: `${filters.rooms} hab.`, patch: { rooms: 'all' } });
  }
  if (filters.bathrooms !== 'all') {
    chips.push({
      key: 'bathrooms',
      label: `${filters.bathrooms} baños`,
      patch: { bathrooms: 'all' },
    });
  }
  if (filters.minPrice !== PRICE_MIN || filters.maxPrice !== PRICE_MAX) {
    const label =
      filters.minPrice !== PRICE_MIN && filters.maxPrice !== PRICE_MAX
        ? `${money(filters.minPrice)}–${money(filters.maxPrice)}`
        : filters.minPrice !== PRICE_MIN
          ? `Desde ${money(filters.minPrice)}`
          : `Hasta ${money(filters.maxPrice)}`;
    chips.push({
      key: 'price',
      label,
      patch: { minPrice: PRICE_MIN, maxPrice: PRICE_MAX },
    });
  }
  if (filters.minArea !== AREA_MIN || filters.maxArea !== AREA_MAX) {
    const label =
      filters.minArea !== AREA_MIN && filters.maxArea !== AREA_MAX
        ? `${filters.minArea.toLocaleString('es-EC')}–${squareMeters(filters.maxArea)}`
        : filters.minArea !== AREA_MIN
          ? `Desde ${squareMeters(filters.minArea)}`
          : `Hasta ${squareMeters(filters.maxArea)}`;
    chips.push({
      key: 'area',
      label,
      patch: { minArea: AREA_MIN, maxArea: AREA_MAX },
    });
  }

  return chips;
}
