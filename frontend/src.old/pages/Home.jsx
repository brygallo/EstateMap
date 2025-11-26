import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Home = () => {
  const { token } = useAuth();
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Bienvenido a Geo Propiedades Ecuador</h1>
      {token ? (
        <Link to="/map" className="mt-4 inline-block px-6 py-3 bg-primary text-white rounded-2xl shadow-lg hover:bg-secondary transition-all">
          Ir al Mapa
        </Link>
      ) : (
        <div className="mt-4 space-x-2">
          <Link to="/login" className="px-4 py-2 bg-primary text-white rounded-2xl shadow-lg hover:bg-secondary transition-all">
            Iniciar Sesión
          </Link>
          <Link to="/register" className="px-4 py-2 border-2 border-primary text-primary rounded-2xl hover:bg-primary hover:text-white transition-all">
            Registrarse
          </Link>
        </div>
      )}
    </div>
  );
};

export default Home;
