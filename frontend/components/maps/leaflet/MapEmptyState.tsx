'use client';

import { useMap } from 'react-leaflet';

export function MapEmptyState({
  hasProperties,
  hasActiveFilters,
  onClearFilters,
  onResetView,
}: {
  hasProperties: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onResetView?: () => void;
}) {
  const map = useMap();
  if (hasProperties) return null;

  const handleZoomOut = () => map.setZoom(Math.max(map.getZoom() - 2, 7));

  return (
    <div className="pointer-events-none absolute left-1/2 top-20 z-nav hidden w-[min(360px,calc(100%-2rem))] -translate-x-1/2 lg:block">
      <div className="map-empty-state rounded-card border border-line bg-white/95 p-3 text-center shadow-cardHover backdrop-blur">
        <p className="text-sm font-semibold text-textPrimary">
          {hasActiveFilters ? 'No hay propiedades con estos filtros' : 'No hay propiedades en esta vista'}
        </p>
        <p className="mt-0.5 text-xs text-textSecondary">
          {hasActiveFilters ? 'Limpia filtros o aleja el mapa para ampliar resultados.' : 'Aleja el mapa o vuelve a la vista general.'}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            className="rounded-button bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primaryHover"
          >
            Alejar mapa
          </button>
          {hasActiveFilters && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-button border border-line bg-white px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-muted"
            >
              Limpiar filtros
            </button>
          )}
          {onResetView && (
            <button
              type="button"
              onClick={onResetView}
              className="rounded-button border border-line bg-white px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-muted"
            >
              Ver Ecuador
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
