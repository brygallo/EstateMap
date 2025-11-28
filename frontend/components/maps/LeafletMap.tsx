'use client';

import { MapContainer, TileLayer, Polygon, useMapEvents, useMap, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import L from 'leaflet';
import * as turf from '@turf/turf';

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

// Component to automatically switch map layers based on zoom level
function AutoLayerSwitch({ activeLayer, setActiveLayer }: { activeLayer: string; setActiveLayer: (layer: string) => void }) {
  const map = useMap();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const handleZoomEnd = () => {
      const currentZoom = map.getZoom();

      // Layer max zoom levels
      const layerLimits: { [key: string]: number } = {
        'satellite': 18,
        'streets': 20,
        'osm': 19
      };

      const currentLimit = layerLimits[activeLayer];

      // If current zoom exceeds current layer's max zoom, switch to a layer that supports it
      if (currentZoom > currentLimit) {
        // Find a layer that supports this zoom level
        const availableLayers = Object.entries(layerLimits)
          .filter(([_, maxZoom]) => maxZoom >= currentZoom)
          .sort((a, b) => b[1] - a[1]); // Sort by max zoom descending

        if (availableLayers.length > 0) {
          const [newLayer] = availableLayers[0];
          setActiveLayer(newLayer);

          // Show toast notification
          const layerNames: { [key: string]: string } = {
            'satellite': 'Vista Satelital',
            'streets': 'Mapa de Calles',
            'osm': 'OpenStreetMap'
          };

          setToastMessage(`Cambiado a ${layerNames[newLayer]} (soporta zoom ${layerLimits[newLayer]})`);
          setShowToast(true);

          setTimeout(() => {
            setShowToast(false);
          }, 3000);
        }
      }
    };

    map.on('zoomend', handleZoomEnd);

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, activeLayer, setActiveLayer]);

  return (
    <>
      {showToast && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          {toastMessage}
        </div>
      )}
    </>
  );
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

// Search box over the map (Nominatim)
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
    <div className="pointer-events-none absolute top-4 sm:top-4 left-1/2 -translate-x-1/2 z-[1000] w-[85%] sm:w-[70%] max-w-lg px-3">
      <div className="pointer-events-auto relative w-full">
        <form onSubmit={handleSearch} className="w-full">
          <div className="relative shadow-lg rounded-xl overflow-hidden bg-white">
            <input
              type="search"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Buscar ciudad, referencia..."
              className="w-full px-3 sm:px-4 py-2 pr-10 text-xs sm:text-sm text-gray-800 outline-none"
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

interface LeafletMapProps {
  filteredProperties: any[];
  selectedProperty: any;
  userLocation: { lat: number; lng: number } | null;
  onMapReady: (map: any) => void;
  onVisiblePropertiesChange: (properties: any[]) => void;
  onPolygonClick: (property: any) => void;
  onPriceLabelClick?: (property: any) => void;
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
  onPriceLabelClick,
  hoverTimeoutRef,
  getPropertyTypeLabel,
  getStatusLabel,
  center,
}: LeafletMapProps) => {
  const polygonLayersRef = useRef<Record<string, any>>({});
  const [activeLayer, setActiveLayer] = useState('streets'); // Default to streets layer

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
        maxZoom={20}
        className="h-full w-full relative"
        preferCanvas={true}
      >
      {/* Render active layer */}
      {activeLayer === 'streets' && (
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains={['a','b','c','d']}
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
      <div className="absolute top-16 sm:top-10 right-2 sm:right-3 z-[900]">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden" style={{ minWidth: '140px' }}>
          <button
            type="button"
            onClick={() => setActiveLayer('streets')}
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
            onClick={() => setActiveLayer('satellite')}
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
            onClick={() => setActiveLayer('osm')}
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

      <AutoLayerSwitch activeLayer={activeLayer} setActiveLayer={setActiveLayer} />
      <LocationSearch />
      <MapController onMapReady={onMapReady} />
      <MapBoundsTracker properties={filteredProperties} onVisiblePropertiesChange={onVisiblePropertiesChange} />

      {useMemo(() => {
        const polygons: JSX.Element[] = [];
        const markers: JSX.Element[] = [];
        const priceLabels: JSX.Element[] = [];

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

          // Format price
          const formattedPrice = p.price ? `$${parseFloat(p.price).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : 'N/A';

          // Create price label icon
          const priceIconColor = p.status === 'for_sale' ? 'linear-gradient(135deg, #2b8a3e, #37b24d)' : p.status === 'for_rent' ? 'linear-gradient(135deg, #1971c2, #1c7ed6)' : 'linear-gradient(135deg, #495057, #868e96)';

          const priceLabelIcon = new L.DivIcon({
            className: 'price-label-icon',
            html: `
              <div class="price-label-container" style="
                position: relative;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <div class="price-label-badge" style="
                  background: ${priceIconColor};
                  color: white;
                  padding: 4px 8px;
                  border-radius: 12px;
                  font-weight: 700;
                  font-size: 11px;
                  white-space: nowrap;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                  border: 1.5px solid white;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  letter-spacing: 0.2px;
                  cursor: pointer;
                  transition: transform 0.2s, box-shadow 0.2s;
                "
                onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.35)';"
                onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.25)';"
                >
                  ${formattedPrice}
                </div>
              </div>
            `,
            iconSize: [1, 1],
            iconAnchor: [0, 0]
          });

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

          // If property has polygon, render as polygon
          if (leafletCoordinates) {
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
                    console.log('Polygon clicked!', p.title);
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

          // Add price label marker for all properties
          if (labelPosition && p.price) {
            priceLabels.push(
              <Marker
                key={`price-label-${p.id || idx}`}
                position={labelPosition}
                icon={priceLabelIcon}
                zIndexOffset={500}
                interactive={true}
                bubblingMouseEvents={false}
                eventHandlers={{
                  click: (e) => {
                    console.log('Price label clicked!', p.title);
                    // Stop event propagation to prevent polygon click
                    L.DomEvent.stopPropagation(e.originalEvent);
                    // Cancel any pending hover timeout
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    (onPriceLabelClick || onPolygonClick)(p);
                  },
                  mouseover: () => {
                    // Cancel any pending hover timeout from polygon
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                  }
                }}
              />
            );
          }
        });

        return [...polygons, ...markers, ...priceLabels];
      }, [filteredProperties, selectedProperty, onPolygonClick, onPriceLabelClick, hoverTimeoutRef, getPropertyTypeLabel, getStatusLabel, addEdgeLabels])}

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
    </>
  );
};

export default LeafletMap;
