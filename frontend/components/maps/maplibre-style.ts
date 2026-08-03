import type maplibregl from 'maplibre-gl';

/**
 * Single source of truth for the basemap used by every map in the app: the
 * browsing map, the nearby map and the drawing map all share this style so the
 * product has one consistent map type (Carto Voyager streets with an optional
 * Esri satellite layer toggled by the shared LayerSwitch control).
 */
export const buildMapStyle = (): maplibregl.StyleSpecification => ({
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxzoom: 20,
    },
    esri: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Tiles &copy; Esri',
      maxzoom: 18,
    },
  },
  layers: [
    { id: 'carto-base', type: 'raster', source: 'carto' },
    { id: 'esri-base', type: 'raster', source: 'esri', layout: { visibility: 'none' } },
  ],
});

export type BaseLayer = 'streets' | 'satellite';

export function applyBaseLayer(map: maplibregl.Map, layer: BaseLayer): void {
  map.setLayoutProperty('carto-base', 'visibility', layer === 'streets' ? 'visible' : 'none');
  map.setLayoutProperty('esri-base', 'visibility', layer === 'satellite' ? 'visible' : 'none');
}

/** Ecuador, as [lng, lat] (MapLibre order). */
export const ECUADOR_CENTER: [number, number] = [-78.5, -1.5];
