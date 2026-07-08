'use client';

import { MapContainer, TileLayer, Popup, ScaleControl, Circle, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import * as turf from '@turf/turf';
import LayerSwitch, { type MapLayer } from '@/components/map/LayerSwitch';
import MapControls from '@/components/map/MapControls';
import MapLegend from '@/components/map/MapLegend';

import './leaflet-icon-fix';
import { MAP_STYLES } from './leaflet/mapStyles';
import { MapController } from './leaflet/MapController';
import { MapBoundsTracker } from './leaflet/MapBoundsTracker';
import { MapZoomTracker } from './leaflet/MapZoomTracker';
import { MapEmptyState } from './leaflet/MapEmptyState';
import { LocationSearch } from './leaflet/LocationSearch';
import { buildPropertyLayers } from './leaflet/buildPropertyLayers';

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
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onResetView?: () => void;
  hoverTimeoutRef: React.MutableRefObject<any>;
  getPropertyTypeLabel: (type: string) => string;
  getStatusLabel: (status: string) => string;
  center: [number, number];
}

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
  hasActiveFilters,
  onClearFilters,
  onResetView,
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
      <style>{MAP_STYLES}</style>
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
      <MapEmptyState
        hasProperties={filteredProperties.length > 0}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
        onResetView={onResetView}
      />

      {useMemo(
        () =>
          buildPropertyLayers({
            filteredProperties,
            selectedProperty,
            mapZoom,
            onPolygonClick,
            hoverTimeoutRef,
            addEdgeLabels,
            polygonLayersRef,
            mapInstanceRef,
          }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filteredProperties, selectedProperty, mapZoom, onPolygonClick, hoverTimeoutRef, addEdgeLabels, getPropertyTypeLabel, getStatusLabel]
      )}

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
