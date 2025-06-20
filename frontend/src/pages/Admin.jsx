import { useEffect, useState } from 'react';
import { TextField, Button, Box, Typography, MenuItem, Alert } from '@mui/material';
import { useAuth } from '../AuthContext';

const Admin = () => {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [owner, setOwner] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!user?.is_staff) return;
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/users/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
  }, [token, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/properties/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          owner,
          title,
          description,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng)
        })
      });
      if (res.ok) {
        setMessage('Propiedad creada');
        setTitle('');
        setDescription('');
        setLat('');
        setLng('');
      } else {
        setMessage('Error al crear');
      }
    } catch (err) {
      setMessage('Error al crear');
    }
  };

  if (!user?.is_staff) {
    return (
      <Typography variant="h6" sx={{ mt: 4, textAlign: 'center' }}>
        Acceso restringido
      </Typography>
    );
  }

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Crear Propiedad
      </Typography>
      {message && <Alert severity="info">{message}</Alert>}
      <form onSubmit={handleSubmit}>
        <TextField
          select
          label="Usuario"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          fullWidth
          margin="normal"
          required
        >
          {users.map((u) => (
            <MenuItem key={u.id} value={u.id}>{`${u.first_name} ${u.last_name} (${u.email})`}</MenuItem>
          ))}
        </TextField>
        <TextField
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Latitud"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Longitud"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <Button type="submit" variant="contained" sx={{ mt: 2 }}>
          Guardar
        </Button>
      </form>
    </Box>
  );
};

export default Admin;
