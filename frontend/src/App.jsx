import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './PrivateRoute';

const App = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route
      path="/map"
      element={(
        <PrivateRoute>
          <MapPage />
        </PrivateRoute>
      )}
    />
  </Routes>
);

export default App;
