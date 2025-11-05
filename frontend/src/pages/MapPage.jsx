import { MapContainer, TileLayer, Polygon, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

// Component to track map bounds and filter visible properties
function MapBoundsTracker({ properties, onVisiblePropertiesChange }) {
  const map = useMapEvents({
    moveend: () => {
      updateVisibleProperties();
    },
    zoomend: () => {
      updateVisibleProperties();
    },
  });

  const updateVisibleProperties = () => {
    const bounds = map.getBounds();
    const visible = properties.filter((property) => {
      if (!property.polygon || property.polygon.length < 3) return false;

      // Check if any point of the polygon is within the map bounds
      return property.polygon.some((point) => {
        const [lat, lng] = point;
        return bounds.contains([lat, lng]);
      });
    });
    onVisiblePropertiesChange(visible);
  };

  // Initial update
  useEffect(() => {
    if (properties.length > 0) {
      updateVisibleProperties();
    }
  }, [properties]);

  return null;
}

const MapPage = () => {
  const { token } = useAuth();
  const [properties, setProperties] = useState([]);
  const [visibleProperties, setVisibleProperties] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const headers = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(`${API_URL}/properties/`, { headers });
        if (res.ok) {
          const data = await res.json();
          setProperties(data);
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
      }
    };
    fetchProperties();
  }, [token, API_URL]);

  const defaultCenter = [-2.311940, -78.124395]; // Macas, Ecuador -2.311940, -78.124395
  const center = properties.length && properties[0].polygon ? properties[0].polygon[0] : defaultCenter;

  // Helper functions
  const getPropertyTypeLabel = (type) => {
    const labels = {
      house: 'Casa',
      land: 'Terreno',
      apartment: 'Apartamento',
      commercial: 'Comercial',
      other: 'Otro'
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status) => {
    const labels = {
      for_sale: 'En Venta',
      for_rent: 'En Alquiler',
      sold: 'Vendido',
      rented: 'Alquilado',
      inactive: 'Inactivo'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      for_sale: 'bg-green-500',
      for_rent: 'bg-blue-500',
      sold: 'bg-gray-500',
      rented: 'bg-purple-500',
      inactive: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="grid grid-cols-5 h-screen">
      {/* Sidebar 20% */}
      <div className="col-span-1 bg-dark text-white overflow-y-auto p-4 space-y-4 h-screen">
        <h2 className="text-xl font-bold mb-4 sticky top-0 bg-dark py-2">Propiedades ({visibleProperties.length})</h2>
        {visibleProperties.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p>No hay propiedades en esta área</p>
            <p className="text-sm mt-2">Mueve el mapa para ver más propiedades</p>
          </div>
        ) : (
          <>
            {visibleProperties.map((p, idx) => (
              <div
                key={idx}
                className="bg-white text-textPrimary rounded-2xl shadow-lg p-4 transition-all hover:scale-105 cursor-pointer"
              >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-lg truncate flex-1">
                {p.title || `Propiedad #${idx + 1}`}
              </h3>
              <span className={`${getStatusColor(p.status)} text-white text-xs px-2 py-1 rounded-full ml-2`}>
                {getStatusLabel(p.status)}
              </span>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Tipo:</span>
                <span>{getPropertyTypeLabel(p.property_type)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold">Área:</span>
                <span>{p.area} m²</span>
              </div>

              {p.built_area && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Área Construida:</span>
                  <span>{p.built_area} m²</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="font-semibold">Precio:</span>
                <span className="text-green-600 font-bold">{p.currency} {parseFloat(p.price).toLocaleString()}</span>
              </div>

              {p.rooms > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Habitaciones:</span>
                  <span>{p.rooms}</span>
                </div>
              )}

              {p.bathrooms > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Baños:</span>
                  <span>{p.bathrooms}</span>
                </div>
              )}

              {p.floors && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Pisos:</span>
                  <span>{p.floors}</span>
                </div>
              )}

              {p.city && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Ciudad:</span>
                  <span>{p.city}</span>
                </div>
              )}

              {p.contact_phone && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Contacto:</span>
                  <span>{p.contact_phone}</span>
                </div>
              )}
            </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="col-span-4 h-screen w-full">
        <MapContainer center={center} zoom={15} maxZoom={20} className="h-full w-full">
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            subdomains={['a','b','c','d']}
            maxZoom={20}
          />
          <MapBoundsTracker properties={properties} onVisiblePropertiesChange={setVisibleProperties} />

          {properties.map((p, idx) => {
            if (!p.polygon || p.polygon.length < 3) return null;
            return (
              <Polygon key={idx} positions={p.polygon} pathOptions={{
                color: p.status === 'for_sale' ? '#2b8a3e' : p.status === 'for_rent' ? '#1971c2' : '#868e96',
                fillOpacity: 0.2
              }}>
                <Popup maxWidth={300}>
                  <div className="p-2">
                    <h3 className="font-bold text-lg mb-2">{p.title || `Propiedad #${idx + 1}`}</h3>

                    <div className="space-y-1 text-sm">
                      <div><strong>Tipo:</strong> {getPropertyTypeLabel(p.property_type)}</div>
                      <div><strong>Estado:</strong> <span className="font-semibold" style={{ color: p.status === 'for_sale' ? '#2b8a3e' : p.status === 'for_rent' ? '#1971c2' : '#868e96' }}>{getStatusLabel(p.status)}</span></div>
                      <div><strong>Área:</strong> {p.area} m²</div>
                      {p.built_area && <div><strong>Área Construida:</strong> {p.built_area} m²</div>}
                      <div><strong>Precio:</strong> {p.currency} {parseFloat(p.price).toLocaleString()}</div>
                      {p.is_negotiable && <div className="text-blue-600">💬 Precio Negociable</div>}

                      {(p.rooms > 0 || p.bathrooms > 0 || p.parking_spaces > 0 || p.floors || p.furnished) && (
                        <div className="border-t pt-1 mt-1">
                          {p.rooms > 0 && <div>🛏️ {p.rooms} habitaciones</div>}
                          {p.bathrooms > 0 && <div>🚿 {p.bathrooms} baños</div>}
                          {p.floors && <div>🏢 {p.floors} {p.floors === 1 ? 'piso' : 'pisos'}</div>}
                          {p.parking_spaces > 0 && <div>🚗 {p.parking_spaces} estacionamientos</div>}
                          {p.furnished && <div>🛋️ Amueblado</div>}
                        </div>
                      )}

                      {p.description && (
                        <div className="border-t pt-1 mt-1">
                          <strong>Descripción:</strong>
                          <p className="text-xs mt-1">{p.description}</p>
                        </div>
                      )}

                      {(p.address || p.city) && (
                        <div className="border-t pt-1 mt-1">
                          {p.address && <div>📍 {p.address}</div>}
                          {p.city && <div>🏙️ {p.city}, {p.province}</div>}
                        </div>
                      )}

                      {(p.contact_phone || p.contact_email) && (
                        <div className="border-t pt-1 mt-1">
                          <strong>Contacto:</strong>
                          {p.contact_phone && <div>📞 {p.contact_phone}</div>}
                          {p.contact_email && <div>📧 {p.contact_email}</div>}
                        </div>
                      )}

                      {p.year_built && <div className="text-gray-600 text-xs">Año: {p.year_built}</div>}
                    </div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPage;
