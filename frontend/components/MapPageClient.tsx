'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
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
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando mapa...</p>
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
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-20 left-4 z-nav bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primaryHover transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {visibleProperties.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-secondary text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
            {visibleProperties.length}
          </span>
        )}
      </button>

      {/* Botón "mi ubicación" */}
      <button
        onClick={geo.handleGetMyLocation}
        disabled={geo.loadingLocation}
        className="fixed bottom-20 right-4 z-nav bg-white text-primary border border-line p-4 rounded-full shadow-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Mi ubicación"
        title="Ir a mi ubicación"
      >
        {geo.loadingLocation ? (
          <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>

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
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-top animate-fade-in">
          <div className="bg-white shadow-2xl rounded-xl px-6 py-4 flex items-center gap-3 border border-gray-200">
            <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800">Obteniendo tu ubicación</span>
              <span className="text-xs text-gray-500">Centrando mapa en tu ciudad...</span>
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
