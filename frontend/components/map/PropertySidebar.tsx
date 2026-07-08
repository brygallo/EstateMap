'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ExternalLink, Loader2, MapPinned, SearchX, X } from 'lucide-react';
import MapFilters from '@/components/map/MapFilters';
import PropertyCard from '@/components/PropertyCard';
import { Badge } from '@/components/ui/badge';
import { formatDistance, getPropertyDistanceKm, type LatLngPoint } from '@/lib/geo';
import { cn } from '@/lib/utils';
import type { Owner, Property, PropertyFilters, PropertyLocationGroup } from '@/lib/types';

type SortMode = 'distance' | 'price_asc' | 'price_desc' | 'area_desc' | 'recent';

interface PropertySidebarProps {
  filters: PropertyFilters;
  owners: Owner[];
  locations: PropertyLocationGroup[];
  hasActiveFilters: boolean;
  onFilterChange: (filters: PropertyFilters) => void;
  onClearFilters: () => void;

  visibleProperties: Property[];
  selectedProperty: Property | null;
  onPropertyClick: (property: Property) => void;
  onPropertyOpen: (property: Property) => void;
  onCloseMobile: () => void;

  /** Cargando propiedades del área tras mover/hacer zoom o cambiar filtros. */
  loading?: boolean;
  /** Total que cumple los filtros en todo el catálogo (no solo el viewport). */
  totalCount?: number | null;
  userLocation?: LatLngPoint | null;
  onZoomOut?: () => void;
  onResetMapView?: () => void;

  /** Sync mapa<->card (opcional): id resaltado desde el mapa y notificación de hover. */
  hoveredPropertyId?: number | null;
  onPropertyHover?: (property: Property | null) => void;
}

/** Panel lateral: buscador de propiedades + filtros + listado de propiedades. */
export default function PropertySidebar({
  filters,
  owners,
  locations,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
  visibleProperties,
  selectedProperty,
  onPropertyClick,
  onPropertyOpen,
  onCloseMobile,
  loading = false,
  totalCount = null,
  userLocation = null,
  onZoomOut,
  onResetMapView,
  hoveredPropertyId = null,
  onPropertyHover,
}: PropertySidebarProps) {
  // Resalte local del listado (funciona aunque el mapa aún no sincronice hover).
  const [localHoverId, setLocalHoverId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  const activeHoverId = hoveredPropertyId ?? localHoverId;

  // Scroll automático del listado hacia la card de la propiedad seleccionada
  // (p. ej. al hacer clic en su polígono/etiqueta en el mapa).
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const propertiesWithDistance = useMemo(
    () =>
      visibleProperties.map((property) => ({
        property,
        distanceKm: getPropertyDistanceKm(userLocation, property),
      })),
    [userLocation, visibleProperties]
  );
  const sortedProperties = useMemo(() => {
    const getNumber = (value: unknown) => {
      const parsed = Number.parseFloat(String(value ?? ''));
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const getDateValue = (property: Property) => {
      const raw = property.updated_at || property.created_at || '';
      const value = Date.parse(raw);
      return Number.isFinite(value) ? value : 0;
    };

    if (sortMode === 'price_asc') {
      return [...propertiesWithDistance].sort((a, b) => getNumber(a.property.price) - getNumber(b.property.price));
    }
    if (sortMode === 'price_desc') {
      return [...propertiesWithDistance].sort((a, b) => getNumber(b.property.price) - getNumber(a.property.price));
    }
    if (sortMode === 'area_desc') {
      return [...propertiesWithDistance].sort((a, b) => getNumber(b.property.area) - getNumber(a.property.area));
    }
    if (sortMode === 'recent') {
      return [...propertiesWithDistance].sort((a, b) => getDateValue(b.property) - getDateValue(a.property));
    }
    if (!userLocation) return propertiesWithDistance;
    return [...propertiesWithDistance].sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [propertiesWithDistance, sortMode, userLocation]);
  const renderedProperties = sortedProperties.slice(0, 60);
  const hiddenPropertiesCount = Math.max(sortedProperties.length - renderedProperties.length, 0);
  useEffect(() => {
    const id = selectedProperty?.id;
    if (id == null) return;
    const el = cardRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedProperty?.id]);

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
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white p-3.5 lg:hidden">
        <h2 className="text-base font-bold text-textPrimary">Filtros y propiedades</h2>
        <button
          onClick={onCloseMobile}
          className="rounded-button p-1.5 text-textSecondary transition-colors hover:bg-muted"
          aria-label="Cerrar panel"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <MapFilters
        filters={filters}
        owners={owners}
        locations={locations}
        hasActiveFilters={hasActiveFilters}
        onChange={onFilterChange}
        onClear={onClearFilters}
      />

      {/* Encabezado del listado: distingue "visibles en el mapa" de "total encontradas" */}
      <div className="flex items-center justify-between border-t border-line bg-white px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
              {userLocation ? 'Cerca de tu ubicación' : 'Visibles en el mapa'}
            </span>
            {totalCount != null && totalCount > visibleProperties.length && (
              <span className="text-[11px] text-textSecondary">
                de <span className="font-geo font-semibold tabular-nums text-textPrimary">{totalCount}</span> encontradas
              </span>
            )}
          </div>
          {loading && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.25} aria-hidden />
              Cargando…
            </span>
          )}
        </div>
        <Badge variant="secondary" className="rounded-md font-geo tabular-nums">
          {visibleProperties.length}
        </Badge>
      </div>

      {visibleProperties.length > 1 && (
        <div className="border-t border-line bg-white px-3.5 py-2">
          <label className="flex items-center justify-between gap-2 text-xs font-medium text-textSecondary">
            Ordenar
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="h-8 rounded-md border border-line bg-white px-2 text-xs font-semibold text-textPrimary outline-none transition-colors hover:border-primary focus:border-primary"
            >
              <option value="distance">Más cercanas</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
              <option value="area_desc">Mayor área</option>
              <option value="recent">Recientes</option>
            </select>
          </label>
        </div>
      )}

      {/* Listado */}
      <div className="space-y-2 bg-background p-2.5 pb-24">
        {loading && visibleProperties.length === 0 ? (
          <div className="mt-6 flex flex-col items-center px-4 text-center text-textSecondary">
            <Loader2 className="h-7 w-7 animate-spin text-primary" strokeWidth={2} aria-hidden />
            <p className="mt-3 text-sm font-medium text-textPrimary">
              Cargando propiedades del área…
            </p>
          </div>
        ) : visibleProperties.length === 0 ? (
          hasActiveFilters ? (
            <div className="mt-6 flex flex-col items-center px-4 text-center text-textSecondary">
              <span className="flex h-11 w-11 items-center justify-center rounded-card bg-muted">
                <SearchX className="h-6 w-6 text-textSecondary" strokeWidth={1.75} aria-hidden />
              </span>
              <p className="mt-3 text-sm font-medium text-textPrimary">
                No hay propiedades con estos filtros
              </p>
              <p className="mt-1 text-xs">Prueba a ampliar o limpiar los filtros aplicados</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="rounded-button border border-line bg-white px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-muted"
                >
                  Limpiar filtros
                </button>
                {onZoomOut && (
                  <button
                    type="button"
                    onClick={onZoomOut}
                    className="rounded-button bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primaryHover"
                  >
                    Alejar mapa
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center px-4 text-center text-textSecondary">
              <span className="flex h-11 w-11 items-center justify-center rounded-card bg-muted">
                <MapPinned className="h-6 w-6 text-textSecondary" strokeWidth={1.75} aria-hidden />
              </span>
              <p className="mt-3 text-sm font-medium text-textPrimary">
                No hay propiedades en esta área
              </p>
              <p className="mt-1 text-xs">Mueve o aleja el mapa para ver más propiedades</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {onZoomOut && (
                  <button
                    type="button"
                    onClick={onZoomOut}
                    className="rounded-button bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primaryHover"
                  >
                    Alejar mapa
                  </button>
                )}
                {onResetMapView && (
                  <button
                    type="button"
                    onClick={onResetMapView}
                    className="rounded-button border border-line bg-white px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-muted"
                  >
                    Ver Ecuador
                  </button>
                )}
              </div>
            </div>
          )
        ) : (
          <>
            <AnimatePresence initial={false}>
              {renderedProperties.map(({ property: p, distanceKm }, idx) => (
                <motion.div
                  key={p.id ?? idx}
                  ref={(el) => {
                    if (p.id != null) cardRefs.current[p.id] = el;
                  }}
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
                    distanceLabel={formatDistance(distanceKm)}
                    onClick={() => onPropertyClick(p)}
                    onOpenDetails={() => onPropertyOpen(p)}
                  />
                  {selectedProperty?.id === p.id && (
                    <Link
                      href={`/propiedad/${p.id}`}
                      className="mt-1.5 flex items-center justify-center gap-1.5 rounded-button border border-line bg-white px-3 py-2 text-[13px] font-semibold text-primary transition-colors hover:border-primary hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Ver página completa
                    </Link>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {hiddenPropertiesCount > 0 && (
              <div className="rounded-card border border-line bg-white p-3 text-center text-xs text-textSecondary shadow-card">
                Mostrando 60 de {sortedProperties.length}. Acerca el mapa o usa filtros para ver resultados más precisos.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
