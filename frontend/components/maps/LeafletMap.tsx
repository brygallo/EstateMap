'use client';

import { MapContainer, TileLayer, Polygon, useMapEvents, useMap, Marker, Popup, ScaleControl, Circle, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import * as turf from '@turf/turf';
import LayerSwitch, { type MapLayer } from '@/components/map/LayerSwitch';
import MapControls from '@/components/map/MapControls';
import MapLegend from '@/components/map/MapLegend';
import { statusMarker, statusColor, typeIconSvg, priceMarkerHtml } from '@/lib/mapMarkers';

// Fix default marker icon issue with webpack
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });

  // Guardar contra removeClass cuando el path ya no existe (previene crash al desmontar)
  const originalRemoveClass = (L.DomUtil as any).removeClass;
  (L.DomUtil as any).removeClass = function (el: any, name: string) {
    if (!el || !el.classList) return this;
    return originalRemoveClass.call(this, el, name);
  };
}

// Component to expose map instance
function MapController({ onMapReady }: { onMapReady: (map: any) => void }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
}

// Component to track map bounds and filter visible properties
function MapBoundsTracker({
  properties,
  onVisiblePropertiesChange,
  onBoundsChange
}: {
  properties: any[];
  onVisiblePropertiesChange: (properties: any[]) => void;
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      updateVisibleProperties();
      reportBounds();
    },
    zoomend: () => {
      updateVisibleProperties();
      reportBounds();
    },
  });

  const reportBounds = useCallback(() => {
    if (!onBoundsChange) return;
    const b = map.getBounds();
    onBoundsChange({
      west: b.getWest(),
      south: b.getSouth(),
      east: b.getEast(),
      north: b.getNorth(),
    });
  }, [map, onBoundsChange]);

  // Report the initial viewport bounds once the map is mounted.
  useEffect(() => {
    reportBounds();
  }, [reportBounds]);

  const updateVisibleProperties = useCallback(() => {
    const bounds = map.getBounds();
    const visible = properties.filter((property) => {
      // Check if property has polygon
      if (property.polygon) {
        let coordinates;

        // Handle GeoJSON format
        if (property.polygon.coordinates?.[0]) {
          coordinates = property.polygon.coordinates[0];
          // Check if any point of the polygon is within the map bounds
          // GeoJSON uses [lng, lat] format, but Leaflet uses [lat, lng]
          return coordinates.some((point: any) => {
            const [lng, lat] = point;
            return bounds.contains([lat, lng]);
          });
        }
        // Handle simple array format [[lat, lng], ...]
        else if (Array.isArray(property.polygon) && property.polygon.length >= 3) {
          coordinates = property.polygon;
          // Simple format already uses [lat, lng]
          return coordinates.some((point: any) => {
            const [lat, lng] = point;
            return bounds.contains([lat, lng]);
          });
        }
      }
      // If no polygon, check if property has lat/lng coordinates
      else if (property.latitude && property.longitude) {
        return bounds.contains([property.latitude, property.longitude]);
      }

      return false;
    });
    onVisiblePropertiesChange(visible);
  }, [map, properties, onVisiblePropertiesChange]);

  // Initial update
  useEffect(() => {
    if (properties.length > 0) {
      updateVisibleProperties();
    }
  }, [properties, updateVisibleProperties]);

  return null;
}

function MapZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
    moveend: () => onZoomChange(map.getZoom()),
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

// Search box over the map: solo busca ubicaciones (Nominatim).
function LocationSearch() {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const runSearch = async (value: string) => {
    const q = value.trim();
    if (!q) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }

    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        format: 'json',
        q,
        countrycodes: 'ec',
        addressdetails: '1',
        limit: '5'
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
          'User-Agent': 'EstateMap/1.0 (contact: soporte@estatemap.local)',
          'Accept-Language': 'es'
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error('No se pudo buscar ubicación');
      }
      const data = await res.json();
      setResults(data || []);
      if ((data || []).length === 0) {
        setError('Sin resultados');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError('Error al buscar ubicación');
        setResults([]);
      }
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (!trimmed) {
      if (controllerRef.current) controllerRef.current.abort();
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed), 350);
  };

  const handleSelect = (place: any) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);

    if (place.boundingbox && place.boundingbox.length === 4) {
      const [south, north, west, east] = place.boundingbox.map((v: string) => parseFloat(v));
      if ([south, north, west, east].every(Number.isFinite)) {
        map.fitBounds(
          [
            [south, west],
            [north, east],
          ],
          { maxZoom: 16 }
        );
      } else if (Number.isFinite(lat) && Number.isFinite(lon)) {
        map.flyTo([lat, lon], 15, { duration: 1.2 });
      }
    } else if (Number.isFinite(lat) && Number.isFinite(lon)) {
      map.flyTo([lat, lon], 15, { duration: 1.2 });
    }

    setQuery(place.display_name || '');
    setResults([]);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute top-4 sm:top-4 left-1/2 -translate-x-1/2 z-nav w-[85%] sm:w-[70%] max-w-lg px-3">
      <div className="pointer-events-auto relative w-full">
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative shadow-lg rounded-xl overflow-hidden bg-white">
            <input
              type="search"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Buscar ciudad, referencia..."
              className="w-full px-3 sm:px-4 py-2 pr-10 text-xs sm:text-sm text-textPrimary outline-none"
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 px-3 text-primary hover:text-secondary disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0a12 12 0 00-8 20z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </button>
          </div>
        </form>
        {(results.length > 0 || error) && (
          <div className="absolute left-0 right-0 mt-1 bg-white shadow-xl rounded-xl overflow-hidden border border-line max-h-60 overflow-y-auto">
            {results.map((r) => (
              <button
                key={`${r.place_id}`}
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2 hover:bg-background text-sm"
              >
                <p className="font-semibold text-textPrimary line-clamp-1">{r.display_name}</p>
                <p className="text-xs text-textSecondary">{r.type}</p>
              </button>
            ))}
            {error && results.length === 0 && (
              <div className="px-3 py-2 text-sm text-textSecondary">{error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface LeafletMapProps {
  filteredProperties: any[];
  selectedProperty: any;
  userLocation: { lat: number; lng: number } | null;
  userAccuracy?: number | null;
  onMapReady: (map: any) => void;
  onVisiblePropertiesChange: (properties: any[]) => void;
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void;
  onPolygonClick: (property: any) => void;
  onLocate: () => void;
  locating: boolean;
  locationBlocked: boolean;
  hoverTimeoutRef: React.MutableRefObject<any>;
  getPropertyTypeLabel: (type: string) => string;
  getStatusLabel: (status: string) => string;
  center: [number, number];
}

const getMapPriceLabel = (price: unknown) => {
  const value = Number.parseFloat(String(price));
  if (!Number.isFinite(value) || value <= 0) return 'Consultar';

  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }

  return `$${Math.round(value).toLocaleString('en-US')}`;
};

const LeafletMap = ({
  filteredProperties,
  selectedProperty,
  userLocation,
  userAccuracy,
  onMapReady,
  onVisiblePropertiesChange,
  onBoundsChange,
  onPolygonClick,
  onLocate,
  locating,
  locationBlocked,
  hoverTimeoutRef,
  getPropertyTypeLabel,
  getStatusLabel,
  center,
}: LeafletMapProps) => {
  const polygonLayersRef = useRef<Record<string, any>>({});
  const mapInstanceRef = useRef<any>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('streets'); // Mapa por defecto
  const [mapZoom, setMapZoom] = useState(7);

  const handleInternalMapReady = useCallback((map: any) => {
    mapInstanceRef.current = map;
    onMapReady(map);
  }, [onMapReady]);

  const toggleLayer = () =>
    setActiveLayer((prev) => (prev === 'satellite' ? 'streets' : 'satellite'));

  const clearEdgeLabels = useCallback((layer: any) => {
    if (layer?._edgeLabels) {
      layer._edgeLabels.forEach((lbl: any) => {
        if (lbl && lbl.remove) {
          try { lbl.remove(); } catch {}
        }
      });
      layer._edgeLabels = [];
    }
  }, []);

  const addEdgeLabels = useCallback((layer: any) => {
    const map = layer?._map;
    if (!map || !layer?.getLatLngs) return;

    clearEdgeLabels(layer);

    const latlngs = layer.getLatLngs()?.[0] || [];
    if (!latlngs || latlngs.length < 2) return;

    const tooltips: any[] = [];
    for (let i = 0; i < latlngs.length; i++) {
      const start = latlngs[i];
      const end = latlngs[(i + 1) % latlngs.length];
      if (!start || !end) continue;

      const segment = turf.lineString([
        [start.lng, start.lat],
        [end.lng, end.lat],
      ]);
      const lengthKm = turf.length(segment, { units: 'kilometers' });
      const lengthMeters = lengthKm * 1000;
      const label = `${lengthMeters.toFixed(1)} m`;

      const midLat = (start.lat + end.lat) / 2;
      const midLng = (start.lng + end.lng) / 2;
      const tooltip = L.tooltip({
        permanent: true,
        direction: 'center',
        className: 'edge-length-label',
        opacity: 0.9,
      })
        .setContent(label)
        .setLatLng([midLat, midLng])
        .addTo(map);

      tooltips.push(tooltip);
    }

    layer._edgeLabels = tooltips;
  }, [clearEdgeLabels]);

  useEffect(() => {
    const selectedId = selectedProperty?.id;
    if (selectedId && polygonLayersRef.current[selectedId]) {
      // Solo mostrar etiquetas si show_measurements es true (o undefined para compatibilidad)
      const showMeasurements = selectedProperty?.show_measurements !== false;
      if (showMeasurements) {
        addEdgeLabels(polygonLayersRef.current[selectedId]);
      }
    }

    return () => {
      Object.values(polygonLayersRef.current).forEach((layer: any) => clearEdgeLabels(layer));
    };
  }, [selectedProperty, addEdgeLabels, clearEdgeLabels]);

  return (
    <>
      <style>{`
        .price-label-icon {
          background: transparent !important;
          border: none !important;
          transform: translate(-50%, -50%);
        }
        .map-marker-icon {
          background: transparent !important;
          border: 0 !important;
        }
        .map-rich-marker-icon {
          background: transparent !important;
          border: 0 !important;
        }
        .map-price-pin {
          --marker-bg: #496D9C;
          --marker-ring: rgba(73, 109, 156, 0.28);
          --marker-shadow: rgba(45, 60, 103, 0.30);
          align-items: center;
          display: flex;
          flex-direction: column;
          pointer-events: auto;
          transform: translate(-50%, -100%);
        }
        .map-price-bubble {
          background: var(--marker-bg);
          border: 2px solid #ffffff;
          border-radius: 999px;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.22);
          color: #ffffff;
          font-family: var(--font-geist-mono), ui-monospace, 'SFMono-Regular', monospace;
          font-size: 12px;
          font-variant-numeric: tabular-nums;
          font-weight: 900;
          line-height: 1;
          padding: 6px 9px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.26);
          transform: translateY(2px);
          white-space: nowrap;
        }
        .map-price-pin-head {
          background: var(--marker-bg);
          border: 2px solid #ffffff;
          border-radius: 999px 999px 999px 5px;
          box-shadow: 0 8px 18px var(--marker-shadow), 0 2px 6px rgba(15, 23, 42, 0.2);
          height: 18px;
          transform: rotate(-45deg);
          width: 18px;
        }
        .map-price-pin-head::after {
          background: rgba(255, 255, 255, 0.88);
          border-radius: 999px;
          content: '';
          display: block;
          height: 5px;
          margin: 4.5px auto 0;
          width: 5px;
        }
        .map-price-pin:hover .map-price-bubble,
        .map-price-pin-selected .map-price-bubble {
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.3), 0 0 0 5px var(--marker-ring);
        }
        .map-price-pin:hover .map-price-pin-head,
        .map-price-pin-selected .map-price-pin-head {
          box-shadow: 0 10px 24px var(--marker-shadow), 0 0 0 5px var(--marker-ring);
        }
        .map-pin {
          --pin-color: #496D9C;
          --pin-shadow: rgba(45, 60, 103, 0.28);
          align-items: center;
          background: var(--pin-color);
          border: 2px solid #ffffff;
          border-radius: 999px 999px 999px 6px;
          box-shadow: 0 8px 18px var(--pin-shadow), 0 2px 6px rgba(15, 23, 42, 0.2);
          display: flex;
          height: 22px;
          justify-content: center;
          transform: rotate(-45deg);
          transition: transform 150ms ease, box-shadow 150ms ease;
          width: 22px;
        }
        .map-pin::after {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 999px;
          content: '';
          height: 7px;
          width: 7px;
        }
        .map-pin:hover,
        .map-pin-selected {
          box-shadow: 0 10px 24px var(--pin-shadow), 0 0 0 6px rgba(73, 109, 156, 0.16);
          transform: rotate(-45deg) scale(1.14);
        }
        .map-cluster {
          --cluster-size: 38px;
          align-items: center;
          background: radial-gradient(circle at 35% 28%, #688CCA 0%, #496D9C 48%, #2D3C67 100%);
          border: 2px solid #ffffff;
          border-radius: 999px;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.24), 0 0 0 7px rgba(73, 109, 156, 0.15);
          color: #ffffff;
          cursor: pointer;
          display: flex;
          font-family: var(--font-geist-mono), ui-monospace, 'SFMono-Regular', monospace;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
          font-weight: 900;
          height: var(--cluster-size);
          justify-content: center;
          line-height: 1;
          min-width: var(--cluster-size);
          padding: 0 8px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
          transform: translate(-50%, -50%);
        }
        .map-cluster-medium {
          --cluster-size: 44px;
          font-size: 14px;
        }
        .map-cluster-large {
          --cluster-size: 52px;
          font-size: 15px;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={7}
        maxZoom={21}
        zoomControl={false}
        className="h-full w-full relative"
        preferCanvas={true}
      >
      {/* Solo dos capas, estilo Google Maps: Mapa (CARTO Voyager) y Satélite (Esri).
          maxNativeZoom = último nivel con imágenes reales; por encima Leaflet
          reescala ("zoom artificial") en lugar de pedir tiles inexistentes. */}
      {activeLayer === 'streets' && (
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains={['a','b','c','d']}
          maxZoom={21}
          maxNativeZoom={20}
        />
      )}
      {activeLayer === 'satellite' && (
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
          maxZoom={21}
          maxNativeZoom={18}
        />
      )}

      {/* Controles flotantes estilo Google Maps */}
      <LayerSwitch active={activeLayer} onToggle={toggleLayer} />
      <MapLegend />
      <MapControls onLocate={onLocate} locating={locating} blocked={locationBlocked} />

      <ScaleControl position="bottomleft" metric={true} imperial={false} maxWidth={120} />
      <LocationSearch />
      <MapController onMapReady={handleInternalMapReady} />
      <MapZoomTracker onZoomChange={setMapZoom} />
      <MapBoundsTracker properties={filteredProperties} onVisiblePropertiesChange={onVisiblePropertiesChange} onBoundsChange={onBoundsChange} />

      {useMemo(() => {
        const polygons: JSX.Element[] = [];
        const markers: JSX.Element[] = [];
        const clusterLabels: JSX.Element[] = [];
        const markerCandidates: Array<{
          key: string;
          property: any;
          position: [number, number];
          formattedPrice: string;
          priceIconColor: string;
          priceRingColor: string;
          shadowColor: string;
          baseColor: string;
          isSelected: boolean;
          priority: number;
        }> = [];
        const clusterBuckets = new Map<string, { count: number; total: number; lat: number; lng: number }>();
        const shouldClusterPrices = mapZoom < 12 && filteredProperties.length > 35;
        const maxRichMarkers = mapZoom >= 16 ? 140 : mapZoom >= 14 ? 90 : mapZoom >= 12 ? 42 : 0;
        const maxPolygons = mapZoom >= 16 ? 140 : mapZoom >= 14 ? 70 : mapZoom >= 13 ? 30 : 0;
        const minLabelDistance = mapZoom >= 16 ? 0.001 : mapZoom >= 14 ? 0.0024 : mapZoom >= 12 ? 0.007 : 0.014;
        const clusterPrecision = mapZoom <= 6 ? 0 : mapZoom <= 8 ? 1 : 2;
        const minClusterDistance = mapZoom <= 6 ? 1.05 : mapZoom <= 8 ? 0.48 : 0.2;

        filteredProperties.forEach((p, idx) => {
          // Handle both GeoJSON and simple array formats for properties with polygons
          let leafletCoordinates;

          if (p.polygon?.coordinates?.[0]) {
            // GeoJSON format: convert [lng, lat] to [lat, lng]
            leafletCoordinates = p.polygon.coordinates[0].map((coord: any) => [coord[1], coord[0]]);
          } else if (Array.isArray(p.polygon) && p.polygon.length >= 3) {
            // Simple array format: already [lat, lng]
            leafletCoordinates = p.polygon;
          }

          const isSelected = selectedProperty?.id === p.id;
          // Colores alineados a la paleta navy: azul profundo para venta,
          // azul claro para alquiler y gris pizarra neutral para inactivo.
          const marker = statusMarker(p.status);
          const baseColor = statusColor(p.status);
          const shadowColor = marker.shadow;
          const ringColor = marker.ring;

          const formattedPrice = getMapPriceLabel(p.price);
          const priceIconColor = marker.solid;

          // Calculate centroid for price label position
          let labelPosition: [number, number] | null = null;

          if (leafletCoordinates) {
            // Calculate centroid using turf
            try {
              const polygonCoords = leafletCoordinates.map((coord: any) => [coord[1], coord[0]]); // Convert to [lng, lat] for turf
              polygonCoords.push(polygonCoords[0]); // Close the polygon
              const turfPolygon = turf.polygon([polygonCoords]);
              const centroid = turf.centroid(turfPolygon);
              labelPosition = [centroid.geometry.coordinates[1], centroid.geometry.coordinates[0]];
            } catch (error) {
              console.error('Error calculating centroid:', error);
              // Fallback to first coordinate
              labelPosition = leafletCoordinates[0];
            }
          } else if (p.latitude && p.longitude) {
            labelPosition = [p.latitude, p.longitude];
          }

          // Los poligonos son costosos en Leaflet; solo se dibujan al acercar
          // bastante o cuando la propiedad esta seleccionada.
          if (leafletCoordinates && (isSelected || polygons.length < maxPolygons)) {
            polygons.push(
              <Polygon
                key={`polygon-${p.id || idx}`}
                positions={leafletCoordinates}
                ref={(layer: any) => {
                  if (layer) {
                    const idKey = p.id || `idx-${idx}`;
                    polygonLayersRef.current[idKey] = layer;
                  }
                }}
                pathOptions={{
                  color: baseColor,
                  fillOpacity: isSelected ? 0.4 : 0.2,
                  weight: isSelected ? 3 : 2,
                  className: 'property-polygon'
                }}
                eventHandlers={{
                  click: () => {
                    // Cancel any pending hover timeout
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    onPolygonClick(p);
                    // Mostrar etiquetas al seleccionar (solo si show_measurements es true)
                    const showMeasurements = p.show_measurements !== false;
                    const layer = polygonLayersRef.current[p.id || `idx-${idx}`];
                    if (layer && showMeasurements) {
                      addEdgeLabels(layer);
                    }
                  },
                  mouseover: (e: any) => {
                    const layer = e.target;
                    layer.setStyle({
                      fillOpacity: 0.4,
                      weight: 3
                    });

                    // Clear any existing timeout
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                    }

                    // Set timeout to open modal after 0.75 seconds of hovering
                    hoverTimeoutRef.current = setTimeout(() => {
                      onPolygonClick(p);
                      hoverTimeoutRef.current = null;
                    }, 750);
                  },
                  mouseout: (e: any) => {
                    const layer = e.target;
                    if (!isSelected) {
                      layer.setStyle({
                        fillOpacity: 0.2,
                        weight: 2
                      });
                    }

                    // Cancel hover timeout if mouse leaves before time expires
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                  }
                }}
              />
            );
          }

          if (labelPosition) {
            if (shouldClusterPrices && !isSelected) {
              const [lat, lng] = labelPosition;
              const key = `${lat.toFixed(clusterPrecision)}:${lng.toFixed(clusterPrecision)}`;
              const current = clusterBuckets.get(key) || { count: 0, total: 0, lat: 0, lng: 0 };
              current.count += 1;
              current.total += Number.parseFloat(String(p.price)) || 0;
              current.lat += lat;
              current.lng += lng;
              clusterBuckets.set(key, current);
            } else {
              const priceValue = Number.parseFloat(String(p.price)) || 0;
              markerCandidates.push({
                key: `map-marker-${p.id || idx}`,
                property: p,
                position: labelPosition,
                formattedPrice,
                priceIconColor,
                priceRingColor: ringColor,
                shadowColor,
                baseColor,
                isSelected,
                priority: (isSelected ? 1_000_000_000 : 0) + priceValue,
              });
            }
          }
        });

        const usedPositions: [number, number][] = [];
        markerCandidates
          .sort((a, b) => b.priority - a.priority)
          .forEach((candidate) => {
            if (!candidate.isSelected && markers.length >= maxRichMarkers) return;
            if (
              !candidate.isSelected &&
              usedPositions.some(([lat, lng]) => Math.abs(lat - candidate.position[0]) < minLabelDistance && Math.abs(lng - candidate.position[1]) < minLabelDistance)
            ) {
              return;
            }
            usedPositions.push(candidate.position);

            const markerIcon = new L.DivIcon({
              className: 'map-rich-marker-icon',
              html: priceMarkerHtml({
                status: candidate.property.status,
                type: candidate.property.property_type,
                price: candidate.formattedPrice,
                selected: candidate.isSelected,
              }),
              iconSize: [100, 42],
              iconAnchor: [50, 42]
            });

            markers.push(
              <Marker
                key={candidate.key}
                position={candidate.position}
                icon={markerIcon}
                zIndexOffset={500}
                interactive={true}
                keyboard={false}
                alt=""
                bubblingMouseEvents={false}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e.originalEvent);
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    onPolygonClick(candidate.property);
                  },
                  mouseover: () => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                  }
                }}
              />
            );
          });

        if (shouldClusterPrices) {
          const displayClusters: Array<{
            key: string;
            count: number;
            total: number;
            lat: number;
            lng: number;
          }> = [];
          const maxClusters = mapZoom <= 7 ? 12 : 18;

          Array.from(clusterBuckets.entries())
            .sort(([, a], [, b]) => b.count - a.count)
            .forEach(([key, bucket]) => {
              const clusterPosition: [number, number] = [bucket.lat / bucket.count, bucket.lng / bucket.count];
              const nearbyCluster = displayClusters.find((cluster) => {
                const lat = cluster.lat / cluster.count;
                const lng = cluster.lng / cluster.count;
                return Math.abs(lat - clusterPosition[0]) < minClusterDistance && Math.abs(lng - clusterPosition[1]) < minClusterDistance;
              });

              if (nearbyCluster) {
                nearbyCluster.count += bucket.count;
                nearbyCluster.total += bucket.total;
                nearbyCluster.lat += bucket.lat;
                nearbyCluster.lng += bucket.lng;
                return;
              }

              if (displayClusters.length >= maxClusters) return;
              displayClusters.push({
                key,
                count: bucket.count,
                total: bucket.total,
                lat: bucket.lat,
                lng: bucket.lng,
              });
            });

          displayClusters
            .filter((cluster) => cluster.count >= 2)
            .forEach((cluster) => {
              const clusterPosition: [number, number] = [cluster.lat / cluster.count, cluster.lng / cluster.count];
              const clusterSizeClass = cluster.count >= 100 ? 'map-cluster-large' : cluster.count >= 25 ? 'map-cluster-medium' : '';
              const clusterIcon = new L.DivIcon({
                className: 'price-label-icon',
                html: `
                  <div class="map-cluster ${clusterSizeClass}" aria-hidden="true">${cluster.count}</div>
                `,
                iconSize: [1, 1],
                iconAnchor: [0, 0]
              });
              clusterLabels.push(
                <Marker
                  key={`cluster-${cluster.key}`}
                  position={clusterPosition}
                  icon={clusterIcon}
                  interactive={true}
                  keyboard={false}
                  alt=""
                  zIndexOffset={450}
                  eventHandlers={{
                    click: (e) => {
                      L.DomEvent.stopPropagation(e.originalEvent);
                      const map = mapInstanceRef.current;
                      if (!map) return;
                      const nextZoom = Math.min(Math.max(map.getZoom() + 2, 11), 15);
                      map.flyTo(clusterPosition, nextZoom, { duration: 0.75 });
                    }
                  }}
                />
              );
            });
        }

        return [...polygons, ...clusterLabels, ...markers];
      }, [filteredProperties, selectedProperty, mapZoom, onPolygonClick, hoverTimeoutRef, addEdgeLabels, getPropertyTypeLabel, getStatusLabel])}

      {/* Ubicación del usuario: punto azul + círculo de precisión (estilo Google Maps) */}
      {userLocation && (
        <>
          {userAccuracy ? (
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={userAccuracy}
              pathOptions={{ stroke: false, fillColor: '#3e97ff', fillOpacity: 0.12 }}
            />
          ) : null}
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={9}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#3e97ff', fillOpacity: 1 }}
          >
            <Popup>
              <div className="text-center">
                <strong>Tu ubicación</strong>
                <br />
                <small>
                  {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                </small>
              </div>
            </Popup>
          </CircleMarker>
        </>
      )}
    </MapContainer>
    </>
  );
};

export default LeafletMap;
