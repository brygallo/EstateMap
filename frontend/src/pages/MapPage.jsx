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

  const center = properties.length ? properties[0].polygon[0] : [0, 0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen">
      <MapContainer center={center} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {properties.map((p, idx) => (
          <Polygon key={idx} positions={p.polygon}>
            <Popup>
              Área: {p.area} m²<br />Precio: {p.price}
            </Popup>
          </Polygon>
        ))}
      </MapContainer>
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
