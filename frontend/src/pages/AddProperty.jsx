// src/pages/AddProperty.jsx
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';
import * as turf from '@turf/turf';

// Fix Leaflet icons (Vite)
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const defaultCenter = [-2.31194, -78.124395]; // Macas

/* ===================== Utils ===================== */
const metersBetween = (a, b) => {
  const km = turf.length(
    turf.lineString([[a.lng, a.lat], [b.lng, b.lat]]),
    { units: 'kilometers' }
  );
  return km * 1000;
};
const formatM = (m) => `${(Math.round(m * 100) / 100).toFixed(2)} m`;
const formatAreaM2 = (m2) => (Math.round(m2 * 100) / 100).toFixed(2);

/* ===================== MapRefBinder ===================== */
function MapRefBinder({ onMapReady }) {
  const map = useMap();

  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
}

/* ===================== Dibujo & medición ===================== */
function DrawingTools({ onPolygonChange, onAreaChange, initialPolygon }) {
  const map = useMap();

  const currentPolygonRef = useRef(null);
  const drawingRef = useRef({
    active: false,
    workingLayer: null,
  });
  const liveTooltipRef = useRef(null); // ← tooltip que sigue al cursor
  const initialLoadRef = useRef(false);

  const metersBetween = (a, b) => {
    const km = turf.length(turf.lineString([[a.lng, a.lat], [b.lng, b.lat]]), { units: 'kilometers' });
    return km * 1000;
  };
  const formatM = (m) => `${(Math.round(m * 100) / 100).toFixed(2)} m`;

  /* ===== Helpers: edge labels / area / estilo ===== */
  const clearEdgeLabels = (layer) => {
    if (layer?._edgeMarkers) {
      layer._edgeMarkers.forEach((m) => m.remove());
      layer._edgeMarkers = [];
    }
  };
  const refreshEdgeLabels = (layer) => {
    // Mediciones deshabilitadas
    clearEdgeLabels(layer);
  };
  const updateAreaAndCoords = (layer) => {
    const ring = layer.getLatLngs()?.[0] || [];
    onPolygonChange?.(ring.map((p) => [p.lat, p.lng]));
    if (ring.length >= 3) {
      const coords = ring.map((p) => [p.lng, p.lat]);
      const a = turf.area(turf.polygon([[...coords, coords[0]]]));
      onAreaChange?.(a);
    } else {
      onAreaChange?.(0);
    }
  };
  const stylePolygon = (layer) => {
    layer.setStyle?.({
      color: '#2b8a3e',
      weight: 2.5,
      fillOpacity: 0.15,
      lineJoin: 'round',
      lineCap: 'round',
    });
  };
  const bindFinalPolygon = (layer) => {
    currentPolygonRef.current = layer;
    stylePolygon(layer);
    refreshEdgeLabels(layer);
    updateAreaAndCoords(layer);
    layer.on('pm:edit', () => { refreshEdgeLabels(layer); updateAreaAndCoords(layer); });
    layer.on('pm:vertexadded', () => { refreshEdgeLabels(layer); updateAreaAndCoords(layer); });
    layer.on('pm:markerdrag', () => { refreshEdgeLabels(layer); updateAreaAndCoords(layer); });
  };

  /* ===== Tooltip en vivo durante el dibujo ===== */
  const ensureLiveTooltip = () => {
    if (!liveTooltipRef.current) {
      liveTooltipRef.current = L.tooltip({
        permanent: true,
        direction: 'top',
        offset: [0, -10],
        className: 'live-measure-tt',
        opacity: 0.95,
      }).setContent('0.00 m').setLatLng(map.getCenter()).addTo(map);
    }
  };
  const removeLiveTooltip = () => {
    if (liveTooltipRef.current) {
      map.removeLayer(liveTooltipRef.current);
      liveTooltipRef.current = null;
    }
  };

  useEffect(() => {
    // Controles
    map.pm.addControls({
      position: 'topleft',
      drawPolygon: true,
      editMode: true,
      removalMode: true,
      drawMarker: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      cutPolygon: false,
      dragMode: false,
      rotateMode: false,
    });
    map.pm.setGlobalOptions({
      tooltips: true,
      snappable: true,
      snapDistance: 20,
      finishOnDoubleClick: true,
      allowSelfIntersection: false,
      templineStyle: { color: '#1971c2' },
      hintlineStyle: { color: '#1971c2', dashArray: [4, 4] },
    });

    /* === START dibujo === */
    const onDrawStart = (e) => {
      if (e.shape !== 'Polygon') return;

      // Un solo polígono
      if (currentPolygonRef.current && map.hasLayer(currentPolygonRef.current)) {
        clearEdgeLabels(currentPolygonRef.current);
        map.removeLayer(currentPolygonRef.current);
        currentPolygonRef.current = null;
        onPolygonChange?.([]);
        onAreaChange?.(0);
      }

      drawingRef.current.active = true;
      drawingRef.current.workingLayer = e.workingLayer || e.layer || null;
      // Tooltip de medición deshabilitado
    };

    /* === MOVE mouse → deshabilitado === */
    const onMouseMove = (evt) => {
      // Medición en movimiento deshabilitada
    };

    /* === END dibujo === */
    const onDrawEnd = () => {
      drawingRef.current.active = false;
      drawingRef.current.workingLayer = null;
      removeLiveTooltip();
    };

    /* === Crear polígono final === */
    const onCreate = (e) => {
      if (e.shape !== 'Polygon') return;
      bindFinalPolygon(e.layer);
      removeLiveTooltip();
    };

    /* === Edit / Remove === */
    const onEdit = (e) => {
      e.layers.eachLayer((layer) => {
        if (layer === currentPolygonRef.current) {
          refreshEdgeLabels(layer);
          updateAreaAndCoords(layer);
        }
      });
    };
    const onRemove = (e) => {
      e.layers.eachLayer((layer) => {
        if (layer === currentPolygonRef.current) {
          clearEdgeLabels(layer);
          currentPolygonRef.current = null;
          onPolygonChange?.([]);
          onAreaChange?.(0);
        }
      });
      removeLiveTooltip();
    };

    // Bind
    map.on('pm:drawstart', onDrawStart);
    map.on('mousemove', onMouseMove);
    map.on('pm:drawend', onDrawEnd);
    map.on('pm:create', onCreate);
    map.on('pm:edit', onEdit);
    map.on('pm:remove', onRemove);
    try { map.pm.setLang('es'); } catch {}

    // Unbind
    return () => {
      try {
        map.off('pm:drawstart', onDrawStart);
        map.off('mousemove', onMouseMove);
        map.off('pm:drawend', onDrawEnd);
        map.off('pm:create', onCreate);
        map.off('pm:edit', onEdit);
        map.off('pm:remove', onRemove);
        removeLiveTooltip();

        // Clean up current polygon safely
        if (currentPolygonRef.current) {
          try {
            clearEdgeLabels(currentPolygonRef.current);
            if (map.hasLayer(currentPolygonRef.current)) {
              currentPolygonRef.current.pm.disable();
              map.removeLayer(currentPolygonRef.current);
            }
          } catch (e) {
            // Ignore cleanup errors on unmount
          }
          currentPolygonRef.current = null;
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [map, onPolygonChange, onAreaChange]);

  // Load initial polygon if provided (for edit mode)
  useEffect(() => {
    // Only load if we have valid polygon data, no polygon is currently on the map, and we haven't loaded it yet
    if (initialPolygon && initialPolygon.length >= 3 && !currentPolygonRef.current && !initialLoadRef.current) {
      console.log('Attempting to load initial polygon:', initialPolygon);

      // Use a small timeout to ensure the map is fully initialized
      const timer = setTimeout(() => {
        try {
          console.log('Loading initial polygon now:', initialPolygon);

          // Create polygon from initial data
          const polygon = L.polygon(initialPolygon, {
            color: '#2b8a3e',
            weight: 2.5,
            fillOpacity: 0.15,
            lineJoin: 'round',
            lineCap: 'round',
          }).addTo(map);

          // Enable editing for this polygon
          polygon.pm.enable();

          bindFinalPolygon(polygon);

          // Fit map to polygon bounds
          map.fitBounds(polygon.getBounds());

          // Mark as loaded only after successfully loading
          initialLoadRef.current = true;

          console.log('Initial polygon loaded successfully');
        } catch (e) {
          console.error('Error loading initial polygon:', e);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      console.log('Skipping polygon load - polygon:', initialPolygon?.length, 'current:', !!currentPolygonRef.current, 'loaded:', initialLoadRef.current);
    }
  }, [initialPolygon, map]);

  return null;
}



/* ===================== Escala ===================== */
function ScaleBottomLeft() {
  const map = useMap();
  useEffect(() => {
    const control = L.control.scale({ position: 'bottomleft', metric: true, imperial: false });
    control.addTo(map);
    return () => control.remove();
  }, [map]);
  return null;
}

/* ===================== HUD Área (deshabilitado) ===================== */

/* ===================== Página ===================== */
const AddProperty = () => {
  const { id } = useParams(); // Get property ID from URL if editing
  const isEditMode = Boolean(id);
  const [loading, setLoading] = useState(isEditMode);

  const [polygonCoords, setPolygonCoords] = useState([]); // [[lat,lng], ...]
  const [area, setArea] = useState(0);

  // General Information
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState('land');
  const [status, setStatus] = useState('for_sale');

  // Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Macas');
  const [province, setProvince] = useState('Morona Santiago');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Characteristics
  const [builtArea, setBuiltArea] = useState('');
  const [rooms, setRooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [parkingSpaces, setParkingSpaces] = useState(0);
  const [floors, setFloors] = useState('');
  const [furnished, setFurnished] = useState(false);
  const [yearBuilt, setYearBuilt] = useState('');

  // Financial Information
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);

  // Contact
  const [contactPhone, setContactPhone] = useState('');

  // Images
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);

  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  // Load property data if editing
  useEffect(() => {
    if (isEditMode) {
      fetchProperty();
    }
  }, [id]);

  const fetchProperty = async () => {
    try {
      const res = await fetch(`${API_URL}/properties/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Property data loaded:', data);
        console.log('Polygon from backend:', data.polygon);

        // Populate form fields
        setTitle(data.title || '');
        setDescription(data.description || '');
        setPropertyType(data.property_type || 'land');
        setStatus(data.status || 'for_sale');
        setAddress(data.address || '');
        setCity(data.city || 'Macas');
        setProvince(data.province || 'Morona Santiago');
        setLatitude(data.latitude || '');
        setLongitude(data.longitude || '');
        setPolygonCoords(data.polygon || []);
        setArea(data.area || 0);
        setBuiltArea(data.built_area || '');
        setRooms(data.rooms || 0);
        setBathrooms(data.bathrooms || 0);
        setParkingSpaces(data.parking_spaces || 0);
        setFloors(data.floors || '');
        setFurnished(data.furnished || false);
        setYearBuilt(data.year_built || '');
        setPrice(data.price || '');
        setIsNegotiable(data.is_negotiable !== undefined ? data.is_negotiable : true);
        setContactPhone(data.contact_phone || '');
        setExistingImages(data.images || []);
      } else if (res.status === 401) {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        logout();
        navigate('/login');
      } else {
        toast.error('No se pudo cargar la propiedad');
        navigate('/my-properties');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
      navigate('/my-properties');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Require polygon for all property types
    if (polygonCoords.length < 3) {
      toast.error('Debes dibujar un polígono en el mapa para definir la ubicación de la propiedad.');
      return;
    }
    try {
      const formData = new FormData();

      // General Information
      formData.append('title', title);
      formData.append('description', description);
      formData.append('property_type', propertyType);
      formData.append('status', status);

      // Location
      formData.append('address', address);
      formData.append('city', city);
      formData.append('province', province);
      if (latitude) formData.append('latitude', parseFloat(latitude));
      if (longitude) formData.append('longitude', parseFloat(longitude));
      if (polygonCoords.length >= 3) {
        formData.append('polygon', JSON.stringify(polygonCoords));
      }

      // Characteristics
      formData.append('area', parseFloat(area));
      if (builtArea) formData.append('built_area', parseFloat(builtArea));
      formData.append('rooms', parseInt(rooms));
      formData.append('bathrooms', parseInt(bathrooms));
      formData.append('parking_spaces', parseInt(parkingSpaces));
      if (floors) formData.append('floors', parseInt(floors));
      formData.append('furnished', furnished);
      if (yearBuilt) formData.append('year_built', parseInt(yearBuilt));

      // Financial Information
      formData.append('price', price);
      formData.append('is_negotiable', isNegotiable);

      // Contact
      formData.append('contact_phone', contactPhone);

      // Images - append each image file
      imageFiles.forEach((file) => {
        formData.append('uploaded_images', file);
      });

      const url = isEditMode ? `${API_URL}/properties/${id}/` : `${API_URL}/properties/`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        toast.success(`Propiedad ${isEditMode ? 'actualizada' : 'creada'} exitosamente`);
        navigate('/my-properties');
      } else if (res.status === 401) {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        logout();
        navigate('/login');
      } else {
        const errorData = await res.json();
        console.error('Error:', errorData);
        toast.error(`No se pudo ${isEditMode ? 'actualizar' : 'guardar'} la propiedad`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    }
  };

  const handleClear = () => {
    const map = window._leaflet_map_ref;
    if (map) {
      map.eachLayer((layer) => {
        if (layer.pm && layer instanceof L.Polygon) {
          if (layer._edgeMarkers) layer._edgeMarkers.forEach((m) => m.remove());
          map.removeLayer(layer);
        }
      });
    }
    setPolygonCoords([]);
    setArea(0);
  };

  const bindMapRef = (map) => { window._leaflet_map_ref = map; };

  // Handle image selection with validation
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);

    // Validaciones
    const MAX_IMAGES = 10;
    const MAX_SIZE_MB = 10;
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    // Validar número máximo de imágenes
    const totalImages = images.length + existingImages.length + files.length;
    if (totalImages > MAX_IMAGES) {
      alert(`Solo puedes subir un máximo de ${MAX_IMAGES} imágenes por propiedad. Actualmente tienes ${images.length + existingImages.length} y estás intentando agregar ${files.length}.`);
      e.target.value = ''; // Reset input
      return;
    }

    // Validar cada archivo
    const validFiles = [];
    const errors = [];

    files.forEach((file, index) => {
      // Validar tamaño
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_SIZE_MB) {
        errors.push(`"${file.name}" es demasiado grande (${sizeMB.toFixed(2)}MB). Máximo: ${MAX_SIZE_MB}MB`);
        return;
      }

      // Validar tipo
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        errors.push(`"${file.name}" tiene un formato no permitido. Use: JPG, PNG o WebP`);
        return;
      }

      // Validar dimensiones mínimas (opcional)
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        if (img.width < 200 || img.height < 200) {
          console.warn(`"${file.name}" tiene dimensiones muy pequeñas (${img.width}x${img.height}px). Se recomienda mínimo 200x200px`);
        }
      };

      validFiles.push(file);
    });

    // Mostrar errores si los hay
    if (errors.length > 0) {
      alert('❌ Algunas imágenes no pudieron ser agregadas:\n\n' + errors.join('\n'));
    }

    // Si hay archivos válidos, agregarlos
    if (validFiles.length > 0) {
      setImageFiles([...imageFiles, ...validFiles]);

      // Create preview URLs
      const newImages = validFiles.map((file) => {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
          file,
          preview: URL.createObjectURL(file),
          size: sizeMB,
          name: file.name
        };
      });
      setImages([...images, ...newImages]);

      // Mostrar mensaje de éxito
      if (validFiles.length > 0) {
        console.log(`✅ ${validFiles.length} imagen(es) agregada(s). Las imágenes serán optimizadas automáticamente al subir.`);
      }
    }

    // Reset input
    e.target.value = '';
  };

  // Remove new image
  const handleRemoveNewImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImages(newImages);
    setImageFiles(newFiles);
  };

  // Remove existing image
  const handleRemoveExistingImage = async (imageId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta imagen?')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/properties/${id}/delete_image/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image_id: imageId }),
      });

      if (res.ok) {
        setExistingImages(existingImages.filter((img) => img.id !== imageId));
        toast.success('Imagen eliminada exitosamente');
      } else if (res.status === 401) {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        logout();
        navigate('/login');
      } else {
        toast.error('Error al eliminar la imagen');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando propiedad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? 'Editar Propiedad' : 'Nueva Propiedad'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {isEditMode ? 'Actualiza la información de tu propiedad' : 'Completa la información para registrar una nueva propiedad'}
              </p>
            </div>
            <button
              onClick={() => navigate('/my-properties')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Map Section */}
          <div className="lg:sticky lg:top-8 lg:self-start order-2 lg:order-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                <h2 className="text-base lg:text-lg font-semibold text-white flex items-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Ubicación en el Mapa
                </h2>
                <p className="text-xs lg:text-sm text-white/90 mt-1">
                  {isEditMode
                    ? 'Edita el polígono de la propiedad'
                    : (propertyType === 'land' ? 'Dibuja el polígono del terreno' : 'Opcional: Dibuja el área de la propiedad')
                  }
                </p>
              </div>
              <div className="relative h-[300px] sm:h-[400px] lg:h-[500px]">
                <MapContainer
                  center={defaultCenter}
                  zoom={15}
                  maxZoom={20}
                  preferCanvas
                  className="h-full w-full"
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    subdomains={['a','b','c','d']}
                    maxZoom={20}
                  />
                  <MapRefBinder onMapReady={bindMapRef} />
                  <ScaleBottomLeft />
                  <DrawingTools
                    onPolygonChange={setPolygonCoords}
                    onAreaChange={setArea}
                    initialPolygon={polygonCoords}
                  />
                </MapContainer>
              </div>
              <div className="px-4 py-3 bg-gray-50 border-t">
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Limpiar Polígono
                </button>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="space-y-4 lg:space-y-6 order-1 lg:order-2">
            <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
              {/* General Information */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Información General
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Título *</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ej: Casa moderna en zona residencial"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Propiedad *</label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
                        required
                      >
                        <option value="land">🏞️ Terreno</option>
                        <option value="house">🏠 Casa</option>
                        <option value="apartment">🏢 Apartamento</option>
                        <option value="commercial">🏪 Comercial</option>
                        <option value="other">📦 Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Estado *</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
                        required
                      >
                        <option value="for_sale">💰 En Venta</option>
                        <option value="for_rent">🔑 En Alquiler</option>
                        <option value="sold">✅ Vendido</option>
                        <option value="rented">🏠 Alquilado</option>
                        <option value="inactive">⏸️ Inactivo</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe las características principales de la propiedad..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                        rows="3"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Ubicación
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ej: Av. Principal #123"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Ciudad</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Macas"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Provincia</label>
                      <input
                        type="text"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        placeholder="Morona Santiago"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Characteristics */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Características
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Área Total (m²) *</label>
                      <input
                        type="number"
                        step="any"
                        value={formatAreaM2(area)}
                        onChange={(e) => setArea(Number(e.target.value || 0))}
                        placeholder="500"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    {/* Campos para Casa, Apartamento o Comercial */}
                    {(propertyType === 'house' || propertyType === 'apartment' || propertyType === 'commercial') && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Área Construida (m²) *</label>
                          <input
                            type="number"
                            step="any"
                            value={builtArea}
                            onChange={(e) => setBuiltArea(e.target.value)}
                            placeholder="250"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            required
                          />
                        </div>
                        {propertyType !== 'commercial' && (
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Habitaciones *</label>
                            <input
                              type="number"
                              value={rooms}
                              onChange={(e) => setRooms(e.target.value)}
                              placeholder="3"
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                              min="0"
                              required
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Baños *</label>
                          <input
                            type="number"
                            value={bathrooms}
                            onChange={(e) => setBathrooms(e.target.value)}
                            placeholder="2"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            min="0"
                            required
                          />
                        </div>
                      </>
                    )}

                    {/* Campos específicos para Casa */}
                    {propertyType === 'house' && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Pisos *</label>
                          <input
                            type="number"
                            value={floors}
                            onChange={(e) => setFloors(e.target.value)}
                            placeholder="2"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            min="1"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Estacionamientos</label>
                          <input
                            type="number"
                            value={parkingSpaces}
                            onChange={(e) => setParkingSpaces(e.target.value)}
                            placeholder="2"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Año de Construcción</label>
                          <input
                            type="number"
                            value={yearBuilt}
                            onChange={(e) => setYearBuilt(e.target.value)}
                            placeholder="2020"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            min="1900"
                            max={new Date().getFullYear()}
                          />
                        </div>
                      </>
                    )}

                    {/* Campos para Apartamento */}
                    {propertyType === 'apartment' && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Estacionamientos</label>
                          <input
                            type="number"
                            value={parkingSpaces}
                            onChange={(e) => setParkingSpaces(e.target.value)}
                            placeholder="1"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            min="0"
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <input
                            type="checkbox"
                            id="furnished"
                            checked={furnished}
                            onChange={(e) => setFurnished(e.target.checked)}
                            className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <label htmlFor="furnished" className="text-sm font-semibold text-gray-700">
                            Amueblado
                          </label>
                        </div>
                      </>
                    )}
          </div>
        </div>

              </div>

              {/* Financial Information */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Información Financiera
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Precio (USD) *</label>
                      <input
                        type="number"
                        step="any"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="150000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="checkbox"
                        id="negotiable"
                        checked={isNegotiable}
                        onChange={(e) => setIsNegotiable(e.target.checked)}
                        className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="negotiable" className="text-sm font-semibold text-gray-700">
                        Precio Negociable
                      </label>
                    </div>
                  </div>
                </div>

              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Información de Contacto
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+593 99 999 9999"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Imágenes de la Propiedad
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  {/* Existing Images */}
                  {isEditMode && existingImages.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Imágenes Actuales</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {existingImages.map((img) => (
                          <div key={img.id} className="relative group">
                            <img
                              src={img.image}
                              alt="Property"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            {img.is_main && (
                              <span className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                Principal
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(img.id)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Images Preview */}
                  {images.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Nuevas Imágenes ({images.length}/10)
                        <span className="ml-2 text-xs text-blue-600 font-normal">✨ Serán optimizadas automáticamente</span>
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((img, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={img.preview}
                              alt="Preview"
                              className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                            />
                            {/* File size badge */}
                            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                              {img.size} MB
                            </div>
                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveNewImage(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              title="Eliminar imagen"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div>
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-all hover:border-primary">
                      <div className="flex flex-col items-center justify-center py-4 px-6">
                        <svg className="h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-600 font-semibold mb-1">Haz clic para subir imágenes</p>
                        <p className="text-xs text-gray-500">PNG, JPG, WebP • Máx. 10MB por imagen</p>
                        <p className="text-xs text-blue-600 mt-2 font-medium">✨ Optimización automática sin pérdida de calidad</p>
                        <p className="text-xs text-gray-400 mt-1">Máximo 10 imágenes</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        multiple
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <button
                      type="submit"
                      className="w-full sm:flex-1 inline-flex justify-center items-center px-6 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:from-primary/90 hover:to-secondary/90 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {isEditMode ? 'Actualizar Propiedad' : 'Guardar Propiedad'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/my-properties')}
                      className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                    >
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* estilos de medición */}
      <style>{`
        .edge-label .edge-badge,
        .live-measure .live-badge {
          background: rgba(0,0,0,0.78);
          color: #fff;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          transform: translate(-50%, -120%);
          box-shadow: 0 2px 6px rgba(0,0,0,.15);
        }
      `}</style>
    </div>
  );
};

export default AddProperty;
