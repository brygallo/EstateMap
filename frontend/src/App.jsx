import { Routes, Route } from 'react-router-dom';
import MapPage from './pages/MapPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Admin from './pages/Admin';
import PrivateRoute from './PrivateRoute';

const App = () => (
  <Routes>
    <Route
      path="/"
      element={(
        <PrivateRoute>
          <MapPage />
        </PrivateRoute>
      )}
    />
    <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
  </Routes>
);

export default App;
