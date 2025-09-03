import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MapPage from './pages/MapPage';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './PrivateRoute';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import { ToastContainer } from 'react-toastify';
const App = () => (
  <div className="min-h-screen flex flex-col bg-background text-textPrimary font-sans">
    <NavBar />
    <main className="flex-grow">
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
    </main>
    <Footer />
    <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
  </div>
);

export default App;
