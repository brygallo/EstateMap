'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2, LocateFixed, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { getPropertyTypeLabel, getStatusLabel } from '@/lib/property-labels';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePropertyFilters } from '@/hooks/usePropertyFilters';
import { flyToProperty } from '@/lib/map-navigation';
import PropertySidebar from '@/components/map/PropertySidebar';
import PropertyModal from '@/components/PropertyModal';
import ShareModal from '@/components/ShareModal';
import LocationPermissionModal from '@/components/LocationPermissionModal';
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
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const geo = useGeolocation(mapRef);
  const {
    filters,
    properties,
    owners,
    handleFilterChange,
    clearFilters,
    hasActiveFilters,
  } = usePropertyFilters({ token, bounds });

  const handleMapReady = (map: any) => {
    mapRef.current = map;
  };

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
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  // Clic en el polígono/marcador: mueve el mapa y abre el modal.
  const handlePolygonClick = (property: Property) => {
    flyToProperty(mapRef.current, property);
    setSelectedProperty(property);
    setIsModalOpen(true);
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

  const getShareUrl = () => (typeof window === 'undefined' ? '' : window.location.href);

  // Limpiar el timeout de hover al desmontar.
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return (
    <div className="relative h-[calc(100vh-4.5rem)] overflow-hidden">
      {/* Botón para abrir el panel en móvil */}
      <Button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        size="icon"
        className="fixed bottom-20 left-4 z-nav h-14 w-14 rounded-full shadow-cardHover lg:hidden [&_svg]:size-6"
        aria-label="Abrir filtros y propiedades"
      >
        <SlidersHorizontal strokeWidth={2} />
        {visibleProperties.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
            {visibleProperties.length}
          </span>
        )}
      </Button>

      {/* Botón "mi ubicación" */}
      <Button
        onClick={geo.handleGetMyLocation}
        disabled={geo.loadingLocation}
        variant="outline"
        size="icon"
        className="fixed bottom-20 right-4 z-nav h-14 w-14 rounded-full border-line bg-white text-primary shadow-cardHover hover:bg-slate-50 hover:text-primary [&_svg]:size-6"
        aria-label="Mi ubicación"
        title="Ir a mi ubicación"
      >
        {geo.loadingLocation ? (
          <Loader2 className="animate-spin" strokeWidth={2} />
        ) : (
          <LocateFixed strokeWidth={2} />
        )}
      </Button>

      {/* Fondo oscuro en móvil */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Panel lateral */}
      <div
        className={`
        fixed lg:relative
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        transition-transform duration-300 ease-in-out
        bg-white text-textPrimary border-r border-line
        h-[calc(100vh-4.5rem)] lg:h-full
        w-72 lg:w-1/5
        z-40 lg:z-0
        overflow-y-auto
        shadow-2xl lg:shadow-none
      `}
      >
        <PropertySidebar
          filters={filters}
          owners={owners}
          hasActiveFilters={hasActiveFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          onShare={() => setShareModalOpen(true)}
          visibleProperties={visibleProperties}
          selectedProperty={selectedProperty}
          onPropertyClick={handleSidebarPropertyClick}
          onCloseMobile={() => setSidebarOpen(false)}
        />
      </div>

      {/* Mapa */}
      <div className="absolute inset-0 lg:left-[20%] h-full w-full lg:w-4/5 z-0">
        <LeafletMap
          filteredProperties={properties}
          selectedProperty={selectedProperty}
          userLocation={geo.userLocation}
          onMapReady={handleMapReady}
          onVisiblePropertiesChange={setVisibleProperties}
          onBoundsChange={setBounds}
          onPolygonClick={handlePolygonClick}
          onPriceLabelClick={handleSidebarPropertyClick}
          hoverTimeoutRef={hoverTimeoutRef}
          getPropertyTypeLabel={getPropertyTypeLabel}
          getStatusLabel={getStatusLabel}
          center={DEFAULT_CENTER}
        />
      </div>

      {/* Modal de detalle */}
      <PropertyModal property={selectedProperty} isOpen={isModalOpen} onClose={handleCloseModal} />

      {/* Modal de compartir */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={getShareUrl()}
      />

      {/* Modal de permiso de ubicación */}
      <LocationPermissionModal
        isOpen={geo.showLocationModal}
        onAccept={geo.handleAcceptLocation}
        onDecline={geo.handleDeclineLocation}
        isLoading={geo.loadingLocation}
      />

      {/* Toast de carga de ubicación */}
      {geo.showLocationToast && (
        <div className="animate-fade-in fixed left-1/2 top-20 z-top -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-card border border-line bg-white px-6 py-4 shadow-cardHover">
            <Loader2 className="h-5 w-5 animate-spin text-primary" strokeWidth={2} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-textPrimary">Obteniendo tu ubicación</span>
              <span className="text-xs text-textSecondary">Centrando mapa en tu ciudad...</span>
            </div>
          </div>
        </div>
      )}

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
