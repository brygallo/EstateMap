'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import maplibregl, { type GeoJSONSource, type Map as MapLibreInstance } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2, LocateFixed, Minus, Plus } from 'lucide-react';
import LayerSwitch, { type MapLayer } from '@/components/map/LayerSwitch';
import MapLegend from '@/components/map/MapLegend';
import { trackEvent } from '@/lib/analytics';
import { isPointInEcuadorBounds } from '@/lib/geo';
import { iconMarkerHtml, priceMarkerHtml, statusColor } from '@/lib/mapMarkers';

type HtmlMarkerRecord = {
  marker: maplibregl.Marker;
  element: HTMLButtonElement;
  signature: string;
};

interface MapLibreMapProps {
  filteredProperties: any[];
  selectedProperty: any;
  userLocation: { lat: number; lng: number } | null;
  userAccuracy?: number | null;
  onMapReady: (map: any) => void;
  onVisiblePropertiesChange: (properties: any[]) => void;
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void;
  onZoomChange?: (zoom: number) => void;
  onPolygonClick: (property: any) => void;
  onLocate: () => void;
  locating: boolean;
  locationBlocked: boolean;
  isRefreshing?: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onResetView?: () => void;
  center: [number, number];
}

const EMPTY_COLLECTION: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const HTML_MARKER_MIN_ZOOM = 10.5;

const getClusterBounds = (cluster: any): [[number, number], [number, number]] | null => {
  const bounds = cluster?.bounds;
  if (!bounds) return null;
  const west = Number(bounds.west);
  const south = Number(bounds.south);
  const east = Number(bounds.east);
  const north = Number(bounds.north);
  if (![west, south, east, north].every(Number.isFinite)) return null;
  if (Math.abs(west - east) < 0.0001 && Math.abs(south - north) < 0.0001) return null;
  if (!isPointInEcuadorBounds(south, west) || !isPointInEcuadorBounds(north, east)) return null;
  return [
    [west, south],
    [east, north],
  ];
};

const clusterPriority = (cluster: any) => {
  const level = String(cluster?.group_level ?? '');
  const count = Number(cluster?.count || 0);
  const hasLabel = typeof cluster?.label === 'string' && cluster.label.trim().length > 0;
  const levelWeight = level === 'country' ? 5000 : level === 'province' ? 4000 : level === 'city' ? 3000 : 1000;
  return levelWeight + (hasLabel ? 500 : 0) + Math.min(count, 999);
};

const getMapPriceLabel = (price: unknown) => {
  const value = Number.parseFloat(String(price));
  if (!Number.isFinite(value) || value <= 0) return 'Consultar';

  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions >= 10 ? Math.round(millions) : millions.toFixed(1).replace(/\.0$/, '')}M`;
  }

  if (value >= 100_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value).toLocaleString('en-US')}`;
};

const getPoint = (property: any): [number, number] | null => {
  const lat = Number(property.latitude);
  const lng = Number(property.longitude);
  if (isPointInEcuadorBounds(lat, lng)) return [lng, lat];

  const polygon = property.polygon;
  const ring = polygon?.coordinates?.[0] || (Array.isArray(polygon) ? polygon.map((p: number[]) => [p[1], p[0]]) : null);
  if (!Array.isArray(ring) || ring.length === 0) return null;

  const totals = ring.reduce(
    (acc: { lng: number; lat: number; count: number }, coord: any) => {
      const lngValue = Number(coord?.[0]);
      const latValue = Number(coord?.[1]);
      if (!isPointInEcuadorBounds(latValue, lngValue)) return acc;
      acc.lng += lngValue;
      acc.lat += latValue;
      acc.count += 1;
      return acc;
    },
    { lng: 0, lat: 0, count: 0 }
  );

  return totals.count > 0 ? [totals.lng / totals.count, totals.lat / totals.count] : null;
};

const getPolygonCoordinates = (property: any): number[][][] | null => {
  const polygon = property?.polygon;
  if (polygon?.coordinates?.[0]) {
    const ring = polygon.coordinates[0].filter((coord: any) =>
      isPointInEcuadorBounds(Number(coord?.[1]), Number(coord?.[0]))
    );
    return ring.length >= 3 ? [ring] : null;
  }
  if (Array.isArray(polygon) && polygon.length >= 3) {
    const ring = polygon
      .map((coord: number[]) => [coord[1], coord[0]])
      .filter((coord: number[]) => isPointInEcuadorBounds(Number(coord?.[1]), Number(coord?.[0])));
    if (ring.length < 3) return null;
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push(first);
    return [ring];
  }
  return null;
};

const buildPointCollection = (properties: any[]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: properties
    .filter((property) => !property?.is_cluster)
    .map((property) => {
      const point = getPoint(property);
      if (!point) return null;
      const status = property.status || 'for_sale';
      const propertyType = property.property_type || 'other';
      const priceLabel = getMapPriceLabel(property.price);
      return {
        type: 'Feature',
        id: property.id,
        geometry: { type: 'Point', coordinates: point },
        properties: {
          id: property.id,
          status,
          property_type: propertyType,
          priceLabel,
        },
      } as GeoJSON.Feature;
    })
    .filter((feature): feature is GeoJSON.Feature => Boolean(feature)),
});

const buildPolygonCollection = (properties: any[]): GeoJSON.FeatureCollection => ({
  type: 'FeatureCollection',
  features: properties
    .filter((property) => !property?.is_cluster)
    .map((property) => {
      const coordinates = getPolygonCoordinates(property);
      if (!coordinates) return null;
      return {
        type: 'Feature',
        id: property.id,
        geometry: { type: 'Polygon', coordinates },
        properties: {
          id: property.id,
          status: property.status || 'for_sale',
        },
      } as GeoJSON.Feature;
    })
    .filter((feature): feature is GeoJSON.Feature => Boolean(feature)),
});

const buildMapStyle = (): maplibregl.StyleSpecification => ({
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

const padBounds = (bounds: maplibregl.LngLatBounds, ratio = 0.75) => {
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const latPad = Math.max((north - south) * ratio, 0.01);
  const lngPad = Math.max((east - west) * ratio, 0.01);
  return {
    west: west - lngPad,
    south: south - latPad,
    east: east + lngPad,
    north: north + latPad,
  };
};

const boundsChangedEnough = (
  previous: { west: number; south: number; east: number; north: number } | null,
  next: { west: number; south: number; east: number; north: number },
  zoom: number,
  previousZoom: number | null
) => {
  if (!previous || previousZoom == null) return true;
  if (Math.abs(zoom - previousZoom) >= 0.25) return true;

  const width = Math.max(previous.east - previous.west, 0.000001);
  const height = Math.max(previous.north - previous.south, 0.000001);
  const movedLng = Math.max(Math.abs(next.west - previous.west), Math.abs(next.east - previous.east));
  const movedLat = Math.max(Math.abs(next.south - previous.south), Math.abs(next.north - previous.north));

  return movedLng / width > 0.18 || movedLat / height > 0.18;
};

export default function MapLibreMap({
  filteredProperties,
  selectedProperty,
  userLocation,
  onMapReady,
  onVisiblePropertiesChange,
  onBoundsChange,
  onZoomChange,
  onPolygonClick,
  onLocate,
  locating,
  locationBlocked,
  isRefreshing = false,
  hasActiveFilters,
  onClearFilters,
  onResetView,
  center,
}: MapLibreMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreInstance | null>(null);
  const propertiesRef = useRef<any[]>(filteredProperties);
  const markerRefs = useRef<Map<string, HtmlMarkerRecord>>(new Map());
  const clusterMarkerRefs = useRef<Map<string, HtmlMarkerRecord>>(new Map());
  const selectedPropertyRef = useRef<any>(selectedProperty);
  const reportedViewportRef = useRef<{
    bounds: { west: number; south: number; east: number; north: number } | null;
    zoom: number | null;
  }>({ bounds: null, zoom: null });
  const [activeLayer, setActiveLayer] = useState<MapLayer>('streets');
  const [loaded, setLoaded] = useState(false);
  const [viewportTick, setViewportTick] = useState(0);

  const backendClusters = useMemo(
    () => filteredProperties.filter((property) => property?.is_cluster),
    [filteredProperties]
  );
  const pointProperties = useMemo(
    () => filteredProperties.filter((property) => !property?.is_cluster),
    [filteredProperties]
  );
  const pointData = useMemo(() => buildPointCollection(pointProperties), [pointProperties]);
  const polygonData = useMemo(() => buildPolygonCollection(pointProperties), [pointProperties]);
  const selectedPointData = useMemo(() => (selectedProperty ? buildPointCollection([selectedProperty]) : EMPTY_COLLECTION), [selectedProperty]);
  const selectedPolygonData = useMemo(() => (selectedProperty ? buildPolygonCollection([selectedProperty]) : EMPTY_COLLECTION), [selectedProperty]);

  const reportViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const paddedBounds = padBounds(bounds);
    const zoom = map.getZoom();
    const shouldReportBounds = boundsChangedEnough(
      reportedViewportRef.current.bounds,
      paddedBounds,
      zoom,
      reportedViewportRef.current.zoom
    );

    if (shouldReportBounds) {
      reportedViewportRef.current = { bounds: paddedBounds, zoom };
      onBoundsChange?.(paddedBounds);
    }
    onZoomChange?.(zoom);
    setViewportTick((current) => current + 1);
  }, [onBoundsChange, onZoomChange]);

  const zoomBy = useCallback((delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({
      zoom: map.getZoom() + delta,
      duration: 180,
      easing: (t) => 1 - Math.pow(1 - t, 2),
    });
  }, []);

  useEffect(() => {
    propertiesRef.current = filteredProperties;
  }, [filteredProperties]);

  useEffect(() => {
    selectedPropertyRef.current = selectedProperty;
  }, [selectedProperty]);

  const clearHtmlMarkers = useCallback(() => {
    markerRefs.current.forEach((record) => record.marker.remove());
    markerRefs.current.clear();
  }, []);

  const clearHtmlClusters = useCallback(() => {
    clusterMarkerRefs.current.forEach((record) => record.marker.remove());
    clusterMarkerRefs.current.clear();
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildMapStyle(),
      center: [center[1], center[0]],
      zoom: 7,
      maxZoom: 21,
      attributionControl: false,
      fadeDuration: 0,
      renderWorldCopies: false,
      refreshExpiredTiles: false,
    });
    mapRef.current = map;
    if (typeof window !== 'undefined') {
      (window as any)._main_map_ref = map;
    }

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      map.addSource('properties', {
        type: 'geojson',
        data: EMPTY_COLLECTION,
        cluster: false,
      });
      map.addSource('property-polygons', { type: 'geojson', data: EMPTY_COLLECTION });
      map.addSource('selected-property', { type: 'geojson', data: EMPTY_COLLECTION });
      map.addSource('selected-polygon', { type: 'geojson', data: EMPTY_COLLECTION });
      map.addSource('user-location', { type: 'geojson', data: EMPTY_COLLECTION });

      map.addLayer({
        id: 'property-polygons-fill',
        type: 'fill',
        source: 'property-polygons',
        minzoom: 14,
        paint: {
          'fill-color': ['match', ['get', 'status'], 'for_rent', statusColor('for_rent'), 'inactive', '#64748B', statusColor('for_sale')],
          'fill-opacity': 0.18,
        },
      });
      map.addLayer({
        id: 'property-polygons-line',
        type: 'line',
        source: 'property-polygons',
        minzoom: 14,
        paint: {
          'line-color': ['match', ['get', 'status'], 'for_rent', statusColor('for_rent'), 'inactive', '#64748B', statusColor('for_sale')],
          'line-width': 2,
          'line-opacity': 0.85,
        },
      });
      map.addLayer({
        id: 'property-clusters',
        type: 'circle',
        source: 'properties',
        maxzoom: HTML_MARKER_MIN_ZOOM,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#496D9C', 25, '#2D3C67', 100, '#172554'],
          'circle-radius': ['step', ['get', 'point_count'], 21, 25, 26, 100, 32],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0,
          'circle-stroke-opacity': 0,
        },
      });
      map.addLayer({
        id: 'property-cluster-count',
        type: 'symbol',
        source: 'properties',
        maxzoom: HTML_MARKER_MIN_ZOOM,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 13,
          'text-font': ['Noto Sans Regular'],
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff', 'text-opacity': 0 },
      });
      map.addLayer({
        id: 'property-points',
        type: 'circle',
        source: 'properties',
        maxzoom: HTML_MARKER_MIN_ZOOM + 0.5,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['match', ['get', 'status'], 'for_rent', statusColor('for_rent'), 'inactive', '#64748B', statusColor('for_sale')],
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 5, 12, 7, 16, 9],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], HTML_MARKER_MIN_ZOOM - 0.3, 1, HTML_MARKER_MIN_ZOOM + 0.4, 0],
        },
      });
      map.addLayer({
        id: 'selected-polygon-fill',
        type: 'fill',
        source: 'selected-polygon',
        paint: { 'fill-color': '#496D9C', 'fill-opacity': 0.34 },
      });
      map.addLayer({
        id: 'selected-polygon-line',
        type: 'line',
        source: 'selected-polygon',
        paint: { 'line-color': '#2D3C67', 'line-width': 3 },
      });
      map.addLayer({
        id: 'selected-point',
        type: 'circle',
        source: 'selected-property',
        paint: {
          'circle-color': '#2D3C67',
          'circle-radius': 10,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
      });
      map.addLayer({
        id: 'user-location-accuracy',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': 28,
          'circle-color': '#3e97ff',
          'circle-opacity': 0.14,
          'circle-stroke-width': 0,
        },
      });
      map.addLayer({
        id: 'user-location-dot',
        type: 'circle',
        source: 'user-location',
        paint: {
          'circle-radius': 7,
          'circle-color': '#1a73e8',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
      });

      setLoaded(true);
      onMapReady(map);
      reportViewport();
    });

    map.on('moveend', reportViewport);
    map.on('zoomend', reportViewport);

    const clickCluster = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: ['property-clusters'] })[0];
      const clusterId = Number(feature?.properties?.cluster_id);
      const coordinates = (feature?.geometry as any)?.coordinates as [number, number] | undefined;
      const source = map.getSource('properties') as GeoJSONSource | undefined;
      if (!source || !coordinates || !Number.isFinite(clusterId)) return;

      source.getClusterExpansionZoom(clusterId).then((zoom) => {
        map.easeTo({
          center: coordinates,
          zoom: Math.min(Math.max(zoom, 12), 15),
          duration: 480,
          easing: (t) => 1 - Math.pow(1 - t, 3),
        });
      });
    };

    map.on('click', 'property-clusters', clickCluster);
    map.on('mouseenter', 'property-clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'property-clusters', () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      clearHtmlMarkers();
      clearHtmlClusters();
      if (typeof window !== 'undefined' && (window as any)._main_map_ref === map) {
        delete (window as any)._main_map_ref;
      }
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearHtmlClusters, clearHtmlMarkers]);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    (mapRef.current.getSource('properties') as GeoJSONSource | undefined)?.setData(pointData);
    (mapRef.current.getSource('property-polygons') as GeoJSONSource | undefined)?.setData(polygonData);
    onVisiblePropertiesChange(pointProperties);
  }, [loaded, onVisiblePropertiesChange, pointData, pointProperties, polygonData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;

    if (backendClusters.length === 0) {
      clearHtmlClusters();
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (!mapRef.current) return;

      const nextKeys = new Set<string>();
      const occupied: Array<{ x: number; y: number; radius: number; priority: number }> = [];
      const visibleClusters = backendClusters
        .map((cluster) => {
          const lat = Number(cluster.latitude);
          const lng = Number(cluster.longitude);
          if (!Number(cluster.count || 0) || !isPointInEcuadorBounds(lat, lng)) return null;
          const point = map.project([lng, lat]);
          const level = String(cluster.group_level ?? '');
          const radius = level === 'city' || level === 'province' || level === 'country' ? 50 : 42;
          return {
            cluster,
            point,
            radius,
            priority: clusterPriority(cluster),
          };
        })
        .filter((item): item is { cluster: any; point: maplibregl.Point; radius: number; priority: number } => Boolean(item))
        .sort((a, b) => b.priority - a.priority)
        .filter((item) => {
          const overlaps = occupied.some((used) => {
            const dx = item.point.x - used.x;
            const dy = item.point.y - used.y;
            return Math.sqrt(dx * dx + dy * dy) < Math.min(item.radius, used.radius);
          });
          if (overlaps) return false;
          occupied.push({ x: item.point.x, y: item.point.y, radius: item.radius, priority: item.priority });
          return true;
        })
        .map((item) => item.cluster);

      visibleClusters.forEach((cluster) => {
        const count = Number(cluster.count || 0);
        const lat = Number(cluster.latitude);
        const lng = Number(cluster.longitude);
        const focusLat = Number(cluster.focus_latitude ?? cluster.latitude);
        const focusLng = Number(cluster.focus_longitude ?? cluster.longitude);
        if (!count || !isPointInEcuadorBounds(lat, lng)) return;

        const key = String(cluster.id);
        const coordinates: [number, number] = [lng, lat];
        const focusCoordinates: [number, number] = isPointInEcuadorBounds(focusLat, focusLng)
          ? [focusLng, focusLat]
          : coordinates;
        const sizeClass = count >= 100 ? 'maplibre-cluster-large' : count >= 25 ? 'maplibre-cluster-medium' : '';
        const label = typeof cluster.label === 'string' ? cluster.label.trim() : '';
        const shortLabel = label.length > 16 ? `${label.slice(0, 15)}…` : label;
        const signature = `${count}:${sizeClass}:${shortLabel}`;
        nextKeys.add(key);

        let record = clusterMarkerRefs.current.get(key);
        if (!record) {
          const element = document.createElement('button');
          element.type = 'button';
          element.className = 'maplibre-cluster-marker';
          const marker = new maplibregl.Marker({ element, anchor: 'center' }).setLngLat(coordinates).addTo(map);
          record = { marker, element, signature: '' };
          clusterMarkerRefs.current.set(key, record);
        }

        record.element.setAttribute('aria-label', `${count} propiedades`);
        record.element.style.zIndex = label ? String(2000 + Math.min(count, 999)) : String(100 + Math.min(count, 899));
        if (record.signature !== signature) {
          record.element.innerHTML = `
            <span class="maplibre-cluster ${sizeClass}">
              <strong>${count}</strong>
              ${shortLabel ? `<em>${shortLabel}</em>` : ''}
            </span>
          `;
          record.signature = signature;
        }
        record.marker.setLngLat(coordinates);
        record.element.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          const targetZoom = Math.min(Math.max(Number(cluster.expansion_zoom) || map.getZoom() + 2, 11), 15);
          trackEvent('map_backend_cluster_clicked', {
            group_level: cluster.group_level ?? null,
            count,
            label: label || null,
            target_zoom: targetZoom,
          });
          const clusterBounds = getClusterBounds(cluster);
          const groupLevel = String(cluster.group_level ?? '');
          const shouldUseExactStep = groupLevel === 'country' || groupLevel === 'province' || groupLevel === 'city';
          if (!shouldUseExactStep && clusterBounds) {
            map.fitBounds(clusterBounds, {
              padding: 92,
              maxZoom: targetZoom,
              duration: 680,
              easing: (t) => 1 - Math.pow(1 - t, 3),
            });
            return;
          }
          map.easeTo({
            center: focusCoordinates,
            zoom: targetZoom,
            duration: 620,
            easing: (t) => 1 - Math.pow(1 - t, 3),
          });
        };
      });

      clusterMarkerRefs.current.forEach((record, key) => {
        if (nextKeys.has(key)) return;
        record.marker.remove();
        clusterMarkerRefs.current.delete(key);
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [backendClusters, clearHtmlClusters, loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;

    const zoom = map.getZoom();
    if (zoom < HTML_MARKER_MIN_ZOOM) {
      clearHtmlMarkers();
      return;
    }

    const bounds = padBounds(map.getBounds(), 0.28);
    const maxMarkers = zoom >= 16 ? 320 : zoom >= 14 ? 220 : 130;
    const minDistance = zoom >= 16 ? 0.00045 : zoom >= 14 ? 0.0011 : 0.0028;
    const selectedId = selectedPropertyRef.current?.id;
    const usedPositions: [number, number][] = [];
    const nextKeys = new Set<string>();
    let renderedCount = 0;

    const frame = window.requestAnimationFrame(() => {
      pointProperties
        .map((property) => {
          const point = getPoint(property);
          if (!point) return null;
          const [lng, lat] = point;
          if (lng < bounds.west || lng > bounds.east || lat < bounds.south || lat > bounds.north) return null;
          const priceValue = Number.parseFloat(String(property.price)) || 0;
          return {
            property,
            point,
            priority: (property.id === selectedId ? 1_000_000_000 : 0) + priceValue,
          };
        })
        .filter((item): item is { property: any; point: [number, number]; priority: number } => Boolean(item))
        .sort((a, b) => b.priority - a.priority)
        .forEach(({ property, point }) => {
          const isSelected = property.id === selectedId;
          if (!isSelected && renderedCount >= maxMarkers) return;
          if (
            !isSelected &&
            usedPositions.some(([lng, lat]) => Math.abs(lat - point[1]) < minDistance && Math.abs(lng - point[0]) < minDistance)
          ) {
            return;
          }

          usedPositions.push(point);
          renderedCount += 1;

          const key = String(property.id);
          const useIcon = zoom < 12 && !isSelected;
          const signature = `${property.status}:${property.property_type}:${property.price}:${isSelected}:${useIcon ? 'icon' : 'price'}`;
          nextKeys.add(key);

          let record = markerRefs.current.get(key);
          if (!record) {
            const element = document.createElement('button');
            element.type = 'button';
            element.className = 'maplibre-price-marker maplibre-marker-enter';
            const marker = new maplibregl.Marker({ element, anchor: 'bottom' }).setLngLat(point).addTo(map);
            record = { marker, element, signature: '' };
            markerRefs.current.set(key, record);
            window.setTimeout(() => element.classList.remove('maplibre-marker-enter'), 160);
          }

          record.element.setAttribute('aria-label', `Ver propiedad ${property.id}`);
          if (record.signature !== signature) {
            record.element.innerHTML = useIcon
              ? iconMarkerHtml({
                  status: property.status,
                  type: property.property_type,
                  selected: false,
                })
              : priceMarkerHtml({
                  status: property.status,
                  type: property.property_type,
                  price: getMapPriceLabel(property.price),
                  selected: isSelected,
                });
            record.signature = signature;
          }
          record.element.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            onPolygonClick(property);
          };
          record.marker.setLngLat(point);
        });

      markerRefs.current.forEach((record, key) => {
        if (nextKeys.has(key)) return;
        record.element.classList.add('maplibre-marker-exit');
        window.setTimeout(() => record.marker.remove(), 120);
        markerRefs.current.delete(key);
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [clearHtmlMarkers, pointProperties, loaded, onPolygonClick, selectedProperty, viewportTick]);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    (mapRef.current.getSource('selected-property') as GeoJSONSource | undefined)?.setData(selectedPointData);
    (mapRef.current.getSource('selected-polygon') as GeoJSONSource | undefined)?.setData(selectedPolygonData);
  }, [loaded, selectedPointData, selectedPolygonData]);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    const data: GeoJSON.FeatureCollection = userLocation
      ? {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [userLocation.lng, userLocation.lat] },
              properties: {},
            },
          ],
        }
      : EMPTY_COLLECTION;
    (mapRef.current.getSource('user-location') as GeoJSONSource | undefined)?.setData(data);
  }, [loaded, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    map.setLayoutProperty('carto-base', 'visibility', activeLayer === 'streets' ? 'visible' : 'none');
    map.setLayoutProperty('esri-base', 'visibility', activeLayer === 'satellite' ? 'visible' : 'none');
  }, [activeLayer, loaded]);

  return (
    <div className="relative h-full w-full">
      {isRefreshing && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-mapcontrol h-1 overflow-hidden bg-white/45">
          <div className="maplibre-refresh-bar h-full w-1/2" />
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />

      <LayerSwitch active={activeLayer} onToggle={() => setActiveLayer((prev) => (prev === 'satellite' ? 'streets' : 'satellite'))} />
      <MapLegend />

      <div className="absolute bottom-6 right-3 z-mapcontrol flex flex-col-reverse gap-2.5">
        <div className="flex flex-col overflow-hidden rounded-lg bg-surface shadow-cardHover ring-1 ring-black/5">
          <button type="button" onClick={() => zoomBy(1)} aria-label="Acercar" className="flex h-10 w-10 items-center justify-center text-textPrimary transition-colors hover:bg-muted">
            <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
          <span className="mx-2 block h-px bg-line" aria-hidden />
          <button type="button" onClick={() => zoomBy(-1)} aria-label="Alejar" className="flex h-10 w-10 items-center justify-center text-textPrimary transition-colors hover:bg-muted">
            <Minus className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={onLocate}
          disabled={locating}
          aria-label="Ir a mi ubicación"
          title={locationBlocked ? 'Ubicación desactivada - tócalo para reintentar' : 'Ir a mi ubicación'}
          className={`flex h-10 w-10 items-center justify-center rounded-lg bg-surface shadow-cardHover ring-1 ring-black/5 transition-colors hover:bg-muted disabled:cursor-not-allowed ${
            locationBlocked ? 'text-error' : 'text-textPrimary'
          }`}
        >
          {locating ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} aria-hidden /> : <LocateFixed className="h-5 w-5" strokeWidth={2} aria-hidden />}
        </button>
      </div>

      {filteredProperties.length === 0 && !isRefreshing && (
        <div className="pointer-events-none absolute inset-x-4 top-20 z-mapcontrol mx-auto max-w-xs">
          <div className="map-empty-state rounded-card border border-line bg-white/95 p-3 text-center shadow-cardHover backdrop-blur">
            <p className="text-sm font-semibold text-textPrimary">
              {hasActiveFilters ? 'No hay propiedades con estos filtros' : 'No hay propiedades en esta vista'}
            </p>
            <p className="mt-1 text-xs text-textSecondary">
              {hasActiveFilters ? 'Limpia filtros o aleja el mapa para ampliar resultados.' : 'Aleja el mapa o vuelve a la vista general.'}
            </p>
            <div className="pointer-events-auto mt-3 flex justify-center gap-2">
              {hasActiveFilters && onClearFilters && (
                <button type="button" onClick={onClearFilters} className="rounded-button border border-line bg-white px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-muted">
                  Limpiar filtros
                </button>
              )}
              {onResetView && (
                <button type="button" onClick={onResetView} className="rounded-button bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primaryHover">
                  Ver Ecuador
                </button>
              )}
              <Link
                href="/publicar-propiedad"
                onClick={() =>
                  trackEvent('map_empty_state_action_clicked', {
                    action: 'publish_property',
                    source: 'map_overlay',
                    has_active_filters: Boolean(hasActiveFilters),
                  })
                }
                className="rounded-button border border-line bg-white px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-muted"
              >
                Publicar aquí
              </Link>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .maplibregl-canvas { outline: none; }
        .maplibregl-marker {
          overflow: visible;
        }
        .maplibre-cluster-marker {
          background: transparent;
          border: 0;
          contain: layout style;
          cursor: pointer;
          overflow: visible;
          padding: 0;
          position: absolute;
          transition: none;
        }
        .maplibre-cluster-marker::before {
          background: rgba(15, 23, 42, 0.22);
          border-radius: 999px;
          bottom: -3px;
          content: '';
          height: 10px;
          left: 50%;
          position: absolute;
          transform: translateX(-50%);
          width: 42px;
          filter: blur(6px);
        }
        .maplibre-cluster {
          align-items: center;
          background: radial-gradient(circle at 35% 28%, #688CCA 0%, #496D9C 48%, #2D3C67 100%);
          border: 2px solid #ffffff;
          border-radius: 999px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 2px 5px rgba(15, 23, 42, 0.16);
          color: #ffffff;
          display: flex;
          flex-direction: column;
          font-family: var(--font-geist-mono), ui-monospace, 'SFMono-Regular', monospace;
          font-variant-numeric: tabular-nums;
          height: 54px;
          justify-content: center;
          line-height: 1;
          min-width: 50px;
          padding: 0 12px;
          position: relative;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
          transition: box-shadow 90ms ease;
          white-space: nowrap;
        }
        .maplibre-cluster-marker:hover .maplibre-cluster {
          box-shadow: 0 0 0 3px rgba(73, 109, 156, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 3px 7px rgba(15, 23, 42, 0.18);
        }
        .maplibre-cluster strong {
          font-size: 16px;
          font-weight: 900;
        }
        .maplibre-cluster em {
          display: block;
          font-family: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
          font-size: 9px;
          font-style: normal;
          font-weight: 800;
          letter-spacing: 0;
          line-height: 1;
          margin-top: 3px;
          max-width: 76px;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.24);
          white-space: nowrap;
        }
        .maplibre-cluster-medium {
          min-width: 56px;
        }
        .maplibre-cluster-large {
          min-width: 64px;
        }
        .maplibre-price-marker {
          background: transparent;
          border: 0;
          contain: layout style;
          cursor: pointer;
          height: 48px;
          overflow: visible;
          padding: 0;
          transition: opacity 140ms ease, transform 180ms cubic-bezier(0.2, 0, 0, 1);
          width: 112px;
        }
        .maplibre-price-marker:focus-visible {
          outline: none;
        }
        .maplibre-price-marker .gp-marker {
          transition: filter 90ms ease;
        }
        .maplibre-price-marker .gp-marker-selected::before {
          animation: selectedMarkerPulse 1.8s ease-out infinite;
          background: rgba(73, 109, 156, 0.18);
          border-radius: 999px;
          bottom: 8px;
          content: '';
          height: 34px;
          left: 50%;
          pointer-events: none;
          position: absolute;
          transform: translateX(-50%);
          width: 100px;
          z-index: -1;
        }
        .maplibre-marker-enter .gp-marker {
          animation: mapMarkerContentIn 180ms cubic-bezier(0.2, 0, 0, 1) both;
        }
        .maplibre-marker-exit {
          opacity: 1;
          pointer-events: none;
        }
        .maplibre-price-marker:hover .gp-marker {
          filter: saturate(1.04);
        }
        .maplibre-refresh-bar {
          background: linear-gradient(90deg, transparent, rgba(73, 109, 156, 0.95), transparent);
          animation: mapRefreshSlide 0.95s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          transform-origin: left center;
        }
        @keyframes mapRefreshSlide {
          0% { transform: translateX(-110%) scaleX(0.45); }
          50% { transform: translateX(55%) scaleX(0.8); }
          100% { transform: translateX(220%) scaleX(0.45); }
        }
        @keyframes mapMarkerContentIn {
          from {
            opacity: 0;
            transform: translateY(3px) scale(0.96);
            filter: saturate(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: saturate(1);
          }
        }
        @keyframes selectedMarkerPulse {
          0% { opacity: 0.78; transform: translateX(-50%) scale(0.86); }
          70% { opacity: 0; transform: translateX(-50%) scale(1.22); }
          100% { opacity: 0; transform: translateX(-50%) scale(1.22); }
        }
        @media (prefers-reduced-motion: reduce) {
          .maplibre-cluster-marker,
          .maplibre-price-marker,
          .maplibre-refresh-bar {
            animation-duration: 1ms !important;
            transition-duration: 1ms !important;
          }
        }
      `}</style>
    </div>
  );
}
