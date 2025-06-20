import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const MapPage = () => (
  <div style={{ height: '100vh' }}>
    <MapContainer center={[0, 0]} zoom={13} style={{ height: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
    </MapContainer>
  </div>
);

export default MapPage;
