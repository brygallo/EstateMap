'use client';

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { useEffect, useRef } from 'react';
import * as turf from '@turf/turf';

// Fix Leaflet icons
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

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

      markers.push(tooltip);
    }

    layer._edgeMarkers = markers;
  };

  const updateAreaAndCoords = (layer: any) => {
    const ring = layer.getLatLngs()?.[0] || [];
    onPolygonChange?.(ring.map((p: any) => [p.lat, p.lng]));
    if (ring.length >= 3) {
      const coords = ring.map((p: any) => [p.lng, p.lat]);
      const a = turf.area(turf.polygon([[...coords, coords[0]]]));
      onAreaChange?.(a);
    } else {
      onAreaChange?.(0);
    }
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
        onAreaChange?.(0);
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
        try {
          e.layer.pm?.enable();
        } catch (err) {
          console.warn('No se pudo habilitar edición del polígono recién creado', err);
        }
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
      });
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
          onAreaChange?.(0);
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
            const hasPath = currentPolygonRef.current?._path;
            const hasClassList = hasPath && (hasPath as any).classList;

            // Solo intentar deshabilitar/quitar si el mapa sigue montado y el path existe
            if (hasContainer && hasClassList && map.hasLayer(currentPolygonRef.current)) {
              currentPolygonRef.current.pm?.disable?.();
              currentPolygonRef.current.remove?.();
              map.removeLayer(currentPolygonRef.current);
            } else if (currentPolygonRef.current.remove) {
              currentPolygonRef.current.remove();
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

interface AddPropertyMapProps {
  onMapReady: (map: any) => void;
  onPolygonChange: (coords: any[]) => void;
  onAreaChange: (area: number) => void;
  initialPolygon?: any[];
  userCenter?: [number, number];
  userZoom?: number;
}

const AddPropertyMap = ({
  onMapReady,
  onPolygonChange,
  onAreaChange,
  initialPolygon,
  userCenter,
  userZoom
}: AddPropertyMapProps) => {
  return (
    <MapContainer
      center={defaultCenter}
      zoom={7}
      maxZoom={20}
      preferCanvas
      className="h-full w-full"
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
      {userCenter && userZoom && <FlyToLocation center={userCenter} zoom={userZoom} />}
    </MapContainer>
  );
};

export default AddPropertyMap;
