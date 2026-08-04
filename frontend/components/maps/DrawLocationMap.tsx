'use client';

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Eraser, Maximize2, Minus, Plus, Undo2 } from 'lucide-react';
import * as turf from '@turf/turf';
import { toast } from 'sonner';
import aentsTokens from '@/lib/aents-tokens.json';
import LayerSwitch, { type MapLayer } from '@/components/map/LayerSwitch';
import { applyBaseLayer, buildMapStyle, ECUADOR_CENTER } from './maplibre-style';

// MapLibre marker elements and GeoJSON paint values cannot resolve CSS custom
// properties, so raw token values are read from JSON here.
const BRAND_STROKE = aentsTokens.light['--primary-strong'];
const BRAND_FILL = aentsTokens.light['--primary-soft'];
const USER_LOCATION_COLOR = aentsTokens.light['--info'];
// Hint color for the rubber-band preview line, same role as Geoman's hintline.
const TOOL_HINT = aentsTokens.light['--info'];

type LatLng = { lat: number; lng: number };

export interface DrawMapHandle {
  flyTo: (center: [number, number], zoom?: number, opts?: { duration?: number }) => void;
  getZoom: () => number;
  clearPolygon: () => void;
  getMap: () => maplibregl.Map | null;
}

interface DrawLocationMapProps {
  onMapReady: (map: DrawMapHandle) => void;
  onPolygonChange: (coords: [number, number][]) => void;
  onLocationChange?: (coords: LatLng) => void;
  initialPolygon?: [number, number][];
  selectedLocation?: LatLng | null;
  locationMode?: 'point' | 'polygon';
  userCenter?: [number, number];
  userZoom?: number;
  userLocation?: LatLng | null;
  showMeasurements?: boolean;
  referenceProperties?: any[];
}

const EMPTY_COLLECTION: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

const isInEcuador = ({ lat, lng }: LatLng) =>
  (lat >= -5.45 && lat <= 1.9 && lng >= -81.35 && lng <= -74.75) ||
  (lat >= -1.75 && lat <= 1.85 && lng >= -92.2 && lng <= -88.45);

const polygonError = (vertices: LatLng[]): string | null => {
  if (vertices.some(({ lat, lng }) => !Number.isFinite(lat) || !Number.isFinite(lng))) {
    return 'La forma contiene coordenadas inválidas.';
  }
  if (vertices.some((vertex) => !isInEcuador(vertex))) {
    return 'Todos los puntos de la forma deben estar dentro de Ecuador.';
  }
  if (new Set(vertices.map(({ lat, lng }) => `${lat},${lng}`)).size < 3) {
    return 'La forma debe tener al menos 3 puntos distintos.';
  }
  const ring = vertices.map(({ lng, lat }) => [lng, lat] as [number, number]);
  const feature = turf.polygon([[...ring, ring[0]]]);
  if (turf.kinks(feature).features.length > 0) {
    return 'Los lados de la forma no pueden cruzarse entre sí.';
  }
  return null;
};

const referenceCollection = (referenceProperties: any[]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: (Array.isArray(referenceProperties) ? referenceProperties : [])
    .map((property, idx) => {
      // Accept both GeoJSON ([lng, lat]) and simple array ([lat, lng]) formats.
      let ring: [number, number][] | null = null;
      if (property?.polygon?.coordinates?.[0]) {
        ring = property.polygon.coordinates[0].map((c: any) => [Number(c[0]), Number(c[1])]);
      } else if (Array.isArray(property?.polygon) && property.polygon.length >= 3) {
        ring = property.polygon.map((c: any) => [Number(c[1]), Number(c[0])]);
      }
      if (!ring || ring.length < 3) return null;
      if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
        ring = [...ring, ring[0]];
      }
      return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: { id: property.id ?? idx },
      } as GeoJSON.Feature;
    })
    .filter((feature): feature is GeoJSON.Feature => Boolean(feature)),
});

const drawCollection = (vertices: LatLng[], closed: boolean): GeoJSON.FeatureCollection => {
  const features: GeoJSON.Feature[] = [];
  if (vertices.length >= 2) {
    const line = vertices.map((v) => [v.lng, v.lat]);
    if (closed && vertices.length >= 3) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...line, line[0]]] },
        properties: { kind: 'draw' },
      });
    } else {
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: line },
        properties: { kind: 'draft' },
      });
    }
  }
  return { type: 'FeatureCollection', features };
};

const userLocationElement = () => {
  const el = document.createElement('div');
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="${USER_LOCATION_COLOR}" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>`;
  el.style.lineHeight = '0';
  return el;
};

const DrawLocationMap = ({
  onMapReady,
  onPolygonChange,
  onLocationChange,
  initialPolygon,
  selectedLocation,
  locationMode = 'polygon',
  userCenter,
  userZoom,
  userLocation,
  showMeasurements = true,
  referenceProperties = [],
}: DrawLocationMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('streets');
  // idle → no vertices yet · drawing → open path · closed → editable polygon
  const [drawState, setDrawState] = useState<'idle' | 'drawing' | 'closed'>('idle');
  const [vertexCount, setVertexCount] = useState(0);
  // Same breakpoint the main map uses for touch interaction: the crosshair +
  // "Agregar punto" flow only helps on coarse pointers; on desktop a plain
  // click is faster.
  const [mobileUX, setMobileUX] = useState(false);
  const mobileUXRef = useRef(false);
  mobileUXRef.current = mobileUX;

  const verticesRef = useRef<LatLng[]>([]);
  const closedRef = useRef(false);
  const vertexMarkersRef = useRef<maplibregl.Marker[]>([]);
  const midMarkersRef = useRef<maplibregl.Marker[]>([]);
  const labelMarkersRef = useRef<maplibregl.Marker[]>([]);
  const pointMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const flownRef = useRef(false);
  const initialLoadedRef = useRef(false);

  const modeRef = useRef(locationMode);
  modeRef.current = locationMode;
  const measurementsRef = useRef(showMeasurements);
  measurementsRef.current = showMeasurements;
  const onPolygonChangeRef = useRef(onPolygonChange);
  onPolygonChangeRef.current = onPolygonChange;
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;

  const clearMarkers = (list: React.MutableRefObject<maplibregl.Marker[]>) => {
    list.current.forEach((marker) => marker.remove());
    list.current = [];
  };

  /** Redraws polygon source, vertex/midpoint handles and edge labels, then
   * reports the ring upward. Every mutation funnels through here. */
  const refresh = useCallback((emit = true) => {
    const map = mapRef.current;
    if (!map) return;
    const vertices = verticesRef.current;
    const closed = closedRef.current;

    const source = map.getSource('draw') as maplibregl.GeoJSONSource | undefined;
    source?.setData(drawCollection(vertices, closed) as any);
    if (closed || vertices.length === 0) {
      const cursorSource = map.getSource('draw-cursor') as maplibregl.GeoJSONSource | undefined;
      cursorSource?.setData(EMPTY_COLLECTION as any);
    }

    clearMarkers(vertexMarkersRef);
    clearMarkers(midMarkersRef);
    clearMarkers(labelMarkersRef);

    vertices.forEach((vertex, index) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `gp-vertex${index === 0 && !closed ? ' gp-vertex-first' : ''}`;
      el.setAttribute('aria-label', `Punto ${index + 1}`);
      el.innerHTML = '<span></span>';
      const marker = new maplibregl.Marker({ element: el, draggable: true, anchor: 'center' })
        .setLngLat([vertex.lng, vertex.lat])
        .addTo(map);
      marker.on('drag', () => {
        const at = marker.getLngLat();
        verticesRef.current[index] = { lat: at.lat, lng: at.lng };
        const src = map.getSource('draw') as maplibregl.GeoJSONSource | undefined;
        src?.setData(drawCollection(verticesRef.current, closedRef.current) as any);
      });
      marker.on('dragend', () => {
        refreshRef.current?.();
      });
      // Closing tap: while drawing, tapping the first vertex closes the ring.
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!closedRef.current && index === 0 && verticesRef.current.length >= 3) {
          closeRef.current?.();
        }
      });
      // Right click (desktop) or long-press (touch) removes the corner.
      el.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteVertexRef.current?.(index);
      });
      let pressTimer: number | null = null;
      el.addEventListener('touchstart', () => {
        pressTimer = window.setTimeout(() => {
          pressTimer = null;
          deleteVertexRef.current?.(index);
        }, 600);
      });
      ['touchend', 'touchmove', 'touchcancel'].forEach((type) =>
        el.addEventListener(type, () => {
          if (pressTimer !== null) {
            clearTimeout(pressTimer);
            pressTimer = null;
          }
        })
      );
      vertexMarkersRef.current.push(marker);
    });

    if (closed && vertices.length >= 3) {
      // Midpoint handles: drag one to insert a vertex on that edge. Touch
      // friendly replacement for Geoman's edge markers.
      vertices.forEach((vertex, index) => {
        const next = vertices[(index + 1) % vertices.length];
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'gp-vertex gp-vertex-mid';
        el.setAttribute('aria-label', 'Agregar punto en este lado');
        el.innerHTML = '<span></span>';
        const marker = new maplibregl.Marker({ element: el, draggable: true, anchor: 'center' })
          .setLngLat([(vertex.lng + next.lng) / 2, (vertex.lat + next.lat) / 2])
          .addTo(map);
        let insertedAt: number | null = null;
        marker.on('dragstart', () => {
          const at = marker.getLngLat();
          insertedAt = index + 1;
          verticesRef.current.splice(insertedAt, 0, { lat: at.lat, lng: at.lng });
        });
        marker.on('drag', () => {
          if (insertedAt === null) return;
          const at = marker.getLngLat();
          verticesRef.current[insertedAt] = { lat: at.lat, lng: at.lng };
          const src = map.getSource('draw') as maplibregl.GeoJSONSource | undefined;
          src?.setData(drawCollection(verticesRef.current, closedRef.current) as any);
        });
        marker.on('dragend', () => {
          insertedAt = null;
          refreshRef.current?.();
        });
        midMarkersRef.current.push(marker);
      });

      if (measurementsRef.current) {
        vertices.forEach((vertex, index) => {
          const nextIndex = (index + 1) % vertices.length;
          const next = vertices[nextIndex];
          const lengthMeters =
            turf.length(
              turf.lineString([
                [vertex.lng, vertex.lat],
                [next.lng, next.lat],
              ]),
              { units: 'kilometers' }
            ) * 1000;

          const el = document.createElement('div');
          el.className = 'gp-edge-label';
          el.innerHTML = `
            <input type="number" step="0.1" min="0.1" inputmode="decimal" value="${lengthMeters.toFixed(1)}" aria-label="Longitud del lado ${index + 1} en metros" />
            <span>m</span>`;
          ['click', 'dblclick', 'pointerdown', 'touchstart', 'wheel'].forEach((type) =>
            el.addEventListener(type, (event) => event.stopPropagation())
          );
          const input = el.querySelector('input') as HTMLInputElement;
          let previousValue = input.value;
          input.addEventListener('focus', () => {
            previousValue = input.value;
          });
          const applyDistance = () => {
            const newDistance = Number.parseFloat(input.value);
            if (!Number.isFinite(newDistance) || newDistance <= 0) {
              input.value = previousValue;
              return;
            }
            const current = verticesRef.current;
            const start = current[index];
            const end = current[nextIndex];
            if (!start || !end) return;
            // Keep the edge direction, move the far endpoint to the typed
            // length (surveyor-style adjustment, same behaviour as before).
            const bearing = turf.bearing([start.lng, start.lat], [end.lng, end.lat]);
            const destination = turf.destination([start.lng, start.lat], newDistance / 1000, bearing, {
              units: 'kilometers',
            });
            current[nextIndex] = {
              lat: destination.geometry.coordinates[1],
              lng: destination.geometry.coordinates[0],
            };
            previousValue = input.value;
            refreshRef.current?.();
          };
          input.addEventListener('change', applyDistance);
          input.addEventListener('blur', applyDistance);
          input.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              input.blur();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              input.value = previousValue;
              input.blur();
            }
          });

          const marker = new maplibregl.Marker({
            element: el,
            anchor: 'top',
            offset: [0, 10],
          })
            .setLngLat([(vertex.lng + next.lng) / 2, (vertex.lat + next.lat) / 2])
            .addTo(map);
          labelMarkersRef.current.push(marker);
        });
      }
    }

    setVertexCount(vertices.length);
    setDrawState(vertices.length === 0 ? 'idle' : closed ? 'closed' : 'drawing');
    if (emit) {
      const error = closed ? polygonError(vertices) : null;
      if (error) {
        // Keep the shape visible so the user can repair it, but invalidate the
        // form until every vertex is valid again.
        onPolygonChangeRef.current?.([]);
        toast.error(error);
      } else {
        onPolygonChangeRef.current?.(
          closed ? vertices.map((v) => [v.lat, v.lng] as [number, number]) : []
        );
      }
    }
  }, []);
  const refreshRef = useRef<typeof refresh | undefined>(undefined);
  refreshRef.current = refresh;

  const addVertex = useCallback((vertex: LatLng) => {
    if (closedRef.current) return;
    verticesRef.current = [...verticesRef.current, vertex];
    // Subtle haptic tick so adding a point "feels" registered on phones.
    (navigator as Navigator & { vibrate?: (ms: number) => void }).vibrate?.(15);
    refreshRef.current?.();
  }, []);

  const deleteVertex = useCallback((index: number) => {
    const vertices = verticesRef.current;
    // A closed shape must keep at least 3 corners; an open path can lose any.
    if (closedRef.current ? vertices.length <= 3 : vertices.length === 0) return;
    verticesRef.current = vertices.filter((_, i) => i !== index);
    refreshRef.current?.();
  }, []);
  const deleteVertexRef = useRef<typeof deleteVertex | undefined>(undefined);
  deleteVertexRef.current = deleteVertex;

  const fitToShape = useCallback((animate = true) => {
    const map = mapRef.current;
    const vertices = verticesRef.current;
    if (!map || vertices.length === 0) return;
    const bounds = vertices.reduce(
      (acc, v) => acc.extend([v.lng, v.lat]),
      new maplibregl.LngLatBounds([vertices[0].lng, vertices[0].lat], [vertices[0].lng, vertices[0].lat])
    );
    map.fitBounds(bounds, { padding: 80, maxZoom: 18, duration: animate ? 600 : 0 });
  }, []);

  const closePolygon = useCallback(() => {
    if (verticesRef.current.length < 3 || closedRef.current) return;
    const error = polygonError(verticesRef.current);
    if (error) {
      toast.error(error);
      return;
    }
    closedRef.current = true;
    refreshRef.current?.();
  }, []);
  const closeRef = useRef<typeof closePolygon | undefined>(undefined);
  closeRef.current = closePolygon;

  const undoVertex = useCallback(() => {
    if (closedRef.current || verticesRef.current.length === 0) return;
    verticesRef.current = verticesRef.current.slice(0, -1);
    refreshRef.current?.();
  }, []);

  const clearAll = useCallback(() => {
    verticesRef.current = [];
    closedRef.current = false;
    refreshRef.current?.();
  }, []);

  /* ===== Map init ===== */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const mobileQuery = window.matchMedia('(max-width: 767px), (pointer: coarse)');
    setMobileUX(mobileQuery.matches);
    const onMobileChange = (event: MediaQueryListEvent) => setMobileUX(event.matches);
    mobileQuery.addEventListener('change', onMobileChange);
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle(),
      center: ECUADOR_CENTER,
      zoom: 6.5,
      maxZoom: 20,
      attributionControl: false,
      fadeDuration: 0,
      renderWorldCopies: false,
      refreshExpiredTiles: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      map.addSource('references', { type: 'geojson', data: EMPTY_COLLECTION });
      map.addLayer({
        id: 'references-fill',
        type: 'fill',
        source: 'references',
        paint: { 'fill-color': BRAND_FILL, 'fill-opacity': 0.18 },
      });
      map.addLayer({
        id: 'references-line',
        type: 'line',
        source: 'references',
        paint: { 'line-color': BRAND_STROKE, 'line-width': 1.5 },
      });

      map.addSource('draw', { type: 'geojson', data: EMPTY_COLLECTION });
      map.addLayer({
        id: 'draw-fill',
        type: 'fill',
        source: 'draw',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': BRAND_STROKE, 'fill-opacity': 0.15 },
      });
      map.addLayer({
        id: 'draw-line',
        type: 'line',
        source: 'draw',
        filter: ['==', ['geometry-type'], 'Polygon'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': BRAND_STROKE, 'line-width': 2.5 },
      });
      map.addLayer({
        id: 'draw-draft',
        type: 'line',
        source: 'draw',
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': BRAND_STROKE, 'line-width': 2, 'line-dasharray': [1.5, 1.5] },
      });

      // Rubber band: while drawing on desktop, a light dashed preview follows
      // the cursor from the last corner (and back to the first one) so the
      // user sees exactly where the next side will land.
      map.addSource('draw-cursor', { type: 'geojson', data: EMPTY_COLLECTION });
      map.addLayer({
        id: 'draw-cursor-line',
        type: 'line',
        source: 'draw-cursor',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': TOOL_HINT, 'line-width': 1.5, 'line-dasharray': [2, 2] },
      });

      setLoaded(true);
    });

    map.on('click', (event) => {
      const { lat, lng } = event.lngLat;
      if (modeRef.current === 'point') {
        onLocationChangeRef.current?.({ lat, lng });
        return;
      }
      if (!closedRef.current) {
        addVertex({ lat, lng });
      }
    });

    const clearCursorLine = () => {
      const src = map.getSource('draw-cursor') as maplibregl.GeoJSONSource | undefined;
      src?.setData(EMPTY_COLLECTION as any);
    };
    map.on('mousemove', (event) => {
      if (
        mobileUXRef.current ||
        modeRef.current !== 'polygon' ||
        closedRef.current ||
        verticesRef.current.length === 0
      ) {
        return;
      }
      const vertices = verticesRef.current;
      const cursor: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      const last = vertices[vertices.length - 1];
      const features: GeoJSON.Feature[] = [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[last.lng, last.lat], cursor] },
          properties: {},
        },
      ];
      if (vertices.length >= 2) {
        const first = vertices[0];
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [cursor, [first.lng, first.lat]] },
          properties: {},
        });
      }
      const src = map.getSource('draw-cursor') as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features } as any);
    });
    map.on('mouseout', clearCursorLine);

    // Double click closes the shape (instead of zooming) while drawing.
    map.on('dblclick', (event) => {
      if (modeRef.current !== 'polygon' || closedRef.current) return;
      event.preventDefault();
      // The double click already fired two 'click's: the second one added a
      // duplicated corner right on top of the previous one — drop it.
      const vertices = verticesRef.current;
      if (vertices.length >= 2) {
        const last = map.project([vertices[vertices.length - 1].lng, vertices[vertices.length - 1].lat]);
        const prev = map.project([vertices[vertices.length - 2].lng, vertices[vertices.length - 2].lat]);
        if (Math.hypot(last.x - prev.x, last.y - prev.y) < 8) {
          verticesRef.current = vertices.slice(0, -1);
        }
      }
      if (verticesRef.current.length >= 3) {
        closeRef.current?.();
      } else {
        refreshRef.current?.();
      }
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closedRef.current && verticesRef.current.length > 0) {
        clearAll();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    onMapReady({
      flyTo: (center, zoom, opts) =>
        map.flyTo({
          center: [center[1], center[0]],
          zoom,
          duration: (opts?.duration ?? 1.2) * 1000,
        }),
      getZoom: () => map.getZoom(),
      clearPolygon: () => clearAll(),
      getMap: () => mapRef.current,
    });

    return () => {
      mobileQuery.removeEventListener('change', onMobileChange);
      window.removeEventListener('keydown', onKeyDown);
      clearMarkers(vertexMarkersRef);
      clearMarkers(midMarkersRef);
      clearMarkers(labelMarkersRef);
      pointMarkerRef.current?.remove();
      pointMarkerRef.current = null;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Cursor: crosshair whenever a click places something ===== */
  useEffect(() => {
    const canvas = mapRef.current?.getCanvas();
    if (!loaded || !canvas) return;
    const placing = locationMode === 'point' || drawState !== 'closed';
    canvas.style.cursor = placing ? 'crosshair' : '';
  }, [loaded, locationMode, drawState]);

  /* ===== Base layer toggle (same structure as the main map) ===== */
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    applyBaseLayer(map, activeLayer);
  }, [activeLayer, loaded]);

  /* ===== Reference polygons ===== */
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const source = map.getSource('references') as maplibregl.GeoJSONSource | undefined;
    source?.setData(referenceCollection(referenceProperties) as any);
  }, [loaded, referenceProperties]);

  /* ===== Initial polygon (edit mode / restored draft) ===== */
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || initialLoadedRef.current) return;
    if (!Array.isArray(initialPolygon) || initialPolygon.length < 3 || verticesRef.current.length > 0) return;
    const normalized = initialPolygon.map((coordinate) => ({
      lat: Number(Array.isArray(coordinate) ? coordinate[0] : Number.NaN),
      lng: Number(Array.isArray(coordinate) ? coordinate[1] : Number.NaN),
    }));
    if (
      normalized.length > 3 &&
      normalized[0].lat === normalized[normalized.length - 1].lat &&
      normalized[0].lng === normalized[normalized.length - 1].lng
    ) {
      normalized.pop();
    }
    const error = normalized.length < 3
      ? 'La forma guardada debe tener al menos 3 puntos distintos.'
      : polygonError(normalized);
    if (error) {
      initialLoadedRef.current = true;
      verticesRef.current = [];
      closedRef.current = false;
      onPolygonChangeRef.current?.([]);
      toast.error(`No se pudo restaurar la forma: ${error}`);
      refreshRef.current?.(false);
      return;
    }
    initialLoadedRef.current = true;
    verticesRef.current = normalized;
    closedRef.current = true;
    refreshRef.current?.(false);
    fitToShape(false);
  }, [loaded, initialPolygon, fitToShape]);

  /* ===== Point mode marker ===== */
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    if (locationMode !== 'point' || !selectedLocation) {
      pointMarkerRef.current?.remove();
      pointMarkerRef.current = null;
      return;
    }
    if (!pointMarkerRef.current) {
      const marker = new maplibregl.Marker({ color: BRAND_STROKE, draggable: true })
        .setLngLat([selectedLocation.lng, selectedLocation.lat])
        .addTo(map);
      marker.on('dragend', () => {
        const at = marker.getLngLat();
        onLocationChangeRef.current?.({ lat: at.lat, lng: at.lng });
      });
      pointMarkerRef.current = marker;
    } else {
      pointMarkerRef.current.setLngLat([selectedLocation.lng, selectedLocation.lat]);
    }
  }, [loaded, locationMode, selectedLocation]);

  /* ===== Polygon mode leftovers cleanup when switching to point ===== */
  useEffect(() => {
    if (locationMode === 'point' && verticesRef.current.length > 0) {
      clearAll();
    }
  }, [locationMode, clearAll]);

  /* ===== Measurements toggle ===== */
  useEffect(() => {
    if (!loaded) return;
    refreshRef.current?.(false);
  }, [loaded, showMeasurements]);

  /* ===== User location marker + one-time fly ===== */
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      userMarkerRef.current = new maplibregl.Marker({ element: userLocationElement(), anchor: 'center' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    }
  }, [loaded, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || flownRef.current || !userCenter || !userZoom) return;
    // A restored/loaded shape owns the camera: flying away from it to the
    // user's position would hide the very thing being edited.
    if (verticesRef.current.length > 0) return;
    flownRef.current = true;
    map.flyTo({ center: [userCenter[1], userCenter[0]], zoom: userZoom, duration: 1500 });
  }, [loaded, userCenter, userZoom]);

  const zoomBy = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + delta, duration: 220 });
  };

  const drawing = locationMode === 'polygon' && drawState !== 'closed';

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      <LayerSwitch active={activeLayer} onToggle={() => setActiveLayer((prev) => (prev === 'satellite' ? 'streets' : 'satellite'))} />

      <div className="absolute bottom-6 right-3 z-mapcontrol flex flex-col-reverse gap-2.5">
        <div className="map-glass-control flex flex-col overflow-hidden rounded-xl">
          <button type="button" onClick={() => zoomBy(1)} aria-label="Acercar" className="flex h-10 w-10 items-center justify-center text-textPrimary transition-colors hover:bg-muted">
            <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
          <span className="mx-2 block h-px bg-line" aria-hidden />
          <button type="button" onClick={() => zoomBy(-1)} aria-label="Alejar" className="flex h-10 w-10 items-center justify-center text-textPrimary transition-colors hover:bg-muted">
            <Minus className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      {/* Center crosshair: pan to aim, then "Agregar punto". Finger-friendly
          alternative to tapping exact spots on small screens. */}
      {drawing && mobileUX && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-mapcontrol -translate-x-1/2 -translate-y-1/2" aria-hidden>
          <div className="gp-crosshair" />
        </div>
      )}

      {locationMode === 'polygon' && (
        <div className="absolute inset-x-0 bottom-6 z-mapcontrol flex justify-center px-3">
          <div className="map-glass-control pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-xl p-1.5">
            {drawState !== 'closed' ? (
              <>
                {mobileUX && (
                  <button
                    type="button"
                    onClick={() => {
                      const center = mapRef.current?.getCenter();
                      if (center) addVertex({ lat: center.lat, lng: center.lng });
                    }}
                    className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-semibold text-white transition-colors hover:bg-primaryHover"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                    Agregar punto
                  </button>
                )}
                <button
                  type="button"
                  onClick={undoVertex}
                  disabled={vertexCount === 0}
                  aria-label="Deshacer último punto"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-textPrimary transition-colors hover:bg-muted disabled:opacity-40"
                >
                  <Undo2 className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={closePolygon}
                  disabled={vertexCount < 3}
                  className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold text-primary transition-colors hover:bg-muted disabled:opacity-40"
                >
                  <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                  Cerrar{vertexCount > 0 ? ` (${vertexCount})` : ''}
                </button>
              </>
            ) : (
              <>
                <p className="w-28 shrink-0 whitespace-normal px-1 text-center text-[10px] font-medium leading-tight text-textSecondary sm:w-auto sm:px-2 sm:text-left sm:text-xs sm:leading-normal">
                  {mobileUX
                    ? 'Arrastra · mantén pulsado para quitar'
                    : 'Arrastra los puntos · clic derecho quita un punto'}
                </p>
                <button
                  type="button"
                  onClick={() => fitToShape()}
                  aria-label="Centrar la forma en el mapa"
                  title="Centrar la forma"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-textPrimary transition-colors hover:bg-muted"
                >
                  <Maximize2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-error transition-colors hover:bg-muted"
                >
                  <Eraser className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Limpiar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {locationMode === 'polygon' && drawState === 'idle' && (
        <div className="pointer-events-none absolute inset-x-4 top-16 z-mapcontrol mx-auto max-w-xs sm:top-20">
          <div className="aents-glass-panel rounded-card p-3 text-center">
            <p className="text-sm font-semibold text-textPrimary">Dibuja la forma del terreno</p>
            <p className="mt-1 text-xs text-textSecondary">
              {mobileUX
                ? 'Toca el mapa o centra la mira y usa “Agregar punto”. Con 3 o más puntos podrás cerrar la figura.'
                : 'Haz clic en el mapa para marcar las esquinas. Con 3 o más puntos, cierra la figura con el botón o haciendo clic en el primer punto.'}
            </p>
          </div>
        </div>
      )}

      <style>{`
        .maplibregl-canvas { outline: none; }
        .gp-vertex {
          background: transparent;
          border: 0;
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 34px;
          width: 34px;
          padding: 0;
        }
        .gp-vertex span {
          background: #ffffff;
          border: 3px solid ${BRAND_STROKE};
          border-radius: 999px;
          box-shadow: 0 1px 4px rgba(15, 23, 42, 0.35);
          height: 18px;
          width: 18px;
          transition: transform 90ms ease;
        }
        .gp-vertex:active { cursor: grabbing; }
        .gp-vertex:active span, .gp-vertex:hover span { transform: scale(1.2); }
        .gp-vertex-first span {
          background: ${BRAND_STROKE};
          animation: gpVertexPulse 1.6s ease-out infinite;
        }
        .gp-vertex-mid span {
          background: rgba(255, 255, 255, 0.85);
          border-style: dashed;
          border-width: 2px;
          height: 13px;
          width: 13px;
          opacity: 0.85;
        }
        .gp-edge-label {
          align-items: center;
          background: #ffffff;
          border: 1px solid ${BRAND_STROKE};
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.18);
          display: inline-flex;
          gap: 3px;
          padding: 3px 6px;
        }
        .gp-edge-label input {
          border: 1px solid var(--border);
          border-radius: 4px;
          background: var(--surface);
          color: var(--text);
          font-size: 12px;
          font-weight: 600;
          outline: none;
          padding: 2px 3px;
          text-align: center;
          width: 58px;
        }
        .gp-edge-label input:focus {
          border-color: ${BRAND_STROKE};
          background: #ffffff;
        }
        .gp-edge-label span {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 500;
        }
        .gp-crosshair {
          height: 34px;
          position: relative;
          width: 34px;
        }
        .gp-crosshair::before, .gp-crosshair::after {
          background: ${BRAND_STROKE};
          content: '';
          position: absolute;
        }
        .gp-crosshair::before {
          height: 2px;
          left: 0;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          mask: linear-gradient(to right, #000 0 30%, transparent 30% 70%, #000 70% 100%);
          -webkit-mask: linear-gradient(to right, #000 0 30%, transparent 30% 70%, #000 70% 100%);
        }
        .gp-crosshair::after {
          bottom: 0;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
          width: 2px;
          mask: linear-gradient(to bottom, #000 0 30%, transparent 30% 70%, #000 70% 100%);
          -webkit-mask: linear-gradient(to bottom, #000 0 30%, transparent 30% 70%, #000 70% 100%);
        }
        @keyframes gpVertexPulse {
          0% { box-shadow: 0 0 0 0 rgb(var(--primary-strong-rgb) / 0.45); }
          70% { box-shadow: 0 0 0 10px rgb(var(--primary-strong-rgb) / 0); }
          100% { box-shadow: 0 0 0 0 rgb(var(--primary-strong-rgb) / 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gp-vertex-first span { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default DrawLocationMap;
