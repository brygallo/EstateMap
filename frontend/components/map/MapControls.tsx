'use client';

import { useMap } from 'react-leaflet';
import { Plus, Minus, LocateFixed, Loader2 } from 'lucide-react';

interface MapControlsProps {
  onLocate: () => void;
  locating: boolean;
  blocked: boolean;
}

/**
 * Controles flotantes abajo-derecha estilo Google Maps: grupo de zoom (+/−) y,
 * debajo, botón de "mi ubicación". Debe renderizarse como hijo de
 * <MapContainer> porque usa `useMap` para el zoom.
 */
export default function MapControls({ onLocate, locating, blocked }: MapControlsProps) {
  const map = useMap();

  return (
    <div className="absolute bottom-6 right-3 z-mapcontrol flex flex-col-reverse gap-2.5">
      {/* Grupo de zoom */}
      <div className="flex flex-col overflow-hidden rounded-lg bg-surface shadow-cardHover ring-1 ring-black/5">
        <button
          type="button"
          onClick={() => map.zoomIn()}
          aria-label="Acercar"
          className="flex h-10 w-10 items-center justify-center text-textPrimary transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted"
        >
          <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
        <span className="mx-2 block h-px bg-line" aria-hidden />
        <button
          type="button"
          onClick={() => map.zoomOut()}
          aria-label="Alejar"
          className="flex h-10 w-10 items-center justify-center text-textPrimary transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted"
        >
          <Minus className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
      </div>

      {/* Mi ubicación */}
      <button
        type="button"
        onClick={onLocate}
        disabled={locating}
        aria-label="Ir a mi ubicación"
        title={blocked ? 'Ubicación desactivada — tócalo para reintentar' : 'Ir a mi ubicación'}
        className={`flex h-10 w-10 items-center justify-center rounded-lg bg-surface shadow-cardHover ring-1 ring-black/5 transition-colors hover:bg-muted focus:outline-none focus-visible:bg-muted disabled:cursor-not-allowed ${
          blocked ? 'text-error' : 'text-textPrimary'
        }`}
      >
        {locating ? (
          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} aria-hidden />
        ) : (
          <LocateFixed className="h-5 w-5" strokeWidth={2} aria-hidden />
        )}
      </button>
    </div>
  );
}
