'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2, X } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { haptic } from '@/lib/haptics';
import { usePropertyFilters } from '@/hooks/usePropertyFilters';
import { trackEvent } from '@/lib/analytics';
import { flyToProperty } from '@/lib/map-navigation';
import PropertySidebar from '@/components/map/PropertySidebar';
import PropertyModal from '@/components/PropertyModal';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import MapPropertyCard from '@/components/map/MapPropertyCard';
import MapActiveFilters from '@/components/map/MapActiveFilters';
import MobilePropertyDrawer, { type MobileDrawerSnap } from '@/components/map/MobilePropertyDrawer';
import type { MapBounds, Property } from '@/lib/types';

// Cargar el mapa MapLibre solo en cliente (sin SSR).
const MainMap = dynamic(() => import('@/components/maps/MapLibreMap'), {
  ssr: false,
  loading: () => (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      {/* Trama tenue tipo mapa para que el hueco no se sienta vacío mientras
          carga MapLibre. */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-transparent via-white/30 to-transparent" aria-hidden />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" strokeWidth={2} />
        <p className="mt-4 text-sm font-medium text-textSecondary">Cargando mapa…</p>
      </div>
    </div>
  ),
});

// Centro de Ecuador para mostrar el país completo al iniciar.
const DEFAULT_CENTER: [number, number] = [-1.5, -78.5];

// Bounds win over centre+zoom, always. The previous order preferred the
// fallback whenever its zoom entered point mode, which was every city jump: the camera
// went to the canton's nominal centre at a fixed zoom and could land on empty
// map while the matching listings sat off screen. `zoom` is now only the cap on
// how far a tightly packed group may zoom in.
const fitMapToBounds = (map: any, bounds?: MapBounds, fallback?: { lat: number; lng: number; zoom: number }) => {
  if (!map) return;
  if (bounds) {
    const samePoint = Math.abs(bounds.west - bounds.east) < 0.0001 && Math.abs(bounds.south - bounds.north) < 0.0001;
    if (!samePoint) {
      map.fitBounds(
        [
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ],
        { padding: 86, maxZoom: fallback?.zoom ?? 13, duration: 720 }
      );
      return;
    }
  }
  if (!fallback) return;
  map.flyTo({ center: [fallback.lng, fallback.lat], zoom: fallback.zoom, duration: 700 });
};

const MapPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mapRef = useRef<any>(null);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [mapZoom, setMapZoom] = useState(7);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isMobile = useIsMobile();
  // Where the drawer rests. `half` is the state a map app spends most of its
  // time in — enough list to scan, enough map to keep your bearings. Going
  // straight from hidden to covering the map, as the old boolean did, meant
  // every glance at the results lost the pin you were looking at.
  const [drawerSnap, setDrawerSnap] = useState<MobileDrawerSnap>('closed');
  const sidebarOpen = drawerSnap !== 'closed';

  const {
    filters,
    mapProperties,
    mapCityGroups,
    mapContext,
    cardProperties,
    owners,
    locations,
    loading,
    mapLoading,
    cardsLoadingMore,
    cardsHasMore,
    loadMoreCards,
    error,
    retry,
    totalCount,
    handleFilterChange,
    clearFilters,
    hasActiveFilters,
  } = usePropertyFilters({
    bounds,
    zoom: mapZoom,
    cardsEnabled: !isMobile || sidebarOpen,
    auxiliaryDataEnabled: !isMobile || sidebarOpen,
  });
  const sidebarProperties = cardProperties;
  // Las cards y los puntos provienen de endpoints distintos. Al unirlos por id,
  // toda propiedad visible en el listado conserva un pin, incluso si su punto
  // tuvo que derivarse del centro de un polígono antiguo.
  const mapDisplayProperties = useMemo(() => {
    const clusters = mapProperties.filter((item) => (item as any).is_cluster);
    const points = new Map<number, Property>();
    mapProperties.forEach((item) => {
      if (!(item as any).is_cluster) points.set(Number(item.id), item as Property);
    });
    cardProperties.forEach((property) =>
      points.set(Number(property.id), { ...property, is_card_result: true } as Property)
    );
    return [...clusters, ...points.values()];
  }, [cardProperties, mapProperties]);
  const mapPointProperties = mapDisplayProperties.filter((item): item is Property => !(item as any).is_cluster);
  const geo = useGeolocation(mapRef, mapPointProperties, loading);

  const handleMapReady = (map: any) => {
    mapRef.current = map;
    const latitude = Number(searchParams?.get('lat'));
    const longitude = Number(searchParams?.get('lng'));
    const zoom = Number(searchParams?.get('zoom'));
    if (![latitude, longitude, zoom].every(Number.isFinite)) return;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || zoom < 1 || zoom > 21) return;

    if (typeof map.jumpTo === 'function') {
      map.jumpTo({ center: [longitude, latitude], zoom });
    } else if (typeof map.setView === 'function') {
      map.setView([latitude, longitude], zoom, { animate: false });
    }
  };

  const getContextualShareUrl = useCallback(() => {
    if (typeof window === 'undefined' || !selectedProperty) return '';
    const url = new URL(window.location.href);
    url.pathname = '/';
    url.searchParams.set('property', String(selectedProperty.id));

    const map = mapRef.current;
    const center = map?.getCenter?.();
    const zoom = Number(map?.getZoom?.());
    const latitude = Number(center?.lat);
    const longitude = Number(center?.lng);
    if (Number.isFinite(latitude) && Number.isFinite(longitude) && Number.isFinite(zoom)) {
      url.searchParams.set('lat', latitude.toFixed(6));
      url.searchParams.set('lng', longitude.toFixed(6));
      url.searchParams.set('zoom', zoom.toFixed(2));
    }
    return url.toString();
  }, [selectedProperty]);

  const handleZoomOut = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    trackEvent('map_empty_zoom_out_clicked', { zoom: map.getZoom() });
    map.setZoom(Math.max(map.getZoom() - 2, 7));
  }, []);

  const handleResetMapView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    trackEvent('map_reset_view_clicked', { source: 'map_page' });
    if (typeof map.fitBounds === 'function' && typeof map.flyToBounds !== 'function') {
      map.flyTo({ center: [DEFAULT_CENTER[1], DEFAULT_CENTER[0]], zoom: 7, duration: 900 });
    } else {
      map.flyTo(DEFAULT_CENTER, 7, { duration: 0.9 });
    }
  }, []);

  const handleCityGroupClick = useCallback((group: { latitude: number; longitude: number; zoom: number; label: string; bounds?: MapBounds }) => {
    const map = mapRef.current;
    if (!map) return;
    trackEvent('map_city_group_clicked', {
      city: group.label,
      zoom: group.zoom,
    });
    fitMapToBounds(map, group.bounds, {
      lat: group.latitude,
      lng: group.longitude,
      zoom: group.zoom || 12,
    });
  }, []);

  const handleCityFilterSelect = useCallback((center: { latitude: number; longitude: number }) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [center.longitude, center.latitude],
      zoom: 12,
      duration: 700,
    });
    if (isMobile) setDrawerSnap('half');
  }, [isMobile]);

  const handleLocate = useCallback(() => {
    trackEvent('map_locate_clicked', {
      location_blocked: geo.locationBlocked,
      has_user_location: Boolean(geo.userLocation),
    });
    geo.handleGetMyLocation();
  }, [geo]);

  // Abrir una propiedad indicada por ?property=<id> (enlaces compartidos).
  useEffect(() => {
    const propertyId = searchParams?.get('property');
    if (!propertyId) return;

    let cancelled = false;
    (async () => {
      try {
        const { apiFetch } = await import('@/lib/api');
        const res = await apiFetch(`/properties/${propertyId}/`, { skipAuth: true });
        if (res.ok && !cancelled) {
          const property: Property = await res.json();
          setSelectedProperty(property);
          setIsModalOpen(true);
        }
      } catch (err) {
        console.error('Error abriendo la propiedad del enlace:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Clic en el listado: solo mueve el mapa y resalta.
  const handleSidebarPropertyClick = (property: Property) => {
    trackEvent('property_card_map_focus_clicked', {
      property_id: property.id,
      city: property.city,
      province: property.province,
      property_type: property.property_type,
      status: property.status,
    });
    setSelectedProperty(property);
    setIsModalOpen(false);
    // "Show me this one on the map" — get out of the map's way, but keep the
    // list within a thumb's reach rather than dismissing it outright.
    if (isMobile) setDrawerSnap('closed');
    haptic('selection');
  };

  const handleSidebarPropertyOpen = (property: Property) => {
    trackEvent('property_card_details_opened', {
      property_id: property.id,
      source: 'sidebar',
      city: property.city,
      province: property.province,
      property_type: property.property_type,
      status: property.status,
    });
    setSelectedProperty(property);
    setIsModalOpen(true);
    if (isMobile) setDrawerSnap('closed');
  };

  // Clic en el polígono/marcador: mueve el mapa y abre el modal.
  const handlePolygonClick = useCallback(async (property: Property) => {
    // Pins are small and the finger covers them; the tick is the only immediate
    // confirmation that the right one was hit, before the camera even moves.
    haptic('selection');
    trackEvent('property_pin_clicked', {
      property_id: property.id,
      city: property.city,
      province: property.province,
      property_type: property.property_type,
      status: property.status,
      zoom: mapRef.current?.getZoom?.() ?? null,
    });
    setSelectedProperty(property);
    setIsModalOpen(true);

    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch(`/properties/${property.id}/`, { skipAuth: true });
      if (res.ok) {
        setSelectedProperty(await res.json());
      }
    } catch (err) {
      console.error('Error cargando detalle de propiedad:', err);
    }
  }, []);

  // "Ver en el mapa" desde el modal: recentra el mapa en la propiedad y, en
  // móvil (donde el panel tapa el mapa), oculta el panel para verlo.
  const handleViewOnMap = () => {
    if (selectedProperty) {
      trackEvent('property_detail_view_on_map_clicked', {
        property_id: selectedProperty.id,
        city: selectedProperty.city,
        province: selectedProperty.province,
      });
    }
    if (selectedProperty) flyToProperty(mapRef.current, selectedProperty);
    if (isMobile) setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    if (selectedProperty) {
      trackEvent('property_detail_closed', {
        property_id: selectedProperty.id,
        city: selectedProperty.city,
        province: selectedProperty.province,
      });
    }
    setIsModalOpen(false);
    setSelectedProperty(null);

    // Quitar el parámetro ?property al cerrar el modal.
    const params = new URLSearchParams(window.location.search);
    if (params.has('property')) {
      params.delete('property');
      const newUrl = params.toString() ? `/?${params.toString()}` : '/';
      router.push(newUrl, { scroll: false });
    }
  };

  useEffect(() => {
    if (!mapRef.current) return;
    const first = window.setTimeout(() => mapRef.current?.invalidateSize?.(), 80);
    const second = window.setTimeout(() => mapRef.current?.invalidateSize?.(), 340);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [isModalOpen]);

  // The property detail still owns its scroll lock. The search/filter drawer
  // keeps its lock beside the rest of its mobile behavior.
  useEffect(() => {
    if (!isModalOpen || !isMobile) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [isMobile, isModalOpen]);

  const renderPropertySidebar = (onClose?: () => void) => (
    <PropertySidebar
      filters={filters}
      owners={owners}
      locations={locations}
      hasActiveFilters={hasActiveFilters}
      onFilterChange={handleFilterChange}
      onClearFilters={clearFilters}
      onCitySelect={handleCityFilterSelect}
      onClose={onClose}
      visibleProperties={sidebarProperties}
      cityGroups={mapCityGroups}
      mapContext={mapContext}
      selectedProperty={selectedProperty}
      onPropertyClick={handleSidebarPropertyClick}
      onPropertyOpen={handleSidebarPropertyOpen}
      loading={loading}
      error={error}
      onRetry={retry}
      totalCount={totalCount}
      userLocation={geo.userLocation}
      onZoomOut={handleZoomOut}
      onResetMapView={handleResetMapView}
      onCityGroupClick={handleCityGroupClick}
      hasMore={cardsHasMore}
      loadingMore={cardsLoadingMore}
      onLoadMore={loadMoreCards}
    />
  );

  return (
    // Subtracts the mobile tab bar as well as the header, so the map fills the
    // gap between them exactly instead of pushing the page into a scroll.
    <div className="relative h-[calc(100dvh-var(--app-header-height)-var(--mobile-tabbar-height)-env(safe-area-inset-bottom))] overflow-hidden lg:h-[calc(100dvh-var(--app-header-height))] lg:flex">
      {isMobile ? (
        <MobilePropertyDrawer
          snap={drawerSnap}
          onSnapChange={setDrawerSnap}
          resultCount={totalCount ?? sidebarProperties.length}
          loading={loading}
          hidden={Boolean(selectedProperty || isModalOpen)}
          lockScroll={!isModalOpen}
        >
          {renderPropertySidebar(() => setDrawerSnap('closed'))}
        </MobilePropertyDrawer>
      ) : (
        <aside className="property-sidebar-scroll h-full w-96 flex-shrink-0 overflow-y-auto overscroll-contain border-r border-line bg-white">
          {renderPropertySidebar()}
        </aside>
      )}

      {/* Mapa: en desktop ocupa el espacio restante entre listado y ficha. */}
      <div
        className={`
          absolute inset-0 z-0 h-full w-full transition-[width] duration-300 ease-in-out
          lg:relative lg:inset-auto lg:left-auto lg:flex-1
        `}
      >
        <MainMap
          filteredProperties={mapDisplayProperties}
          selectedProperty={selectedProperty}
          userLocation={geo.userLocation}
          userAccuracy={geo.accuracy}
          onMapReady={handleMapReady}
          onVisiblePropertiesChange={() => {}}
          onBoundsChange={setBounds}
          onZoomChange={setMapZoom}
          onPolygonClick={handlePolygonClick}
          onLocate={handleLocate}
          locating={geo.loadingLocation}
          locationBlocked={geo.locationBlocked}
          isRefreshing={mapLoading}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          onResetView={handleResetMapView}
          center={DEFAULT_CENTER}
        />

        {/* On mobile the filters live inside the drawer: once it is down, the
            map stays filtered with nothing on screen saying so. These chips make
            that visible and remove a filter without reopening the panel. */}
        <MapActiveFilters
          filters={filters}
          owners={owners}
          onChange={handleFilterChange}
          onClear={clearFilters}
        />
      </div>

      {selectedProperty && !isModalOpen && !sidebarOpen && (
        <div className="fixed inset-x-3 bottom-[calc(var(--mobile-tabbar-height)+env(safe-area-inset-bottom)+0.75rem)] z-panel lg:hidden">
          <div className="relative rounded-card border border-line bg-white p-2 shadow-cardHover">
            <button
              type="button"
              onClick={() => setSelectedProperty(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/95 p-1.5 text-textSecondary shadow-card transition-colors hover:text-textPrimary"
              aria-label="Cerrar vista previa"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
            <MapPropertyCard
              property={selectedProperty}
              selected
              onMapClick={() => flyToProperty(mapRef.current, selectedProperty)}
              onOpenDetails={() => setIsModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Ficha lateral de detalle */}
          <PropertyModal
            property={selectedProperty}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onViewOnMap={handleViewOnMap}
            getContextualShareUrl={getContextualShareUrl}
          />

      {/* Modal de permiso de ubicación */}
      <LocationPermissionModal
        isOpen={geo.showLocationModal}
        onAccept={geo.handleAcceptLocation}
        onDecline={geo.handleDeclineLocation}
        isLoading={geo.loadingLocation}
        blocked={geo.locationBlocked}
      />

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .property-polygon {
            transition:
              fill-opacity 240ms cubic-bezier(0.2, 0, 0, 1),
              stroke-opacity 240ms cubic-bezier(0.2, 0, 0, 1),
              stroke-width 180ms cubic-bezier(0.2, 0, 0, 1) !important;
          }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.3s ease-out; }
        }
      `}</style>
    </div>
  );
};

export default MapPage;
