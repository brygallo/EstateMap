import { MapContainer, TileLayer, Polygon, useMapEvents, useMap, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import PropertyModal from '../components/PropertyModal';
import MapFilters from '../components/MapFilters';
import ShareModal from '../components/ShareModal';
import L from 'leaflet';

// Fix default marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for user location
const userLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3B82F6" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#3B82F6" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

// Component to expose map instance
function MapController({ onMapReady }) {
  const map = useMap();

  useEffect(() => {
    if (map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
}

// Component to track map bounds and filter visible properties
function MapBoundsTracker({ properties, onVisiblePropertiesChange }) {
  const map = useMapEvents({
    moveend: () => {
      updateVisibleProperties();
    },
    zoomend: () => {
      updateVisibleProperties();
    },
  });

  const updateVisibleProperties = useCallback(() => {
    const bounds = map.getBounds();
    const visible = properties.filter((property) => {
      if (!property.polygon) return false;

      let coordinates;

      // Handle GeoJSON format
      if (property.polygon.coordinates?.[0]) {
        coordinates = property.polygon.coordinates[0];
        // Check if any point of the polygon is within the map bounds
        // GeoJSON uses [lng, lat] format, but Leaflet uses [lat, lng]
        return coordinates.some((point) => {
          const [lng, lat] = point;
          return bounds.contains([lat, lng]);
        });
      }
      // Handle simple array format [[lat, lng], ...]
      else if (Array.isArray(property.polygon) && property.polygon.length >= 3) {
        coordinates = property.polygon;
        // Simple format already uses [lat, lng]
        return coordinates.some((point) => {
          const [lat, lng] = point;
          return bounds.contains([lat, lng]);
        });
      }

      return false;
    });
    onVisiblePropertiesChange(visible);
  }, [map, properties, onVisiblePropertiesChange]);

  // Initial update
  useEffect(() => {
    if (properties.length > 0) {
      updateVisibleProperties();
    }
  }, [properties, updateVisibleProperties]);

  return null;
}

// Searchable User Select Component
function SearchableUserSelect({ users, selectedUserId, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const searchLower = search.toLowerCase();
    return users.filter(user =>
      user.username.toLowerCase().includes(searchLower)
    );
  }, [users, search]);

  // Get selected user display name
  const selectedUser = users.find(u => u.id === parseInt(selectedUserId));
  const displayText = selectedUserId === 'all' ? 'Todos los usuarios' : `👤 ${selectedUser?.username || 'Usuario'}`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (userId) => {
    onSelect(userId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white focus:bg-white/20 focus:outline-none text-left flex items-center justify-between"
      >
        <span className="truncate">{displayText}</span>
        <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-dark border border-white/20 rounded-lg shadow-xl max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-white/20">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar usuario..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:bg-white/20 focus:outline-none"
                autoFocus
              />
              <svg className="absolute left-2 top-2 h-3.5 w-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect('all')}
              className={`w-full px-3 py-2 text-xs text-left hover:bg-white/10 transition-colors ${
                selectedUserId === 'all' ? 'bg-white/20 text-white' : 'text-white/80'
              }`}
            >
              Todos los usuarios
            </button>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user.id.toString())}
                  className={`w-full px-3 py-2 text-xs text-left hover:bg-white/10 transition-colors ${
                    selectedUserId === user.id.toString() ? 'bg-white/20 text-white' : 'text-white/80'
                  }`}
                >
                  👤 {user.username}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-white/50 text-center">
                No se encontraron usuarios
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const MapPage = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [visibleProperties, setVisibleProperties] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Initialize filters from URL params
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    propertyType: searchParams.get('type') || 'all',
    status: searchParams.get('status') || 'all',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minArea: searchParams.get('minArea') || '',
    maxArea: searchParams.get('maxArea') || '',
    rooms: searchParams.get('rooms') || 'all',
    bathrooms: searchParams.get('bathrooms') || 'all',
    userId: searchParams.get('user') || 'all',
  });

  const [users, setUsers] = useState([]);
  const mapRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const handleMapReady = (map) => {
    mapRef.current = map;
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Mover el mapa a la ubicación del usuario
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 17, {
            duration: 1.5
          });
        }

        setLoadingLocation(false);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        let errorMessage = 'No se pudo obtener tu ubicación';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Por favor, habilita la ubicación en tu navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Información de ubicación no disponible.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tiempo de espera agotado al obtener la ubicación.';
            break;
        }

        alert(errorMessage);
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Function for sidebar clicks - only moves map
  const handleSidebarPropertyClick = (property) => {
    console.log('Sidebar property clicked:', property);

    // Move map to property location if polygon exists
    if (mapRef.current && property.polygon) {
      try {
        let coordinates;

        // Check if polygon is in GeoJSON format
        if (property.polygon.coordinates && Array.isArray(property.polygon.coordinates[0])) {
          coordinates = property.polygon.coordinates[0];
        }
        // Check if polygon is already in simple array format [[lat, lng], ...]
        else if (Array.isArray(property.polygon) && property.polygon.length >= 3) {
          // Convert from [lat, lng] to [lng, lat] for bounds calculation
          coordinates = property.polygon.map(coord => [coord[1], coord[0]]);
        }

        if (coordinates && coordinates.length >= 3) {
          // Calculate bounds for the polygon
          const lats = coordinates.map(coord => coord[1]);
          const lngs = coordinates.map(coord => coord[0]);

          const bounds = [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)]
          ];

          console.log('Flying to bounds:', bounds);

          // Fly to the polygon with maximum zoom
          mapRef.current.flyToBounds(bounds, {
            padding: [50, 50],
            maxZoom: 20, // Maximum zoom available
            duration: 1.5
          });
        }
      } catch (error) {
        console.error('Error moving map:', error);
      }
    }

    // Highlight the selected property visually
    setSelectedProperty(property);

    // Close sidebar on mobile after clicking
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Function for polygon clicks - opens modal
  const handlePolygonClick = (property) => {
    console.log('Polygon clicked:', property);

    // Open modal
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProperty(null);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);

    // Update URL params
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.propertyType !== 'all') params.set('type', newFilters.propertyType);
    if (newFilters.status !== 'all') params.set('status', newFilters.status);
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice);
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice);
    if (newFilters.minArea) params.set('minArea', newFilters.minArea);
    if (newFilters.maxArea) params.set('maxArea', newFilters.maxArea);
    if (newFilters.rooms !== 'all') params.set('rooms', newFilters.rooms);
    if (newFilters.bathrooms !== 'all') params.set('bathrooms', newFilters.bathrooms);
    if (newFilters.userId !== 'all') params.set('user', newFilters.userId);

    setSearchParams(params);
  };

  const getShareUrl = () => {
    return window.location.href;
  };

  // Filter properties based on filter criteria
  useEffect(() => {
    const filtered = properties.filter((property) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          property.title?.toLowerCase().includes(searchLower) ||
          property.address?.toLowerCase().includes(searchLower) ||
          property.city?.toLowerCase().includes(searchLower) ||
          property.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Property type filter
      if (filters.propertyType !== 'all' && property.property_type !== filters.propertyType) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && property.status !== filters.status) {
        return false;
      }

      // Price range filter
      if (filters.minPrice && parseFloat(property.price) < parseFloat(filters.minPrice)) {
        return false;
      }
      if (filters.maxPrice && parseFloat(property.price) > parseFloat(filters.maxPrice)) {
        return false;
      }

      // Area range filter
      if (filters.minArea && parseFloat(property.area) < parseFloat(filters.minArea)) {
        return false;
      }
      if (filters.maxArea && parseFloat(property.area) > parseFloat(filters.maxArea)) {
        return false;
      }

      // Rooms filter
      if (filters.rooms !== 'all' && property.rooms < parseInt(filters.rooms)) {
        return false;
      }

      // Bathrooms filter
      if (filters.bathrooms !== 'all' && property.bathrooms < parseInt(filters.bathrooms)) {
        return false;
      }

      // User filter
      if (filters.userId !== 'all' && property.owner !== parseInt(filters.userId)) {
        return false;
      }

      return true;
    });

    setFilteredProperties(filtered);
  }, [filters, properties]);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const headers = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(`${API_URL}/properties/`, { headers });
        if (res.ok) {
          const data = await res.json();
          console.log('Properties loaded:', data.length, 'properties');
          console.log('First property:', data[0]);
          setProperties(data);
          setFilteredProperties(data); // Initialize filtered properties

          // Extract unique users
          const uniqueUsers = {};
          data.forEach(prop => {
            if (prop.owner && !uniqueUsers[prop.owner]) {
              uniqueUsers[prop.owner] = {
                id: prop.owner,
                username: prop.owner_username || `Usuario ${prop.owner}`
              };
            }
          });
          setUsers(Object.values(uniqueUsers));
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
      }
    };
    fetchProperties();

    // Cleanup timeout on unmount
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [token, API_URL]);

  const defaultCenter = [-2.311940, -78.124395]; // Macas, Ecuador

  // Format area with 2 decimals
  const formatArea = (area) => {
    return area ? parseFloat(area).toFixed(2) : '0.00';
  };

  // Calculate center from first filtered property with polygon
  let center = defaultCenter;
  if (filteredProperties.length > 0) {
    const firstWithPolygon = filteredProperties.find(p => p.polygon);
    if (firstWithPolygon) {
      if (firstWithPolygon.polygon?.coordinates?.[0]?.[0]) {
        // GeoJSON format [lng, lat] -> convert to [lat, lng]
        const coords = firstWithPolygon.polygon.coordinates[0][0];
        center = [coords[1], coords[0]];
      } else if (Array.isArray(firstWithPolygon.polygon) && firstWithPolygon.polygon[0]) {
        // Simple array format already [lat, lng]
        center = firstWithPolygon.polygon[0];
      }
    }
  }

  // Helper functions
  const getPropertyTypeLabel = (type) => {
    const labels = {
      house: 'Casa',
      land: 'Terreno',
      apartment: 'Apartamento',
      commercial: 'Comercial',
      other: 'Otro'
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status) => {
    const labels = {
      for_sale: 'En Venta',
      for_rent: 'En Alquiler',
      sold: 'Vendido',
      rented: 'Alquilado',
      inactive: 'Inactivo'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      for_sale: 'bg-green-500',
      for_rent: 'bg-blue-500',
      sold: 'bg-gray-500',
      rented: 'bg-purple-500',
      inactive: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="relative h-[calc(100vh-4.5rem)] overflow-hidden">
      {/* Mobile Toggle Button - Bottom Left for better visibility */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-20 left-4 z-[1000] bg-gradient-to-r from-primary to-secondary text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"
        aria-label="Toggle sidebar"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {visibleProperties.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
            {visibleProperties.length}
          </span>
        )}
      </button>

      {/* My Location Button - Bottom Right */}
      <button
        onClick={handleGetMyLocation}
        disabled={loadingLocation}
        className="fixed bottom-20 right-4 z-[1000] bg-white text-primary p-4 rounded-full shadow-2xl hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Mi ubicación"
        title="Ir a mi ubicación"
      >
        {loadingLocation ? (
          <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        transition-transform duration-300 ease-in-out
        bg-dark text-white
        h-[calc(100vh-4.5rem)] lg:h-full
        w-72 lg:w-1/5
        z-40 lg:z-0
        overflow-y-auto
        shadow-2xl lg:shadow-none
      `}>
        {/* Close button for mobile */}
        <div className="flex items-center justify-between lg:hidden p-3 bg-dark sticky top-0 z-10">
          <h2 className="text-base font-bold">Filtros y Propiedades</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters Section */}
        <div className="p-3 bg-dark sticky top-0 lg:top-0 z-10 space-y-2">
          <h3 className="text-sm font-bold flex items-center gap-1 mb-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
          </h3>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange({ ...filters, search: e.target.value })}
              placeholder="Buscar..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:outline-none"
            />
            <svg className="absolute left-2.5 top-2 h-3.5 w-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Property Type */}
          <select
            value={filters.propertyType}
            onChange={(e) => handleFilterChange({ ...filters, propertyType: e.target.value })}
            className="w-full px-2 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white focus:bg-white/20 focus:outline-none"
          >
            <option value="all" className="bg-dark">Todos los tipos</option>
            <option value="house" className="bg-dark">🏠 Casa</option>
            <option value="apartment" className="bg-dark">🏢 Apartamento</option>
            <option value="land" className="bg-dark">🏞️ Terreno</option>
            <option value="commercial" className="bg-dark">🏪 Comercial</option>
          </select>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
            className="w-full px-2 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white focus:bg-white/20 focus:outline-none"
          >
            <option value="all" className="bg-dark">Todos los estados</option>
            <option value="for_sale" className="bg-dark">💰 En Venta</option>
            <option value="for_rent" className="bg-dark">🔑 En Alquiler</option>
          </select>

          {/* User Filter with Search */}
          <SearchableUserSelect
            users={users}
            selectedUserId={filters.userId}
            onSelect={(userId) => handleFilterChange({ ...filters, userId })}
          />

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => handleFilterChange({ ...filters, minPrice: e.target.value })}
              placeholder="$ Min"
              className="w-full px-2 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:outline-none"
            />
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange({ ...filters, maxPrice: e.target.value })}
              placeholder="$ Max"
              className="w-full px-2 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:outline-none"
            />
          </div>

          {/* Area Range */}
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="number"
              value={filters.minArea}
              onChange={(e) => handleFilterChange({ ...filters, minArea: e.target.value })}
              placeholder="m² Min"
              className="w-full px-2 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:outline-none"
            />
            <input
              type="number"
              value={filters.maxArea}
              onChange={(e) => handleFilterChange({ ...filters, maxArea: e.target.value })}
              placeholder="m² Max"
              className="w-full px-2 py-1.5 text-xs bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:bg-white/20 focus:outline-none"
            />
          </div>

          {/* Clear Filters Button */}
          {(filters.search || filters.propertyType !== 'all' || filters.status !== 'all' ||
            filters.minPrice || filters.maxPrice || filters.minArea || filters.maxArea || filters.userId !== 'all') && (
            <button
              onClick={() => handleFilterChange({
                search: '',
                propertyType: 'all',
                status: 'all',
                minPrice: '',
                maxPrice: '',
                minArea: '',
                maxArea: '',
                rooms: 'all',
                bathrooms: 'all',
                userId: 'all',
              })}
              className="w-full px-2 py-1.5 text-xs bg-red-500/80 hover:bg-red-500 rounded-lg font-semibold transition-colors"
            >
              Limpiar Filtros
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="w-full px-2 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 shadow-lg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Compartir Búsqueda
          </button>
        </div>

        {/* Properties Header */}
        <div className="px-3 py-2 bg-dark border-t border-white/10">
          <h2 className="text-sm font-bold">
            Propiedades ({visibleProperties.length})
          </h2>
        </div>

        {/* Properties List */}
        <div className="p-3 space-y-2 pb-20">

          {visibleProperties.length === 0 ? (
            <div className="text-center text-gray-400 mt-4">
              <p className="text-sm">No hay propiedades en esta área</p>
              <p className="text-xs mt-1">Mueve el mapa para ver más propiedades</p>
            </div>
          ) : (
            <>
              {visibleProperties.map((p, idx) => {
              const isSelected = selectedProperty?.id === p.id;
              return (
              <div
                key={idx}
                onClick={() => {
                  console.log('Card clicked!', p.title);
                  handleSidebarPropertyClick(p);
                }}
                className={`bg-white text-textPrimary rounded-xl shadow-lg p-2.5 transition-all hover:scale-105 cursor-pointer ${
                  isSelected ? 'ring-2 ring-primary scale-105' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="font-bold text-sm truncate flex-1">
                    {p.title || `Propiedad #${idx + 1}`}
                  </h3>
                  <span className={`${getStatusColor(p.status)} text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1.5 flex-shrink-0`}>
                    {getStatusLabel(p.status)}
                  </span>
                </div>

                {/* Owner info */}
                <div className="flex items-center gap-1 mb-1.5">
                  <svg className="h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-[10px] text-gray-600 font-medium">
                    {p.owner_username || `Usuario ${p.owner}`}
                  </span>
                </div>

                <div className="space-y-0.5 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">Tipo:</span>
                    <span>{getPropertyTypeLabel(p.property_type)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="font-semibold">Área:</span>
                    <span>{formatArea(p.area)} m²</span>
                  </div>

                  {p.built_area && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">Construida:</span>
                      <span>{formatArea(p.built_area)} m²</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <span className="font-semibold">Precio:</span>
                    <span className="text-green-600 font-bold">${parseFloat(p.price).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {p.rooms > 0 && <span>🛏️ {p.rooms}</span>}
                    {p.bathrooms > 0 && <span>🚿 {p.bathrooms}</span>}
                    {p.floors && <span>🏢 {p.floors}</span>}
                  </div>
                </div>
              </div>
              );
              })}
            </>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="absolute inset-0 lg:left-[20%] h-full w-full lg:w-4/5 z-0">
        <MapContainer
          center={center}
          zoom={15}
          maxZoom={20}
          className="h-full w-full"
          preferCanvas={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
            subdomains={['a','b','c','d']}
            maxZoom={20}
          />
          <MapController onMapReady={handleMapReady} />
          <MapBoundsTracker properties={filteredProperties} onVisiblePropertiesChange={setVisibleProperties} />

          {useMemo(() => filteredProperties.map((p, idx) => {
            // Handle both GeoJSON and simple array formats
            let leafletCoordinates;

            if (p.polygon?.coordinates?.[0]) {
              // GeoJSON format: convert [lng, lat] to [lat, lng]
              leafletCoordinates = p.polygon.coordinates[0].map(coord => [coord[1], coord[0]]);
            } else if (Array.isArray(p.polygon) && p.polygon.length >= 3) {
              // Simple array format: already [lat, lng]
              leafletCoordinates = p.polygon;
            } else {
              return null;
            }

            const isSelected = selectedProperty?.id === p.id;
            const baseColor = p.status === 'for_sale' ? '#2b8a3e' : p.status === 'for_rent' ? '#1971c2' : '#868e96';

            return (
              <Polygon
                key={p.id || idx}
                positions={leafletCoordinates}
                pathOptions={{
                  color: baseColor,
                  fillOpacity: isSelected ? 0.4 : 0.2,
                  weight: isSelected ? 3 : 2,
                  className: 'property-polygon'
                }}
                eventHandlers={{
                  click: () => {
                    console.log('Polygon clicked!', p.title);
                    // Cancel any pending hover timeout
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    handlePolygonClick(p);
                  },
                  mouseover: (e) => {
                    const layer = e.target;
                    layer.setStyle({
                      fillOpacity: 0.4,
                      weight: 3
                    });

                    // Clear any existing timeout
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                    }

                    // Set timeout to open modal after 0.75 seconds of hovering
                    hoverTimeoutRef.current = setTimeout(() => {
                      handlePolygonClick(p);
                      hoverTimeoutRef.current = null;
                    }, 750);
                  },
                  mouseout: (e) => {
                    const layer = e.target;
                    if (!isSelected) {
                      layer.setStyle({
                        fillOpacity: 0.2,
                        weight: 2
                      });
                    }

                    // Cancel hover timeout if mouse leaves before time expires
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                  }
                }}
              />
            );
          }), [filteredProperties, selectedProperty])}

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userLocationIcon}
            >
              <Popup>
                <div className="text-center">
                  <strong>Tu ubicación</strong>
                  <br />
                  <small>
                    {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                  </small>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Property Detail Modal */}
      <PropertyModal
        property={selectedProperty}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={getShareUrl()}
      />

      {/* Custom Styles */}
      <style>{`
        .leaflet-interactive {
          cursor: pointer !important;
        }
        .property-polygon {
          transition: none !important;
        }
        .leaflet-zoom-animated {
          will-change: auto !important;
        }
      `}</style>
    </div>
  );
};

export default MapPage;
