'use client';

import { useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { useEffect, useRef, useCallback } from 'react';
import * as turf from '@turf/turf';

/* ===================== Dibujo & medición ===================== */
export function DrawingTools({
  onPolygonChange,
  onAreaChange,
  initialPolygon,
  showMeasurements = true,
}: {
  onPolygonChange?: (coords: any[]) => void;
  onAreaChange?: (area: number) => void;
  initialPolygon?: any[];
  showMeasurements?: boolean;
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
  const clearEdgeLabels = useCallback((layer: any) => {
    if (layer?._edgeMarkers) {
      layer._edgeMarkers.forEach((m: any) => {
        if (m && m.remove && m._map) {
          try { m.remove(); } catch {}
        }
      });
      layer._edgeMarkers = [];
    }
  }, []);

  const refreshEdgeLabels = useCallback((layer: any) => {
    clearEdgeLabels(layer);

    // No mostrar etiquetas si showMeasurements es false
    if (!showMeasurements) return;

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
          border: 1px solid #496D9C;
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
        iconAnchor: [0, 0],
      });

      const marker = L.marker([midLat, midLng], {
        icon: icon,
        interactive: true,
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


          if (isNaN(newDistance) || newDistance <= 0) {
            inputElement.value = previousValue;
            return;
          }

          // Obtener coordenadas actuales DEL LAYER
          const currentLatlngs = layer.getLatLngs()[0];
          if (!currentLatlngs || currentLatlngs.length < 3) {
            return;
          }

          const startPoint = currentLatlngs[edgeIndex];
          const nextIndex = (edgeIndex + 1) % currentLatlngs.length;


          // Calcular bearing del segmento ACTUAL
          const bearing = turf.bearing(
            [startPoint.lng, startPoint.lat],
            [currentLatlngs[nextIndex].lng, currentLatlngs[nextIndex].lat]
          );


          // Calcular nueva posición
          const newEndPoint = turf.destination(
            [startPoint.lng, startPoint.lat],
            newDistance / 1000,
            bearing,
            { units: 'kilometers' }
          );

          const newLat = newEndPoint.geometry.coordinates[1];
          const newLng = newEndPoint.geometry.coordinates[0];


          // Actualizar coordenadas
          const newLatlngs = currentLatlngs.map((pt: any, idx: number) => {
            if (idx === nextIndex) {
              return L.latLng(newLat, newLng);
            }
            return pt;
          });


          // Aplicar cambios
          layer.setLatLngs([newLatlngs]);

          // Forzar redibujado
          layer.redraw();

          // Actualizar área
          updateAreaAndCoords(layer);


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
  }, [clearEdgeLabels, showMeasurements, map]);

  const updateAreaAndCoords = (layer: any) => {
    const ring = layer.getLatLngs()?.[0] || [];
    onPolygonChange?.(ring.map((p: any) => [p.lat, p.lng]));
    // Área calculada automáticamente removida - el usuario debe ingresarla manualmente
  };

  const stylePolygon = (layer: any) => {
    layer.setStyle?.({
      color: '#496D9C',
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
    layer.on('pm:drag', () => { refreshEdgeLabels(layer); updateAreaAndCoords(layer); });
    layer.on('pm:rotate', () => { refreshEdgeLabels(layer); updateAreaAndCoords(layer); });
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
      dragMode: true,  // Permite mover el polígono completo
      rotateMode: false, // Permite rotar el polígono
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
        zoom: map.getZoom(),
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
        zoom: map.getZoom(),
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
          duration: 0,
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

    /* === Edit / Remove / Drag / Rotate === */
    const onEdit = (e: any) => {
      e.layers.eachLayer((layer: any) => {
        if (layer === currentPolygonRef.current) {
          refreshEdgeLabels(layer);
          updateAreaAndCoords(layer);
        }
      });
    };

    const onDrag = (e: any) => {
      if (e.layer === currentPolygonRef.current) {
        refreshEdgeLabels(e.layer);
        updateAreaAndCoords(e.layer);
      }
    };

    const onRotate = (e: any) => {
      if (e.layer === currentPolygonRef.current) {
        refreshEdgeLabels(e.layer);
        updateAreaAndCoords(e.layer);
      }
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
          duration: 0,
        });
      }
    };

    // Bind
    map.on('pm:drawstart', onDrawStart);
    map.on('pm:drawend', onDrawEnd);
    map.on('pm:create', onCreate);
    map.on('pm:edit', onEdit);
    map.on('pm:drag', onDrag);
    map.on('pm:rotate', onRotate);
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

        try { map.pm.removeControls(); } catch {}
        try { map.pm.disableDraw(); } catch {}
        try { map.pm.disableGlobalEditMode(); } catch {}

        map.off('pm:drawstart', onDrawStart);
        map.off('pm:drawend', onDrawEnd);
        map.off('pm:create', onCreate);
        map.off('pm:edit', onEdit);
        map.off('pm:drag', onDrag);
        map.off('pm:rotate', onRotate);
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

  // Actualizar etiquetas cuando cambia showMeasurements
  useEffect(() => {
    if (currentPolygonRef.current) {
      refreshEdgeLabels(currentPolygonRef.current);
    }
  }, [showMeasurements, refreshEdgeLabels]);

  // Load initial polygon if provided (for edit mode)
  useEffect(() => {
    // Only load if we have valid polygon data, no polygon is currently on the map, and we haven't loaded it yet
    if (initialPolygon && initialPolygon.length >= 3 && !currentPolygonRef.current && !initialLoadRef.current) {

      // Use a small timeout to ensure the map is fully initialized
      const timer = setTimeout(() => {
        try {

          // Create polygon from initial data
          const polygon = L.polygon(initialPolygon, {
            color: '#496D9C',
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

        } catch (e) {
          console.error('Error loading initial polygon:', e);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
    }
  }, [initialPolygon, map]);

  return null;
}
