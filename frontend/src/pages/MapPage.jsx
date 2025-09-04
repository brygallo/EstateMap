import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';

const MapPage = () => {
  const { token } = useAuth();
  const [properties, setProperties] = useState([]);
  const [mapStyle, setMapStyle] = useState('streets');
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

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
      <div className="relative h-full w-full">
        <MapContainer center={center} zoom={18} maxZoom={20} className="h-full w-full">
          <TileLayer
            url={`https://api.maptiler.com/maps/${mapStyle}/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`}
            attribution='&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'
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
        <div className="absolute top-2 left-2 z-[1000] bg-white p-2 rounded shadow">
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
            className="p-1 border rounded"
          >
            <option value="streets">Streets</option>
            <option value="satellite">Satellite</option>
            <option value="hybrid">Hybrid</option>
            <option value="terrain">Terrain</option>
            <option value="basic">Basic</option>
            <option value="bright">Bright</option>
            <option value="darkmatter">Dark Matter</option>
          </select>
        </div>
      </div>

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
