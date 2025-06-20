import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Button } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../AuthContext';
import { useEffect, useState } from 'react';

const MapPage = () => {
  const { logout, token } = useAuth();
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/properties/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProperties(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [token]);

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <Button onClick={logout} variant="contained" sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000 }}>
        Logout
      </Button>
      <MapContainer center={[0, 0]} zoom={3} style={{ height: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        {properties.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]}>
            <Popup>{p.title}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapPage;
