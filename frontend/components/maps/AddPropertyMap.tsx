'use client';

import { MapContainer, TileLayer, useMap, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { useEffect, useRef, useState } from 'react';
import * as turf from '@turf/turf';

// Fix Leaflet icons
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });

  // Guardar contra llamados a removeClass con path destruido (previene crash al desmontar)
  const originalRemoveClass = (L.DomUtil as any).removeClass;
  (L.DomUtil as any).removeClass = function (el: any, name: string) {
    if (!el || !el.classList) return this;
    return originalRemoveClass.call(this, el, name);
  };
}

const userLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3B82F6" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const defaultCenter: [number, number] = [-1.5, -78.5]; // Centro de Ecuador

/* ===================== MapRefBinder ===================== */
function MapRefBinder({ onMapReady }: { onMapReady: (map: any) => void }) {
  const map = useMap();

  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
}

/* ===================== Dibujo & medición ===================== */
function DrawingTools({
  onPolygonChange,
  onAreaChange,
  initialPolygon
}: {
  onPolygonChange?: (coords: any[]) => void;
  onAreaChange?: (area: number) => void;
  initialPolygon?: any[];
}) {
  const map = useMap();

  const currentPolygonRef = useRef<any>(null);
  const drawingRef = useRef({
    active: false,
    workingLayer: null,
  });
  const liveTooltipRef = useRef<any>(null);
  const initialLoadRef = useRef(false);
  const mapViewRef = useRef<{ center: L.LatLng; zoom: number } | null>(null);
  const preventZoomRef = useRef(false);

  /* ===== Helpers: edge labels / area / estilo ===== */
  const clearEdgeLabels = (layer: any) => {
    if (layer?._edgeMarkers) {
      layer._edgeMarkers.forEach((m: any) => {
        if (m && m.remove && m._map) {
          try { m.remove(); } catch {}
        }
      });
      layer._edgeMarkers = [];
    }
  };

  const refreshEdgeLabels = (layer: any) => {
    clearEdgeLabels(layer);

    const latlngs = layer?.getLatLngs?.()?.[0] || [];
    if (!latlngs || latlngs.length < 2) return;

    const markers: any[] = [];
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

      const midLat = (start.lat + end.lat) / 2;
      const midLng = (start.lng + end.lng) / 2;

      // Crear un marcador con input siempre visible - diseño mejorado
      const iconHtml = `
        <div class="editable-distance-label" data-edge-index="${i}" style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: white;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid #28a745;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        ">
          <input type="number" step="0.1" min="0.1"
                 class="distance-input"
                 data-edge-index="${i}"
                 style="width: 60px;
                        font-size: 12px;
                        font-weight: 600;
                        padding: 2px 4px;
                        border: 1px solid #ddd;
                        border-radius: 3px;
                        text-align: center;
                        outline: none;
                        background: #f8f9fa;
                        color: #333;"
                 value="${lengthMeters.toFixed(1)}" />
          <span style="font-size: 11px; color: #666; font-weight: 500;">m</span>
        </div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: 'editable-distance-marker',
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      const marker = L.marker([midLat, midLng], {
        icon: icon,
        interactive: true
      }).addTo(map);

      // Guardar referencia al índice actual para el closure
      const edgeIndex = i;

      // Configurar eventos después de que el marcador se agregue al DOM
      setTimeout(() => {
        const inputElement = marker.getElement()?.querySelector('.distance-input') as HTMLInputElement;
        if (!inputElement) return;

        // Prevenir propagación de eventos al mapa
        L.DomEvent.disableClickPropagation(inputElement);
        L.DomEvent.disableScrollPropagation(inputElement);

        let previousValue = inputElement.value;

        // Guardar el valor cuando empieza a editar
        inputElement.addEventListener('focus', () => {
          previousValue = inputElement.value;
        });

        // Manejar cambio de valor
        const handleChange = (evt: Event) => {
          evt.stopPropagation();

          const newDistance = parseFloat(inputElement.value);

          console.log('=== CAMBIO DE DISTANCIA ===');
          console.log('Nuevo valor:', newDistance, 'metros');

          if (isNaN(newDistance) || newDistance <= 0) {
            inputElement.value = previousValue;
            console.log('Valor inválido, restaurado a:', previousValue);
            return;
          }

          // Obtener coordenadas actuales DEL LAYER
          const currentLatlngs = layer.getLatLngs()[0];
          if (!currentLatlngs || currentLatlngs.length < 3) {
            console.log('ERROR: No hay suficientes puntos');
            return;
          }

          const startPoint = currentLatlngs[edgeIndex];
          const nextIndex = (edgeIndex + 1) % currentLatlngs.length;

          console.log('Segmento:', edgeIndex, '->', nextIndex);
          console.log('Start:', [startPoint.lat, startPoint.lng]);

          // Calcular bearing del segmento ACTUAL
          const bearing = turf.bearing(
            [startPoint.lng, startPoint.lat],
            [currentLatlngs[nextIndex].lng, currentLatlngs[nextIndex].lat]
          );

          console.log('Bearing:', bearing, 'grados');

          // Calcular nueva posición
          const newEndPoint = turf.destination(
            [startPoint.lng, startPoint.lat],
            newDistance / 1000,
            bearing,
            { units: 'kilometers' }
          );

          const newLat = newEndPoint.geometry.coordinates[1];
          const newLng = newEndPoint.geometry.coordinates[0];

          console.log('Nuevo punto final:', [newLat, newLng]);

          // Actualizar coordenadas
          const newLatlngs = currentLatlngs.map((pt: any, idx: number) => {
            if (idx === nextIndex) {
              return L.latLng(newLat, newLng);
            }
            return pt;
          });

          console.log('Actualizando polígono...');

          // Aplicar cambios
          layer.setLatLngs([newLatlngs]);

          // Forzar redibujado
          layer.redraw();

          // Actualizar área
          updateAreaAndCoords(layer);

          console.log('Polígono actualizado ✓');

          // Actualizar valor previo
          previousValue = inputElement.value;

          // Refrescar etiquetas
          setTimeout(() => {
            refreshEdgeLabels(layer);
          }, 100);
        };

        // Eventos
        inputElement.addEventListener('blur', handleChange);
        inputElement.addEventListener('change', handleChange);

        inputElement.addEventListener('keydown', (evt: KeyboardEvent) => {
          if (evt.key === 'Enter') {
            evt.preventDefault();
            evt.stopPropagation();
            inputElement.blur();
          } else if (evt.key === 'Escape') {
            evt.preventDefault();
            evt.stopPropagation();
            inputElement.value = previousValue;
            inputElement.blur();
          }
        });
      }, 200);

      markers.push(marker);
    }

    layer._edgeMarkers = markers;
  };

  const updateAreaAndCoords = (layer: any) => {
    const ring = layer.getLatLngs()?.[0] || [];
    onPolygonChange?.(ring.map((p: any) => [p.lat, p.lng]));
    // Área calculada automáticamente removida - el usuario debe ingresarla manualmente
  };

  const stylePolygon = (layer: any) => {
    layer.setStyle?.({
      color: '#2b8a3e',
      weight: 2.5,
      fillOpacity: 0.15,
      lineJoin: 'round',
      lineCap: 'round',
    });
  };

  const bindFinalPolygon = (layer: any) => {
    currentPolygonRef.current = layer;
    stylePolygon(layer);
    refreshEdgeLabels(layer);
    updateAreaAndCoords(layer);
    layer.on('pm:edit', () => { refreshEdgeLabels(layer); updateAreaAndCoords(layer); });
    layer.on('pm:vertexadded', () => { refreshEdgeLabels(layer); updateAreaAndCoords(layer); });
    layer.on('pm:markerdrag', () => { refreshEdgeLabels(layer); updateAreaAndCoords(layer); });
  };

  const forceEditMode = (layer: any) => {
    const opts = { snappable: true, allowSelfIntersection: false };
    try { layer.pm?.enable?.(opts); } catch {}
    requestAnimationFrame(() => {
      try { layer.pm?.enable?.(opts); } catch {}
    });
    setTimeout(() => {
      try { layer.pm?.enable?.(opts); } catch {}
    }, 80);
  };

  const removeLiveTooltip = () => {
    const tooltip = liveTooltipRef.current;
    liveTooltipRef.current = null;
    if (!tooltip) return;

    const hasContainer = (map as any)?._container;
    const hasPath = (tooltip as any)?._path;
    if (hasContainer && hasPath && map.hasLayer(tooltip)) {
      try { map.removeLayer(tooltip); } catch {}
    } else if (tooltip.remove) {
      try { tooltip.remove(); } catch {}
    }
  };

  useEffect(() => {
    // Controles
    map.pm.addControls({
      position: 'topleft',
      drawPolygon: true,
      editMode: true,
      removalMode: false, // Solo se usa el botón "Limpiar Polígono" custom
      drawMarker: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      cutPolygon: false,
      dragMode: false,
      rotateMode: false,
      drawText: false,
    });

    // Asegurar que el modo de borrado global esté deshabilitado
    try {
      map.pm.disableGlobalRemovalMode();
    } catch {}

    map.pm.setGlobalOptions({
      tooltips: true,
      snappable: true,
      snapDistance: 20,
      allowSelfIntersection: false,
      templineStyle: { color: '#1971c2' },
      hintlineStyle: { color: '#1971c2', dashArray: [4, 4] },
      continueDrawing: false,
      editable: true,
    });

    /* === START dibujo === */
    const onDrawStart = (e: any) => {
      if (e.shape !== 'Polygon') return;

      // Guardar la vista actual del mapa
      mapViewRef.current = {
        center: map.getCenter(),
        zoom: map.getZoom()
      };

      // Un solo polígono
      if (currentPolygonRef.current && map.hasLayer(currentPolygonRef.current)) {
        clearEdgeLabels(currentPolygonRef.current);
        map.removeLayer(currentPolygonRef.current);
        currentPolygonRef.current = null;
        onPolygonChange?.([]);
      }

      drawingRef.current.active = true;
      drawingRef.current.workingLayer = e.workingLayer || e.layer || null;
    };

    /* === END dibujo === */
    const onDrawEnd = () => {
      drawingRef.current.active = false;
      drawingRef.current.workingLayer = null;
      removeLiveTooltip();
    };

    /* === Crear polígono final === */
    const onCreate = (e: any) => {
      if (e.shape !== 'Polygon') return;

      // Activar prevención de zoom
      preventZoomRef.current = true;

      // Usar la vista guardada desde drawStart
      const savedView = mapViewRef.current || {
        center: map.getCenter(),
        zoom: map.getZoom()
      };

      // Mantener el polígono en modo edición inmediatamente (solo si hay path)
      if (e.layer?._path) {
        forceEditMode(e.layer);
      }

      bindFinalPolygon(e.layer);
      removeLiveTooltip();

      // Restaurar la vista inmediatamente en el siguiente frame
      requestAnimationFrame(() => {
        map.setView(savedView.center, savedView.zoom, {
          animate: false,
          duration: 0
        });

        // Desactivar prevención después de un momento
        setTimeout(() => {
          preventZoomRef.current = false;
          mapViewRef.current = null;
        }, 300);

        // En caso de que Geoman quite edición al cerrar, re-forzar luego de restaurar vista
        if (e.layer?._path) {
          setTimeout(() => forceEditMode(e.layer), 120);
        }
      });

      // Asegurar que el botón de edición quede activo
      try {
        map.pm.enableGlobalEditMode();
      } catch {}
    };

    /* === Edit / Remove === */
    const onEdit = (e: any) => {
      e.layers.eachLayer((layer: any) => {
        if (layer === currentPolygonRef.current) {
          refreshEdgeLabels(layer);
          updateAreaAndCoords(layer);
        }
      });
    };

    const onRemove = (e: any) => {
      e.layers.eachLayer((layer: any) => {
        if (layer === currentPolygonRef.current) {
          clearEdgeLabels(layer);
          currentPolygonRef.current = null;
          onPolygonChange?.([]);
        }
      });
      removeLiveTooltip();
    };

    // Prevenir zoom automático durante la creación
    const blockZoomStart = () => {
      if (preventZoomRef.current && mapViewRef.current) {
        map.setView(mapViewRef.current.center, mapViewRef.current.zoom, {
          animate: false,
          duration: 0
        });
      }
    };

    // Bind
    map.on('pm:drawstart', onDrawStart);
    map.on('pm:drawend', onDrawEnd);
    map.on('pm:create', onCreate);
    map.on('pm:edit', onEdit);
    map.on('pm:remove', onRemove);

    // Bloquear zoom automático
    map.on('zoomstart', blockZoomStart);
    map.on('movestart', blockZoomStart);

    try { map.pm.setLang('es'); } catch {}

    // Unbind
    return () => {
      try {
        const hasContainer = (map as any)?._container;
        if (!hasContainer) {
          return;
        }

        map.off('pm:drawstart', onDrawStart);
        map.off('pm:drawend', onDrawEnd);
        map.off('pm:create', onCreate);
        map.off('pm:edit', onEdit);
        map.off('pm:remove', onRemove);
        map.off('zoomstart', blockZoomStart);
        map.off('movestart', blockZoomStart);
        removeLiveTooltip();

        // Clean up current polygon safely
        if (currentPolygonRef.current) {
          try {
            clearEdgeLabels(currentPolygonRef.current);
            const hasContainer = (map as any)?._container;
            const path = (currentPolygonRef.current as any)?._path;
            const hasClassList = !!(path && path.classList);

            // Solo intentar deshabilitar/quitar si el mapa sigue montado y el path sigue existiendo
            if (hasContainer && hasClassList && map.hasLayer(currentPolygonRef.current)) {
              try { currentPolygonRef.current.pm?.disable?.(); } catch {}
              try { currentPolygonRef.current.remove?.(); } catch {}
              try { map.removeLayer(currentPolygonRef.current); } catch {}
            } else if (hasClassList && currentPolygonRef.current.remove) {
              try { currentPolygonRef.current.remove(); } catch {}
            }
          } catch (e) {
            // Ignore cleanup errors on unmount
          }
          currentPolygonRef.current = null;
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [map, onPolygonChange, onAreaChange]);

  // Load initial polygon if provided (for edit mode)
  useEffect(() => {
    // Only load if we have valid polygon data, no polygon is currently on the map, and we haven't loaded it yet
    if (initialPolygon && initialPolygon.length >= 3 && !currentPolygonRef.current && !initialLoadRef.current) {
      console.log('Attempting to load initial polygon:', initialPolygon);

      // Use a small timeout to ensure the map is fully initialized
      const timer = setTimeout(() => {
        try {
          console.log('Loading initial polygon now:', initialPolygon);

          // Create polygon from initial data
          const polygon = L.polygon(initialPolygon, {
            color: '#2b8a3e',
            weight: 2.5,
            fillOpacity: 0.15,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(map);

          // Enable editing for this polygon
          polygon.pm.enable();

          bindFinalPolygon(polygon);

          // Fit map to polygon bounds
          map.fitBounds(polygon.getBounds());

          // Mark as loaded only after successfully loading
          initialLoadRef.current = true;

          console.log('Initial polygon loaded successfully');
        } catch (e) {
          console.error('Error loading initial polygon:', e);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      console.log('Skipping polygon load - polygon:', initialPolygon?.length, 'current:', !!currentPolygonRef.current, 'loaded:', initialLoadRef.current);
    }
  }, [initialPolygon, map]);

  return null;
}

/* ===================== Escala ===================== */
function ScaleBottomLeft() {
  const map = useMap();
  useEffect(() => {
    const control = L.control.scale({ position: 'bottomleft', metric: true, imperial: false });
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);
  return null;
}

/* ===================== FlyToLocation ===================== */
function FlyToLocation({ center, zoom }: { center?: [number, number]; zoom?: number }) {
  const map = useMap();
  const hasFlownRef = useRef(false);

  useEffect(() => {
    // Solo volar una vez cuando se obtiene la ubicación
    if (center && zoom && !hasFlownRef.current) {
      hasFlownRef.current = true;

      // Small delay to ensure map is fully loaded
      setTimeout(() => {
        map.flyTo(center, zoom, {
          duration: 1.5
        });
      }, 500);
    }
  }, [center, zoom, map]);

  return null;
}

/* ===================== Buscador ===================== */
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

    // Cancelar búsquedas previas para que la más reciente responda rápido
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      if (controllerRef.current) controllerRef.current.abort();
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      runSearch(trimmed);
    }, 350);
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
    <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[85%] max-w-lg px-3">
      <div className="pointer-events-auto relative w-full">
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative shadow-lg rounded-xl overflow-hidden bg-white">
            <input
              type="search"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Buscar ciudad, referencia..."
              className="w-full px-4 py-2 pr-10 text-sm text-gray-800 outline-none"
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
          <div className="absolute left-0 right-0 mt-1 bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100 max-h-60 overflow-y-auto">
            {results.map((r) => (
              <button
                key={`${r.place_id}`}
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
              >
                <p className="font-semibold text-gray-800 line-clamp-1">{r.display_name}</p>
                <p className="text-xs text-gray-500">{r.type}</p>
              </button>
            ))}
            {error && results.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">{error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface AddPropertyMapProps {
  onMapReady: (map: any) => void;
  onPolygonChange: (coords: any[]) => void;
  onAreaChange?: (area: number) => void;
  initialPolygon?: any[];
  userCenter?: [number, number];
  userZoom?: number;
  userLocation?: { lat: number; lng: number } | null;
}

const AddPropertyMap = ({
  onMapReady,
  onPolygonChange,
  onAreaChange,
  initialPolygon,
  userCenter,
  userZoom,
  userLocation
}: AddPropertyMapProps) => {
  return (
    <>
      <style>{`
        .editable-distance-marker {
          background: transparent !important;
          border: none !important;
        }
        .distance-input {
          transition: all 0.2s ease;
        }
        .distance-input:hover {
          border-color: #28a745 !important;
          background: white !important;
        }
        .distance-input:focus {
          border-color: #28a745 !important;
          background: white !important;
          box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.2) !important;
        }
        .distance-input::-webkit-inner-spin-button,
        .distance-input::-webkit-outer-spin-button {
          opacity: 1;
        }
      `}</style>
      <MapContainer
        center={defaultCenter}
        zoom={7}
        maxZoom={20}
        preferCanvas
        className="h-full w-full relative"
        zoomControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        boxZoom={true}
        keyboard={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains={['a','b','c','d']}
          maxZoom={20}
        />
        <MapRefBinder onMapReady={onMapReady} />
        <ScaleBottomLeft />
        <DrawingTools
          onPolygonChange={onPolygonChange}
          onAreaChange={onAreaChange}
          initialPolygon={initialPolygon}
        />
        <LocationSearch />
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon} />
        )}
        {userCenter && userZoom && <FlyToLocation center={userCenter} zoom={userZoom} />}
      </MapContainer>
    </>
  );
};

export default AddPropertyMap;
