'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { getPropertyTypeLabel, getStatusLabel } from '@/lib/property-labels';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePropertyFilters } from '@/hooks/usePropertyFilters';
import { flyToProperty } from '@/lib/map-navigation';
import PropertySidebar from '@/components/map/PropertySidebar';
import PropertyModal from '@/components/PropertyModal';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import PropertyCard from '@/components/PropertyCard';
import type { MapBounds, Property } from '@/lib/types';

// Cargar el mapa Leaflet solo en cliente (sin SSR).
const LeafletMap = dynamic(() => import('@/components/maps/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" strokeWidth={2} />
        <p className="mt-4 text-sm text-textSecondary">Cargando mapa...</p>
      </div>
    </div>
  ),
});

// Centro de Ecuador para mostrar el país completo al iniciar.
const DEFAULT_CENTER: [number, number] = [-1.5, -78.5];

const MapPage = () => {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const mapRef = useRef<any>(null);
  const hoverTimeoutRef = useRef<any>(null);

  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [visibleProperties, setVisibleProperties] = useState<Property[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    filters,
    properties,
    owners,
    locations,
    loading,
    totalCount,
    handleFilterChange,
    clearFilters,
    hasActiveFilters,
  } = usePropertyFilters({ token, bounds });
  const geo = useGeolocation(mapRef, properties, loading);

  const handleMapReady = (map: any) => {
    mapRef.current = map;
  };

  const handleZoomOut = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setZoom(Math.max(map.getZoom() - 2, 7));
  }, []);

  const handleResetMapView = useCallback(() => {
    mapRef.current?.flyTo(DEFAULT_CENTER, 7, { duration: 0.9 });
  }, []);

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
    flyToProperty(mapRef.current, property);
    setSelectedProperty(property);
    setIsModalOpen(false);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleSidebarPropertyOpen = (property: Property) => {
    flyToProperty(mapRef.current, property);
    setSelectedProperty(property);
    setIsModalOpen(true);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  // Clic en el polígono/marcador: mueve el mapa y abre el modal.
  const handlePolygonClick = (property: Property) => {
    flyToProperty(mapRef.current, property);
    setSelectedProperty(property);
    setIsModalOpen(typeof window === 'undefined' || window.innerWidth >= 1024);
  };

  // "Ver en el mapa" desde el modal: recentra el mapa en la propiedad y, en
  // móvil (donde el panel tapa el mapa), oculta el panel para verlo.
  const handleViewOnMap = () => {
    if (selectedProperty) flyToProperty(mapRef.current, selectedProperty);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsModalOpen(false);
    }
  };

  const handleCloseModal = () => {
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

  // Limpiar el timeout de hover al desmontar.
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const first = window.setTimeout(() => mapRef.current?.invalidateSize?.(), 80);
    const second = window.setTimeout(() => mapRef.current?.invalidateSize?.(), 340);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [isModalOpen]);

  return (
    <div className="relative h-[calc(100vh-3.5rem)] overflow-hidden lg:flex">
      {/* Botón para abrir filtros y propiedades en móvil (con conteo explícito) */}
      <Button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed bottom-20 left-1/2 z-nav h-12 -translate-x-1/2 gap-2 rounded-full px-5 shadow-cardHover lg:hidden [&_svg]:size-5 ${
          selectedProperty && !isModalOpen ? 'hidden' : ''
        }`}
        aria-label="Abrir filtros y propiedades"
      >
        <SlidersHorizontal strokeWidth={2} />
        <span className="font-semibold tabular-nums">
          {loading
            ? 'Cargando…'
            : `${visibleProperties.length} ${visibleProperties.length === 1 ? 'propiedad' : 'propiedades'}`}
        </span>
      </Button>

      {/* Fondo oscuro en móvil */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Panel lateral en desktop; drawer inferior en móvil (más natural sobre el mapa) */}
      <div
        className={`
        fixed lg:relative z-40 lg:z-0
        bg-white text-textPrimary
        overflow-y-auto
        transition-transform duration-300 ease-in-out
        inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl shadow-cardHover
        ${sidebarOpen ? 'translate-y-0' : 'translate-y-full'}
        lg:inset-auto lg:left-0 lg:h-full lg:max-h-none lg:w-96 lg:flex-shrink-0
        lg:translate-y-0 lg:rounded-none lg:border-r lg:border-line lg:shadow-none
      `}
      >
        {/* Asa de arrastre (solo móvil) */}
        <div className="flex justify-center bg-white pt-2 lg:hidden">
          <span className="h-1.5 w-10 rounded-full bg-line" aria-hidden />
        </div>

        <PropertySidebar
          filters={filters}
          owners={owners}
          locations={locations}
          hasActiveFilters={hasActiveFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          visibleProperties={visibleProperties}
          selectedProperty={selectedProperty}
          onPropertyClick={handleSidebarPropertyClick}
          onPropertyOpen={handleSidebarPropertyOpen}
          onCloseMobile={() => setSidebarOpen(false)}
          loading={loading}
          totalCount={totalCount}
          userLocation={geo.userLocation}
          onZoomOut={handleZoomOut}
          onResetMapView={handleResetMapView}
        />
      </div>

      {/* Mapa: en desktop ocupa el espacio restante entre listado y ficha. */}
      <div
        className={`
          absolute inset-0 z-0 h-full w-full transition-[width] duration-300 ease-in-out
          lg:relative lg:inset-auto lg:left-auto lg:flex-1
        `}
      >
        <LeafletMap
          filteredProperties={properties}
          selectedProperty={selectedProperty}
          userLocation={geo.userLocation}
          userAccuracy={geo.accuracy}
          onMapReady={handleMapReady}
          onVisiblePropertiesChange={setVisibleProperties}
          onBoundsChange={setBounds}
          onPolygonClick={handlePolygonClick}
          onLocate={geo.handleGetMyLocation}
          locating={geo.loadingLocation}
          locationBlocked={geo.locationBlocked}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
          onResetView={handleResetMapView}
          hoverTimeoutRef={hoverTimeoutRef}
          getPropertyTypeLabel={getPropertyTypeLabel}
          getStatusLabel={getStatusLabel}
          center={DEFAULT_CENTER}
        />

        {/* Estado de carga de propiedades del área (desktop; en móvil lo indica el botón) */}
        {loading && (
          <div className="animate-fade-in pointer-events-none absolute left-1/2 top-20 z-nav hidden -translate-x-1/2 lg:block">
            <div className="flex items-center gap-2 rounded-full border border-line bg-white/95 px-3.5 py-1.5 shadow-cardHover backdrop-blur">
              <Loader2 className="h-4 w-4 animate-spin text-primary" strokeWidth={2} />
              <span className="text-xs font-medium text-textPrimary">Cargando propiedades del área…</span>
            </div>
          </div>
        )}
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
            <PropertyCard
              property={selectedProperty}
              variant="compact"
              selected
              onClick={() => flyToProperty(mapRef.current, selectedProperty)}
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
      />

      <style>{`
        .leaflet-interactive { cursor: pointer !important; }
        .property-polygon { transition: none !important; }
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
