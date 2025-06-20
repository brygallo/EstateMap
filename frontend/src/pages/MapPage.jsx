import { MapContainer, TileLayer } from 'react-leaflet';
import { Button } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../AuthContext';

const MapPage = () => {
  const { logout } = useAuth();
  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <Button onClick={logout} variant="contained" sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000 }}>
        Logout
      </Button>
      <MapContainer center={[0, 0]} zoom={13} style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
      </MapContainer>
    </div>
  );
};

export default MapPage;
