import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../AuthContext';

const MapPage = () => {
  const { logout } = useAuth();
  return (
    <div className="h-screen relative">
      <button
        onClick={logout}
        className="absolute top-4 right-4 z-[1000] px-4 py-2 bg-blue-600 text-white rounded"
      >
        Logout
      </button>
      <MapContainer center={[0, 0]} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
      </MapContainer>
    </div>
  );
};

export default MapPage;
