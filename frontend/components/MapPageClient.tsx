'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2, SlidersHorizontal, X } from 'lucide-react';
import { motion, useDragControls } from 'motion/react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePropertyFilters } from '@/hooks/usePropertyFilters';
import { trackEvent } from '@/lib/analytics';
import { flyToProperty } from '@/lib/map-navigation';
import PropertySidebar from '@/components/map/PropertySidebar';
import PropertyModal from '@/components/PropertyModal';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import MapPropertyCard from '@/components/map/MapPropertyCard';
import type { MapBounds, Property } from '@/lib/types';

// Cargar el mapa MapLibre solo en cliente (sin SSR).
const MainMap = dynamic(() => import('@/components/maps/MapLibreMap'), {
  ssr: false,
  loading: () => (
    <div className="relative h-full w-full overflow-hidden bg-muted">
      {/* Trama tenue tipo mapa para que el hueco no se sienta vacío mientras
          carga Leaflet. */}
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

const fitMapToBounds = (map: any, bounds?: MapBounds, fallback?: { lat: number; lng: number; zoom: number }) => {
  if (!map) return;
  if (fallback && fallback.zoom >= 11.5) {
    if (typeof map.fitBounds === 'function' && typeof map.flyToBounds !== 'function') {
      map.flyTo({ center: [fallback.lng, fallback.lat], zoom: fallback.zoom, duration: 700 });
    } else {
      map.flyTo([fallback.lat, fallback.lng], fallback.zoom, { duration: 0.7 });
    }
    return;
  }
  if (bounds) {
    const samePoint = Math.abs(bounds.west - bounds.east) < 0.0001 && Math.abs(bounds.south - bounds.north) < 0.0001;
    if (!samePoint && typeof map.fitBounds === 'function' && typeof map.flyToBounds !== 'function') {
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
  if (typeof map.fitBounds === 'function' && typeof map.flyToBounds !== 'function') {
    map.flyTo({ center: [fallback.lng, fallback.lat], zoom: fallback.zoom, duration: 700 });
  } else {
    map.flyTo([fallback.lat, fallback.lng], fallback.zoom, { duration: 0.7 });
  }
};

const MapPage = () => {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const mapRef = useRef<any>(null);
  const drawerDragControls = useDragControls();

  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [mapZoom, setMapZoom] = useState(7);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  } = usePropertyFilters({ token, bounds, zoom: mapZoom });
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
    cardProperties.forEach((property) => points.set(Number(property.id), property));
    return [...clusters, ...points.values()];
  }, [cardProperties, mapProperties]);
  const mapPointProperties = mapDisplayProperties.filter((item): item is Property => !(item as any).is_cluster);
  const geo = useGeolocation(mapRef, mapPointProperties, loading);

  const handleMapReady = (map: any) => {
    mapRef.current = map;
  };

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
        const res = await apiFetch(`/properties/${propertyId}/`, { skipAuth: !token });
        if (res.ok && !cancelled) {
          const property: Property = await res.json();
          setSelectedProperty(property);
          setIsModalOpen(true);
          setTimeout(() => flyToProperty(mapRef.current, property), 1000);
        }
      } catch (err) {
        console.error('Error abriendo la propiedad del enlace:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, token]);

  // Clic en el listado: solo mueve el mapa y resalta.
  const handleSidebarPropertyClick = (property: Property) => {
    trackEvent('property_card_map_focus_clicked', {
      property_id: property.id,
      city: property.city,
      province: property.province,
      property_type: property.property_type,
      status: property.status,
    });
    flyToProperty(mapRef.current, property);
    setSelectedProperty(property);
    setIsModalOpen(false);
    if (window.innerWidth < 1024) setSidebarOpen(false);
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
    flyToProperty(mapRef.current, property);
    setSelectedProperty(property);
    setIsModalOpen(true);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  // Clic en el polígono/marcador: mueve el mapa y abre el modal.
  const handlePolygonClick = async (property: Property) => {
    trackEvent('property_pin_clicked', {
      property_id: property.id,
      city: property.city,
      province: property.province,
      property_type: property.property_type,
      status: property.status,
      zoom: mapRef.current?.getZoom?.() ?? null,
    });
    flyToProperty(mapRef.current, property);
    setSelectedProperty(property);
    setIsModalOpen(true);

    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch(`/properties/${property.id}/`, { skipAuth: !token });
      if (res.ok) {
        setSelectedProperty(await res.json());
      }
    } catch (err) {
      console.error('Error cargando detalle de propiedad:', err);
    }
  };

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
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsModalOpen(false);
    }
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

  // En móvil, el drawer y el detalle deben tener su propio desplazamiento sin
  // transmitir el gesto a la página ni al mapa que queda debajo.
  useEffect(() => {
    if ((!sidebarOpen && !isModalOpen) || window.innerWidth >= 1024) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [isModalOpen, sidebarOpen]);

  return (
    <div className="relative h-[calc(100dvh-3.5rem)] overflow-hidden lg:flex">
      {/* Botón para abrir filtros y propiedades en móvil (con conteo explícito) */}
      {!sidebarOpen && !selectedProperty && !isModalOpen && (
        <Button
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-20 left-1/2 z-nav h-12 -translate-x-1/2 gap-2 rounded-full px-5 shadow-cardHover lg:hidden [&_svg]:size-5"
          aria-label="Abrir filtros y propiedades"
        >
          <SlidersHorizontal strokeWidth={2} />
          <span className="font-semibold tabular-nums">
            {loading
              ? 'Cargando…'
              : `${sidebarProperties.length} ${sidebarProperties.length === 1 ? 'propiedad' : 'propiedades'}`}
          </span>
        </Button>
      )}

      {/* Fondo oscuro en móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 touch-none bg-black/50 lg:hidden"
          aria-hidden
          onPointerDown={(event) => event.preventDefault()}
        />
      )}

      {/* Panel lateral en desktop; drawer inferior en móvil (más natural sobre el mapa) */}
      <motion.div
        initial={false}
        animate={{ y: sidebarOpen ? 0 : '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
        drag="y"
        dragControls={drawerDragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 600 }}
        dragElastic={0.04}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) setSidebarOpen(false);
        }}
        className={`
        property-sidebar-drawer
        fixed lg:relative z-40 lg:z-0
        bg-white text-textPrimary
        overscroll-contain overflow-y-auto
        inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl shadow-cardHover
        lg:inset-auto lg:left-0 lg:h-full lg:max-h-none lg:w-96 lg:flex-shrink-0
        lg:rounded-none lg:border-r lg:border-line lg:shadow-none
      `}
      >
        {/* Asa de arrastre (solo móvil) */}
        <div
          className="flex touch-none cursor-grab justify-center bg-white py-3 active:cursor-grabbing lg:hidden"
          onPointerDown={(event) => drawerDragControls.start(event)}
          aria-label="Desliza hacia abajo para cerrar"
        >
          <span className="h-1.5 w-10 rounded-full bg-line" aria-hidden />
        </div>

        <PropertySidebar
          filters={filters}
          owners={owners}
          locations={locations}
          hasActiveFilters={hasActiveFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
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
      </motion.div>

      <style>{`
        @media (min-width: 1024px) {
          .property-sidebar-drawer {
            transform: none !important;
          }
        }
      `}</style>

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
          isRefreshing={mapLoading && mapProperties.length === 0}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          onResetView={handleResetMapView}
          center={DEFAULT_CENTER}
        />

      </div>

      {selectedProperty && !isModalOpen && !sidebarOpen && (
        <div className="fixed inset-x-3 bottom-3 z-panel lg:hidden">
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
        .leaflet-interactive { cursor: pointer !important; }
        .property-polygon {
          transition:
            fill-opacity 240ms cubic-bezier(0.2, 0, 0, 1),
            stroke-opacity 240ms cubic-bezier(0.2, 0, 0, 1),
            stroke-width 180ms cubic-bezier(0.2, 0, 0, 1) !important;
        }
        .leaflet-zoom-animated { will-change: auto !important; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default MapPage;
