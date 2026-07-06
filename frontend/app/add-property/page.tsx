'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'react-toastify';
import dynamic from 'next/dynamic';
import LocationSelect from '@/components/LocationSelect';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import { trackEvent } from '@/lib/analytics';

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

const PROPERTY_DRAFT_STORAGE_KEY = 'propertyPublicationDraft';

const AddPropertyPage = () => {
  const mapRef = useRef<any>(null);
  const [polygonCoords, setPolygonCoords] = useState<any[]>([]);
  const [area, setArea] = useState(0);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [referenceProperties, setReferenceProperties] = useState<any[]>([]);

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
  const [landType, setLandType] = useState('');
  const [hasWater, setHasWater] = useState(false);
  const [hasElectricity, setHasElectricity] = useState(false);

  // Financial Information
  const [price, setPrice] = useState('');
  const [isNegotiable, setIsNegotiable] = useState(true);

  // Contact
  const [contactPhone, setContactPhone] = useState('');

  // Images
  const [images, setImages] = useState<any[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // Geocoding
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Location permission modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLocationToast, setShowLocationToast] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountFirstName, setAccountFirstName] = useState('');
  const [accountLastName, setAccountLastName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const formStartedRef = useRef(false);
  const polygonTrackedRef = useRef(false);

  const { token, logout } = useAuth();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  const trackFormStarted = () => {
    if (formStartedRef.current) return;
    formStartedRef.current = true;
    trackEvent('publication_form_started', {
      has_session: Boolean(token),
      draft_loaded: draftLoaded,
    });
  };

  const hasDraftContent = () => {
    return Boolean(
      title.trim() ||
      description.trim() ||
      address.trim() ||
      city.trim() ||
      province.trim() ||
      price.trim() ||
      contactPhone.trim() ||
      polygonCoords.length >= 3 ||
      images.length > 0
    );
  };

  const handlePolygonChange = (coords: any[]) => {
    setPolygonCoords(coords);

    if (coords.length >= 3 && !polygonTrackedRef.current) {
      polygonTrackedRef.current = true;
      trackEvent('publication_polygon_drawn', {
        has_session: Boolean(token),
        points: coords.length,
      });
    }
  };

  useEffect(() => {
    trackEvent('publication_form_viewed', {
      has_session: Boolean(token),
    });
  }, [token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedDraft = localStorage.getItem(PROPERTY_DRAFT_STORAGE_KEY);
    if (!storedDraft) return;

    try {
      const draft = JSON.parse(storedDraft);
      if (draft.title) setTitle(draft.title);
      if (draft.description) setDescription(draft.description);
      if (draft.property_type) setPropertyType(draft.property_type);
      if (draft.status) setStatus(draft.status);
      if (draft.address) setAddress(draft.address);
      if (draft.city) setCity(draft.city);
      if (draft.province) setProvince(draft.province);
      if (draft.latitude) setLatitude(draft.latitude);
      if (draft.longitude) setLongitude(draft.longitude);
      if (draft.polygon) setPolygonCoords(draft.polygon);
      if (draft.area) setArea(Number(draft.area));
      if (draft.show_measurements !== undefined) setShowMeasurements(Boolean(draft.show_measurements));
      if (draft.built_area) setBuiltArea(draft.built_area);
      if (draft.rooms !== undefined) setRooms(Number(draft.rooms));
      if (draft.bathrooms !== undefined) setBathrooms(Number(draft.bathrooms));
      if (draft.parking_spaces !== undefined) setParkingSpaces(Number(draft.parking_spaces));
      if (draft.floors) setFloors(draft.floors);
      if (draft.furnished !== undefined) setFurnished(Boolean(draft.furnished));
      if (draft.year_built) setYearBuilt(draft.year_built);
      if (draft.price) setPrice(draft.price);
      if (draft.is_negotiable !== undefined) setIsNegotiable(Boolean(draft.is_negotiable));
      if (draft.contact_phone) setContactPhone(draft.contact_phone);
      setDraftLoaded(true);
    } catch (error) {
      console.error('Error loading property draft:', error);
    }
  }, []);

  // Check location permission on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const locationPermissionAsked = localStorage.getItem('locationPermissionAsked');
      const hasInitialLocation = localStorage.getItem('hasInitialLocation');

      if (!locationPermissionAsked && !hasInitialLocation) {
        setTimeout(() => {
          setShowLocationModal(true);
        }, 500);
      } else if (hasInitialLocation === 'true') {
        if (navigator.geolocation) {
          setLoadingLocation(true);
          setShowLocationToast(true);

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setUserLocation({ lat: latitude, lng: longitude });
              setLoadingLocation(false);

              setTimeout(() => {
                setShowLocationToast(false);
              }, 2000);
            },
            (error) => {
              console.error('Error obteniendo ubicación:', error);
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

  // Load all properties to show as reference
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { apiFetch } = await import('@/lib/api');
        const res = await apiFetch('/properties/', {
          skipAuth: !token,
        });

        if (res.ok) {
          const data = await res.json();
          setReferenceProperties(data);
        } else {
          console.error('Error loading reference properties');
        }
      } catch (error) {
        console.error('Error fetching reference properties:', error);
      }
    };

    fetchProperties();
  }, [token]);

  const handleAcceptLocation = async () => {
    setShowLocationModal(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem('locationPermissionAsked', 'true');
    }

    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });

        if (permissionStatus.state === 'denied') {
          toast.error('El permiso de ubicación está bloqueado. Por favor habilítalo en la configuración de tu navegador.');
          return;
        }
      } catch (error) {
        // Permissions API no disponible (iOS Safari): continuar de todos modos
      }
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        if (typeof window !== 'undefined') {
          localStorage.setItem('hasInitialLocation', 'true');
        }

        setLoadingLocation(false);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);

        let errorMessage = 'No se pudo obtener tu ubicación';
        if (isIOS) {
          errorMessage = 'Permiso denegado. Para habilitarlo en iPhone: Configuración > Safari > Ubicación > Permitir';
        } else if (isAndroid) {
          errorMessage = 'Permiso denegado. Para habilitarlo: Configuración del sitio > Permisos > Ubicación > Permitir';
        }

        toast.error(errorMessage);
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  };

  const handleDeclineLocation = () => {
    setShowLocationModal(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem('locationPermissionAsked', 'true');
      localStorage.setItem('hasInitialLocation', 'false');
    }
  };

  const savePublicationDraft = () => {
    if (typeof window === 'undefined') return;
    if (!hasDraftContent()) return;

    const draft = {
      draft_status: token ? 'authenticated_draft' : 'pending_account',
      title,
      description,
      property_type: propertyType,
      status,
      address,
      city,
      province,
      latitude,
      longitude,
      polygon: polygonCoords,
      show_measurements: showMeasurements,
      area,
      built_area: builtArea,
      rooms,
      bathrooms,
      parking_spaces: parkingSpaces,
      floors,
      furnished,
      year_built: yearBuilt,
      price,
      is_negotiable: isNegotiable,
      contact_phone: contactPhone,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(PROPERTY_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setDraftSavedAt(new Date());
  };

  const buildWhatsAppDraftUrl = () => {
    const operationLabel = status === 'for_rent' ? 'Alquiler' : 'Venta';
    const typeLabel =
      propertyType === 'house' ? 'Casa' :
      propertyType === 'apartment' ? 'Departamento' :
      propertyType === 'commercial' ? 'Local comercial' :
      propertyType === 'land' ? 'Terreno' : 'Otro';

    const message = [
      'Hola, necesito ayuda para publicar esta propiedad en Geo Propiedades Ecuador.',
      '',
      `Titulo: ${title || 'Por completar'}`,
      `Tipo: ${typeLabel}`,
      `Operacion: ${operationLabel}`,
      `Ciudad/provincia: ${city || 'Por completar'}${province ? `, ${province}` : ''}`,
      `Area: ${area ? `${area} m2` : 'Por completar'}`,
      `Precio: ${price || 'Por completar'}`,
      `Telefono: ${contactPhone || 'Por completar'}`,
      `Tiene poligono dibujado: ${polygonCoords.length >= 3 ? 'Si' : 'No'}`,
      `Fotos cargadas en el formulario: ${images.length}`,
      `Detalles: ${description || 'Por completar'}`,
    ].join('\n');

    return `https://wa.me/593983738151?text=${encodeURIComponent(message)}`;
  };

  const buildUsername = (email: string) => {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18) || 'usuario';
    return `${base}_${Date.now().toString().slice(-5)}`.toLowerCase();
  };

  const savePendingPublication = async (source: 'account_required' | 'whatsapp_help' | 'exit_prompt') => {
    if (!hasDraftContent()) return;

    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch('/pending-publications/', {
        method: 'POST',
        skipAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          contact_phone: contactPhone,
          contact_email: accountEmail,
          city,
          province,
          property_type: propertyType,
          operation: status,
          price,
          source,
          draft: {
            title,
            description,
            property_type: propertyType,
            status,
            address,
            city,
            province,
            latitude,
            longitude,
            polygon: polygonCoords,
            show_measurements: showMeasurements,
            area,
            built_area: builtArea,
            rooms,
            bathrooms,
            parking_spaces: parkingSpaces,
            floors,
            furnished,
            year_built: yearBuilt,
            price,
            is_negotiable: isNegotiable,
            contact_phone: contactPhone,
            images_count: images.length,
          },
        }),
      });

      trackEvent(res.ok ? 'publication_pending_saved' : 'publication_pending_save_failed', {
        source,
        status_code: res.status,
      });
    } catch (error) {
      console.error('Error saving pending publication:', error);
      trackEvent('publication_pending_save_failed', {
        source,
        status_code: 'network',
      });
    }
  };

  const handleWhatsAppHelp = async () => {
    savePublicationDraft();
    await savePendingPublication('whatsapp_help');
    trackEvent('publication_whatsapp_help_clicked', {
      has_session: Boolean(token),
      has_polygon: polygonCoords.length >= 3,
      has_images: images.length > 0,
      property_type: propertyType,
    });
    window.open(buildWhatsAppDraftUrl(), '_blank', 'noopener,noreferrer');
  };

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingAccount(true);
    savePublicationDraft();

    try {
      const res = await fetch(`${API_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: buildUsername(accountEmail),
          first_name: accountFirstName,
          last_name: accountLastName,
          email: accountEmail,
          password: accountPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          data.detail ||
          data.email?.[0] ||
          data.password?.[0] ||
          data.username?.[0] ||
          'No se pudo crear la cuenta';
        toast.error(message);
        trackEvent('publication_account_create_failed', {
          status_code: res.status,
        });
        return;
      }

      trackEvent('publication_account_created_from_modal');
      toast.success('Cuenta creada. Verifica tu correo para publicar el anuncio.');
      router.push(`/verify-email?email=${encodeURIComponent(accountEmail)}`);
    } catch (error) {
      toast.error('Error de conexión al crear cuenta');
      trackEvent('publication_account_create_failed', {
        status_code: 'network',
      });
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleCancel = () => {
    if (hasDraftContent()) {
      savePublicationDraft();
      void savePendingPublication('exit_prompt');
      setShowExitModal(true);
      trackEvent('publication_exit_prompt_shown', {
        has_session: Boolean(token),
        has_polygon: polygonCoords.length >= 3,
        has_images: images.length > 0,
      });
      return;
    }

    router.push(token ? '/my-properties' : '/');
  };

  useEffect(() => {
    if (!formStartedRef.current || !hasDraftContent()) return;

    const timeout = setTimeout(() => {
      savePublicationDraft();
    }, 800);

    return () => clearTimeout(timeout);
  }, [
    title,
    description,
    propertyType,
    status,
    address,
    city,
    province,
    latitude,
    longitude,
    polygonCoords,
    showMeasurements,
    area,
    builtArea,
    rooms,
    bathrooms,
    parkingSpaces,
    floors,
    furnished,
    yearBuilt,
    price,
    isNegotiable,
    contactPhone,
    images.length,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasDraftContent()) return;

      savePublicationDraft();
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [
    title,
    description,
    propertyType,
    status,
    address,
    city,
    province,
    latitude,
    longitude,
    polygonCoords,
    showMeasurements,
    area,
    builtArea,
    rooms,
    bathrooms,
    parkingSpaces,
    floors,
    furnished,
    yearBuilt,
    price,
    isNegotiable,
    contactPhone,
    images.length,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    trackEvent('publication_submit_attempted', {
      has_session: Boolean(token),
      has_polygon: polygonCoords.length >= 3,
      has_images: imageFiles.length > 0,
      property_type: propertyType,
      status,
    });

    if (!token) {
      savePublicationDraft();
      await savePendingPublication('account_required');
      trackEvent('publication_account_required', {
        has_polygon: polygonCoords.length >= 3,
        has_images: imageFiles.length > 0,
        property_type: propertyType,
        status,
      });
      toast.info('Tu anuncio está listo. Crea una cuenta para publicarlo.');
      setShowAccountModal(true);
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
      formData.append('show_measurements', showMeasurements.toString());

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

      // Images - append each image file
      imageFiles.forEach((file) => {
        formData.append('uploaded_images', file);
      });

      const { apiFetch } = await import('@/lib/api');

      const res = await apiFetch('/properties/', {
        method: 'POST',
        body: formData,
        // No incluir Content-Type en headers para que el navegador lo establezca automáticamente con boundary
      });

      if (res.ok) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
        }
        trackEvent('publication_created', {
          has_polygon: polygonCoords.length >= 3,
          images_count: imageFiles.length,
          property_type: propertyType,
          status,
        });
        toast.success('Propiedad creada exitosamente');
        router.push('/my-properties');
      } else if (res.status === 401) {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        logout();
        router.push('/login');
      } else {
        const errorData = await res.json();
        console.error('Error:', errorData);
        trackEvent('publication_create_failed', {
          status_code: res.status,
          property_type: propertyType,
          has_polygon: polygonCoords.length >= 3,
        });
        toast.error('No se pudo guardar la propiedad');
      }
    } catch (error) {
      console.error('Error:', error);
      trackEvent('publication_create_failed', {
        status_code: 'network',
        property_type: propertyType,
        has_polygon: polygonCoords.length >= 3,
      });
      toast.error('Error de conexión');
    }
  };

  const handleClear = () => {
    const map = (window as any)._leaflet_map_ref;
    if (map) {
      map.eachLayer((layer: any) => {
        if (layer.pm && layer instanceof (window as any).L.Polygon) {
          const path = (layer as any)._path;
          const hasClassList = !!(path && path.classList);
          if (layer._edgeMarkers) {
            layer._edgeMarkers.forEach((m: any) => {
              if (m && m.remove && m._map) {
                try { m.remove(); } catch {}
              }
            });
          }
          try {
            if (hasClassList) {
              layer.pm?.disable?.();
            }
          } catch {}
          try {
            if (hasClassList && map.hasLayer(layer)) {
              map.removeLayer(layer);
            } else if (layer.remove) {
              layer.remove();
            }
          } catch {}
        }
      });
    }
    setPolygonCoords([]);
  };

  const handleGetMyLocation = () => {
    trackEvent('publication_location_requested', {
      has_session: Boolean(token),
    });

    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 17, {
            duration: 1.2
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

  const bindMapRef = (map: any) => {
    (window as any)._leaflet_map_ref = map;
    mapRef.current = map;
  };

  // Handle image selection with validation
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validaciones
    const MAX_IMAGES = 10;
    const MAX_SIZE_MB = 10;
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    // Validar número máximo de imágenes
    const totalImages = images.length + files.length;
    if (totalImages > MAX_IMAGES) {
      toast.error(`Máximo ${MAX_IMAGES} imágenes por propiedad. Ya tienes ${images.length}.`);
      e.target.value = ''; // Reset input
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
      toast.error('Algunas imágenes no se pudieron agregar: ' + errors.join(' · '));
    }

    // Si hay archivos válidos, agregarlos
    if (validFiles.length > 0) {
      trackEvent('publication_images_added', {
        files_count: validFiles.length,
        total_images: images.length + validFiles.length,
      });

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
    }

    // Reset input
    e.target.value = '';
  };

  // Remove new image
  const handleRemoveNewImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImages(newImages);
    setImageFiles(newFiles);
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Publicar propiedad gratis
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Completa los datos principales. Si algo se complica, te ayudamos por WhatsApp.
                </p>
              </div>
              <button
                onClick={handleCancel}
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
          <div className="space-y-4 lg:space-y-6">
            <form onSubmit={handleSubmit} onChange={trackFormStarted} className="space-y-4 lg:space-y-6">
                <div className="sticky top-12 z-[600] rounded-2xl border border-line bg-white/95 p-4 shadow-lg backdrop-blur">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold text-gray-600 sm:text-xs">
                      {[
                        { label: 'Datos', done: Boolean(title.trim()) },
                        { label: 'Ubicacion', done: polygonCoords.length >= 3 || Boolean(city.trim()) },
                        { label: 'Precio', done: Boolean(price.trim()) },
                        { label: 'Contacto', done: Boolean(contactPhone.trim()) },
                      ].map((step) => (
                        <div
                          key={step.label}
                          className={`rounded-lg px-2 py-2 ${
                            step.done ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {step.label}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs font-medium text-gray-600">
                      {draftSavedAt
                        ? `Borrador guardado ${draftSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'Tu borrador se guarda automáticamente'}
                    </p>
                  </div>
                </div>
                {draftLoaded && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900 shadow-sm">
                    <p className="font-bold">Cargamos tu borrador.</p>
                    <p className="mt-1 text-sm">
                      Revisa los datos, completa el mapa, agrega fotos si tienes y guarda la propiedad.
                    </p>
                  </div>
                )}
                <div className="rounded-2xl border border-primary/15 bg-white p-5 shadow-lg">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Sin costo</p>
                      <p className="mt-1 text-sm text-gray-600">No cobramos por publicar ni comisión por cerrar negocio.</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Contacto directo</p>
                      <p className="mt-1 text-sm text-gray-600">Los interesados pueden llamarte o escribirte por WhatsApp.</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Mejor ubicación</p>
                      <p className="mt-1 text-sm text-gray-600">El mapa ayuda a mostrar la zona y las medidas del predio.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-950 shadow-sm">
                  <p className="font-bold">Publicar es gratis y sin comisión</p>
                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
                    <p>Puedes editar o eliminar tu anuncio cuando quieras.</p>
                    <p>Los interesados te contactan directo por teléfono o WhatsApp.</p>
                    <p>Si algo se complica, te ayudamos a terminar la publicación.</p>
                  </div>
                </div>
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
                          <option value="land">Terreno</option>
                          <option value="house">Casa</option>
                          <option value="apartment">Apartamento</option>
                          <option value="commercial">Comercial</option>
                          <option value="other">Otro</option>
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
                          <option value="for_sale">En venta</option>
                          <option value="for_rent">En alquiler</option>
                          <option value="sold">Vendido</option>
                          <option value="rented">Alquilado</option>
                          <option value="inactive">Inactivo</option>
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

                {/* Map Section */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                    <h2 className="text-base lg:text-lg font-semibold text-white flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Ubicación en el Mapa
                    </h2>
                <p className="text-xs lg:text-sm text-white/90 mt-1">
                  Opcional: dibuja el área para mostrar medidas exactas. También puedes publicar con ubicación aproximada.
                </p>
                <p className="text-[11px] lg:text-xs text-white/90 mt-1">
                  Tip: si estás en móvil y se complica, completa el área manualmente y publica. Luego podemos ayudarte a mejorar el mapa.
                </p>

              </div>
              <div className="relative h-[400px] sm:h-[500px] lg:h-[600px]">
                    <button
                      type="button"
                      onClick={handleGetMyLocation}
                      disabled={loadingLocation}
                      className="absolute bottom-3 right-3 z-[500] bg-white text-primary p-2.5 sm:p-3 rounded-full shadow-lg hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Mi ubicación"
                      title="Ir a mi ubicación"
                    >
                      {loadingLocation ? (
                        <svg className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                      <AddPropertyMap
                        onMapReady={bindMapRef}
                        onPolygonChange={handlePolygonChange}
                        onAreaChange={setArea}
                      initialPolygon={polygonCoords}
                      userCenter={userLocation ? [userLocation.lat, userLocation.lng] : undefined}
                      userZoom={userLocation ? 12 : undefined}
                      userLocation={userLocation}
                      showMeasurements={showMeasurements}
                      referenceProperties={referenceProperties}
                    />
                  </div>
                  <div className="px-4 py-3 bg-gray-50 border-t">
                    <button
                      type="button"
                      onClick={handleClear}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Limpiar polígono opcional
                    </button>
                  </div>
                </div>

                {/* Characteristics */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-primary to-secondary">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Características del Predio
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Área Total (m²) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={area || ''}
                          onChange={(e) => setArea(Number(e.target.value || 0))}
                          placeholder="500"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Medidas del Polígono</label>
                        <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl">
                          <input
                            type="checkbox"
                            id="showMeasurements"
                            checked={showMeasurements}
                            onChange={(e) => setShowMeasurements(e.target.checked)}
                            className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                          />
                        <label htmlFor="showMeasurements" className="text-sm text-gray-700 cursor-pointer">
                            Mostrar medidas del polígono si lo dibujas
                            <p className="text-xs text-gray-500 mt-1">
                              Puedes publicar sin polígono. Si lo agregas, el área se calcula automáticamente.
                            </p>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {/* New Images Preview */}
                    {images.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">
                          Nuevas Imágenes ({images.length}/10)
                          <span className="ml-2 text-xs text-muted font-normal">Se optimizan automáticamente</span>
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
                          <p className="text-xs text-muted mt-2">Opcional, pero los anuncios con fotos suelen recibir más contactos</p>
                          <p className="text-xs text-gray-400 mt-1">Máximo 10 imágenes. Se optimizan automáticamente</p>
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
                        {token ? 'Guardar Propiedad' : 'Crear cuenta para publicar'}
                      </button>
                      <button
                        type="button"
                        onClick={handleWhatsAppHelp}
                        className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-4 border-2 border-primary text-primary rounded-xl hover:bg-primary/5 transition-all font-semibold"
                      >
                        Publicar con ayuda
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
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

            {/* Contact Support */}
            <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-white to-secondary/10 border border-primary/15 shadow-lg p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-semibold text-gray-900">¿Problemas técnicos o dudas?</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Escríbenos y te ayudamos a publicar tu propiedad en minutos.
                    </p>
                  </div>
                </div>
                <a
                  href="https://wa.me/593983738151?text=Hola%20necesito%20ayuda%20para%20publicar%20mi%20propiedad"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white px-5 py-3 font-semibold shadow hover:shadow-lg transition"
                >
                  Chatear por WhatsApp
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

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

        {showExitModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-gray-900">Tu anuncio no se ha publicado</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Guardamos el borrador en este navegador. Puedes volver luego, crear tu cuenta para publicarlo o pedir ayuda por WhatsApp.
              </p>
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowExitModal(false);
                    trackEvent('publication_exit_continue_clicked');
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-3 font-bold text-white"
                >
                  Seguir editando
                </button>
                <button
                  type="button"
                  onClick={handleWhatsAppHelp}
                  className="w-full rounded-xl border border-primary px-5 py-3 font-bold text-primary hover:bg-primary/5"
                >
                  Recibir ayuda por WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    trackEvent('publication_exit_confirmed');
                    router.push(token ? '/my-properties' : '/');
                  }}
                  className="w-full rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Salir y mantener borrador
                </button>
              </div>
            </div>
          </div>
        )}

        {showAccountModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-gray-900">Tu anuncio está listo</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Crea tu cuenta para guardar y publicar este anuncio. El borrador ya está guardado.
              </p>
              <form onSubmit={handleCreateAccount} className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                    <input
                      value={accountFirstName}
                      onChange={(e) => setAccountFirstName(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Apellido</label>
                    <input
                      value={accountLastName}
                      onChange={(e) => setAccountLastName(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Correo</label>
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingAccount}
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary px-5 py-3 font-bold text-white disabled:opacity-50"
                >
                  {creatingAccount ? 'Creando cuenta...' : 'Crear cuenta y publicar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="w-full rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Seguir editando
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Custom Styles */}
        <style>{`
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

export default AddPropertyPage;
