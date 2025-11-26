'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';
import PrivateRoute from '@/components/PrivateRoute';
import LocationSelect from '@/components/LocationSelect';

// Dynamically import the map component with no SSR
const AddPropertyMap = dynamic(() => import('@/components/maps/AddPropertyMap'), {
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

const formatAreaM2 = (m2: number) => (Math.round(m2 * 100) / 100).toFixed(2);

const EditPropertyPage = () => {
  const params = useParams();
  const propertyId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [polygonCoords, setPolygonCoords] = useState<any[]>([]);
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
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [newImages, setNewImages] = useState<any[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

  // Geocoding
  const [loadingLocation, setLoadingLocation] = useState(false);

  const { token, logout } = useAuth();
  const router = useRouter();

  // Load property data
  useEffect(() => {
    const loadProperty = async () => {
      if (!propertyId) return;

      try {
        const { apiGet } = await import('@/lib/api');
        const res = await apiGet(`/properties/${propertyId}/`);

        if (res.ok) {
          const property = await res.json();

          // General Information
          setTitle(property.title || '');
          setDescription(property.description || '');
          setPropertyType(property.property_type || 'land');
          setStatus(property.status || 'for_sale');

          // Location
          setAddress(property.address || '');
          setCity(property.city || 'Macas');
          setProvince(property.province || 'Morona Santiago');
          setLatitude(property.latitude?.toString() || '');
          setLongitude(property.longitude?.toString() || '');

          // Polygon
          if (property.polygon) {
            let coords: any[] = [];
            // Check if polygon is in GeoJSON format
            if (property.polygon.coordinates && Array.isArray(property.polygon.coordinates[0])) {
              // Convert GeoJSON [lng, lat] to [lat, lng]
              coords = property.polygon.coordinates[0].map((c: any) => [c[1], c[0]]);
            } else if (Array.isArray(property.polygon)) {
              coords = property.polygon;
            }
            setPolygonCoords(coords);
          }

          // Characteristics
          setArea(parseFloat(property.area) || 0);
          setBuiltArea(property.built_area?.toString() || '');
          setRooms(property.rooms || 0);
          setBathrooms(property.bathrooms || 0);
          setParkingSpaces(property.parking_spaces || 0);
          setFloors(property.floors?.toString() || '');
          setFurnished(property.furnished || false);
          setYearBuilt(property.year_built?.toString() || '');

          // Financial Information
          setPrice(property.price?.toString() || '');
          setIsNegotiable(property.is_negotiable ?? true);

          // Contact
          setContactPhone(property.contact_phone || '');

          // Images
          if (property.images && Array.isArray(property.images)) {
            setExistingImages(property.images);
          }

          setLoading(false);
        } else if (res.status === 401) {
          toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
          logout();
          router.push('/login');
        } else if (res.status === 404) {
          toast.error('Propiedad no encontrada');
          router.push('/my-properties');
        } else {
          toast.error('Error al cargar la propiedad');
          router.push('/my-properties');
        }
      } catch (error) {
        console.error('Error loading property:', error);
        toast.error('Error de conexión');
        router.push('/my-properties');
      }
    };

    loadProperty();
  }, [propertyId, logout, router]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (latitude) formData.append('latitude', parseFloat(latitude).toString());
      if (longitude) formData.append('longitude', parseFloat(longitude).toString());
      if (polygonCoords.length >= 3) {
        formData.append('polygon', JSON.stringify(polygonCoords));
      }

      // Characteristics
      formData.append('area', parseFloat(area.toString()).toString());
      if (builtArea) formData.append('built_area', parseFloat(builtArea).toString());
      formData.append('rooms', parseInt(rooms.toString()).toString());
      formData.append('bathrooms', parseInt(bathrooms.toString()).toString());
      formData.append('parking_spaces', parseInt(parkingSpaces.toString()).toString());
      if (floors) formData.append('floors', parseInt(floors).toString());
      formData.append('furnished', furnished.toString());
      if (yearBuilt) formData.append('year_built', parseInt(yearBuilt).toString());

      // Financial Information
      formData.append('price', price);
      formData.append('is_negotiable', isNegotiable.toString());

      // Contact
      formData.append('contact_phone', contactPhone);

      // Images to delete
      if (imagesToDelete.length > 0) {
        formData.append('images_to_delete', JSON.stringify(imagesToDelete));
      }

      // New images - append each image file
      newImageFiles.forEach((file) => {
        formData.append('uploaded_images', file);
      });

      const { apiFetch } = await import('@/lib/api');

      const res = await apiFetch(`/properties/${propertyId}/`, {
        method: 'PUT',
        body: formData,
      });

      if (res.ok) {
        toast.success('Propiedad actualizada exitosamente');
        router.push('/my-properties');
      } else if (res.status === 401) {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        logout();
        router.push('/login');
      } else {
        const errorData = await res.json();
        console.error('Error:', errorData);
        toast.error('No se pudo actualizar la propiedad');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error de conexión');
    }
  };

  const handleClear = () => {
    const map = (window as any)._leaflet_map_ref;
    if (map) {
      map.eachLayer((layer: any) => {
        if (layer.pm && layer instanceof (window as any).L.Polygon) {
          if (layer._edgeMarkers) layer._edgeMarkers.forEach((m: any) => m.remove());
          map.removeLayer(layer);
        }
      });
    }
    setPolygonCoords([]);
    setArea(0);
  };

  const bindMapRef = (map: any) => { (window as any)._leaflet_map_ref = map; };

  // Get location from map polygon
  const handleGetLocationFromMap = async () => {
    if (polygonCoords.length < 3) {
      toast.warning('Primero dibuja un polígono en el mapa');
      return;
    }

    setLoadingLocation(true);

    try {
      const { reverseGeocodePolygon } = await import('@/lib/geocoding');
      const result = await reverseGeocodePolygon(polygonCoords as [number, number][]);

      if (result) {
        // Auto-fill location fields
        if (result.address) setAddress(result.address);
        if (result.city) setCity(result.city);
        if (result.province) setProvince(result.province);

        toast.success('Ubicación obtenida del mapa exitosamente');
      } else {
        toast.error('No se pudo obtener la ubicación. Intenta con otro punto del mapa.');
      }
    } catch (error) {
      console.error('Error en geocodificación:', error);
      toast.error('Error al obtener la ubicación');
    } finally {
      setLoadingLocation(false);
    }
  };

  // Handle new image selection with validation
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validaciones
    const MAX_IMAGES = 10;
    const MAX_SIZE_MB = 10;
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    // Validar número máximo de imágenes (existentes + nuevas - a eliminar)
    const totalImages = existingImages.length - imagesToDelete.length + newImages.length + files.length;
    if (totalImages > MAX_IMAGES) {
      alert(`Solo puedes tener un máximo de ${MAX_IMAGES} imágenes por propiedad. Actualmente tienes ${existingImages.length - imagesToDelete.length + newImages.length} y estás intentando agregar ${files.length}.`);
      e.target.value = '';
      return;
    }

    // Validar cada archivo
    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
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

      validFiles.push(file);
    });

    // Mostrar errores si los hay
    if (errors.length > 0) {
      alert('❌ Algunas imágenes no pudieron ser agregadas:\n\n' + errors.join('\n'));
    }

    // Si hay archivos válidos, agregarlos
    if (validFiles.length > 0) {
      setNewImageFiles([...newImageFiles, ...validFiles]);

      // Create preview URLs
      const newImagesPreview = validFiles.map((file) => {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
          file,
          preview: URL.createObjectURL(file),
          size: sizeMB,
          name: file.name
        };
      });
      setNewImages([...newImages, ...newImagesPreview]);

      // Mostrar mensaje de éxito
      if (validFiles.length > 0) {
        console.log(`✅ ${validFiles.length} imagen(es) agregada(s). Las imágenes serán optimizadas automáticamente al subir.`);
      }
    }

    // Reset input
    e.target.value = '';
  };

  // Remove new image
  const handleRemoveNewImage = (index: number) => {
    const newImagesFiltered = newImages.filter((_, i) => i !== index);
    const newFilesFiltered = newImageFiles.filter((_, i) => i !== index);
    setNewImages(newImagesFiltered);
    setNewImageFiles(newFilesFiltered);
  };

  // Mark existing image for deletion
  const handleDeleteExistingImage = (imageId: number) => {
    if (imagesToDelete.includes(imageId)) {
      setImagesToDelete(imagesToDelete.filter(id => id !== imageId));
    } else {
      setImagesToDelete([...imagesToDelete, imageId]);
    }
  };

  if (loading) {
    return (
      <PrivateRoute>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando propiedad...</p>
          </div>
        </div>
      </PrivateRoute>
    );
  }

  return (
    <PrivateRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Editar Propiedad
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Actualiza la información de tu propiedad
                </p>
              </div>
              <button
                onClick={() => router.push('/my-properties')}
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
                    Edita el polígono de la propiedad
                  </p>
                </div>
                <div className="relative h-[300px] sm:h-[400px] lg:h-[500px]">
                  <AddPropertyMap
                    onMapReady={bindMapRef}
                    onPolygonChange={setPolygonCoords}
                    onAreaChange={setArea}
                    initialPolygon={polygonCoords}
                  />
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
                          rows={3}
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
                    {/* Get Location Button */}
                    <div className="flex justify-end mb-4">
                      <button
                        type="button"
                        onClick={handleGetLocationFromMap}
                        disabled={loadingLocation || polygonCoords.length < 3}
                        className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loadingLocation ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Obteniendo ubicación...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Obtener Ubicación del Mapa
                          </>
                        )}
                      </button>
                    </div>

                    {/* Location Select Component */}
                    <LocationSelect
                      provinceValue={province}
                      cityValue={city}
                      onProvinceChange={setProvince}
                      onCityChange={setCity}
                    />

                    {/* Address Field */}
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ej: Av. Principal #123"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
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
                                onChange={(e) => setRooms(Number(e.target.value))}
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
                              onChange={(e) => setBathrooms(Number(e.target.value))}
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
                              onChange={(e) => setParkingSpaces(Number(e.target.value))}
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
                              onChange={(e) => setParkingSpaces(Number(e.target.value))}
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
                    {existingImages.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          Imágenes Actuales ({existingImages.length - imagesToDelete.length}/{existingImages.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {existingImages.map((img) => (
                            <div key={img.id} className="relative group">
                              <img
                                src={img.image}
                                alt="Property"
                                className={`w-full h-32 object-cover rounded-lg border-2 ${
                                  imagesToDelete.includes(img.id) ? 'border-red-500 opacity-50' : 'border-gray-200'
                                }`}
                              />
                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteExistingImage(img.id)}
                                className={`absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                                  imagesToDelete.includes(img.id)
                                    ? 'bg-green-500 hover:bg-green-600'
                                    : 'bg-red-500 hover:bg-red-600'
                                } text-white`}
                                title={imagesToDelete.includes(img.id) ? 'Restaurar imagen' : 'Eliminar imagen'}
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  {imagesToDelete.includes(img.id) ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  )}
                                </svg>
                              </button>
                              {imagesToDelete.includes(img.id) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                                  <span className="text-white text-xs font-bold">Se eliminará</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New Images Preview */}
                    {newImages.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          Nuevas Imágenes ({newImages.length})
                          <span className="ml-2 text-xs text-blue-600 font-normal">✨ Serán optimizadas automáticamente</span>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {newImages.map((img, index) => (
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
                          <p className="text-xs text-gray-400 mt-1">
                            Máximo 10 imágenes ({existingImages.length - imagesToDelete.length + newImages.length}/10)
                          </p>
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
                        Actualizar Propiedad
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push('/my-properties')}
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
      </div>
    </PrivateRoute>
  );
};

export default EditPropertyPage;
