'use client';

import MapFilters from '@/components/map/MapFilters';
import PropertyCard from '@/components/PropertyCard';
import type { Owner, Property, PropertyFilters } from '@/lib/types';

interface PropertySidebarProps {
  filters: PropertyFilters;
  owners: Owner[];
  hasActiveFilters: boolean;
  onFilterChange: (filters: PropertyFilters) => void;
  onClearFilters: () => void;
  onShare: () => void;

  visibleProperties: Property[];
  selectedProperty: Property | null;
  onPropertyClick: (property: Property) => void;
  onCloseMobile: () => void;
}

/** Panel lateral: filtros + listado de propiedades visibles en el mapa. */
export default function PropertySidebar({
  filters,
  owners,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
  onShare,
  visibleProperties,
  selectedProperty,
  onPropertyClick,
  onCloseMobile,
}: PropertySidebarProps) {
  return (
    <>
      {/* Encabezado móvil */}
      <div className="flex items-center justify-between lg:hidden p-3 bg-white border-b border-line sticky top-0 z-10">
        <h2 className="text-base font-bold">Filtros y propiedades</h2>
        <button
          onClick={onCloseMobile}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Close sidebar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <MapFilters
        filters={filters}
        owners={owners}
        hasActiveFilters={hasActiveFilters}
        onChange={onFilterChange}
        onClear={onClearFilters}
        onShare={onShare}
      />

      {/* Encabezado del listado */}
      <div className="px-3 py-2 bg-white border-t border-line">
        <h2 className="text-sm font-semibold text-textPrimary">
          Propiedades ({visibleProperties.length})
        </h2>
      </div>

      {/* Listado */}
      <div className="p-3 space-y-2 pb-20 bg-background">
        {visibleProperties.length === 0 ? (
          <div className="text-center text-textSecondary mt-4">
            <p className="text-sm">No hay propiedades en esta área</p>
            <p className="text-xs mt-1">Mueve el mapa para ver más propiedades</p>
          </div>
        ) : (
          visibleProperties.map((p, idx) => (
            <PropertyCard
              key={p.id ?? idx}
              property={p}
              variant="compact"
              selected={selectedProperty?.id === p.id}
              onClick={() => onPropertyClick(p)}
            />
          ))
        )}
      </div>
    </>
  );
}
