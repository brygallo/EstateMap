import { useState } from 'react';
import { TextField, Button, Box, Typography, CircularProgress } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName })
      });
      if (!res.ok) throw new Error('Error al registrar');
      // login automatically
      const loginRes = await fetch(`${import.meta.env.VITE_API_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
      });
      if (!loginRes.ok) throw new Error('Registro completado pero fallo el login');
      const data = await loginRes.json();
      login(data.access, data.user, true);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8, p: 2 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Registrarse
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Nombre"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Apellido"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          margin="normal"
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
        <TextField
          label="Confirmar Contraseña"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        {error && (
          <Typography color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
        <Box sx={{ position: 'relative', mt: 2 }}>
          <Button type="submit" variant="contained" fullWidth disabled={loading}>
            Registrarse
          </Button>
          {loading && (
            <CircularProgress size={24} sx={{ position: 'absolute', top: '50%', left: '50%', mt: '-12px', ml: '-12px' }} />
          )}
        </Box>
      </form>
      <Typography variant="body2" sx={{ mt: 2 }}>
        ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
      </Typography>
    </Box>
  );
};

export default Register;
