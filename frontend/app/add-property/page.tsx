'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Info,
  LocateFixed,
  MapPin,
  Pentagon,
  Ruler,
  DollarSign,
  Phone,
  ImagePlus,
  UploadCloud,
  Check,
  X,
  Loader2,
  Trash2,
  MessageCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { buildWhatsAppUrl } from '@/lib/constants';
import { trackEvent } from '@/lib/analytics';
import LocationSelect from '@/components/LocationSelect';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import GoogleSignInButton from '@/components/GoogleSignInButton';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AddPropertyMap = dynamic(() => import('@/components/maps/AddPropertyMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <div className="text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-textSecondary">Cargando mapa...</p>
      </div>
    </div>
  ),
});

const PROPERTY_DRAFT_STORAGE_KEY = 'propertyPublicationDraft';

// Solo título y precio son obligatorios a nivel de esquema. El resto de los
// detalles físicos (área construida, habitaciones, baños, pisos) son opcionales
// para que publicar sea lo más rápido posible; se pueden completar después.
const propertySchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio'),
  description: z.string().optional(),
  propertyType: z.enum(['land', 'house', 'apartment', 'commercial', 'other']),
  status: z.enum(['for_sale', 'for_rent', 'sold', 'rented', 'inactive']),
  address: z.string().optional(),
  price: z.string().trim().min(1, 'El precio es obligatorio'),
  isNegotiable: z.boolean(),
  contactPhone: z.string().optional(),
  builtArea: z.string().optional(),
  rooms: z.string().optional(),
  bathrooms: z.string().optional(),
  parkingSpaces: z.string().optional(),
  floors: z.string().optional(),
  furnished: z.boolean(),
  yearBuilt: z.string().optional(),
});

type PropertyValues = z.infer<typeof propertySchema>;

function PreviewImage({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative h-32 w-full overflow-hidden rounded-lg border-2 border-line bg-muted">
      {!loaded && <Skeleton className="absolute inset-0" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Preview"
        onLoad={() => setLoaded(true)}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-card bg-surface shadow-card">
      <div className="bg-primary px-5 py-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-white lg:text-lg">
          {icon}
          {title}
        </h3>
        {subtitle}
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </div>
  );
}

const AddPropertyPage = () => {
  const params = useParams();
  const propertyId = typeof params?.id === 'string' ? params.id : null;
  const isEditMode = Boolean(propertyId);
  const mapRef = useRef<any>(null);
  const [loadingProperty, setLoadingProperty] = useState(Boolean(propertyId));
  const [polygonCoords, setPolygonCoords] = useState<any[]>([]);
  const [locationMode, setLocationMode] = useState<'point' | 'polygon'>('point');
  const [area, setArea] = useState(0);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [referenceProperties, setReferenceProperties] = useState<any[]>([]);

  // Location (managed by LocationSelect + map, kept as local state)
  const [city, setCity] = useState('Macas');
  const [province, setProvince] = useState('Morona Santiago');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Images
  const [images, setImages] = useState<any[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

  // Geocoding
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Location permission modal
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showLocationToast, setShowLocationToast] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [accountFirstName, setAccountFirstName] = useState('');
  const [accountLastName, setAccountLastName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  // Gate de publicación: por defecto ofrece registrarse, pero si el usuario ya
  // tiene cuenta puede iniciar sesión ('login') y publicar sin crear otra.
  const [gateMode, setGateMode] = useState<'register' | 'login'>('register');
  const [loggingIn, setLoggingIn] = useState(false);
  // Cuando el login desde el gate tiene éxito, esperamos a que el token entre en
  // contexto para disparar la publicación automáticamente.
  const [pendingPublish, setPendingPublish] = useState(false);
  const formStartedRef = useRef(false);
  const polygonTrackedRef = useRef(false);
  const locationInitRef = useRef(false);
  const reverseGeocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { token, logout, login } = useAuth();
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  const form = useForm<PropertyValues>({
    resolver: zodResolver(propertySchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      propertyType: 'land',
      status: 'for_sale',
      address: '',
      price: '',
      isNegotiable: true,
      contactPhone: '',
      builtArea: '',
      rooms: '0',
      bathrooms: '0',
      parkingSpaces: '0',
      floors: '',
      furnished: false,
      yearBuilt: '',
    },
  });

  const values = form.watch();
  const propertyType = values.propertyType;

  const trackFormStarted = () => {
    if (formStartedRef.current) return;
    formStartedRef.current = true;
    if (isEditMode) return;
    trackEvent('publication_form_started', {
      has_session: Boolean(token),
      draft_loaded: draftLoaded,
    });
  };

  const hasDraftContent = () => {
    const v = form.getValues();
    return Boolean(
      v.title.trim() ||
        v.description?.trim() ||
        v.address?.trim() ||
        city.trim() ||
        province.trim() ||
        v.price.trim() ||
        v.contactPhone?.trim() ||
        latitude ||
        longitude ||
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
    if (!isEditMode || !propertyId) return;

    let cancelled = false;
    const loadProperty = async () => {
      setLoadingProperty(true);
      try {
        const { apiGet } = await import('@/lib/api');
        const res = await apiGet(`/properties/${propertyId}/`);

        if (!res.ok) {
          if (res.status === 401) {
            toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
            logout();
            router.push('/iniciar-sesion');
          } else if (res.status === 404) {
            toast.error('Propiedad no encontrada');
            router.push('/mis-propiedades');
          } else {
            toast.error('Error al cargar la propiedad');
            router.push('/mis-propiedades');
          }
          return;
        }

        const property = await res.json();
        if (cancelled) return;

        form.reset({
          title: property.title || '',
          description: property.description || '',
          propertyType: property.property_type || 'land',
          status: property.status || 'for_sale',
          address: property.address || '',
          price: property.price?.toString() || '',
          isNegotiable: property.is_negotiable ?? true,
          contactPhone: property.contact_phone || '',
          builtArea: property.built_area?.toString() || '',
          rooms: property.rooms !== undefined ? String(property.rooms) : '0',
          bathrooms: property.bathrooms !== undefined ? String(property.bathrooms) : '0',
          parkingSpaces: property.parking_spaces !== undefined ? String(property.parking_spaces) : '0',
          floors: property.floors?.toString() || '',
          furnished: property.furnished || false,
          yearBuilt: property.year_built?.toString() || '',
        });

        setCity(property.city || 'Macas');
        setProvince(property.province || 'Morona Santiago');
        setLatitude(property.latitude?.toString() || '');
        setLongitude(property.longitude?.toString() || '');

        if (property.polygon) {
          let coords: any[] = [];
          if (property.polygon.coordinates && Array.isArray(property.polygon.coordinates[0])) {
            coords = property.polygon.coordinates[0].map((c: any) => [c[1], c[0]]);
          } else if (Array.isArray(property.polygon)) {
            coords = property.polygon;
          }
          setPolygonCoords(coords);
          setLocationMode(coords.length >= 3 ? 'polygon' : 'point');
        } else if (property.latitude && property.longitude) {
          setLocationMode('point');
        }

        setArea(parseFloat(property.area) || 0);
        setShowMeasurements(property.show_measurements !== undefined ? property.show_measurements : true);
        setExistingImages(Array.isArray(property.images) ? property.images : []);
        setImagesToDelete([]);
        setImages([]);
        setImageFiles([]);
      } catch (error) {
        console.error('Error loading property:', error);
        toast.error('Error de conexión');
        router.push('/mis-propiedades');
      } finally {
        if (!cancelled) setLoadingProperty(false);
      }
    };

    void loadProperty();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, propertyId]);

  useEffect(() => {
    if (isEditMode) return;
    trackEvent('publication_form_viewed', {
      has_session: Boolean(token),
    });
  }, [isEditMode, token]);

  useEffect(() => {
    return () => {
      if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isEditMode) return;
    if (typeof window === 'undefined') return;

    const storedDraft = localStorage.getItem(PROPERTY_DRAFT_STORAGE_KEY);
    if (!storedDraft) return;

    try {
      const draft = JSON.parse(storedDraft);
      form.reset({
        title: draft.title ?? '',
        description: draft.description ?? '',
        propertyType: draft.property_type ?? 'land',
        status: draft.status ?? 'for_sale',
        address: draft.address ?? '',
        price: draft.price ?? '',
        isNegotiable: draft.is_negotiable !== undefined ? Boolean(draft.is_negotiable) : true,
        contactPhone: draft.contact_phone ?? '',
        builtArea: draft.built_area ?? '',
        rooms: draft.rooms !== undefined ? String(draft.rooms) : '0',
        bathrooms: draft.bathrooms !== undefined ? String(draft.bathrooms) : '0',
        parkingSpaces: draft.parking_spaces !== undefined ? String(draft.parking_spaces) : '0',
        floors: draft.floors ? String(draft.floors) : '',
        furnished: draft.furnished !== undefined ? Boolean(draft.furnished) : false,
        yearBuilt: draft.year_built ? String(draft.year_built) : '',
      });
      if (draft.city) setCity(draft.city);
      if (draft.province) setProvince(draft.province);
      if (draft.latitude) setLatitude(draft.latitude);
      if (draft.longitude) setLongitude(draft.longitude);
      if (draft.polygon) {
        setPolygonCoords(draft.polygon);
        setLocationMode('polygon');
      }
      if (draft.location_mode === 'point' || draft.location_mode === 'polygon') {
        setLocationMode(draft.location_mode);
      }
      if (draft.area) setArea(Number(draft.area));
      if (draft.show_measurements !== undefined) setShowMeasurements(Boolean(draft.show_measurements));
      setDraftLoaded(true);
    } catch (error) {
      console.error('Error loading property draft:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  // Pedir permiso de ubicación recién cuando el usuario llega al paso del mapa,
  // no al cargar la página. Así no interrumpimos antes de que tenga contexto.
  useEffect(() => {
    if (isEditMode) return;
    if (currentStep !== 1 || locationInitRef.current) return;
    if (typeof window === 'undefined') return;
    locationInitRef.current = true;

    const locationPermissionAsked = localStorage.getItem('locationPermissionAsked');
    const hasInitialLocation = localStorage.getItem('hasInitialLocation');

    if (!locationPermissionAsked && !hasInitialLocation) {
      setShowLocationModal(true);
    } else if (hasInitialLocation === 'true' && navigator.geolocation) {
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
          maximumAge: 0,
        }
      );
    }
  }, [currentStep, isEditMode]);

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
          setReferenceProperties(Array.isArray(data) ? data : data.results || []);
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
          setLocationBlocked(true);
          setShowLocationModal(true);
          toast.error('El permiso de ubicación está bloqueado. Revisa los pasos para activarlo en tu iPhone o navegador.');
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

        setLocationBlocked(false);
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
        if (error.code === error.PERMISSION_DENIED) {
          setLocationBlocked(true);
          setShowLocationModal(true);
        }
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
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
    if (isEditMode) return;
    if (typeof window === 'undefined') return;
    if (!hasDraftContent()) return;

    const v = form.getValues();
    const draft = {
      draft_status: token ? 'authenticated_draft' : 'pending_account',
      title: v.title,
      description: v.description,
      property_type: v.propertyType,
      status: v.status,
      address: v.address,
      city,
      province,
      latitude,
      longitude,
      location_mode: locationMode,
      polygon: polygonCoords,
      show_measurements: showMeasurements,
      area,
      built_area: v.builtArea,
      rooms: v.rooms,
      bathrooms: v.bathrooms,
      parking_spaces: v.parkingSpaces,
      floors: v.floors,
      furnished: v.furnished,
      year_built: v.yearBuilt,
      price: v.price,
      is_negotiable: v.isNegotiable,
      contact_phone: v.contactPhone,
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(PROPERTY_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setDraftSavedAt(new Date());
  };

  const buildWhatsAppDraftUrl = () => {
    const v = form.getValues();
    const operationLabel = v.status === 'for_rent' ? 'Alquiler' : 'Venta';
    const typeLabel =
      v.propertyType === 'house'
        ? 'Casa'
        : v.propertyType === 'apartment'
        ? 'Departamento'
        : v.propertyType === 'commercial'
        ? 'Local comercial'
        : v.propertyType === 'land'
        ? 'Terreno'
        : 'Otro';

    const message = [
      'Hola, necesito ayuda para publicar esta propiedad en Geo Propiedades Ecuador.',
      '',
      `Titulo: ${v.title || 'Por completar'}`,
      `Tipo: ${typeLabel}`,
      `Operacion: ${operationLabel}`,
      `Ciudad/provincia: ${city || 'Por completar'}${province ? `, ${province}` : ''}`,
      `Area: ${area ? `${area} m2` : 'Por completar'}`,
      `Precio: ${v.price || 'Por completar'}`,
      `Telefono: ${v.contactPhone || 'Por completar'}`,
      `Tiene poligono dibujado: ${polygonCoords.length >= 3 ? 'Si' : 'No'}`,
      `Fotos cargadas en el formulario: ${images.length}`,
      `Detalles: ${v.description || 'Por completar'}`,
    ].join('\n');

    return buildWhatsAppUrl(message);
  };

  const buildUsername = (email: string) => {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18) || 'usuario';
    return `${base}_${Date.now().toString().slice(-5)}`.toLowerCase();
  };

  const savePendingPublication = async (source: 'account_required' | 'whatsapp_help' | 'exit_prompt') => {
    if (!hasDraftContent()) return;

    const v = form.getValues();
    try {
      const { apiFetch } = await import('@/lib/api');
      const res = await apiFetch('/pending-publications/', {
        method: 'POST',
        skipAuth: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: v.title,
          contact_phone: v.contactPhone,
          contact_email: accountEmail,
          city,
          province,
          property_type: v.propertyType,
          operation: v.status,
          price: v.price,
          source,
          draft: {
            title: v.title,
            description: v.description,
            property_type: v.propertyType,
            status: v.status,
            address: v.address,
            city,
            province,
            latitude,
            longitude,
            location_mode: locationMode,
            polygon: polygonCoords,
            show_measurements: showMeasurements,
            area,
            built_area: v.builtArea,
            rooms: v.rooms,
            bathrooms: v.bathrooms,
            parking_spaces: v.parkingSpaces,
            floors: v.floors,
            furnished: v.furnished,
            year_built: v.yearBuilt,
            price: v.price,
            is_negotiable: v.isNegotiable,
            contact_phone: v.contactPhone,
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
    if (isEditMode) return;
    savePublicationDraft();
    await savePendingPublication('whatsapp_help');
    trackEvent('publication_whatsapp_help_clicked', {
      has_session: Boolean(token),
      has_polygon: polygonCoords.length >= 3,
      has_images: images.length > 0,
      property_type: form.getValues('propertyType'),
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
      router.push(`/verificar-correo?email=${encodeURIComponent(accountEmail)}`);
    } catch (error) {
      toast.error('Error de conexión al crear cuenta');
      trackEvent('publication_account_create_failed', {
        status_code: 'network',
      });
    } finally {
      setCreatingAccount(false);
    }
  };

  // Iniciar sesión con una cuenta existente desde el gate y publicar el borrador.
  const handleLoginAndPublish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggingIn(true);
    savePublicationDraft();

    try {
      const res = await fetch(`${API_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: accountEmail, password: accountPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorCode = data.code || data.detail;
        if (errorCode === 'email_not_verified') {
          const emailToVerify = data.email || accountEmail;
          toast.info('Verifica tu correo para publicar el anuncio.');
          router.push(`/verificar-correo?email=${encodeURIComponent(emailToVerify)}`);
          return;
        }
        const message =
          data.detail ||
          (Array.isArray(data.email) ? data.email[0] : data.email) ||
          'Correo o contraseña incorrectos';
        toast.error(message);
        trackEvent('publication_login_failed', { status_code: res.status });
        return;
      }

      trackEvent('publication_login_from_modal');
      login(data.access, data.refresh, true);
      savePublicationDraft();
      setShowAccountModal(false);
      // El token entra por contexto en el siguiente render; el efecto de abajo
      // dispara la publicación cuando ya está disponible.
      setPendingPublish(true);
      toast.success('Sesión iniciada. Publicando tu anuncio…');
    } catch (error) {
      toast.error('Error de conexión al iniciar sesión');
      trackEvent('publication_login_failed', { status_code: 'network' });
    } finally {
      setLoggingIn(false);
    }
  };

  // Tras iniciar sesión en el gate, publica el borrador en cuanto el token existe.
  useEffect(() => {
    if (!pendingPublish || !token) return;
    setPendingPublish(false);
    void form.handleSubmit(onSubmit)();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPublish, token]);

  const handleCancel = () => {
    if (isEditMode) {
      router.push('/mis-propiedades');
      return;
    }

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

    router.push(token ? '/mis-propiedades' : '/');
  };

  const draftSignature = JSON.stringify({
    ...values,
    city,
    province,
    latitude,
    longitude,
    area,
    showMeasurements,
    locationMode,
    polygonLen: polygonCoords.length,
    imagesLen: images.length,
  });

  useEffect(() => {
    if (isEditMode) return;
    if (!formStartedRef.current || !hasDraftContent()) return;

    const timeout = setTimeout(() => {
      savePublicationDraft();
    }, 800);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSignature, isEditMode]);

  useEffect(() => {
    if (isEditMode) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasDraftContent()) return;

      savePublicationDraft();
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSignature, isEditMode]);

  const onSubmit = async (v: PropertyValues) => {
    if (locationMode === 'polygon' && !area) {
      toast.error('Ingresa el área total del predio');
      return;
    }
    if (locationMode === 'polygon' && polygonCoords.length < 3) {
      toast.error('Dibuja el polígono o cambia el modo a ubicación puntual.');
      return;
    }
    if (locationMode === 'point' && (!latitude || !longitude)) {
      toast.error('Marca la ubicación en el mapa o busca una referencia.');
      return;
    }

    trackEvent('publication_submit_attempted', {
      has_session: Boolean(token),
      has_polygon: polygonCoords.length >= 3,
      has_images: imageFiles.length > 0,
      property_type: v.propertyType,
      status: v.status,
    });

    if (!token && !isEditMode) {
      savePublicationDraft();
      await savePendingPublication('account_required');
      trackEvent('publication_account_required', {
        has_polygon: polygonCoords.length >= 3,
        has_images: imageFiles.length > 0,
        property_type: v.propertyType,
        status: v.status,
      });
      toast.info('Tu anuncio está listo. Crea una cuenta para publicarlo.');
      setShowAccountModal(true);
      return;
    }

    try {
      const formData = new FormData();

      formData.append('title', v.title);
      formData.append('description', v.description || '');
      formData.append('property_type', v.propertyType);
      formData.append('status', v.status);

      formData.append('address', v.address || '');
      formData.append('city', city);
      formData.append('province', province);
      if (latitude) formData.append('latitude', parseFloat(latitude).toString());
      if (longitude) formData.append('longitude', parseFloat(longitude).toString());
      if (locationMode === 'polygon' && polygonCoords.length >= 3) {
        formData.append('polygon', JSON.stringify(polygonCoords));
      }
      formData.append('show_measurements', showMeasurements.toString());

      formData.append('area', parseFloat(area.toString()).toString());
      if (v.builtArea) formData.append('built_area', parseFloat(v.builtArea).toString());
      formData.append('rooms', parseInt(v.rooms || '0').toString());
      formData.append('bathrooms', parseInt(v.bathrooms || '0').toString());
      formData.append('parking_spaces', parseInt(v.parkingSpaces || '0').toString());
      if (v.floors) formData.append('floors', parseInt(v.floors).toString());
      formData.append('furnished', v.furnished.toString());
      if (v.yearBuilt) formData.append('year_built', parseInt(v.yearBuilt).toString());

      formData.append('price', v.price);
      formData.append('is_negotiable', v.isNegotiable.toString());

      formData.append('contact_phone', v.contactPhone || '');

      if (isEditMode && imagesToDelete.length > 0) {
        formData.append('images_to_delete', JSON.stringify(imagesToDelete));
      }

      imageFiles.forEach((file) => {
        formData.append('uploaded_images', file);
      });

      const { apiFetch } = await import('@/lib/api');
      const endpoint = isEditMode && propertyId ? `/properties/${propertyId}/` : '/properties/';

      const res = await apiFetch(endpoint, {
        method: isEditMode ? 'PUT' : 'POST',
        body: formData,
      });

      if (res.ok) {
        if (!isEditMode && typeof window !== 'undefined') {
          localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
        }
        trackEvent(isEditMode ? 'publication_updated' : 'publication_created', {
          has_polygon: polygonCoords.length >= 3,
          images_count: imageFiles.length,
          property_type: v.propertyType,
          status: v.status,
        });
        try {
          const confetti = (await import('canvas-confetti')).default;
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.7 },
            colors: ['#496D9C', '#688CCA', '#E3EAF4'],
          });
        } catch {}
        toast.success(isEditMode ? 'Propiedad actualizada exitosamente' : 'Propiedad creada exitosamente');
        setTimeout(() => router.push('/mis-propiedades'), 650);
      } else if (res.status === 401) {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        logout();
        router.push('/iniciar-sesion');
      } else {
        const errorData = await res.json();
        console.error('Error:', errorData);
        trackEvent(isEditMode ? 'publication_update_failed' : 'publication_create_failed', {
          status_code: res.status,
          property_type: v.propertyType,
          has_polygon: polygonCoords.length >= 3,
        });
        toast.error('No se pudo guardar la propiedad');
      }
    } catch (error) {
      console.error('Error:', error);
      trackEvent(isEditMode ? 'publication_update_failed' : 'publication_create_failed', {
        status_code: 'network',
        property_type: v.propertyType,
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
                try {
                  m.remove();
                } catch {}
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

  const handleLocationModeChange = (mode: 'point' | 'polygon', measurements = showMeasurements) => {
    setLocationMode(mode);
    if (mode === 'point') {
      setShowMeasurements(false);
      handleClear();
      toast.info('Marca un punto en el mapa o usa el buscador.');
    } else {
      setShowMeasurements(measurements);
      toast.info(
        measurements
          ? 'Dibuja el contorno del predio. Se mostrarán medidas por lado.'
          : 'Dibuja la forma aproximada del predio.'
      );
    }
  };

  const locationMapLabel =
    locationMode === 'point'
      ? 'Solo ubicación'
      : showMeasurements
        ? 'Polígono con medidas'
        : 'Polígono sin medidas';

  // Autocompleta ciudad/provincia a partir del punto marcado en el mapa
  // (reverse geocoding con Nominatim). Con debounce para respetar el límite de
  // uso y evitar llamadas en cada clic. No pisa datos si no detecta nada útil.
  const reverseGeocodeLocation = (lat: number, lng: number) => {
    if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);

    reverseGeocodeTimerRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          format: 'json',
          lat: String(lat),
          lon: String(lng),
          addressdetails: '1',
          zoom: '14',
          'accept-language': 'es',
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
          headers: { 'Accept-Language': 'es' },
        });
        if (!res.ok) return;

        const data = await res.json();
        const addr = data?.address || {};

        const detectedProvince = String(addr.state || addr.region || '')
          .replace(/^Provincia\s+de\s+/i, '')
          .trim();
        const detectedCity = String(
          addr.city || addr.town || addr.village || addr.municipality || addr.county || ''
        ).trim();

        if (detectedProvince) setProvince(detectedProvince);
        if (detectedCity) {
          const changed = detectedCity !== city;
          setCity(detectedCity);
          if (changed) {
            toast.success(
              `Ubicación detectada: ${detectedCity}${detectedProvince ? `, ${detectedProvince}` : ''}`
            );
          }
        }
      } catch {
        // Silencioso: si falla el reverse geocoding, el usuario elige ciudad manualmente.
      }
    }, 600);
  };

  const handlePointLocationChange = ({ lat, lng }: { lat: number; lng: number }) => {
    setLatitude(lat.toString());
    setLongitude(lng.toString());
    reverseGeocodeLocation(lat, lng);
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom?.() || 15, 15), {
        duration: 0.8,
      });
    }
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
        if (locationMode === 'point') {
          setLatitude(latitude.toString());
          setLongitude(longitude.toString());
          reverseGeocodeLocation(latitude, longitude);
        }

        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 17, {
            duration: 1.2,
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
        if (error.code === error.PERMISSION_DENIED) {
          setLocationBlocked(true);
          setShowLocationModal(true);
        }
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const bindMapRef = (map: any) => {
    (window as any)._leaflet_map_ref = map;
    mapRef.current = map;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const MAX_IMAGES = 10;
    const MAX_SIZE_MB = 10;
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    const activeExistingImages = existingImages.length - imagesToDelete.length;
    const totalImages = activeExistingImages + images.length + files.length;
    if (totalImages > MAX_IMAGES) {
      toast.error(`Máximo ${MAX_IMAGES} imágenes por propiedad. Ya tienes ${activeExistingImages + images.length}.`);
      e.target.value = '';
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach((file) => {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_SIZE_MB) {
        errors.push(`"${file.name}" es demasiado grande (${sizeMB.toFixed(2)}MB). Máximo: ${MAX_SIZE_MB}MB`);
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        errors.push(`"${file.name}" tiene un formato no permitido. Use: JPG, PNG o WebP`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      toast.error('Algunas imágenes no se pudieron agregar: ' + errors.join(' · '));
    }

    if (validFiles.length > 0) {
      trackEvent('publication_images_added', {
        files_count: validFiles.length,
        total_images: images.length + validFiles.length,
      });

      setImageFiles([...imageFiles, ...validFiles]);

      const newImages = validFiles.map((file) => {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
          file,
          preview: URL.createObjectURL(file),
          size: sizeMB,
          name: file.name,
        };
      });
      setImages([...images, ...newImages]);
    }

    e.target.value = '';
  };

  const handleRemoveNewImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newFiles = imageFiles.filter((_, i) => i !== index);
    setImages(newImages);
    setImageFiles(newFiles);
  };

  const handleToggleExistingImageDelete = (imageId: number) => {
    if (imageId == null) return;
    setImagesToDelete((current) =>
      current.includes(imageId) ? current.filter((id) => id !== imageId) : [...current, imageId]
    );
  };

  // Reordena imagen (y su File paralelo). La primera imagen es la principal.
  function reorderArray<T>(arr: T[], from: number, to: number): T[] {
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }
  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    setImages((prev) => reorderArray(prev, from, to));
    setImageFiles((prev) => reorderArray(prev, from, to));
  };

  const wizardSteps = [
    {
      label: 'Datos',
      title: 'Datos básicos',
      description: 'Tipo de inmueble, título y descripción.',
      done: Boolean(values.title?.trim()),
    },
    {
      label: 'Ubicación',
      title: 'Ubicación',
      description: 'Elige punto rápido o polígono con contorno.',
      done: locationMode === 'polygon' ? polygonCoords.length >= 3 : Boolean(latitude && longitude),
    },
    {
      label: 'Características',
      title: 'Características',
      description: 'Área, medidas y datos físicos.',
      done: locationMode === 'polygon' ? Boolean(area) : true,
    },
    {
      label: 'Precio',
      title: 'Precio y contacto',
      description: 'Precio, negociación y teléfono.',
      done: Boolean(values.price?.trim()),
    },
    {
      label: 'Fotos',
      title: 'Fotos y publicación',
      description: 'Agrega imágenes y revisa antes de guardar.',
      done: existingImages.length - imagesToDelete.length > 0 || images.length > 0 || imageFiles.length > 0,
    },
  ];
  const isLastStep = currentStep === wizardSteps.length - 1;

  const validateStep = async (step = currentStep) => {
    if (step === 0) {
      if (!form.getValues('title')?.trim()) {
        toast.error('Ingresa un título para la propiedad.');
        return false;
      }
      return true;
    }
    if (step === 1) {
      if (locationMode === 'polygon' && polygonCoords.length < 3) {
        toast.error('Dibuja el polígono o cambia a ubicación puntual.');
        return false;
      }
      if (locationMode === 'point' && (!latitude || !longitude)) {
        toast.error('Marca un punto en el mapa, usa el buscador o presiona “Mi ubicación”.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      // El área total solo es obligatoria cuando se dibuja el predio (polígono).
      // En modo punto y para el resto de detalles físicos todo es opcional.
      if (locationMode === 'polygon' && !area) {
        toast.error('Ingresa el área total del predio.');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!form.getValues('price')?.trim()) {
        toast.error('Ingresa el precio.');
        return false;
      }
      return true;
    }
    return true;
  };

  const goNextStep = async () => {
    if (!(await validateStep())) return;
    setCurrentStep((step) => Math.min(step + 1, wizardSteps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPreviousStep = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showBuiltGroup = ['house', 'apartment', 'commercial'].includes(propertyType);

  // Etiquetas legibles para el resumen y el preview del wizard.
  const FORM_STATUS_LABELS: Record<string, string> = {
    for_sale: 'En venta',
    for_rent: 'En alquiler',
    sold: 'Vendido',
    rented: 'Alquilado',
    inactive: 'Inactivo',
  };
  const FORM_TYPE_LABELS: Record<string, string> = {
    house: 'Casa',
    apartment: 'Apartamento',
    land: 'Terreno',
    commercial: 'Comercial',
    other: 'Otro',
  };
  const summaryStatusLabel = FORM_STATUS_LABELS[values.status] || 'En venta';
  const summaryTypeLabel = FORM_TYPE_LABELS[propertyType] || 'Propiedad';
  const summaryLocation = [city, province].filter(Boolean).join(', ');
  const summaryPrice = values.price ? `$${Number(values.price).toLocaleString()}` : null;
  const activeExistingImages = existingImages.filter((img) => !imagesToDelete.includes(img.id));
  const summaryCover = activeExistingImages[0]?.thumbnail || activeExistingImages[0]?.image || images[0]?.preview || null;

  if (loadingProperty) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-textSecondary">Cargando propiedad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-line bg-surface shadow-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-textPrimary">
                {isEditMode ? 'Editar propiedad' : 'Publicar propiedad gratis'}
              </h1>
              <p className="mt-1 text-sm text-textSecondary">
                {isEditMode
                  ? 'Actualiza la información con el mismo flujo de publicación.'
                  : 'Toma entre 5 y 8 minutos. Tu borrador se guarda solo y puedes pedir ayuda por WhatsApp.'}
              </p>
            </div>
            <Button variant="outline" onClick={handleCancel} className="rounded-button border-line">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-4 grid gap-3 rounded-card border border-primary/15 bg-surface p-4 shadow-card md:grid-cols-3">
          {[
            'Ten a mano precio y ciudad',
            'Marca punto o dibuja el predio',
            'Sube hasta 10 fotos cuando puedas',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-textPrimary">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primaryLight text-primary">
                <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
        <div className="space-y-4 lg:space-y-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              onChange={trackFormStarted}
              className="space-y-4 lg:space-y-6"
            >
              {/* Progress + autosave */}
              <div className="sticky top-16 z-20 overflow-hidden rounded-card border border-line bg-white/95 shadow-cardHover backdrop-blur">
                <div className="flex flex-col gap-3 border-b border-line px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primaryLight px-2.5 py-1 text-xs font-bold text-primary">
                        Paso {currentStep + 1} de {wizardSteps.length}
                      </span>
                      <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-textSecondary">
                        {Math.round(((currentStep + 1) / wizardSteps.length) * 100)}%
                      </span>
                      <span className="rounded-full border border-success/25 bg-successBg px-2.5 py-1 text-xs font-semibold text-success">
                        {draftSavedAt
                          ? `Guardado ${draftSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Autoguardado activo'}
                      </span>
                    </div>
                    <h2 className="mt-2 truncate text-base font-bold text-textPrimary">
                      {wizardSteps[currentStep].title}
                    </h2>
                    <p className="text-sm text-textSecondary">
                      {wizardSteps[currentStep].description}
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted lg:w-56">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${((currentStep + 1) / wizardSteps.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1 bg-surface/80 p-2 text-[11px] font-bold text-textSecondary sm:text-xs">
                    {wizardSteps.map((step, index) => (
                      <button
                        type="button"
                        key={step.label}
                        onClick={async () => {
                          if (index <= currentStep || (await validateStep())) {
                            setCurrentStep(index);
                          }
                        }}
                        className={cn(
                          'min-h-12 rounded-button px-2 py-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
                          index === currentStep
                            ? 'bg-primary text-white'
                            : step.done
                            ? 'bg-primaryLight text-primary'
                            : 'bg-muted text-textSecondary'
                        )}
                      >
                        <span className="mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/80 font-geo text-[10px] text-textPrimary">
                          {step.done && index !== currentStep ? <Check className="h-3 w-3 text-primary" strokeWidth={3} /> : index + 1}
                        </span>
                        <span className="block truncate">{step.label}</span>
                      </button>
                    ))}
                </div>
              </div>

              {draftLoaded && (
                <div className="rounded-card border border-success/30 bg-successBg p-5 text-success shadow-card">
                  <p className="font-bold">Cargamos tu borrador.</p>
                  <p className="mt-1 text-sm">
                    Revisa los datos, completa el mapa, agrega fotos si tienes y guarda la propiedad.
                  </p>
                </div>
              )}

              <div className="hidden rounded-card border border-primary/15 bg-surface p-5 shadow-card md:block">
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-bold text-textPrimary">Sin costo</p>
                    <p className="mt-1 text-sm text-textSecondary">No cobramos por publicar ni comisión por cerrar negocio.</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-textPrimary">Contacto directo</p>
                    <p className="mt-1 text-sm text-textSecondary">Los interesados pueden llamarte o escribirte por WhatsApp.</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-textPrimary">Mejor ubicación</p>
                    <p className="mt-1 text-sm text-textSecondary">El mapa ayuda a mostrar la zona y las medidas del predio.</p>
                  </div>
                </div>
              </div>

              {/* General Information */}
              {currentStep === 0 && (
              <SectionCard icon={<Info className="h-5 w-5" />} title="Información General">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="font-semibold">Título *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Casa moderna en zona residencial" className="h-12 rounded-input" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Tipo de Propiedad *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-input">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="land">Terreno</SelectItem>
                            <SelectItem value="house">Casa</SelectItem>
                            <SelectItem value="apartment">Apartamento</SelectItem>
                            <SelectItem value="commercial">Comercial</SelectItem>
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Estado *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-input">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="for_sale">En venta</SelectItem>
                            <SelectItem value="for_rent">En alquiler</SelectItem>
                            <SelectItem value="sold">Vendido</SelectItem>
                            <SelectItem value="rented">Alquilado</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="font-semibold">Descripción</FormLabel>
                        <FormControl>
                          <Textarea
                            rows={3}
                            placeholder="Describe las características principales de la propiedad..."
                            className="resize-none rounded-input"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SectionCard>
              )}

              {/* Map Section */}
              {currentStep === 1 && (
              <>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="overflow-hidden rounded-card bg-surface shadow-card">
                  <div className="flex flex-col gap-3 border-b border-line bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 text-base font-semibold text-textPrimary lg:text-lg">
                        <MapPin className="h-5 w-5 text-primary" />
                        Ubicación en el mapa
                      </h2>
                      <p className="mt-1 text-xs text-textSecondary lg:text-sm">
                        {locationMode === 'point'
                          ? 'Marca el punto donde se encuentra la propiedad.'
                          : showMeasurements
                            ? 'Dibuja el contorno y ajusta las medidas por lado.'
                            : 'Dibuja el contorno aproximado como referencia visual.'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGetMyLocation}
                      disabled={loadingLocation}
                      className="h-9 rounded-button border-line bg-surface"
                    >
                      {loadingLocation ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <LocateFixed className="mr-2 h-4 w-4" />
                      )}
                      Mi ubicación
                    </Button>
                  </div>

                  <div className="relative isolate h-[430px] sm:h-[540px] lg:h-[calc(100vh-13rem)] lg:min-h-[620px]">
                    <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-1.5rem)] rounded-card border border-line bg-white/95 px-3 py-2 text-xs shadow-card backdrop-blur">
                      <p className="font-semibold text-textPrimary">{locationMapLabel}</p>
                      <p className="mt-0.5 text-textSecondary">
                        {locationMode === 'point'
                          ? latitude && longitude
                            ? 'Punto marcado'
                            : 'Pendiente de marcar punto'
                          : polygonCoords.length >= 3
                            ? `${polygonCoords.length} puntos dibujados${area ? ` · ${area} m²` : ''}`
                            : 'Pendiente de dibujar polígono'}
                      </p>
                    </div>
                    <AddPropertyMap
                      onMapReady={bindMapRef}
                      onPolygonChange={handlePolygonChange}
                      onLocationChange={locationMode === 'point' ? handlePointLocationChange : undefined}
                      onAreaChange={setArea}
                      initialPolygon={polygonCoords}
                      selectedLocation={latitude && longitude ? { lat: Number(latitude), lng: Number(longitude) } : null}
                      locationMode={locationMode}
                      userCenter={userLocation ? [userLocation.lat, userLocation.lng] : undefined}
                      userZoom={userLocation ? 12 : undefined}
                      userLocation={userLocation}
                      showMeasurements={showMeasurements}
                      referenceProperties={referenceProperties}
                    />
                  </div>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-card border border-line bg-white p-4 shadow-card">
                    <h3 className="text-sm font-semibold text-textPrimary">Modo de ubicación</h3>
                    <div className="mt-3 space-y-2">
                      {[
                        {
                          key: 'point',
                          title: 'Solo ubicación',
                          description: 'Un punto rápido en el mapa.',
                          icon: MapPin,
                          active: locationMode === 'point',
                          onClick: () => handleLocationModeChange('point'),
                        },
                        {
                          key: 'polygon-reference',
                          title: 'Polígono sin medidas',
                          description: 'Contorno aproximado, sin distancias.',
                          icon: Pentagon,
                          active: locationMode === 'polygon' && !showMeasurements,
                          onClick: () => handleLocationModeChange('polygon', false),
                        },
                        {
                          key: 'polygon-measured',
                          title: 'Polígono con medidas',
                          description: 'Contorno con lados medidos.',
                          icon: Ruler,
                          active: locationMode === 'polygon' && showMeasurements,
                          onClick: () => handleLocationModeChange('polygon', true),
                        },
                      ].map((option) => (
                        <button
                          type="button"
                          key={option.key}
                          onClick={option.onClick}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-card border p-3 text-left transition-colors',
                            option.active
                              ? 'border-primary bg-primaryLight text-primary'
                              : 'border-line bg-surface text-textPrimary hover:bg-muted'
                          )}
                        >
                          <span className={cn(
                            'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-button',
                            option.active ? 'bg-primary text-white' : 'bg-white text-primary'
                          )}>
                            <option.icon className="h-4 w-4" strokeWidth={2} aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{option.title}</span>
                            <span className="mt-0.5 block text-xs text-textSecondary">{option.description}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-card border border-line bg-white p-4 shadow-card">
                    <h3 className="text-sm font-semibold text-textPrimary">Ciudad y referencia</h3>
                    <div className="mt-3 space-y-4">
                      <LocationSelect
                        provinceValue={province}
                        cityValue={city}
                        onProvinceChange={setProvince}
                        onCityChange={setCity}
                      />
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Dirección o referencia</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Av. Principal #123, sector centro" className="h-12 rounded-input" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="rounded-card border border-line bg-white p-4 shadow-card">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-textPrimary">Estado</h3>
                        <p className="mt-1 text-xs text-textSecondary">
                          {locationMode === 'point'
                            ? latitude && longitude
                              ? 'Punto listo para publicar.'
                              : 'Falta marcar un punto.'
                            : polygonCoords.length >= 3
                              ? 'Polígono listo para publicar.'
                              : 'Falta dibujar el contorno.'}
                        </p>
                      </div>
                      <span className={cn(
                        'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                        (locationMode === 'point' ? latitude && longitude : polygonCoords.length >= 3)
                          ? 'bg-successBg text-success'
                          : 'bg-muted text-textSecondary'
                      )}>
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (locationMode === 'polygon') {
                          handleClear();
                        } else {
                          setLatitude('');
                          setLongitude('');
                        }
                      }}
                      className="mt-4 w-full rounded-button border-line bg-surface"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {locationMode === 'polygon' ? 'Limpiar polígono' : 'Limpiar punto'}
                    </Button>
                  </div>
                </aside>
              </div>
              </>
              )}

              {/* Characteristics */}
              {currentStep === 2 && (
              <SectionCard icon={<Ruler className="h-5 w-5" />} title="Características del Predio">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-textPrimary">
                      Área Total (m²){locationMode === 'polygon' ? ' *' : ''}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={area || ''}
                      onChange={(e) => setArea(Number(e.target.value || 0))}
                      placeholder="500"
                      className="h-12 rounded-input"
                    />
                  </div>
                  <div className="md:col-span-2 rounded-input border border-line bg-muted/40 px-4 py-3">
                    <p className="text-sm font-semibold text-textPrimary">{locationMapLabel}</p>
                    <p className="mt-1 text-xs text-textSecondary">
                      {locationMode === 'point'
                        ? 'Elegiste publicar con punto de ubicación, sin medidas de contorno.'
                        : showMeasurements
                          ? 'Las medidas por lado se configuran directamente en el mapa.'
                          : 'El contorno se usará como referencia visual, sin mostrar distancias por lado.'}
                    </p>
                  </div>
                </div>

                {(propertyType === 'house' || propertyType === 'apartment' || propertyType === 'commercial') && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="builtArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Área Construida (m²)</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" placeholder="250" className="h-12 rounded-input" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {propertyType !== 'commercial' && (
                      <FormField
                        control={form.control}
                        name="rooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Habitaciones</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" placeholder="3" className="h-12 rounded-input" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Baños</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="2" className="h-12 rounded-input" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {propertyType === 'house' && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="floors"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Número de Pisos</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" placeholder="2" className="h-12 rounded-input" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="parkingSpaces"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Estacionamientos</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="2" className="h-12 rounded-input" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="yearBuilt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Año de Construcción</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1900"
                              max={new Date().getFullYear()}
                              placeholder="2020"
                              className="h-12 rounded-input"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {propertyType === 'apartment' && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="parkingSpaces"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Estacionamientos</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="1" className="h-12 rounded-input" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="furnished"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 pt-8">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} id="furnished" />
                          </FormControl>
                          <FormLabel htmlFor="furnished" className="font-semibold">
                            Amueblado
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </SectionCard>
              )}

              {/* Financial Information */}
              {currentStep === 3 && (
              <>
              <SectionCard icon={<DollarSign className="h-5 w-5" />} title="Información Financiera">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Precio (USD) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" placeholder="150000" className="h-12 rounded-input font-geo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isNegotiable"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} id="negotiable" />
                      </FormControl>
                      <FormLabel htmlFor="negotiable" className="font-semibold">
                        Precio Negociable
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </SectionCard>

              {/* Contact Information */}
              <SectionCard icon={<Phone className="h-5 w-5" />} title="Información de Contacto">
                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Teléfono</FormLabel>
                      <FormControl>
                        <Input type="tel" inputMode="tel" placeholder="+593 99 999 9999" className="h-12 rounded-input" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </SectionCard>
              </>
              )}

              {/* Images */}
              {currentStep === 4 && (
              <>
              <SectionCard icon={<ImagePlus className="h-5 w-5" />} title="Imágenes de la Propiedad">
                {isEditMode && existingImages.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold text-textPrimary">
                      Imágenes actuales ({activeExistingImages.length}/{existingImages.length})
                    </h4>
                    <p className="mb-3 text-xs text-textSecondary">
                      Marca las fotos que quieres eliminar. Las nuevas imágenes se agregarán al guardar.
                    </p>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                      {existingImages.map((img, index) => {
                        const marked = imagesToDelete.includes(img.id);
                        return (
                          <div
                            key={img.id ?? index}
                            className={cn(
                              'group relative overflow-hidden rounded-input',
                              !marked && index === 0 && 'ring-2 ring-primary',
                              marked && 'opacity-55 grayscale'
                            )}
                          >
                            <PreviewImage src={img.thumbnail || img.image} />
                            {!marked && index === 0 && (
                              <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-white shadow-card">
                                <Star className="h-3 w-3 fill-current" strokeWidth={2} aria-hidden />
                                Principal
                              </span>
                            )}
                            {marked && (
                              <span className="absolute left-2 top-2 rounded-md bg-error px-2 py-0.5 text-[11px] font-semibold text-white shadow-card">
                                Se eliminará
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleExistingImageDelete(img.id)}
                              className={cn(
                                'absolute right-2 top-2 rounded-full p-1 text-white shadow-card transition-colors',
                                marked ? 'bg-primary hover:bg-primaryHover' : 'bg-error hover:bg-error/90'
                              )}
                              title={marked ? 'Conservar imagen' : 'Eliminar imagen'}
                            >
                              {marked ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {images.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-sm font-semibold text-textPrimary">
                      {isEditMode ? 'Imágenes nuevas' : 'Nuevas Imágenes'} ({images.length}/10)
                      <span className="ml-2 text-xs font-normal text-muted-foreground">Se optimizan automáticamente</span>
                    </h4>
                    <p className="mb-3 text-xs text-textSecondary">
                      La primera imagen es la portada. Reordena con las flechas o marca otra como principal.
                    </p>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                      {images.map((img, index) => (
                        <div
                          key={index}
                          className={cn(
                            'group relative overflow-hidden rounded-input',
                            index === 0 && 'ring-2 ring-primary'
                          )}
                        >
                          <PreviewImage src={img.preview} />

                          {/* Portada / badge de principal */}
                          {index === 0 ? (
                            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-white shadow-card">
                              <Star className="h-3 w-3 fill-current" strokeWidth={2} aria-hidden />
                              Principal
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => moveImage(index, 0)}
                              className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white opacity-0 transition-opacity hover:bg-black/90 group-hover:opacity-100"
                              title="Hacer principal"
                            >
                              <Star className="h-3 w-3" strokeWidth={2} aria-hidden />
                              Principal
                            </button>
                          )}

                          <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white font-geo">
                            {img.size} MB
                          </div>

                          {/* Controles de orden */}
                          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => moveImage(index, index - 1)}
                              disabled={index === 0}
                              className="rounded-md bg-white/90 p-1 text-textPrimary shadow-card transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                              title="Mover a la izquierda"
                            >
                              <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveImage(index, index + 1)}
                              disabled={index === images.length - 1}
                              className="rounded-md bg-white/90 p-1 text-textPrimary shadow-card transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                              title="Mover a la derecha"
                            >
                              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(index)}
                            className="absolute right-2 top-2 rounded-full bg-error p-1 text-white opacity-0 transition-opacity hover:bg-error/90 group-hover:opacity-100"
                            title="Eliminar imagen"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-input border-2 border-dashed border-line transition-all hover:border-primary hover:bg-muted/40">
                  <div className="flex flex-col items-center justify-center px-6 py-4 text-center">
                    <UploadCloud className="mb-3 h-10 w-10 text-textSecondary" />
                    <p className="mb-1 text-sm font-semibold text-textSecondary">Haz clic para subir imágenes</p>
                    <p className="text-xs text-textSecondary">PNG, JPG, WebP • Máx. 10MB por imagen</p>
                    <p className="mt-2 text-xs text-muted-foreground">Opcional, pero los anuncios con fotos suelen recibir más contactos</p>
                    <p className="mt-1 text-xs text-muted-foreground">Máximo 10 imágenes. Se optimizan automáticamente</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                  />
                </label>
              </SectionCard>

              <div className="rounded-card border border-line bg-surface p-5 shadow-card">
                <h3 className="text-base font-semibold text-textPrimary">Así se verá tu publicación</h3>
                <p className="mt-1 text-xs text-textSecondary">Vista previa de la tarjeta que verán los interesados.</p>

                {/* Preview tipo tarjeta pública */}
                <div className="mt-3 max-w-sm overflow-hidden rounded-card border border-line bg-surface shadow-card">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {summaryCover ? (
                      <img src={summaryCover} alt="Portada" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-textSecondary">
                        <ImagePlus className="h-10 w-10" strokeWidth={1.5} aria-hidden />
                      </div>
                    )}
                    <span className="absolute left-2.5 top-2.5 rounded-md bg-primaryLight px-2 py-0.5 text-[11px] font-medium text-primary shadow-card">
                      {summaryStatusLabel}
                    </span>
                  </div>
                  <div className="p-4">
                    <h4 className="line-clamp-1 text-base font-semibold text-textPrimary">
                      {values.title?.trim() || `${summaryTypeLabel} por publicar`}
                    </h4>
                    {summaryLocation && (
                      <p className="mt-1.5 flex items-center gap-1 text-sm text-textSecondary">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                        <span className="line-clamp-1">{summaryLocation}</span>
                      </p>
                    )}
                    <div className="mt-2.5 flex items-baseline gap-1.5">
                      <span className="price font-geo text-xl font-semibold">{summaryPrice || 'Precio por definir'}</span>
                      {values.status === 'for_rent' && summaryPrice && (
                        <span className="text-sm font-medium text-textSecondary">/mes</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-[11px] text-textSecondary">
                      <span className="rounded-md bg-background px-2 py-0.5 font-medium">{summaryTypeLabel}</span>
                      {area ? <span className="rounded-md bg-background px-2 py-0.5 font-medium">{area} m²</span> : null}
                      {values.rooms ? <span className="rounded-md bg-background px-2 py-0.5 font-medium">{values.rooms} hab.</span> : null}
                      {values.bathrooms ? <span className="rounded-md bg-background px-2 py-0.5 font-medium">{values.bathrooms} baños</span> : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-textSecondary sm:grid-cols-2">
                  <p><span className="font-semibold text-textPrimary">Ubicación en mapa:</span> {locationMapLabel}</p>
                  <p><span className="font-semibold text-textPrimary">Fotos:</span> {activeExistingImages.length + images.length}</p>
                </div>
              </div>
              </>
              )}

              <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={goPreviousStep}
                  disabled={currentStep === 0}
                  className="inline-flex h-10 items-center justify-center rounded-button border border-line bg-surface px-4 text-sm font-medium text-textPrimary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Anterior
                </button>
                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={goNextStep}
                    className="inline-flex h-10 items-center justify-center rounded-button bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primaryHover"
                  >
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {/* Action Buttons */}
              {isLastStep && (
              <div className="rounded-card bg-surface p-6 shadow-card">
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={form.formState.isSubmitting}
                    className="w-full rounded-button bg-primary py-6 text-lg font-semibold shadow-cardHover sm:flex-1"
                  >
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isEditMode ? 'Actualizando...' : 'Guardando...'}
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        {isEditMode ? 'Actualizar propiedad' : token ? 'Guardar Propiedad' : 'Crear cuenta para publicar'}
                      </>
                    )}
                  </Button>
                  {!isEditMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={handleWhatsAppHelp}
                      className="w-full rounded-button border-2 border-primary py-6 font-semibold text-primary hover:bg-primary/5 sm:w-auto"
                    >
                      Publicar con ayuda
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleCancel}
                    className="w-full rounded-button border-2 border-line py-6 font-medium text-textSecondary sm:w-auto"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              </div>
              )}
            </form>
          </Form>

          {/* Contact Support */}
          {!isEditMode && <div className="rounded-card border border-primary/15 bg-primaryLight/40 p-6 shadow-card sm:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <Info className="mt-1 h-6 w-6 text-primary" />
                <div>
                  <p className="text-base font-semibold text-textPrimary sm:text-lg">¿Problemas técnicos o dudas?</p>
                  <p className="mt-1 text-sm text-textSecondary">
                    Escríbenos y te ayudamos a publicar tu propiedad en minutos.
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="rounded-button bg-primary font-semibold shadow-card"
              >
                <a
                  href={buildWhatsAppUrl('Hola necesito ayuda para publicar mi propiedad')}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Chatear por WhatsApp
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>}
        </div>

        {/* Resumen lateral (solo desktop): datos clave siempre visibles */}
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-3 rounded-card border border-line bg-surface p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Resumen</p>

            <div className="overflow-hidden rounded-input bg-muted">
              <div className="relative aspect-[4/3]">
                {summaryCover ? (
                  <img src={summaryCover} alt="Portada" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-textSecondary">
                    <ImagePlus className="h-8 w-8" strokeWidth={1.5} aria-hidden />
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="line-clamp-2 text-sm font-semibold text-textPrimary">
                {values.title?.trim() || 'Título por completar'}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-textSecondary">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                {summaryLocation || 'Ubicación por completar'}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="price font-geo text-xl font-semibold">{summaryPrice || '—'}</span>
                {values.status === 'for_rent' && summaryPrice && (
                  <span className="text-xs text-textSecondary">/mes</span>
                )}
              </div>
              <span className="rounded-md bg-primaryLight px-2 py-0.5 text-[11px] font-medium text-primary">
                {summaryStatusLabel}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3 text-xs">
              <div>
                <dt className="text-textSecondary">Tipo</dt>
                <dd className="font-medium text-textPrimary">{summaryTypeLabel}</dd>
              </div>
              <div>
                <dt className="text-textSecondary">Área</dt>
                <dd className="font-geo font-medium tabular-nums text-textPrimary">{area ? `${area} m²` : '—'}</dd>
              </div>
              <div>
                <dt className="text-textSecondary">Fotos</dt>
                <dd className="font-geo font-medium tabular-nums text-textPrimary">{images.length}</dd>
              </div>
              <div>
                <dt className="text-textSecondary">Ubicación</dt>
                <dd className="font-medium text-textPrimary">{locationMapLabel}</dd>
              </div>
            </dl>
          </div>
        </aside>
        </div>
      </div>

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onAccept={handleAcceptLocation}
        onDecline={handleDeclineLocation}
        isLoading={loadingLocation}
        blocked={locationBlocked}
      />

      {/* Location Loading Toast */}
      {showLocationToast && (
        <div className="fixed left-1/2 top-20 z-top -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-card border border-line bg-surface px-6 py-4 shadow-cardHover">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-textPrimary">Obteniendo tu ubicación</span>
              <span className="text-xs text-textSecondary">Centrando mapa en tu ciudad...</span>
            </div>
          </div>
        </div>
      )}

      {/* Exit Modal */}
      <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
        <DialogContent className="rounded-modal">
          <DialogHeader>
            <DialogTitle>Tu anuncio no se ha publicado</DialogTitle>
            <DialogDescription>
              Guardamos el borrador en este navegador. Puedes volver luego, crear tu cuenta para publicarlo o pedir ayuda por WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              className="w-full rounded-button bg-primary font-bold"
              onClick={() => {
                setShowExitModal(false);
                trackEvent('publication_exit_continue_clicked');
              }}
            >
              Seguir editando
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-button border-primary font-bold text-primary hover:bg-primary/5"
              onClick={handleWhatsAppHelp}
            >
              Recibir ayuda por WhatsApp
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-button border-line font-semibold text-textSecondary"
              onClick={() => {
                trackEvent('publication_exit_confirmed');
                router.push(token ? '/mis-propiedades' : '/');
              }}
            >
              Salir y mantener borrador
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Modal */}
      <Dialog open={showAccountModal} onOpenChange={setShowAccountModal}>
        <DialogContent className="max-w-md rounded-modal p-0">
          <DialogHeader>
            <div className="border-b border-line px-6 pb-4 pt-6">
              <DialogTitle>Tu anuncio está listo</DialogTitle>
              <DialogDescription className="mt-2">
                {gateMode === 'login'
                  ? 'Inicia sesión con tu cuenta para publicar este anuncio. El borrador ya está guardado.'
                  : 'Crea tu cuenta o inicia sesión para publicar este anuncio. El borrador ya está guardado.'}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="px-6">
            <GoogleSignInButton
              text={gateMode === 'login' ? 'signin_with' : 'signup_with'}
              onSuccess={() => {
                savePublicationDraft();
                setShowAccountModal(false);
                trackEvent('publication_google_account_connected');
                toast.success('Cuenta conectada. Revisa el anuncio y publícalo.');
              }}
            />
          </div>

          <div className="relative px-6">
            <div className="absolute inset-x-6 top-1/2 border-t border-line" aria-hidden />
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 font-medium text-textSecondary">O usa tu correo</span>
            </div>
          </div>

          {gateMode === 'login' ? (
            <form onSubmit={handleLoginAndPublish} className="space-y-4 px-6 pb-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-textPrimary">Correo</label>
                <Input type="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} className="h-11 rounded-input" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-textPrimary">Contraseña</label>
                <Input type="password" value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} className="h-11 rounded-input" required />
              </div>
              <div className="space-y-2 pt-1">
                <Button type="submit" disabled={loggingIn} className="h-11 w-full rounded-button bg-primary font-bold">
                  {loggingIn ? 'Iniciando sesión...' : 'Iniciar sesión y publicar'}
                </Button>
                <Button type="button" variant="outline" className="h-11 w-full rounded-button border-line font-semibold text-textSecondary" onClick={() => setShowAccountModal(false)}>
                  Seguir editando
                </Button>
              </div>
              <p className="text-center text-sm text-textSecondary">
                ¿No tienes cuenta?{' '}
                <button type="button" onClick={() => setGateMode('register')} className="font-semibold text-primary hover:underline">
                  Regístrate
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-4 px-6 pb-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-textPrimary">Nombre</label>
                  <Input value={accountFirstName} onChange={(e) => setAccountFirstName(e.target.value)} className="h-11 rounded-input" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-textPrimary">Apellido</label>
                  <Input value={accountLastName} onChange={(e) => setAccountLastName(e.target.value)} className="h-11 rounded-input" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-textPrimary">Correo</label>
                <Input type="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} className="h-11 rounded-input" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-textPrimary">Contraseña</label>
                <Input type="password" value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} className="h-11 rounded-input" required />
              </div>
              <div className="space-y-2 pt-1">
                <Button type="submit" disabled={creatingAccount} className="h-11 w-full rounded-button bg-primary font-bold">
                  {creatingAccount ? 'Creando cuenta...' : 'Crear cuenta y publicar'}
                </Button>
                <Button type="button" variant="outline" className="h-11 w-full rounded-button border-line font-semibold text-textSecondary" onClick={() => setShowAccountModal(false)}>
                  Seguir editando
                </Button>
              </div>
              <p className="text-center text-sm text-textSecondary">
                ¿Ya tienes cuenta?{' '}
                <button type="button" onClick={() => setGateMode('login')} className="font-semibold text-primary hover:underline">
                  Inicia sesión
                </button>
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddPropertyPage;
