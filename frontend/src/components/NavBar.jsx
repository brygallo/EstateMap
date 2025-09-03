import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const NavBar = () => {
  const { token, logout } = useAuth();
  return (
    <nav className="bg-primary text-white p-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-semibold">EstateMap</Link>
      {token ? (
        <button onClick={logout} className="hover:text-secondary transition-colors">Salir</button>
      ) : (
        <div className="space-x-4">
          <Link to="/login" className="hover:text-secondary transition-colors">Iniciar Sesión</Link>
          <Link to="/register" className="hover:text-secondary transition-colors">Registrarse</Link>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
