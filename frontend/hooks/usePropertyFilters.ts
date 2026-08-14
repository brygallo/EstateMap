'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { readMapNetworkProfile } from '@/lib/network-profile';
import type {
  MapBounds,
  MapCityGroup,
  MapPayloadContext,
  MapPropertyItem,
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
function filtersToApiParams(
  f: PropertyFilters,
  bounds: MapBounds | null,
  options: {
    pageSize?: number;
    includeImages?: boolean;
    page?: number;
    distanceOrigin?: { lat: number; lng: number };
  } = {}
): URLSearchParams {
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
  if (options.pageSize) params.set('page_size', String(options.pageSize));
  if (options.page) params.set('page', String(options.page));
  if (options.includeImages != null) params.set('include_images', options.includeImages ? '1' : '0');
  if (options.distanceOrigin) {
    params.set('origin_lat', String(options.distanceOrigin.lat));
    params.set('origin_lng', String(options.distanceOrigin.lng));
  }
  return params;
}

/**
 * Clave que identifica el conjunto de resultados por filtros (sin bbox ni
 * page_size). Si no cambia, dos vistas con distinto encuadre comparten datos.
 */
function filtersKey(f: PropertyFilters): string {
  const params = filtersToApiParams(f, null);
  params.delete('page_size');
  params.delete('include_images');
  params.sort();
  return params.toString();
}

function mapRequestKey(f: PropertyFilters, zoom: number): string {
  const zoomBucket = zoom <= 9.2 ? Math.floor(zoom * 2) / 2 : 'points';
  return `${filtersKey(f)}|zoom:${zoomBucket}`;
}

function mapBoundsCacheKey(bounds: MapBounds, zoom: number): MapBounds {
  if (zoom <= 9.2) {
    return { west: -180, south: -90, east: 180, north: 90 };
  }
  return bounds;
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
  items: MapPropertyItem[];
  cityGroups: MapCityGroup[];
  context: MapPayloadContext | null;
}

function getOrCreateCache(
  caches: Map<string, MapResultsCache>,
  key: string
): MapResultsCache {
  let cache = caches.get(key);
  if (!cache) {
    cache = {
      areas: [],
      items: [],
      cityGroups: [],
      context: null,
    };
    caches.set(key, cache);
  }
  return cache;
}

interface UsePropertyFiltersArgs {
  bounds: MapBounds | null;
  zoom?: number;
  cardsEnabled?: boolean;
  auxiliaryDataEnabled?: boolean;
}

/**
 * Fuente de verdad de los filtros del mapa: mantiene el estado, lo sincroniza
 * con la URL y trae del backend (con debounce) solo las propiedades que caen en
 * el bbox visible y cumplen los filtros. Así no se descarga todo el catálogo.
 */
export function usePropertyFilters({
  bounds,
  zoom = 7,
  cardsEnabled = true,
  auxiliaryDataEnabled = true,
}: UsePropertyFiltersArgs) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState<PropertyFilters>(() =>
    filtersFromParams(searchParams)
  );
  const [mapProperties, setMapProperties] = useState<MapPropertyItem[]>([]);
  const [mapCityGroups, setMapCityGroups] = useState<MapCityGroup[]>([]);
  const [mapContext, setMapContext] = useState<MapPayloadContext | null>(null);
  const [cardProperties, setCardProperties] = useState<Property[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [locations, setLocations] = useState<PropertyLocationGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsLoadingMore, setCardsLoadingMore] = useState(false);
  const [cardsPage, setCardsPage] = useState(1);
  const [cardsHasMore, setCardsHasMore] = useState(false);
  const [cardsPageSize, setCardsPageSize] = useState(20);
  const [networkProfile] = useState(readMapNetworkProfile);
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
  const cardsAbortRef = useRef<AbortController | null>(null);
  const activeFilterKeyRef = useRef<string>(filtersKey(filters));
  const displayedMapKeyRef = useRef<string>(mapRequestKey(filters, zoom));
  // Cache incremental por filtros: cada bbox nuevo se mezcla por id. El mapa no
  // reemplaza el set entero al panear, solo agrega lo que faltaba.
  const resultCachesRef = useRef<Map<string, MapResultsCache>>(new Map());

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px), (pointer: coarse)');
    const updatePageSize = () => setCardsPageSize(
      networkProfile.constrained ? networkProfile.cardPageSize : mobileQuery.matches ? 8 : 20
    );
    updatePageSize();
    mobileQuery.addEventListener('change', updatePageSize);
    return () => mobileQuery.removeEventListener('change', updatePageSize);
  }, [networkProfile]);

  useEffect(() => {
    const next = filtersFromParams(searchParams);
    setFilters((current) => (filtersEqual(current, next) ? current : next));
  }, [searchParams]);

  useEffect(() => {
    const key = filtersKey(filters);
    if (activeFilterKeyRef.current === key) return;
    activeFilterKeyRef.current = key;
    const cache = resultCachesRef.current.get(key);
    setMapProperties(cache ? cache.items : []);
    setMapCityGroups(cache ? cache.cityGroups : []);
    setMapContext(cache ? cache.context : null);
    setCardProperties([]);
    setCardsPage(1);
    setCardsHasMore(false);
    setError(false);
  }, [filters]);

  // Lista de propietarios para el filtro por usuario (independiente del bbox).
  useEffect(() => {
    if (!auxiliaryDataEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/properties/owners/', { skipAuth: true });
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
  }, [auxiliaryDataEnabled]);

  // Provincias/ciudades disponibles para el filtro por ubicación (todo el catálogo).
  useEffect(() => {
    if (!auxiliaryDataEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/properties/locations/', { skipAuth: true });
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
  }, [auxiliaryDataEnabled]);

  // Count every matching row through the aggregate endpoint. The public list
  // endpoint is intentionally capped and must never be used as a catalog total.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = filtersToApiParams(filters, null);
        const res = await apiFetch(`/properties/summary/?${params.toString()}`, {
          skipAuth: true,
          signal: controller.signal,
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setTotalCount(typeof data?.total === 'number' ? data.total : null);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Error fetching total count:', err);
        }
      }
    }, networkProfile.constrained ? 1_800 : 300);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [filters, networkProfile.constrained]);

  // Traer puntos ultralivianos del mapa cuando cambian filtros o bounds.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const key = mapRequestKey(filters, zoom);
      const cache = getOrCreateCache(resultCachesRef.current, key);
      const hasCachedResults = cache.items.length > 0;

      // A different zoom bucket represents a different aggregation level.
      // Do not keep drawing clusters from the previous level while its
      // replacement is loading, since they move with the camera and look as if
      // the clicked cluster was loaded twice.
      if (displayedMapKeyRef.current !== key) {
        displayedMapKeyRef.current = key;
        setMapProperties(cache.items);
        setMapCityGroups(cache.cityGroups);
        setMapContext(cache.context);
      }

      if (!bounds) {
        setMapProperties(cache.items);
        setMapCityGroups(cache.cityGroups);
        setMapContext(cache.context);
        return;
      }

      // Si el bbox solicitado ya cae dentro de cualquier zona cacheada para
      // estos filtros, no pedimos red ni tocamos el array de propiedades.
      const cacheBounds = mapBoundsCacheKey(bounds, zoom);

      if (cache.areas.some((area) => boundsContains(area, cacheBounds))) {
        if (cache.items.length) setMapProperties(cache.items);
        setMapCityGroups(cache.cityGroups);
        setMapContext(cache.context);
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
        const params = filtersToApiParams(filters, bounds);
        params.set('zoom', String(zoom));
        params.set('limit', String(
          zoom <= 9.2 ? Math.min(900, networkProfile.mapPointLimit) : networkProfile.mapPointLimit
        ));
        const qs = params.toString();
        const res = await apiFetch(`/properties/map_points/?${qs}`, {
          skipAuth: true,
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          const list: MapPropertyItem[] = Array.isArray(data) ? data : data.items ?? data.results ?? [];
          const cityGroups: MapCityGroup[] = Array.isArray(data?.city_groups) ? data.city_groups : [];
          const context: MapPayloadContext | null = data?.context ?? null;
          cache.items = list;
          cache.cityGroups = cityGroups;
          cache.context = context;
          cache.areas = [cacheBounds];
          setMapProperties(list);
          setMapCityGroups(cityGroups);
          setMapContext(context);
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
    }, 220);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, bounds, reloadKey, zoom, networkProfile]);

  const fetchCardsPage = useCallback(
    async (page: number, mode: 'replace' | 'append' = 'replace') => {
      if (!bounds) {
        if (mode === 'replace') {
          setCardProperties([]);
          setCardsPage(1);
          setCardsHasMore(false);
        }
        return;
      }

      if (cardsAbortRef.current) cardsAbortRef.current.abort();
      const controller = new AbortController();
      cardsAbortRef.current = controller;
      if (mode === 'append') setCardsLoadingMore(true);
      else setCardsLoading(true);

      try {
        const params = filtersToApiParams(filters, null, {
          page,
          pageSize: cardsPageSize,
          includeImages: networkProfile.includeCardImages,
          distanceOrigin: {
            lat: (bounds.south + bounds.north) / 2,
            lng: (bounds.west + bounds.east) / 2,
          },
        });
        const res = await apiFetch(`/properties/?${params.toString()}`, {
          skipAuth: true,
          signal: controller.signal,
        });
        if (!res.ok) {
          if (cardsAbortRef.current === controller) setError(true);
          return;
        }

        const data = await res.json();
        const list: Property[] = Array.isArray(data) ? data : data.results ?? [];
        setCardProperties((current) => {
          if (mode === 'replace') return list;
          const seen = new Set(current.map((property) => property.id));
          return [...current, ...list.filter((property) => !seen.has(property.id))];
        });
        setCardsPage(page);
        setCardsHasMore(Boolean(!Array.isArray(data) && data.next));
        if (cardsAbortRef.current === controller) setError(false);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Error fetching property cards:', err);
          if (cardsAbortRef.current === controller) setError(true);
        }
      } finally {
        if (cardsAbortRef.current === controller) {
          setCardsLoading(false);
          setCardsLoadingMore(false);
        }
      }
    },
    [bounds, cardsPageSize, filters, networkProfile.includeCardImages]
  );

  useEffect(() => {
    if (!cardsEnabled) {
      cardsAbortRef.current?.abort();
      return;
    }
    const timer = setTimeout(() => {
      fetchCardsPage(1, 'replace');
    }, networkProfile.cardDelayMs);
    return () => clearTimeout(timer);
  }, [cardsEnabled, fetchCardsPage, networkProfile.cardDelayMs]);

  const loadMoreCards = useCallback(() => {
    if (cardsLoading || cardsLoadingMore || !cardsHasMore) return;
    fetchCardsPage(cardsPage + 1, 'append');
  }, [cardsHasMore, cardsLoading, cardsLoadingMore, cardsPage, fetchCardsPage]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (cardsAbortRef.current) cardsAbortRef.current.abort();
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
        if (typeof window !== 'undefined') {
          const currentParams = new URLSearchParams(window.location.search);
          ['property', 'lat', 'lng', 'zoom'].forEach((key) => {
            const value = currentParams.get(key);
            if (value != null) params.set(key, value);
          });
        }
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
    setCardProperties([]);
    setCardsPage(1);
    setCardsHasMore(false);
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
    mapProperties,
    mapCityGroups,
    mapContext,
    cardProperties,
    owners,
    locations,
    loading: cardsLoading,
    mapLoading: loading,
    cardsLoading,
    cardsLoadingMore,
    cardsHasMore,
    loadMoreCards,
    error,
    retry,
    totalCount,
    handleFilterChange,
    clearFilters,
    hasActiveFilters,
  };
}
