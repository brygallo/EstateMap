'use client';

import { MapContainer, TileLayer, Polygon, useMapEvents, useMap, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';

// Fix default marker icon issue with webpack
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Custom icon for user location
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
  onVisiblePropertiesChange
}: {
  properties: any[];
  onVisiblePropertiesChange: (properties: any[]) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      updateVisibleProperties();
    },
    zoomend: () => {
      updateVisibleProperties();
    },
  });

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

interface LeafletMapProps {
  filteredProperties: any[];
  selectedProperty: any;
  userLocation: { lat: number; lng: number } | null;
  onMapReady: (map: any) => void;
  onVisiblePropertiesChange: (properties: any[]) => void;
  onPolygonClick: (property: any) => void;
  hoverTimeoutRef: React.MutableRefObject<any>;
  getPropertyTypeLabel: (type: string) => string;
  getStatusLabel: (status: string) => string;
  center: [number, number];
}

const LeafletMap = ({
  filteredProperties,
  selectedProperty,
  userLocation,
  onMapReady,
  onVisiblePropertiesChange,
  onPolygonClick,
  hoverTimeoutRef,
  getPropertyTypeLabel,
  getStatusLabel,
  center,
}: LeafletMapProps) => {
  return (
    <MapContainer
      center={center}
      zoom={7}
      maxZoom={20}
      className="h-full w-full"
      preferCanvas={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        subdomains={['a','b','c','d']}
        maxZoom={20}
      />
      <MapController onMapReady={onMapReady} />
      <MapBoundsTracker properties={filteredProperties} onVisiblePropertiesChange={onVisiblePropertiesChange} />

      {useMemo(() => {
        const polygons: JSX.Element[] = [];
        const markers: JSX.Element[] = [];

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
          const baseColor = p.status === 'for_sale' ? '#2b8a3e' : p.status === 'for_rent' ? '#1971c2' : '#868e96';

          // If property has polygon, render as polygon
          if (leafletCoordinates) {
            polygons.push(
              <Polygon
                key={`polygon-${p.id || idx}`}
                positions={leafletCoordinates}
                pathOptions={{
                  color: baseColor,
                  fillOpacity: isSelected ? 0.4 : 0.2,
                  weight: isSelected ? 3 : 2,
                  className: 'property-polygon'
                }}
                eventHandlers={{
                  click: () => {
                    console.log('Polygon clicked!', p.title);
                    // Cancel any pending hover timeout
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    onPolygonClick(p);
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
          // If property doesn't have polygon but has lat/lng, render as marker
          else if (p.latitude && p.longitude) {
            // Create custom icon based on property type and status
            const markerIcon = new L.Icon({
              iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${baseColor}" width="32" height="32">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
              `),
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32]
            });

            markers.push(
              <Marker
                key={`marker-${p.id || idx}`}
                position={[p.latitude, p.longitude]}
                icon={markerIcon}
                eventHandlers={{
                  click: () => {
                    console.log('Marker clicked!', p.title);
                    onPolygonClick(p);
                  }
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{p.title || `Propiedad #${p.id}`}</strong>
                    <br />
                    <small className="text-gray-600">
                      {getPropertyTypeLabel(p.property_type)} - {getStatusLabel(p.status)}
                    </small>
                  </div>
                </Popup>
              </Marker>
            );
          }
        });

        return [...polygons, ...markers];
      }, [filteredProperties, selectedProperty, onPolygonClick, hoverTimeoutRef, getPropertyTypeLabel, getStatusLabel])}

      {/* User Location Marker */}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={userLocationIcon}
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
        </Marker>
      )}
    </MapContainer>
  );
};

export default LeafletMap;
