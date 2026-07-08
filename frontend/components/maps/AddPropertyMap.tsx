'use client';

import { MapContainer, TileLayer, Marker, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useMemo } from 'react';

import { userLocationIcon, defaultCenter } from './add-property/leaflet-setup';
import { MapRefBinder } from './add-property/MapRefBinder';
import { AutoLayerSwitch } from './add-property/AutoLayerSwitch';
import { DrawingTools } from './add-property/DrawingTools';
import { PointLocationPicker } from './add-property/PointLocationPicker';
import { ScaleBottomLeft } from './add-property/ScaleBottomLeft';
import { FlyToLocation } from './add-property/FlyToLocation';
import { LocationSearch } from './add-property/LocationSearch';

interface AddPropertyMapProps {
  onMapReady: (map: any) => void;
  onPolygonChange: (coords: any[]) => void;
  onLocationChange?: (coords: { lat: number; lng: number }) => void;
  onAreaChange?: (area: number) => void;
  initialPolygon?: any[];
  selectedLocation?: { lat: number; lng: number } | null;
  locationMode?: 'point' | 'polygon';
  userCenter?: [number, number];
  userZoom?: number;
  userLocation?: { lat: number; lng: number } | null;
  showMeasurements?: boolean;
  referenceProperties?: any[];
}

const AddPropertyMap = ({
  onMapReady,
  onPolygonChange,
  onLocationChange,
  onAreaChange,
  initialPolygon,
  selectedLocation,
  locationMode = 'polygon',
  userCenter,
  userZoom,
  userLocation,
  showMeasurements = true,
  referenceProperties = [],
}: AddPropertyMapProps) => {
  const [activeLayer, setActiveLayer] = useState('streets'); // Default to streets layer
  const [preferredLayer, setPreferredLayer] = useState('streets'); // Remember user's selection

  const handleLayerSelect = (layer: string) => {
    setPreferredLayer(layer);
    setActiveLayer(layer);
  };

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
          border-color: #496D9C !important;
          background: white !important;
        }
        .distance-input:focus {
          border-color: #496D9C !important;
          background: white !important;
          box-shadow: 0 0 0 2px rgba(73, 109, 156, 0.2) !important;
        }
        .distance-input::-webkit-inner-spin-button,
        .distance-input::-webkit-outer-spin-button {
          opacity: 1;
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
        {/* Render active layer */}
        {activeLayer === 'streets' && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            subdomains={['a', 'b', 'c', 'd']}
            maxZoom={20}
          />
        )}
        {activeLayer === 'satellite' && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            maxZoom={18}
          />
        )}
        {activeLayer === 'osm' && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={19}
          />
        )}

        {/* Custom Layer Control - Compact for mobile */}
        <div className="absolute right-2 top-16 z-mapcontrol sm:right-3 sm:top-10">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ minWidth: '140px' }}>
            <button
              type="button"
              onClick={() => handleLayerSelect('streets')}
              className={`block w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                activeLayer === 'streets' ? 'bg-gray-100 font-semibold' : ''
              }`}
            >
              <span className="inline-block w-5">🗺️</span>
              <span className="hidden sm:inline">Calles (20)</span>
              <span className="sm:hidden">Calles</span>
            </button>
            <button
              type="button"
              onClick={() => handleLayerSelect('satellite')}
              className={`block w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                activeLayer === 'satellite' ? 'bg-gray-100 font-semibold' : ''
              }`}
            >
              <span className="inline-block w-5">🛰️</span>
              <span className="hidden sm:inline">Satélite (18)</span>
              <span className="sm:hidden">Satélite</span>
            </button>
            <button
              type="button"
              onClick={() => handleLayerSelect('osm')}
              className={`block w-full px-3 sm:px-4 py-2 text-left text-xs sm:text-sm hover:bg-gray-50 transition-colors ${
                activeLayer === 'osm' ? 'bg-gray-100 font-semibold' : ''
              }`}
            >
              <span className="inline-block w-5">🌐</span>
              <span className="hidden sm:inline">OSM (19)</span>
              <span className="sm:hidden">OSM</span>
            </button>
          </div>
        </div>

        <AutoLayerSwitch
          activeLayer={activeLayer}
          preferredLayer={preferredLayer}
          setActiveLayer={setActiveLayer}
        />
        <MapRefBinder onMapReady={onMapReady} />
        <ScaleBottomLeft />
        {locationMode === 'polygon' ? (
          <DrawingTools
            onPolygonChange={onPolygonChange}
            onAreaChange={onAreaChange}
            initialPolygon={initialPolygon}
            showMeasurements={showMeasurements}
          />
        ) : (
          <PointLocationPicker
            selectedLocation={selectedLocation}
            onLocationChange={onLocationChange}
          />
        )}
        <LocationSearch onLocationChange={onLocationChange} />

        {/* Reference properties - shown in gray as visual reference */}
        {useMemo(() => {
          const references = Array.isArray(referenceProperties) ? referenceProperties : [];
          if (references.length === 0) return null;

          return references.map((property, idx) => {
            // Handle both GeoJSON and simple array formats for properties with polygons
            let leafletCoordinates;

            if (property.polygon?.coordinates?.[0]) {
              // GeoJSON format: convert [lng, lat] to [lat, lng]
              leafletCoordinates = property.polygon.coordinates[0].map((coord: any) => [coord[1], coord[0]]);
            } else if (Array.isArray(property.polygon) && property.polygon.length >= 3) {
              // Simple array format: already [lat, lng]
              leafletCoordinates = property.polygon;
            }

            // Only render properties with polygons
            if (!leafletCoordinates || leafletCoordinates.length < 3) {
              return null;
            }

            return (
              <Polygon
                key={`reference-polygon-${property.id || idx}`}
                positions={leafletCoordinates}
                pathOptions={{
                  color: '#496D9C',
                  fillColor: '#E3EAF4',
                  fillOpacity: 0.18,
                  weight: 1.5,
                  interactive: false,
                  className: 'reference-property-polygon',
                }}
              />
            );
          });
        }, [referenceProperties])}

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon} />
        )}
        {userCenter && userZoom && <FlyToLocation center={userCenter} zoom={userZoom} />}
      </MapContainer>
    </>
  );
};

export default AddPropertyMap;
