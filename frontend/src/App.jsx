import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MapPage from './pages/MapPage';

const App = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/map" element={<MapPage />} />
  </Routes>
);

export default App;
