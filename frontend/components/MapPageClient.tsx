'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuth } from '@/lib/auth-context';
import {
  getPropertyTypeLabel,
  getStatusLabel,
  getStatusBadgeClass,
  formatArea,
} from '@/lib/property-labels';
import PropertyModal from '@/components/PropertyModal';
import ShareModal from '@/components/ShareModal';
import RangeSlider from '@/components/RangeSlider';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import dynamic from 'next/dynamic';

// Dynamically import the Leaflet map component with no SSR
const LeafletMap = dynamic(() => import('@/components/maps/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando mapa...</p>
      </div>
    </div>
  ),
});

// Rangos de valores para los sliders
const PRICE_MIN = 0;
const PRICE_MAX = 10000000; // allow up to 10M USD by default
const AREA_MIN = 0;
const AREA_MAX = 100000; // keep high so large terrenos are visible by default

// Searchable User Select Component
function SearchableUserSelect({ users, selectedUserId, onSelect }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const searchLower = search.toLowerCase();
    return users.filter((user: any) =>
      user.username.toLowerCase().includes(searchLower)
    );
  }, [users, search]);

  // Get selected user display name
  const selectedUser = users.find((u: any) => u.id === parseInt(selectedUserId));
  const displayText = selectedUserId === 'all' ? 'Todos los usuarios' : (selectedUser?.username || 'Usuario');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const handleSelect = (userId: string) => {
    onSelect(userId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-sm bg-white border border-line rounded-lg text-textPrimary focus:border-primary focus:outline-none text-left flex items-center justify-between"
      >
        <span className="truncate">{displayText}</span>
        <svg className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-line rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-line">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar usuario..."
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-white border border-line rounded text-textPrimary placeholder-slate-400 focus:border-primary focus:outline-none"
                autoFocus
              />
              <svg className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect('all')}
              className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                selectedUserId === 'all' ? 'bg-primary/10 text-primary font-medium' : 'text-textPrimary'
              }`}
            >
              Todos los usuarios
            </button>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user: any) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user.id.toString())}
                  className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors ${
                    selectedUserId === user.id.toString() ? 'bg-primary/10 text-primary font-medium' : 'text-textPrimary'
                  }`}
                >
                  {user.username}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-slate-400 text-center">
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [visibleProperties, setVisibleProperties] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [initialLocationSet, setInitialLocationSet] = useState(false);
  const [showLocationToast, setShowLocationToast] = useState(false);

  // Initialize filters from URL params
  const [filters, setFilters] = useState({
    search: searchParams?.get('search') || '',
    propertyType: searchParams?.get('type') || 'all',
    status: searchParams?.get('status') || 'all',
    minPrice: searchParams?.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : PRICE_MIN,
    maxPrice: searchParams?.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : PRICE_MAX,
    minArea: searchParams?.get('minArea') ? parseInt(searchParams.get('minArea')!) : AREA_MIN,
    maxArea: searchParams?.get('maxArea') ? parseInt(searchParams.get('maxArea')!) : AREA_MAX,
    rooms: searchParams?.get('rooms') || 'all',
    bathrooms: searchParams?.get('bathrooms') || 'all',
    userId: searchParams?.get('user') || 'all',
  });

  const [users, setUsers] = useState<any[]>([]);
  const mapRef = useRef<any>(null);
  const hoverTimeoutRef = useRef<any>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  // Check if we should show location permission modal on initial load
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const locationPermissionAsked = localStorage.getItem('locationPermissionAsked');
      const hasInitialLocation = localStorage.getItem('hasInitialLocation');

      // If we haven't asked before and haven't set initial location, show modal
      if (!locationPermissionAsked && !hasInitialLocation) {
        // Small delay to ensure smooth page load
        setTimeout(() => {
          setShowLocationModal(true);
        }, 500);
      } else if (hasInitialLocation === 'true') {
        // User previously accepted, automatically get location on every page load
        setInitialLocationSet(true);

        // Automatically get user location
        if (navigator.geolocation) {
          setLoadingLocation(true);
          setShowLocationToast(true);

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setUserLocation({ lat: latitude, lng: longitude });

              // Wait for map to be ready before flying
              setTimeout(() => {
                if (mapRef.current) {
                  mapRef.current.flyTo([latitude, longitude], 12, {
                    duration: 1.5
                  });
                }
              }, 1000);

              setLoadingLocation(false);

              // Hide toast after 2 seconds
              setTimeout(() => {
                setShowLocationToast(false);
              }, 2000);
            },
            (error) => {
              console.error('Error obteniendo ubicación:', error);
              // If permission was revoked, don't show error, just use default Ecuador view
              setLoadingLocation(false);
              setShowLocationToast(false);
            },
            {
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 0
            }
          );
        }
      }
    }
  }, []);

  const handleAcceptLocation = async () => {
    setShowLocationModal(false);

    // Mark that we've asked for permission
    if (typeof window !== 'undefined') {
      localStorage.setItem('locationPermissionAsked', 'true');
    }

    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }

    // Check if Permissions API is available (not available on iOS Safari)
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });

        if (permissionStatus.state === 'denied') {
          toast.error('El permiso de ubicación está bloqueado. Habilítalo desde la configuración de tu navegador.');
          return;
        }
      } catch (error) {
        // Permissions API not supported (iOS Safari), continue anyway
      }
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Move map to user's city with a wider zoom to see the whole city
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 12, {
            duration: 1.5
          });
        }

        // Save that we successfully set initial location
        if (typeof window !== 'undefined') {
          localStorage.setItem('hasInitialLocation', 'true');
        }
        setInitialLocationSet(true);
        setLoadingLocation(false);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        let errorMessage = 'No se pudo obtener tu ubicación';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permiso de ubicación denegado. Habilítalo desde la configuración de tu navegador.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible. Activa los servicios de ubicación en tu dispositivo.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Se agotó el tiempo de espera. Verifica tu señal GPS o Wi-Fi e intenta de nuevo.';
            break;
        }

        toast.error(errorMessage);
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000, // Increased timeout for mobile devices
        maximumAge: 0
      }
    );
  };

  const handleDeclineLocation = () => {
    setShowLocationModal(false);

    // Mark that we've asked for permission
    if (typeof window !== 'undefined') {
      localStorage.setItem('locationPermissionAsked', 'true');
      localStorage.setItem('hasInitialLocation', 'false');
    }

    // Keep default Ecuador view
    setInitialLocationSet(true);
  };

  const handleMapReady = (map: any) => {
    mapRef.current = map;
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
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

        toast.error(errorMessage);
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
  const handleSidebarPropertyClick = (property: any) => {
    // Move map to property location
    if (mapRef.current) {
      try {
        // If property has polygon, fly to polygon bounds
        if (property.polygon) {
          let coordinates;

          // Check if polygon is in GeoJSON format
          if (property.polygon.coordinates && Array.isArray(property.polygon.coordinates[0])) {
            coordinates = property.polygon.coordinates[0];
          }
          // Check if polygon is already in simple array format [[lat, lng], ...]
          else if (Array.isArray(property.polygon) && property.polygon.length >= 3) {
            // Convert from [lat, lng] to [lng, lat] for bounds calculation
            coordinates = property.polygon.map((coord: any) => [coord[1], coord[0]]);
          }

          if (coordinates && coordinates.length >= 3) {
            // Calculate bounds for the polygon
            const lats = coordinates.map((coord: any) => coord[1]);
            const lngs = coordinates.map((coord: any) => coord[0]);

            const bounds: any = [
              [Math.min(...lats), Math.min(...lngs)],
              [Math.max(...lats), Math.max(...lngs)]
            ];

            // Fly to the polygon with maximum zoom
            mapRef.current.flyToBounds(bounds, {
              padding: [50, 50],
              maxZoom: 20, // Maximum zoom available
              duration: 1.5
            });
          }
        }
        // If property doesn't have polygon but has lat/lng, fly to marker position
        else if (property.latitude && property.longitude) {
          mapRef.current.flyTo([property.latitude, property.longitude], 17, {
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
  const handlePolygonClick = (property: any) => {
    // Move map to property location first
    if (mapRef.current) {
      try {
        // If property has polygon, fly to polygon bounds
        if (property.polygon) {
          let coordinates;

          // Check if polygon is in GeoJSON format
          if (property.polygon.coordinates && Array.isArray(property.polygon.coordinates[0])) {
            coordinates = property.polygon.coordinates[0];
          }
          // Check if polygon is already in simple array format [[lat, lng], ...]
          else if (Array.isArray(property.polygon) && property.polygon.length >= 3) {
            // Convert from [lat, lng] to [lng, lat] for bounds calculation
            coordinates = property.polygon.map((coord: any) => [coord[1], coord[0]]);
          }

          if (coordinates && coordinates.length >= 3) {
            // Calculate bounds for the polygon
            const lats = coordinates.map((coord: any) => coord[1]);
            const lngs = coordinates.map((coord: any) => coord[0]);

            const bounds: any = [
              [Math.min(...lats), Math.min(...lngs)],
              [Math.max(...lats), Math.max(...lngs)]
            ];

            // Fly to the polygon with maximum zoom
            mapRef.current.flyToBounds(bounds, {
              padding: [50, 50],
              maxZoom: 20, // Maximum zoom available
              duration: 1.5
            });
          }
        }
        // If property doesn't have polygon but has lat/lng, fly to marker position
        else if (property.latitude && property.longitude) {
          mapRef.current.flyTo([property.latitude, property.longitude], 17, {
            duration: 1.5
          });
        }
      } catch (error) {
        console.error('Error moving map:', error);
      }
    }

    // Open modal
    setSelectedProperty(property);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProperty(null);

    // Remove property parameter from URL when closing modal
    const params = new URLSearchParams(window.location.search);
    if (params.has('property')) {
      params.delete('property');
      const newUrl = params.toString() ? `/?${params.toString()}` : '/';
      router.push(newUrl, { scroll: false });
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);

    // Update URL params
    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.propertyType !== 'all') params.set('type', newFilters.propertyType);
    if (newFilters.status !== 'all') params.set('status', newFilters.status);
    if (newFilters.minPrice) params.set('minPrice', newFilters.minPrice.toString());
    if (newFilters.maxPrice) params.set('maxPrice', newFilters.maxPrice.toString());
    if (newFilters.minArea) params.set('minArea', newFilters.minArea.toString());
    if (newFilters.maxArea) params.set('maxArea', newFilters.maxArea.toString());
    if (newFilters.rooms !== 'all') params.set('rooms', newFilters.rooms);
    if (newFilters.bathrooms !== 'all') params.set('bathrooms', newFilters.bathrooms);
    if (newFilters.userId !== 'all') params.set('user', newFilters.userId);

    router.push(`/?${params.toString()}`, { scroll: false });
  };

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
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
      if (filters.minPrice && parseFloat(property.price) < parseFloat(filters.minPrice.toString())) {
        return false;
      }
      if (filters.maxPrice && parseFloat(property.price) > parseFloat(filters.maxPrice.toString())) {
        return false;
      }

      // Area range filter
      if (filters.minArea && parseFloat(property.area) < parseFloat(filters.minArea.toString())) {
        return false;
      }
      if (filters.maxArea && parseFloat(property.area) > parseFloat(filters.maxArea.toString())) {
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
        // Importar dinámicamente para evitar problemas de SSR
        const { apiFetch } = await import('@/lib/api');

        const res = await apiFetch('/properties/', {
          skipAuth: !token, // Si no hay token, no enviar Authorization header
        });

        if (res.ok) {
          const data = await res.json();
          setProperties(data);
          setFilteredProperties(data);

          // Extract unique users
          const uniqueUsers: any = {};
          data.forEach((prop: any) => {
            if (prop.owner && !uniqueUsers[prop.owner]) {
              uniqueUsers[prop.owner] = {
                id: prop.owner,
                username: prop.owner_username || `Usuario ${prop.owner}`
              };
            }
          });
          setUsers(Object.values(uniqueUsers));

          // Check if there's a property ID in the URL to open
          const propertyId = searchParams?.get('property');
          if (propertyId) {
            const propertyToOpen = data.find((p: any) => p.id.toString() === propertyId);
            if (propertyToOpen) {
              setSelectedProperty(propertyToOpen);
              setIsModalOpen(true);

              // Move map to property location
              setTimeout(() => {
                if (mapRef.current) {
                  if (propertyToOpen.polygon) {
                    let coordinates;
                    if (propertyToOpen.polygon.coordinates && Array.isArray(propertyToOpen.polygon.coordinates[0])) {
                      coordinates = propertyToOpen.polygon.coordinates[0];
                    } else if (Array.isArray(propertyToOpen.polygon) && propertyToOpen.polygon.length >= 3) {
                      coordinates = propertyToOpen.polygon.map((coord: any) => [coord[1], coord[0]]);
                    }

                    if (coordinates && coordinates.length >= 3) {
                      const lats = coordinates.map((coord: any) => coord[1]);
                      const lngs = coordinates.map((coord: any) => coord[0]);
                      const bounds: any = [
                        [Math.min(...lats), Math.min(...lngs)],
                        [Math.max(...lats), Math.max(...lngs)]
                      ];
                      mapRef.current.flyToBounds(bounds, {
                        padding: [50, 50],
                        maxZoom: 20,
                        duration: 1.5
                      });
                    }
                  } else if (propertyToOpen.latitude && propertyToOpen.longitude) {
                    mapRef.current.flyTo([propertyToOpen.latitude, propertyToOpen.longitude], 17, {
                      duration: 1.5
                    });
                  }
                }
              }, 1000);
            }
          }
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

  // Centro de Ecuador para mostrar el país completo al iniciar
  const defaultCenter: [number, number] = [-1.5, -78.5]; // Centro de Ecuador

  // Siempre usar el centro de Ecuador para mostrar el país completo
  const center = defaultCenter;

  return (
    <div className="relative h-[calc(100vh-4.5rem)] overflow-hidden">
      {/* Mobile Toggle Button - Bottom Left for better visibility */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-20 left-4 z-[1000] bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primaryHover transition-colors"
        aria-label="Toggle sidebar"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {visibleProperties.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-secondary text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
            {visibleProperties.length}
          </span>
        )}
      </button>

      {/* My Location Button - Bottom Right */}
      <button
        onClick={handleGetMyLocation}
        disabled={loadingLocation}
        className="fixed bottom-20 right-4 z-[1000] bg-white text-primary border border-line p-4 rounded-full shadow-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        bg-white text-textPrimary border-r border-line
        h-[calc(100vh-4.5rem)] lg:h-full
        w-72 lg:w-1/5
        z-40 lg:z-0
        overflow-y-auto
        shadow-2xl lg:shadow-none
      `}>
        {/* Close button for mobile */}
        <div className="flex items-center justify-between lg:hidden p-3 bg-white border-b border-line sticky top-0 z-10">
          <h2 className="text-base font-bold">Filtros y propiedades</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters Section */}
        <div className="p-3 bg-white border-b border-line sticky top-0 lg:top-0 z-10 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-textSecondary flex items-center gap-1.5 mb-1">
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
              className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-line rounded-lg text-textPrimary placeholder-slate-400 focus:border-primary focus:outline-none"
            />
            <svg className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Property Type */}
          <select
            value={filters.propertyType}
            onChange={(e) => handleFilterChange({ ...filters, propertyType: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-white border border-line rounded-lg text-textPrimary focus:border-primary focus:outline-none"
          >
            <option value="all">Todos los tipos</option>
            <option value="house">Casa</option>
            <option value="apartment">Apartamento</option>
            <option value="land">Terreno</option>
            <option value="commercial">Comercial</option>
          </select>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-white border border-line rounded-lg text-textPrimary focus:border-primary focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="for_sale">En venta</option>
            <option value="for_rent">En alquiler</option>
          </select>

          {/* User Filter with Search */}
          <SearchableUserSelect
            users={users}
            selectedUserId={filters.userId}
            onSelect={(userId: string) => handleFilterChange({ ...filters, userId })}
          />

          {/* Price Range */}
          <div className="space-y-0.5">
            <label className="block text-xs font-medium text-textSecondary">Precio (USD)</label>
            <RangeSlider
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={1000}
              minValue={filters.minPrice}
              maxValue={filters.maxPrice}
              onChange={(min, max) => handleFilterChange({ ...filters, minPrice: min, maxPrice: max })}
              formatValue={(v) => `$${v.toLocaleString()}`}
              theme="light"
            />
          </div>

          {/* Area Range */}
          <div className="space-y-0.5">
            <label className="block text-xs font-medium text-textSecondary">Área (m²)</label>
            <RangeSlider
              min={AREA_MIN}
              max={AREA_MAX}
              step={50}
              minValue={filters.minArea}
              maxValue={filters.maxArea}
              onChange={(min, max) => handleFilterChange({ ...filters, minArea: min, maxArea: max })}
              formatValue={(v) => `${v.toLocaleString()} m²`}
              theme="light"
            />
          </div>

          {/* Clear Filters Button */}
          {(filters.search || filters.propertyType !== 'all' || filters.status !== 'all' ||
            filters.minPrice !== PRICE_MIN || filters.maxPrice !== PRICE_MAX ||
            filters.minArea !== AREA_MIN || filters.maxArea !== AREA_MAX || filters.userId !== 'all') && (
            <button
              onClick={() => handleFilterChange({
                search: '',
                propertyType: 'all',
                status: 'all',
                minPrice: PRICE_MIN,
                maxPrice: PRICE_MAX,
                minArea: AREA_MIN,
                maxArea: AREA_MAX,
                rooms: 'all',
                bathrooms: 'all',
                userId: 'all',
              })}
              className="btn btn-sm btn-ghost border border-line w-full text-error hover:bg-red-50"
            >
              Limpiar filtros
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="btn btn-sm btn-primary w-full"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Compartir Búsqueda
          </button>
        </div>

        {/* Properties Header */}
        <div className="px-3 py-2 bg-white border-t border-line">
          <h2 className="text-sm font-semibold text-textPrimary">
            Propiedades ({visibleProperties.length})
          </h2>
        </div>

        {/* Properties List */}
        <div className="p-3 space-y-2 pb-20 bg-background">
          {visibleProperties.length === 0 ? (
            <div className="text-center text-textSecondary mt-4">
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
                onClick={() => handleSidebarPropertyClick(p)}
                className={`card card-hover p-2.5 cursor-pointer ${
                  isSelected ? 'ring-2 ring-primary border-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">
                      {p.title || `Propiedad #${idx + 1}`}
                    </h3>
                    {/* Indicator for polygon vs marker */}
                    {p.polygon ? (
                      <svg className="h-3 w-3 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <title>Propiedad con polígono delimitado</title>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    ) : (
                      <svg className="h-3 w-3 text-secondary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <title>Propiedad sin polígono (mostrada como marcador)</title>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                  <span className={`badge ${getStatusBadgeClass(p.status)} ml-1.5 flex-shrink-0 !text-[10px]`}>
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
                    <span className="text-emerald-600 font-bold">${parseFloat(p.price).toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-textSecondary pt-0.5">
                    {p.rooms > 0 && <span>{p.rooms} hab.</span>}
                    {p.bathrooms > 0 && <span>{p.bathrooms} baños</span>}
                    {p.floors && <span>{p.floors} {p.floors === 1 ? 'piso' : 'pisos'}</span>}
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
        <LeafletMap
          filteredProperties={filteredProperties}
          selectedProperty={selectedProperty}
          userLocation={userLocation}
          onMapReady={handleMapReady}
          onVisiblePropertiesChange={setVisibleProperties}
          onPolygonClick={handlePolygonClick}
          onPriceLabelClick={handleSidebarPropertyClick}
          hoverTimeoutRef={hoverTimeoutRef}
          getPropertyTypeLabel={getPropertyTypeLabel}
          getStatusLabel={getStatusLabel}
          center={center}
        />
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

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onAccept={handleAcceptLocation}
        onDecline={handleDeclineLocation}
        isLoading={loadingLocation}
      />

      {/* Location Loading Toast */}
      {showLocationToast && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] animate-fade-in">
          <div className="bg-white shadow-2xl rounded-xl px-6 py-4 flex items-center gap-3 border border-gray-200">
            <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800">Obteniendo tu ubicación</span>
              <span className="text-xs text-gray-500">Centrando mapa en tu ciudad...</span>
            </div>
          </div>
        </div>
      )}

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
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default MapPage;
