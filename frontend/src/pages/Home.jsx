import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Home = () => {
  const { token } = useAuth();
  return (
    <div>
      <nav className="bg-blue-600 text-white p-4 flex justify-between">
        <h1 className="text-lg font-semibold">EstateMap</h1>
        {!token && (
          <Link to="/login" className="hover:underline">
            Iniciar Sesión
          </Link>
        )}
      </nav>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Welcome to EstateMap</h1>
        {token ? (
          <Link to="/map" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded">
            Ir al Mapa
          </Link>
        ) : (
          <div className="mt-4 space-x-2">
            <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded">
              Iniciar Sesión
            </Link>
            <Link to="/register" className="px-4 py-2 border border-blue-600 text-blue-600 rounded">
              Registrarse
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
