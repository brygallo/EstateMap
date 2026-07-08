'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  MapBounds,
  Owner,
  Property,
  PropertyFilters,
  PropertyLocationGroup,
} from '@/lib/types';

// Rangos por defecto de los sliders.
export const PRICE_MIN = 0;
export const PRICE_MAX = 10000000; // hasta 10M USD por defecto
export const AREA_MIN = 0;
export const AREA_MAX = 100000; // alto para que los terrenos grandes se vean por defecto

export function defaultFilters(): PropertyFilters {
  return {
    search: '',
    propertyType: 'all',
    status: 'all',
    province: 'all',
    city: 'all',
    minPrice: PRICE_MIN,
    maxPrice: PRICE_MAX,
    minArea: AREA_MIN,
    maxArea: AREA_MAX,
    rooms: 'all',
    bathrooms: 'all',
    userId: 'all',
  };
}

function filtersFromParams(params: URLSearchParams | null): PropertyFilters {
  const base = defaultFilters();
  if (!params) return base;
  const num = (key: string, fallback: number) => {
    const v = params.get(key);
    return v ? parseInt(v, 10) : fallback;
  };
  return {
    search: params.get('search') || '',
    propertyType: params.get('type') || 'all',
    status: params.get('status') || 'all',
    province: params.get('province') || 'all',
    city: params.get('city') || 'all',
    minPrice: num('minPrice', PRICE_MIN),
    maxPrice: num('maxPrice', PRICE_MAX),
    minArea: num('minArea', AREA_MIN),
    maxArea: num('maxArea', AREA_MAX),
    rooms: params.get('rooms') || 'all',
    bathrooms: params.get('bathrooms') || 'all',
    userId: params.get('user') || 'all',
  };
}

function filtersEqual(a: PropertyFilters, b: PropertyFilters): boolean {
  return (
    a.search === b.search &&
    a.propertyType === b.propertyType &&
    a.status === b.status &&
    a.province === b.province &&
    a.city === b.city &&
    a.minPrice === b.minPrice &&
    a.maxPrice === b.maxPrice &&
    a.minArea === b.minArea &&
    a.maxArea === b.maxArea &&
    a.rooms === b.rooms &&
    a.bathrooms === b.bathrooms &&
    a.userId === b.userId
  );
}

/** Serializa los filtros activos a URLSearchParams (para la URL compartible). */
function filtersToUrlParams(f: PropertyFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (f.search) params.set('search', f.search);
  if (f.propertyType !== 'all') params.set('type', f.propertyType);
  if (f.status !== 'all') params.set('status', f.status);
  if (f.province !== 'all') params.set('province', f.province);
  if (f.city !== 'all') params.set('city', f.city);
  if (f.minPrice !== PRICE_MIN) params.set('minPrice', String(f.minPrice));
  if (f.maxPrice !== PRICE_MAX) params.set('maxPrice', String(f.maxPrice));
  if (f.minArea !== AREA_MIN) params.set('minArea', String(f.minArea));
  if (f.maxArea !== AREA_MAX) params.set('maxArea', String(f.maxArea));
  if (f.rooms !== 'all') params.set('rooms', f.rooms);
  if (f.bathrooms !== 'all') params.set('bathrooms', f.bathrooms);
  if (f.userId !== 'all') params.set('user', f.userId);
  return params;
}

/** Traduce los filtros de la UI a los query params que entiende el backend. */
function filtersToApiParams(f: PropertyFilters, bounds: MapBounds | null): URLSearchParams {
  const params = new URLSearchParams();
  if (f.search) params.set('search', f.search);
  if (f.propertyType !== 'all') params.set('type', f.propertyType);
  if (f.status !== 'all') params.set('status', f.status);
  if (f.province !== 'all') params.set('province', f.province);
  if (f.city !== 'all') params.set('city', f.city);
  if (f.minPrice !== PRICE_MIN) params.set('min_price', String(f.minPrice));
  if (f.maxPrice !== PRICE_MAX) params.set('max_price', String(f.maxPrice));
  if (f.minArea !== AREA_MIN) params.set('min_area', String(f.minArea));
  if (f.maxArea !== AREA_MAX) params.set('max_area', String(f.maxArea));
  if (f.rooms !== 'all') params.set('rooms', f.rooms);
  if (f.bathrooms !== 'all') params.set('bathrooms', f.bathrooms);
  if (f.userId !== 'all') params.set('user', f.userId);
  if (bounds) {
    params.set('bbox', `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
  }
  // El mapa no debe intentar hidratar miles de tarjetas/marcadores por paneo.
  // El backend sigue exponiendo `count`; el detalle completo se carga por ID.
  params.set('page_size', '600');
  return params;
}

/**
 * Clave que identifica el conjunto de resultados por filtros (sin bbox ni
 * page_size). Si no cambia, dos vistas con distinto encuadre comparten datos.
 */
function filtersKey(f: PropertyFilters): string {
  const params = filtersToApiParams(f, null);
  params.delete('page_size');
  params.sort();
  return params.toString();
}

/** True si `inner` está totalmente contenido dentro de `outer`. */
function boundsContains(outer: MapBounds, inner: MapBounds): boolean {
  return (
    outer.west <= inner.west &&
    outer.south <= inner.south &&
    outer.east >= inner.east &&
    outer.north >= inner.north
  );
}

interface MapResultsCache {
  areas: MapBounds[];
  propertiesById: Map<number, Property>;
  orderedIds: number[];
  hasGlobal: boolean;
}

function cacheToList(cache: MapResultsCache): Property[] {
  return cache.orderedIds
    .map((id) => cache.propertiesById.get(id))
    .filter((property): property is Property => Boolean(property));
}

function getOrCreateCache(
  caches: Map<string, MapResultsCache>,
  key: string
): MapResultsCache {
  let cache = caches.get(key);
  if (!cache) {
    cache = {
      areas: [],
      propertiesById: new Map(),
      orderedIds: [],
      hasGlobal: false,
    };
    caches.set(key, cache);
  }
  return cache;
}

function mergeProperties(cache: MapResultsCache, list: Property[]) {
  list.forEach((property) => {
    if (property.id == null) return;
    if (!cache.propertiesById.has(property.id)) {
      cache.orderedIds.push(property.id);
    }
    cache.propertiesById.set(property.id, property);
  });
}

interface UsePropertyFiltersArgs {
  token: string | null;
  bounds: MapBounds | null;
  zoom?: number;
}

/**
 * Fuente de verdad de los filtros del mapa: mantiene el estado, lo sincroniza
 * con la URL y trae del backend (con debounce) solo las propiedades que caen en
 * el bbox visible y cumplen los filtros. Así no se descarga todo el catálogo.
 */
export function usePropertyFilters({ token, bounds, zoom = 7 }: UsePropertyFiltersArgs) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState<PropertyFilters>(() =>
    filtersFromParams(searchParams)
  );
  const [properties, setProperties] = useState<Property[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [locations, setLocations] = useState<PropertyLocationGroup[]>([]);
  const [loading, setLoading] = useState(false);
  // true cuando la última carga de propiedades del área falló (red / respuesta
  // no OK). Permite distinguir "0 resultados" real de un error, y ofrecer
  // reintentar en lugar de mostrar una lista vacía silenciosa.
  const [error, setError] = useState(false);
  // Se incrementa al pulsar "Reintentar"; fuerza que el efecto de carga vuelva a
  // ejecutarse aunque filtros/bounds no hayan cambiado.
  const [reloadKey, setReloadKey] = useState(0);
  // Total de propiedades que cumplen los filtros en TODO el catálogo (sin bbox),
  // para diferenciar "visibles en el mapa" de "total encontradas".
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeFilterKeyRef = useRef<string>(filtersKey(filters));
  // Cache incremental por filtros: cada bbox nuevo se mezcla por id. El mapa no
  // reemplaza el set entero al panear, solo agrega lo que faltaba.
  const resultCachesRef = useRef<Map<string, MapResultsCache>>(new Map());

  useEffect(() => {
    const next = filtersFromParams(searchParams);
    setFilters((current) => (filtersEqual(current, next) ? current : next));
  }, [searchParams]);

  useEffect(() => {
    const key = filtersKey(filters);
    if (activeFilterKeyRef.current === key) return;
    activeFilterKeyRef.current = key;
    const cache = resultCachesRef.current.get(key);
    setProperties(cache ? cacheToList(cache) : []);
    setError(false);
  }, [filters]);

  // Lista de propietarios para el filtro por usuario (independiente del bbox).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { apiFetch } = await import('@/lib/api');
        const res = await apiFetch('/properties/owners/', { skipAuth: !token });
        if (res.ok && !cancelled) {
          setOwners(await res.json());
        }
      } catch {
        // El filtro por usuario simplemente queda vacío si falla.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Provincias/ciudades disponibles para el filtro por ubicación (todo el catálogo).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { apiFetch } = await import('@/lib/api');
        const res = await apiFetch('/properties/locations/', { skipAuth: !token });
        if (res.ok && !cancelled) {
          setLocations(await res.json());
        }
      } catch {
        // El filtro por ubicación queda vacío si falla.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Total de resultados que cumplen los filtros SIN restringir al bbox visible.
  // Se pide `page_size=1` porque solo interesa el `count` de la paginación DRF.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { apiFetch } = await import('@/lib/api');
        const params = filtersToApiParams(filters, null);
        params.set('page_size', '1');
        const res = await apiFetch(`/properties/?${params.toString()}`, {
          skipAuth: !token,
          signal: controller.signal,
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTotalCount(
            typeof data?.count === 'number'
              ? data.count
              : Array.isArray(data)
                ? data.length
                : null
          );
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Error fetching total count:', err);
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [filters, token]);

  // Traer propiedades cuando cambian filtros o bounds (con debounce).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const key = filtersKey(filters);
      const cache = getOrCreateCache(resultCachesRef.current, key);
      const hasCachedResults = cache.propertiesById.size > 0;
      const useGlobalLoad = zoom <= 7;

      if (useGlobalLoad && cache.hasGlobal) {
        const cached = cacheToList(cache);
        if (cached.length) setProperties(cached);
        return;
      }

      if (!bounds && !useGlobalLoad) {
        setProperties(cacheToList(cache));
        return;
      }

      // Si el bbox solicitado ya cae dentro de cualquier zona cacheada para
      // estos filtros, no pedimos red ni tocamos el array de propiedades.
      if (!useGlobalLoad && bounds && cache.areas.some((area) => boundsContains(area, bounds))) {
        const cached = cacheToList(cache);
        if (cached.length) setProperties(cached);
        return;
      }

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Spinner con retardo: solo se muestra si la respuesta tarda de verdad,
      // para no parpadear en cargas rápidas. Además solo la petición vigente
      // (la más reciente) puede togglear `loading`, evitando parpadeos al
      // encadenar movimientos.
      const showTimer = setTimeout(() => {
        if (abortRef.current === controller && !hasCachedResults) setLoading(true);
      }, hasCachedResults ? 900 : 400);

      try {
        const { apiFetch } = await import('@/lib/api');
        const params = filtersToApiParams(filters, useGlobalLoad ? null : bounds);
        if (useGlobalLoad) params.set('page_size', '2000');
        const qs = params.toString();
        const res = await apiFetch(`/properties/?${qs}`, {
          skipAuth: !token,
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          const list: Property[] = Array.isArray(data) ? data : data.results ?? [];
          mergeProperties(cache, list);
          if (useGlobalLoad) {
            cache.hasGlobal = true;
          } else if (bounds) {
            cache.areas.push(bounds);
          }
          setProperties(cacheToList(cache));
          if (abortRef.current === controller) setError(false);
        } else if (abortRef.current === controller) {
          setError(true);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Error fetching properties:', err);
          if (abortRef.current === controller) setError(true);
        }
      } finally {
        clearTimeout(showTimer);
        if (abortRef.current === controller) setLoading(false);
      }
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, bounds, token, reloadKey, zoom]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    };
  }, []);

  const handleFilterChange = useCallback(
    (next: PropertyFilters) => {
      setFilters(next);
      // Sincroniza la URL con replace + debounce. Antes se hacía router.push en
      // cada cambio: un solo arrastre del slider emite decenas de onChange, así
      // que el historial se llenaba de entradas y el botón "Atrás" dejaba de
      // funcionar. `replace` mantiene el enlace compartible sin apilar historial,
      // y el debounce evita reescribir la URL en cada tick del arrastre.
      if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
      urlSyncRef.current = setTimeout(() => {
        const params = filtersToUrlParams(next);
        const query = params.toString();
        router.replace(query ? `/?${query}` : '/', { scroll: false });
      }, 300);
    },
    [router]
  );

  const clearFilters = useCallback(() => {
    handleFilterChange(defaultFilters());
  }, [handleFilterChange]);

  // Reintenta la carga tras un error: descarta la zona cacheada para forzar la
  // re-consulta aunque filtros y bounds no hayan cambiado.
  const retry = useCallback(() => {
    resultCachesRef.current.delete(filtersKey(filters));
    setError(false);
    setReloadKey((k) => k + 1);
  }, [filters]);

  const hasActiveFilters = useMemo(() => {
    const f = filters;
    return (
      !!f.search ||
      f.propertyType !== 'all' ||
      f.status !== 'all' ||
      f.province !== 'all' ||
      f.city !== 'all' ||
      f.minPrice !== PRICE_MIN ||
      f.maxPrice !== PRICE_MAX ||
      f.minArea !== AREA_MIN ||
      f.maxArea !== AREA_MAX ||
      f.rooms !== 'all' ||
      f.bathrooms !== 'all' ||
      f.userId !== 'all'
    );
  }, [filters]);

  return {
    filters,
    properties,
    owners,
    locations,
    loading,
    error,
    retry,
    totalCount,
    handleFilterChange,
    clearFilters,
    hasActiveFilters,
  };
}
