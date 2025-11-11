import { Routes, Route, useLocation } from 'react-router-dom';
import MapPage from './pages/MapPage';
import Login from './pages/Login';
import Register from './pages/Register';
import AddProperty from './pages/AddProperty';
import MyProperties from './pages/MyProperties';
import PrivateRoute from './PrivateRoute';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import { ToastContainer } from 'react-toastify';
import { useEffect } from 'react';

const App = () => {
  const location = useLocation();
  const isMapPage = location.pathname === '/';

  // Prevent body scroll when on map page
  useEffect(() => {
    if (isMapPage) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isMapPage]);

  return (
    <div className={`${isMapPage ? 'h-screen overflow-hidden' : 'min-h-screen'} flex flex-col bg-background text-textPrimary font-sans`}>
      <NavBar />
      <main className={isMapPage ? '' : 'flex-grow'}>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/add-property"
            element={(
              <PrivateRoute>
                <AddProperty />
              </PrivateRoute>
            )}
          />
          <Route
            path="/my-properties"
            element={(
              <PrivateRoute>
                <MyProperties />
              </PrivateRoute>
            )}
          />
          <Route
            path="/edit-property/:id"
            element={(
              <PrivateRoute>
                <AddProperty />
              </PrivateRoute>
            )}
          />
        </Routes>
      </main>
      <Footer />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default App;
