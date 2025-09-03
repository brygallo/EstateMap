import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const icon = L.divIcon({ className: 'custom-marker' });

const MapPage = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 h-screen">
      <MapContainer center={[0, 0]} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <Marker position={[0, 0]} icon={icon}>
          <Popup>Propiedad demo</Popup>
        </Marker>
      </MapContainer>
      <div className="bg-dark text-white overflow-y-auto p-4 space-y-4">
        <div className="bg-white text-textPrimary rounded-2xl shadow-lg p-4 transition-all hover:scale-105">
          Propiedad demo
        </div>
      </div>
    </div>
  );
};

export default MapPage;
