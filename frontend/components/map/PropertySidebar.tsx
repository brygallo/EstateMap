'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MapPinned, X } from 'lucide-react';
import MapFilters from '@/components/map/MapFilters';
import PropertyCard from '@/components/PropertyCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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

  /** Sync mapa<->card (opcional): id resaltado desde el mapa y notificación de hover. */
  hoveredPropertyId?: number | null;
  onPropertyHover?: (property: Property | null) => void;
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
  hoveredPropertyId = null,
  onPropertyHover,
}: PropertySidebarProps) {
  // Resalte local del listado (funciona aunque el mapa aún no sincronice hover).
  const [localHoverId, setLocalHoverId] = useState<number | null>(null);
  const activeHoverId = hoveredPropertyId ?? localHoverId;

  const handleEnter = (p: Property) => {
    setLocalHoverId(p.id);
    onPropertyHover?.(p);
  };
  const handleLeave = () => {
    setLocalHoverId(null);
    onPropertyHover?.(null);
  };

  return (
    <>
      {/* Encabezado móvil */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white p-4 lg:hidden">
        <h2 className="text-base font-bold text-textPrimary">Filtros y propiedades</h2>
        <button
          onClick={onCloseMobile}
          className="rounded-button p-1.5 text-textSecondary transition-colors hover:bg-slate-100"
          aria-label="Cerrar panel"
        >
          <X className="h-5 w-5" aria-hidden />
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
      <div className="flex items-center justify-between border-t border-line bg-white px-4 py-3">
        <h2 className="text-sm font-semibold text-textPrimary">Propiedades</h2>
        <Badge variant="secondary" className="rounded-full font-geo tabular-nums">
          {visibleProperties.length}
        </Badge>
      </div>

      {/* Listado */}
      <div className="space-y-2.5 bg-background p-3 pb-24">
        {visibleProperties.length === 0 ? (
          <div className="mt-6 flex flex-col items-center px-4 text-center text-textSecondary">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <MapPinned className="h-6 w-6 text-slate-400" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="mt-3 text-sm font-medium text-textPrimary">
              No hay propiedades en esta área
            </p>
            <p className="mt-1 text-xs">Mueve o aleja el mapa para ver más propiedades</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {visibleProperties.map((p, idx) => (
              <motion.div
                key={p.id ?? idx}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' as const }}
                onMouseEnter={() => handleEnter(p)}
                onMouseLeave={handleLeave}
                className={cn(
                  'rounded-card transition-shadow',
                  activeHoverId === p.id && selectedProperty?.id !== p.id
                    ? 'shadow-cardHover ring-1 ring-primary/30'
                    : ''
                )}
              >
                <PropertyCard
                  property={p}
                  variant="compact"
                  selected={selectedProperty?.id === p.id}
                  onClick={() => onPropertyClick(p)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </>
  );
}
