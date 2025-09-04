import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

const MapPage = () => {
  const { token } = useAuth();
  const [properties, setProperties] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch(`${API_URL}/properties/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProperties(data);
        }
      } catch (err) {
        // ignore for now
      }
    };
    fetchProperties();
  }, [token]);

  const defaultCenter = [-2.3086, -78.1117]; // Macas, Ecuador
  const center = properties.length ? properties[0].polygon[0] : defaultCenter;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen">
      <MapContainer center={center} zoom={18} maxZoom={20} className="h-full w-full">
        {/* OpenStreetMap */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
          subdomains={['a','b','c','d']}
          maxZoom={20}
        />
        {properties.map((p, idx) => (
          <Polygon key={idx} positions={p.polygon}>
            <Popup>
              Área: {p.area} m²<br />Precio: {p.price}
            </Popup>
          </Polygon>
        ))}
      </MapContainer>

      {/* Lista lateral */}
      <div className="bg-dark text-white overflow-y-auto p-4 space-y-4">
        {properties.map((p, idx) => (
          <div
            key={idx}
            className="bg-white text-textPrimary rounded-2xl shadow-lg p-4 transition-all hover:scale-105"
          >
            Área: {p.area} m² - Precio: {p.price}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MapPage;
