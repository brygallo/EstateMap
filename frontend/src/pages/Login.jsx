import { useState } from 'react';
import { TextField, Button, Checkbox, FormControlLabel, Box, Typography, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) throw new Error('Credenciales incorrectas');
      const data = await res.json();
      login(data.access, remember);
      navigate('/map');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8, p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Iniciar Sesión
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <FormControlLabel
          control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
          label="Recordar sesión"
        />
        {error && (
          <Typography color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
        <Box sx={{ position: 'relative', mt: 2 }}>
          <Button type="submit" variant="contained" fullWidth disabled={loading}>
            Entrar
          </Button>
          {loading && (
            <CircularProgress size={24} sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-12px', ml: '-12px' }} />
          )}
        </Box>
      </form>
    </Box>
  );
};

export default Login;
