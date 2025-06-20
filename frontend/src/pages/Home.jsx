import { Link } from 'react-router-dom';
import { Button } from '@mui/material';
import { useAuth } from '../AuthContext';

const Home = () => {
  const { token } = useAuth();
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome to EstateMap</h1>
      {token ? (
        <Button component={Link} to="/map" variant="contained" sx={{ mt: 2 }}>
          Ir al Mapa
        </Button>
      ) : (
        <Button component={Link} to="/login" variant="contained" sx={{ mt: 2 }}>
          Iniciar Sesión
        </Button>
      )}
    </div>
  );
};

export default Home;
