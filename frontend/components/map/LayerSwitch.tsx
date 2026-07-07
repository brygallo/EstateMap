'use client';

export type MapLayer = 'streets' | 'satellite';

interface LayerSwitchProps {
  active: MapLayer;
  onToggle: () => void;
}

// Miniaturas de preview (un tile de cada basemap), igual que el toggle de
// Google Maps: el botón muestra la capa a la que cambiarás.
const MAP_THUMB = 'https://a.basemaps.cartocdn.com/rastertiles/voyager/3/2/4.png';
const SATELLITE_THUMB =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/3/4/2';

/**
 * Conmutador Mapa/Satélite estilo Google Maps: un solo botón con miniatura +
 * etiqueta de la capa opuesta. Se ancla abajo-izquierda del mapa.
 */
export default function LayerSwitch({ active, onToggle }: LayerSwitchProps) {
  const isSatellite = active === 'satellite';
  const targetLabel = isSatellite ? 'Mapa' : 'Satélite';
  const targetThumb = isSatellite ? MAP_THUMB : SATELLITE_THUMB;

  return (
    <div className="absolute bottom-9 left-3 z-mapcontrol">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isSatellite}
        aria-label={`Cambiar a vista ${targetLabel}`}
        title={`Cambiar a vista ${targetLabel}`}
        className="block w-[72px] overflow-hidden rounded-lg bg-surface shadow-cardHover ring-1 ring-black/5 transition hover:ring-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span
          className="block h-[52px] w-full bg-cover bg-center"
          style={{ backgroundColor: '#cfd8dc', backgroundImage: `url("${targetThumb}")` }}
        />
        <span className="block bg-surface py-1 text-center text-[0.7rem] font-semibold text-textPrimary">
          {targetLabel}
        </span>
      </button>
    </div>
  );
}
