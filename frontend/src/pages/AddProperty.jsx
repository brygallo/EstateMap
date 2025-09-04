import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';

const AddProperty = () => {
  const [positions, setPositions] = useState([]);
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  const { token } = useAuth();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        setPositions((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
      },
    });
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/properties/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ polygon: positions, area, price }),
      });
      if (!res.ok) {
        toast.error('No se pudo guardar');
        return;
      }
      toast.success('Propiedad creada');
      navigate('/map');
    } catch (err) {
      toast.error('Error de conexión');
    }
  };

  const handleClear = () => setPositions([]);

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => navigate(-1)} className="text-primary hover:underline">Volver</button>
      <MapContainer center={[0, 0]} zoom={13} className="h-64 w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <MapClickHandler />
        {positions.length > 0 && <Polygon positions={positions} />}
      </MapContainer>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block">Metros cuadrados</label>
          <input
            type="number"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block">Precio</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="space-x-2">
          <button type="submit" className="px-4 py-2 bg-primary text-white rounded-2xl">Guardar</button>
          <button type="button" onClick={handleClear} className="px-4 py-2 border rounded-2xl">Limpiar</button>
        </div>
      </form>
    </div>
  );
};

export default AddProperty;

