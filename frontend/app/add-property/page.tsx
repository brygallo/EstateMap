'use client';

import { useEffect, useState, useRef } from 'react';
// Read as data: this palette is handed to a library that does not resolve
// CSS custom properties.
import aentsTokens from '@/lib/aents-tokens.json';
import {
  PROPERTY_DRAFT_STORAGE_KEY,
  PENDING_PUBLICATION_KEY_STORAGE_KEY,
  PUBLICATION_RESUME_TOKEN_KEY,
} from '@/lib/publication-draft';
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
import { getPropertyTypeLabel, getStatusLabel, formatPrice } from '@/lib/property-labels';
import { buildWhatsAppUrl } from '@/lib/constants';
import { trackEvent } from '@/lib/analytics';
import { fetchWithTimeout, requestErrorMessage, responseErrorMessage } from '@/lib/form-errors';
import {
  publicationApiErrorStep,
  publicationErrorReport,
  publicationFormError,
  publicationFormErrorFields,
} from '@/lib/publication-form-errors';
import { getPublicApiUrl } from '@/lib/api-url';
import {
  LOCATION_STORAGE_KEYS,
  geolocationErrorMessage,
  getGeolocationPermission,
  hasPreviousLocationSuccess,
  markLocationSuccess,
  requestBrowserLocation,
  safeStorageSet,
  wasLocationPromptDismissed,
  watchGeolocationPermission,
} from '@/lib/browser-geolocation';
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
import { compressImage } from '@/lib/image-compression';
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

const DrawLocationMap = dynamic(() => import('@/components/maps/DrawLocationMap'), {
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

// The form opens on these, so they are not evidence that anybody typed
// anything. Treating them as content made an untouched form look like a draft
// worth saving — and worth reporting to the sales tray.
const DEFAULT_CITY = 'Macas';
const DEFAULT_PROVINCE = 'Morona Santiago';

const createPublicationRequestId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `publication-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// Mirrors Property.title's max_length: the model truncating at 150 used to be
// discovered only after pressing Publish, five steps away from the field.
const MAX_TITLE_LENGTH = 150;

/** Mirrors MAX_LISTING_AREA_M2 in the model: 10 000 ha. */
const MAX_AREA_M2 = 100_000_000;

/**
 * An optional numeric field that may be left blank but, once filled, has to be a
 * number the server would also accept. Without this the browser lets a minus
 * sign through and the rejection arrives from the API, in the API's words.
 */
const optionalNumber = (message: string, { max = MAX_AREA_M2 } = {}) =>
  z
    .string()
    .optional()
    .refine((value) => {
      if (!value?.trim()) return true;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= max;
    }, message);

// Solo título y precio son obligatorios a nivel de esquema. El resto de los
// detalles físicos (área construida, habitaciones, baños, pisos) son opcionales
// para que publicar sea lo más rápido posible; se pueden completar después.
const propertySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'El título es obligatorio')
    .max(MAX_TITLE_LENGTH, `El título no puede pasar de ${MAX_TITLE_LENGTH} caracteres`),
  description: z.string().optional(),
  propertyType: z.enum(['land', 'house', 'apartment', 'commercial', 'other']),
  // Mirrors Property.STATUS_CHOICES. Migration 0005 narrowed the model to these
  // three; offering more here only produced a 400 from the serializer.
  status: z.enum(['for_sale', 'for_rent', 'inactive']),
  address: z.string().optional(),
  price: z
    .string()
    .trim()
    .min(1, 'El precio es obligatorio')
    // A negative price is never a cheaper listing, and the public card hides it
    // behind "Precio a consultar", so nothing downstream would ever say it.
    .refine((value) => Number(value) > 0, 'El precio debe ser mayor que cero'),
  isNegotiable: z.boolean(),
  contactPhone: z.string().optional(),
  builtArea: optionalNumber('El área construida debe ser un número positivo'),
  rooms: optionalNumber('Las habitaciones deben ser un número positivo', { max: 200 }),
  bathrooms: optionalNumber('Los baños deben ser un número positivo', { max: 200 }),
  parkingSpaces: optionalNumber('Los estacionamientos deben ser un número positivo', { max: 200 }),
  floors: optionalNumber('Los pisos deben ser un número positivo', { max: 200 }),
  furnished: z.boolean(),
  yearBuilt: z
    .string()
    .optional()
    .refine((value) => {
      if (!value?.trim()) return true;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 1800 && parsed <= new Date().getFullYear();
    }, 'Escribe un año de construcción válido'),
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
  // The surface is held as the text that was typed, not as a number: a numeric
  // state rendered as `area || ''` swallows the first keystroke of "0.5".
  const [areaInput, setAreaInput] = useState('');
  const area = Number.parseFloat(areaInput) || 0;
  const setArea = (value: number) => setAreaInput(value ? String(value) : '');
  // True once the drawn parcel filled the field, so the hint can say where the
  // number came from and that correcting it is allowed.
  const [areaFromPolygon, setAreaFromPolygon] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [referenceProperties, setReferenceProperties] = useState<any[]>([]);

  // Location (managed by LocationSelect + map, kept as local state)
  const [city, setCity] = useState(DEFAULT_CITY);
  const [province, setProvince] = useState(DEFAULT_PROVINCE);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Images
  const [images, setImages] = useState<any[]>([]);
  // Derived, never stored in parallel: a second array indexed by position broke
  // as soon as `images` also held photos recovered from a resume link, which
  // carry no File. Removing or reordering one then hit the wrong file.
  const imageFiles: File[] = images.flatMap((image) => (image.file ? [image.file] : []));
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
  // How many photos the restored draft had and this browser could not keep.
  const [missingDraftImages, setMissingDraftImages] = useState(0);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [publicationRequestId, setPublicationRequestId] = useState(createPublicationRequestId);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepError, setStepError] = useState('');
  const [accountFirstName, setAccountFirstName] = useState('');
  const [accountLastName, setAccountLastName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  // Gate de publicación: por defecto ofrece registrarse, pero si el usuario ya
  // tiene cuenta puede iniciar sesión ('login') y publicar sin crear otra.
  const [gateMode, setGateMode] = useState<'register' | 'login'>('login');
  const [loggingIn, setLoggingIn] = useState(false);
  // Cuando el login desde el gate tiene éxito, esperamos a que el token entre en
  // contexto para disparar la publicación automáticamente.
  const [pendingPublish, setPendingPublish] = useState(false);
  // Whether the server confirmed it holds a copy of this draft. Null until we
  // have tried; the account modal only promises what this says is true.
  const [draftStoredOnServer, setDraftStoredOnServer] = useState<boolean | null>(null);
  // Upload progress of the publication request, 0-100, null when not uploading.
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const formStartedRef = useRef(false);
  const polygonTrackedRef = useRef(false);
  const locationInitRef = useRef(false);
  const reverseGeocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Nominatim asks for one request per second; a city is geocoded once per session.
  const cityCenterCacheRef = useRef(new Map<string, { lat: number; lng: number }>());

  const { token, user, logout, login } = useAuth();
  const router = useRouter();
  const API_URL = getPublicApiUrl();

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
        // Only a city the person chose counts; the preloaded one is ours.
        (city.trim() && city.trim() !== DEFAULT_CITY) ||
        (province.trim() && province.trim() !== DEFAULT_PROVINCE) ||
        v.price.trim() ||
        v.contactPhone?.trim() ||
        latitude ||
        longitude ||
        polygonCoords.length >= 3 ||
        images.length > 0
    );
  };

  /** The drawn parcel measures its own surface; the field stays editable after. */
  const handleDrawnAreaChange = (areaM2: number) => {
    if (!areaM2) {
      setAreaFromPolygon(false);
      return;
    }
    setAreaInput(String(Math.round(areaM2)));
    setAreaFromPolygon(true);
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
      } catch (error) {
        console.error('Error loading property:', error);
        toast.error(requestErrorMessage(error, 'cargar la propiedad'));
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
    // Set by /continuar-publicacion/[token]: this session is somebody coming
    // back to a draft they abandoned, and they still have no account. The token
    // only applies to the draft that link brought in — it publishes into the
    // pending request's account, so letting it survive into a listing somebody
    // started afterwards would file that listing under a stranger's email.
    const storedResumeToken = sessionStorage.getItem(PUBLICATION_RESUME_TOKEN_KEY);
    const resumedDraft = (() => {
      if (!storedDraft) return null;
      try {
        const parsed = JSON.parse(storedDraft);
        return parsed?.draft_status === 'resumed' ? parsed : null;
      } catch {
        return null;
      }
    })();

    if (storedResumeToken && resumedDraft) {
      setResumeToken(storedResumeToken);
    } else if (storedResumeToken) {
      sessionStorage.removeItem(PUBLICATION_RESUME_TOKEN_KEY);
    }

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
      if (Array.isArray(draft.polygon) && draft.polygon.length >= 3) {
        setPolygonCoords(draft.polygon);
        setLocationMode('polygon');
      }
      if (draft.location_mode === 'point' || draft.location_mode === 'polygon') {
        setLocationMode(draft.location_mode);
      }
      if (draft.area) setArea(Number(draft.area));
      if (draft.show_measurements !== undefined) setShowMeasurements(Boolean(draft.show_measurements));
      if (Array.isArray(draft.temporary_images) && draft.temporary_images.length > 0) {
        setImages(draft.temporary_images.map((image: { id: number; url: string; name?: string }) => ({
          pendingId: image.id,
          preview: image.url,
          size: 'temporal',
          name: image.name || 'Foto guardada',
        })));
      } else if (Number(draft.images_count) > 0) {
        // The draft remembers everything except the files themselves. Saying so
        // is the difference between "ya estaba" and finding out at the end.
        setMissingDraftImages(Number(draft.images_count));
      }
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

    let cancelled = false;

    const initializeLocation = async () => {
      const permission = await getGeolocationPermission();
      if (cancelled) return;

      if (permission === 'denied') {
        setLocationBlocked(true);
        return;
      }

      if (permission === 'granted' || hasPreviousLocationSuccess()) {
        setLoadingLocation(true);
        setShowLocationToast(true);
        try {
          const position = await requestBrowserLocation('discovery');
          if (cancelled) return;
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          markLocationSuccess(latitude, longitude);
        } catch {
          // El usuario todavía puede buscar o marcar la ubicación manualmente.
        } finally {
          if (!cancelled) {
            setLoadingLocation(false);
            setShowLocationToast(false);
          }
        }
        return;
      }

      if (!wasLocationPromptDismissed(LOCATION_STORAGE_KEYS.publicationPromptDismissed)) {
        setShowLocationModal(true);
      }
    };

    void initializeLocation();
    return () => {
      cancelled = true;
    };
  }, [currentStep, isEditMode]);

  useEffect(() => {
    let unsubscribe: () => void = () => undefined;
    let cancelled = false;
    void watchGeolocationPermission((state) => {
      if (cancelled) return;
      setLocationBlocked(state === 'denied');
      if (state === 'granted') setShowLocationModal(false);
    }).then((cleanup) => {
      if (cancelled) cleanup();
      else unsubscribe = cleanup;
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
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
    safeStorageSet(LOCATION_STORAGE_KEYS.publicationPromptDismissed, 'true');

    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }

    if (await getGeolocationPermission() === 'denied') {
      setLocationBlocked(true);
      toast.error('La ubicación está bloqueada. Cámbiala en la configuración del sitio e intenta de nuevo.');
      return;
    }

    setLoadingLocation(true);
    try {
      const position = await requestBrowserLocation('discovery');
      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      markLocationSuccess(latitude, longitude);
      setLocationBlocked(false);
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      if (geoError.code === 1) setLocationBlocked(true);
      toast.error(geolocationErrorMessage(error));
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleDeclineLocation = () => {
    setShowLocationModal(false);
    safeStorageSet(LOCATION_STORAGE_KEYS.publicationPromptDismissed, 'true');
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
      // Files cannot be serialised here, so the count is what lets the restored
      // form say the photos are missing instead of quietly showing none.
      images_count: images.length,
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
      `Tiene forma del terreno dibujada: ${polygonCoords.length >= 3 ? 'Si' : 'No'}`,
      `Fotos cargadas en el formulario: ${images.length}`,
      `Detalles: ${v.description || 'Por completar'}`,
    ].join('\n');

    return buildWhatsAppUrl(message);
  };

  const buildUsername = (email: string) => {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18) || 'usuario';
    return `${base}_${Date.now().toString().slice(-5)}`.toLowerCase();
  };

  /**
   * Mirror the work in progress on the server, photos included.
   *
   * Returns whether the copy actually landed. It is the only place the images
   * survive leaving this device, so a caller that promises the person their
   * draft is safe has to know the answer rather than assume it — this endpoint
   * has gone down before (a missing migration) with the form carrying on as if
   * everything had been stored.
   */
  const savePendingPublication = async (
    source: 'account_required' | 'whatsapp_help' | 'exit_prompt' | 'other'
  ): Promise<boolean> => {
    if (!hasDraftContent()) return false;

    const v = form.getValues();
    try {
      const { apiFetch } = await import('@/lib/api');
      let draftKey = localStorage.getItem(PENDING_PUBLICATION_KEY_STORAGE_KEY);
      if (!draftKey) {
        draftKey = crypto.randomUUID();
        localStorage.setItem(PENDING_PUBLICATION_KEY_STORAGE_KEY, draftKey);
      }
      const payload = {
        title: v.title,
        contact_phone: v.contactPhone,
        contact_email: accountEmail || user?.email || '',
        city,
        province,
        property_type: v.propertyType,
        operation: v.status,
        price: v.price,
        draft_key: draftKey,
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
      };
      const formData = new FormData();
      for (const [field, value] of Object.entries(payload)) {
        formData.append(field, field === 'draft' ? JSON.stringify(value) : String(value));
      }
      imageFiles.forEach((file) => formData.append('uploaded_images', file));

      const res = await apiFetch('/pending-publications/', {
        method: 'POST',
        skipAuth: true,
        body: formData,
      });

      trackEvent(res.ok ? 'publication_pending_saved' : 'publication_pending_save_failed', {
        source,
        status_code: res.status,
      });
      setDraftStoredOnServer(res.ok);
      return res.ok;
    } catch (error) {
      console.error('Error saving pending publication:', error);
      trackEvent('publication_pending_save_failed', {
        source,
        status_code: 'network',
      });
      setDraftStoredOnServer(false);
      return false;
    }
  };

  const handleWhatsAppHelp = () => {
    if (isEditMode) return;
    savePublicationDraft();
    // Opened first and synchronously: a tab opened after awaiting a POST has
    // lost the click that authorised it, and Safari swallows it without a word.
    window.open(buildWhatsAppDraftUrl(), '_blank', 'noopener,noreferrer');
    trackEvent('publication_whatsapp_help_clicked', {
      has_session: Boolean(token),
      has_polygon: polygonCoords.length >= 3,
      has_images: images.length > 0,
      property_type: form.getValues('propertyType'),
    });
    void savePendingPublication('whatsapp_help');
  };

  const handleCreateAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingAccount(true);
    savePublicationDraft();

    try {
      const res = await fetchWithTimeout(`${API_URL}/register/`, {
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
      toast.error(requestErrorMessage(error, 'crear la cuenta'));
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
      const res = await fetchWithTimeout(`${API_URL}/login/`, {
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
      toast.error(requestErrorMessage(error, 'iniciar sesión'));
      trackEvent('publication_login_failed', { status_code: 'network' });
    } finally {
      setLoggingIn(false);
    }
  };

  // Tras iniciar sesión en el gate, publica el borrador en cuanto el token existe.
  useEffect(() => {
    if (!pendingPublish || !token) return;
    setPendingPublish(false);
    void form.handleSubmit(onSubmit, handleInvalidSubmit)();
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

  // Every path that stops a publication reports why. These three checks live
  // outside the form schema, so without their own event the activity log shows
  // an attempt that simply stops, with nothing to explain it.
  const blockPublication = (reason: string, message: string, step: number) => {
    setCurrentStep(step);
    // Same treatment as a schema error: the step alert keeps the reason on
    // screen after the toast goes, and the scroll puts the step header back in
    // view — being dropped halfway down the map explains nothing.
    setStepError(message);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.error(message);
    trackEvent('publication_blocked', {
      reason,
      error_message: message,
      error_step: step,
      location_mode: locationMode,
    });
  };

  const onSubmit = async (v: PropertyValues) => {
    if (locationMode === 'polygon' && !area) {
      blockPublication('missing_area', 'Ingresa el área total del predio', 2);
      return;
    }
    if (locationMode === 'polygon' && polygonCoords.length < 3) {
      blockPublication(
        'incomplete_polygon',
        'Dibuja la forma del terreno o cambia el modo a ubicación puntual.',
        1
      );
      return;
    }
    if (locationMode === 'point' && (!latitude || !longitude)) {
      blockPublication('missing_location', 'Marca la ubicación en el mapa o busca una referencia.', 1);
      return;
    }

    trackEvent('publication_submit_attempted', {
      has_session: Boolean(token),
      has_polygon: polygonCoords.length >= 3,
      has_images: imageFiles.length > 0,
      property_type: v.propertyType,
      status: v.status,
    });

    // A resume link stands in for the session: its holder already abandoned this
    // form once at the account wall, so walking them back into it is the one
    // thing the link exists to prevent.
    if (!token && !isEditMode && !resumeToken) {
      savePublicationDraft();
      await savePendingPublication('account_required');
      trackEvent('publication_account_required', {
        has_polygon: polygonCoords.length >= 3,
        has_images: imageFiles.length > 0,
        property_type: v.propertyType,
        status: v.status,
      });
      toast.info('Tu anuncio está listo. Inicia sesión para publicarlo.');
      setGateMode('login');
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
      if (locationMode === 'point' && latitude) formData.append('latitude', parseFloat(latitude).toString());
      if (locationMode === 'point' && longitude) formData.append('longitude', parseFloat(longitude).toString());
      if (locationMode === 'polygon' && polygonCoords.length >= 3) {
        formData.append('polygon', JSON.stringify(polygonCoords));
      } else if (isEditMode) {
        // An omitted field preserves the old JSONField during an update. Send
        // an explicit null when changing an existing polygon to point mode.
        formData.append('polygon', JSON.stringify(null));
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
      if (resumeToken) {
        formData.append(
          'pending_image_ids',
          JSON.stringify(images.flatMap((image) => image.pendingId == null ? [] : [image.pendingId]))
        );
      }

      const { apiFetch } = await import('@/lib/api');
      const endpoint = resumeToken
        ? `/publication-drafts/${resumeToken}/redeem/`
        : isEditMode && propertyId
          ? `/properties/${propertyId}/`
          : '/properties/';

      const res = await apiFetch(endpoint, {
        method: isEditMode && !resumeToken ? 'PUT' : 'POST',
        body: formData,
        // The redeem endpoint burns its token on the first success, which is a
        // stronger guard than the idempotency key and does not need it.
        skipAuth: Boolean(resumeToken),
        headers: isEditMode || resumeToken ? undefined : { 'Idempotency-Key': publicationRequestId },
        // Asking for progress also lifts the 30 s abort that used to kill every
        // upload of more than a couple of photos over mobile data.
        onUploadProgress: ({ percent }) => setUploadProgress(percent),
      }).finally(() => setUploadProgress(null));

      if (res.ok && resumeToken) {
        const body = await res.json().catch(() => ({}));
        localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
        localStorage.removeItem(PENDING_PUBLICATION_KEY_STORAGE_KEY);
        sessionStorage.removeItem(PUBLICATION_RESUME_TOKEN_KEY);
        setResumeToken(null);
        trackEvent('publication_resume_redeemed', {
          images_count: imageFiles.length,
          property_type: v.propertyType,
          account_created: Boolean(body.account_created),
        });
        toast.success(
          body.account_created
            ? `Publicado. Te enviamos un correo a ${body.email} para que definas tu contraseña.`
            : 'Publicado. Entra con tu cuenta para administrarlo.'
        );
        const publishedId = body.property?.id;
        setTimeout(() => router.push(publishedId ? `/propiedad/${publishedId}` : '/'), 900);
        return;
      }

      if (res.ok) {
        if (!isEditMode && typeof window !== 'undefined') {
          localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
          localStorage.removeItem(PENDING_PUBLICATION_KEY_STORAGE_KEY);
          setPublicationRequestId(createPublicationRequestId());
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
            colors: [
              aentsTokens.light['--primary-strong'],
              aentsTokens.light['--accent-alt'],
              aentsTokens.light['--primary-soft'],
            ],
          });
        } catch (error) {
          // The confetti is decorative only; log the failure without blocking the flow.
          console.error('No se pudo mostrar la animación de confetti:', error);
        }
        // Only a fresh publication should read the id back off the response —
        // an edit reuses the same property and has nowhere new to send the owner.
        let createdPropertyId: number | undefined;
        if (!isEditMode) {
          const body = await res.json().catch(() => null);
          createdPropertyId = body?.id;
        }

        toast.success(
          isEditMode
            ? 'Propiedad actualizada exitosamente'
            : '¡Publicado! Te preparamos el material para tus redes'
        );
        // Publishing (not editing) lands the owner straight in the promo kit while
        // the momentum is fresh; editing is a correction, not a launch, so it keeps
        // going back to the list. Fall back to the list if the id is missing so we
        // never navigate to a URL with "undefined" in it.
        const destination =
          !isEditMode && createdPropertyId
            ? `/propiedad/${createdPropertyId}/promocionar`
            : '/mis-propiedades';
        setTimeout(() => router.push(destination), 650);
      } else if (res.status === 410) {
        // Expired, revoked or already spent: four causes, one remedy.
        sessionStorage.removeItem(PUBLICATION_RESUME_TOKEN_KEY);
        setResumeToken(null);
        toast.error('Este enlace ya no es válido. Pide uno nuevo por WhatsApp.');
      } else if (res.status === 401) {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        logout();
        router.push('/iniciar-sesion');
      } else {
        const errorBody = await res.clone().json().catch(() => null);
        const message = await responseErrorMessage(res, 'No se pudo guardar la propiedad. Revisa los datos e inténtalo nuevamente.');
        const errorStep = publicationApiErrorStep(errorBody);
        if (errorStep !== null) {
          setCurrentStep(errorStep);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        console.error('Error al guardar la propiedad:', res.status, message);
        trackEvent(isEditMode ? 'publication_update_failed' : 'publication_create_failed', {
          status_code: res.status,
          property_type: v.propertyType,
          has_polygon: polygonCoords.length >= 3,
          error_step: errorStep,
          request_id: res.headers.get('x-request-id') || '',
          ...publicationErrorReport(errorBody, message),
        });
        toast.error(message);
        if (!isEditMode) void savePendingPublication('other');
      }
    } catch (error) {
      console.error('Error:', error);
      const message = requestErrorMessage(error, isEditMode ? 'actualizar la propiedad' : 'publicar la propiedad');
      trackEvent(isEditMode ? 'publication_update_failed' : 'publication_create_failed', {
        status_code: 'network',
        property_type: v.propertyType,
        has_polygon: polygonCoords.length >= 3,
        error_message: message,
        // The exception name separates a timeout from a dropped connection, and
        // its message is the only thing the browser tells us about either.
        error_code: error instanceof Error ? error.name : 'unknown',
        error_detail: error instanceof Error ? error.message : String(error),
      });
      toast.error(message);
    }
  };

  const handleInvalidSubmit = (errors: unknown) => {
    const error = publicationFormError(errors);
    const message = error?.message || 'Revisa los datos del anuncio e inténtalo nuevamente.';
    trackEvent('publication_validation_failed', {
      error_message: message,
      error_fields: publicationFormErrorFields(errors),
      error_step: error?.step ?? null,
    });
    if (!error) {
      toast.error(message);
      return;
    }
    setCurrentStep(error.step);
    setStepError(message);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.error(message);
  };

  const handleClear = () => {
    mapRef.current?.clearPolygon?.();
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
      : 'Forma del terreno';

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

  /**
   * Put the map where the person already said the property is.
   *
   * The step used to open on the whole country — Quito and Guayaquil on screen,
   * a 100 km scale bar — and only browser geolocation ever moved it. Anyone who
   * declined the permission, or published from a desktop, had to find their lot
   * by dragging from country scale, while the city selector right below the map
   * said "Macas" the whole time. The same Nominatim the form already uses for
   * reverse geocoding answers the opposite question just as well.
   */
  const centerMapOnCity = async (targetCity: string, targetProvince: string) => {
    const key = `${targetCity}|${targetProvince}`.toLowerCase();
    if (!targetCity.trim() || cityCenterCacheRef.current.has(key)) {
      const cached = cityCenterCacheRef.current.get(key);
      if (cached) mapRef.current?.flyTo([cached.lat, cached.lng], 13, { duration: 1.2 });
      return Boolean(cached);
    }

    try {
      const params = new URLSearchParams({
        format: 'json',
        limit: '1',
        country: 'Ecuador',
        city: targetCity,
        ...(targetProvince ? { state: targetProvince } : {}),
        'accept-language': 'es',
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: { 'Accept-Language': 'es' },
      });
      if (!res.ok) return false;
      const [match] = await res.json();
      if (!match?.lat || !match?.lon) return false;

      const center = { lat: Number(match.lat), lng: Number(match.lon) };
      cityCenterCacheRef.current.set(key, center);
      mapRef.current?.flyTo([center.lat, center.lng], 13, { duration: 1.2 });
      return true;
    } catch {
      // The map still works by hand; this only saves the panning.
      return false;
    }
  };

  // Center on the city when the location step opens, and again whenever the
  // city changes — unless the person already placed the property, in which case
  // moving the camera away from their own mark would be worse than not helping.
  useEffect(() => {
    if (currentStep !== 1) return;
    if (userLocation) return;
    if (latitude && longitude) return;
    if (polygonCoords.length >= 3) return;

    const timeout = setTimeout(() => {
      void centerMapOnCity(city, province);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, city, province, userLocation]);

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

  const handleGetMyLocation = async () => {
    trackEvent('publication_location_requested', {
      has_session: Boolean(token),
    });

    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización');
      return;
    }

    if (locationBlocked) {
      setShowLocationModal(true);
      return;
    }

    setLoadingLocation(true);
    try {
      const position = await requestBrowserLocation('precise');
      const { latitude, longitude } = position.coords;
      setUserLocation({ lat: latitude, lng: longitude });
      markLocationSuccess(latitude, longitude);
      if (locationMode === 'point') {
        setLatitude(latitude.toString());
        setLongitude(longitude.toString());
        reverseGeocodeLocation(latitude, longitude);
      }
      mapRef.current?.flyTo([latitude, longitude], 17, { duration: 1.2 });
      setLocationBlocked(false);
    } catch (error) {
      const geoError = error as GeolocationPositionError;
      if (geoError.code === 1) setLocationBlocked(true);
      toast.error(geolocationErrorMessage(error));
    } finally {
      setLoadingLocation(false);
    }
  };

  const bindMapRef = (map: any) => {
    mapRef.current = map;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    const MAX_IMAGES = 10;
    const MAX_SIZE_MB = 10;
    const MAX_TOTAL_SIZE_MB = 50;
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
    let savedBytes = 0;

    for (const file of files) {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > MAX_SIZE_MB) {
        errors.push(`"${file.name}" es demasiado grande (${sizeMB.toFixed(2)}MB). Máximo: ${MAX_SIZE_MB}MB`);
        continue;
      }

      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        errors.push(`"${file.name}" tiene un formato no permitido. Use: JPG, PNG o WebP`);
        continue;
      }

      // The bitmap decoded to validate dimensions is handed straight to the
      // compressor, so the file is only decoded once.
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
        const { width, height } = bitmap;
        if (width < 200 || height < 200) {
          bitmap.close();
          errors.push(`"${file.name}" debe medir al menos 200×200 píxeles (${width}×${height}).`);
          continue;
        }
        if (width > 8000 || height > 8000 || width * height > 64_000_000) {
          bitmap.close();
          errors.push(`"${file.name}" supera el límite seguro de 8000×8000 o 64 megapíxeles.`);
          continue;
        }
      } catch {
        errors.push(`"${file.name}" está corrupta o no es una imagen legible.`);
        continue;
      }

      const { file: prepared, originalBytes, compressed } = await compressImage(file, bitmap);
      if (compressed) savedBytes += originalBytes - prepared.size;
      validFiles.push(prepared);
    }

    const currentBytes = imageFiles.reduce((total, file) => total + file.size, 0);
    const selectedBytes = validFiles.reduce((total, file) => total + file.size, 0);
    if ((currentBytes + selectedBytes) / (1024 * 1024) > MAX_TOTAL_SIZE_MB) {
      errors.push(`El conjunto de imágenes supera ${MAX_TOTAL_SIZE_MB}MB. Reduce la cantidad o el tamaño de las fotos.`);
      validFiles.length = 0;
    }

    if (errors.length > 0) {
      toast.error('Algunas imágenes no se pudieron agregar: ' + errors.join(' · '));
    }

    if (validFiles.length > 0) {
      trackEvent('publication_images_added', {
        files_count: validFiles.length,
        total_images: images.length + validFiles.length,
        saved_bytes: savedBytes,
      });

      if (savedBytes > 512 * 1024) {
        toast.success(
          `Fotos optimizadas: ${(savedBytes / (1024 * 1024)).toFixed(1)} MB menos por subir.`,
        );
      }

      // Whatever the restored draft was missing, it is not missing any more.
      setMissingDraftImages(0);

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
    setImages((current) => current.filter((_, i) => i !== index));
  };

  const handleToggleExistingImageDelete = (imageId: number) => {
    if (imageId == null) return;
    setImagesToDelete((current) =>
      current.includes(imageId) ? current.filter((id) => id !== imageId) : [...current, imageId]
    );
  };

  // Reordena las imágenes; la primera es la principal. Los File se derivan de
  // este mismo orden, así que no hay una segunda lista que pueda desincronizarse.
  function reorderArray<T>(arr: T[], from: number, to: number): T[] {
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }
  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    setImages((prev) => reorderArray(prev, from, to));
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
      description: 'Elige punto rápido o dibuja la forma del terreno.',
      done: locationMode === 'polygon' ? polygonCoords.length >= 3 : Boolean(latitude && longitude),
    },
    {
      label: 'Características',
      title: 'Características',
      description: 'Área, medidas y datos físicos.',
      // Nothing here is required in point mode, but a tick before the step has
      // ever been opened claims the person completed something they never saw.
      done: locationMode === 'polygon' ? Boolean(area) : currentStep > 2,
    },
    {
      label: 'Precio',
      title: 'Precio y contacto',
      description: 'Precio, negociación y teléfono.',
      done: Number(values.price) > 0,
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
    const rejectStep = (message: string) => {
      setStepError(message);
      toast.error(message);
      return false;
    };
    if (step === 0) {
      if (!form.getValues('title')?.trim()) {
        return rejectStep('Ingresa un título para la propiedad.');
      }
      setStepError('');
      return true;
    }
    if (step === 1) {
      if (locationMode === 'polygon' && polygonCoords.length < 3) {
        return rejectStep('Dibuja la forma del terreno o cambia a ubicación puntual.');
      }
      if (locationMode === 'point' && (!latitude || !longitude)) {
        return rejectStep('Marca un punto en el mapa, usa el buscador o presiona “Mi ubicación”.');
      }
      setStepError('');
      return true;
    }
    if (step === 2) {
      // El área total solo es obligatoria cuando se dibuja el predio (polígono).
      // En modo punto y para el resto de detalles físicos todo es opcional.
      if (locationMode === 'polygon' && !area) {
        return rejectStep('Ingresa el área total del predio.');
      }
      if (areaInput.trim() && !(area > 0 && area <= MAX_AREA_M2)) {
        return rejectStep('El área total debe ser un número positivo y realista en m².');
      }
      setStepError('');
      return true;
    }
    if (step === 3) {
      const price = form.getValues('price')?.trim();
      if (!price) {
        return rejectStep('Ingresa el precio.');
      }
      if (!(Number(price) > 0)) {
        return rejectStep('El precio debe ser mayor que cero.');
      }
      setStepError('');
      return true;
    }
    setStepError('');
    return true;
  };

  const goNextStep = async () => {
    if (!(await validateStep())) return;
    setCurrentStep((step) => Math.min(step + 1, wizardSteps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goPreviousStep = () => {
    setStepError('');
    setCurrentStep((step) => Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Enter advances the wizard instead of submitting it.
   *
   * A step with a single text field and no submit button is the exact shape
   * HTML implicit submission fires on, so pressing Enter after typing the title
   * used to publish straight from step 1: the person was thrown to "Precio" —
   * skipping Ubicación entirely — and told a price they had never been asked
   * for was missing. Enter now means what everyone assumes it means.
   */
  const handleFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    const target = event.target as HTMLElement | null;
    // A textarea keeps its newlines, and an explicit button keeps its click.
    if (target?.tagName === 'TEXTAREA' || target?.tagName === 'BUTTON') return;
    if (isLastStep) return;
    event.preventDefault();
    void goNextStep();
  };

  const showBuiltGroup = ['house', 'apartment', 'commercial'].includes(propertyType);

  // Readable labels for the wizard summary and preview (shared canonical maps).
  const summaryStatusLabel = getStatusLabel(values.status) || 'En venta';
  const summaryTypeLabel = getPropertyTypeLabel(propertyType);
  const summaryLocation = [city, province].filter(Boolean).join(', ');
  const summaryPrice = values.price ? formatPrice(values.price) : null;
  const activeExistingImages = existingImages.filter((img) => !imagesToDelete.includes(img.id));
  const summaryCover = activeExistingImages[0]?.thumbnail || activeExistingImages[0]?.image || images[0]?.preview || null;

  if (loadingProperty) {
    return (
      <div className="flex min-h-[calc(100dvh-var(--app-header-height))] items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-textSecondary">Cargando propiedad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-var(--app-header-height))] bg-background">
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
        {resumeToken && (
          <div
            data-testid="resume-photos-notice"
            className="mb-4 rounded-card border border-primary/30 bg-primaryLight/40 p-4 shadow-card"
          >
            <p className="text-sm font-semibold text-textPrimary">Retomamos tu publicación</p>
            <p className="mt-1 text-sm text-textSecondary">
              Recuperamos lo que habías escrito y las fotos guardadas temporalmente. Al publicar creamos
              tu cuenta, trasladamos las fotos al anuncio y te enviamos un correo para que definas tu
              contraseña.
            </p>
          </div>
        )}
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
              onSubmit={form.handleSubmit(onSubmit, handleInvalidSubmit)}
              onChange={trackFormStarted}
              onKeyDown={handleFormKeyDown}
              className="space-y-4 lg:space-y-6"
            >
              {/* Progress + autosave */}
              <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
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
                          // Editing is correcting one field of something that
                          // already exists and already passed validation, so
                          // walking five steps to reach a price is pure toll.
                          if (isEditMode || index <= currentStep) {
                            setStepError('');
                            setCurrentStep(index);
                          } else if (index === currentStep + 1 && (await validateStep())) {
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

              {stepError && (
                <div role="alert" className="rounded-card border border-error/30 bg-error/5 px-4 py-3 text-sm font-medium text-error">
                  {stepError}
                </div>
              )}

              {draftLoaded && (
                <div className="rounded-card border border-success/30 bg-successBg p-5 text-success shadow-card">
                  <p className="font-bold">Cargamos tu borrador.</p>
                  <p className="mt-1 text-sm">
                    {missingDraftImages > 0
                      ? `Recuperamos todo lo que habías escrito. ${missingDraftImages === 1 ? 'La foto que habías agregado' : `Las ${missingDraftImages} fotos que habías agregado`} no ${missingDraftImages === 1 ? 'se guarda' : 'se guardan'} en el navegador: vuelve a subirlas en el paso de fotos.`
                      : 'Revisa los datos, completa el mapa, agrega fotos si tienes y guarda la propiedad.'}
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
                          <Input
                            placeholder="Ej: Casa moderna en zona residencial"
                            className="h-12 rounded-input"
                            // The model stops at 150. Saying so here beats a
                            // rejection from the API four steps later.
                            maxLength={MAX_TITLE_LENGTH}
                            {...field}
                          />
                        </FormControl>
                        <div className="flex items-start justify-between gap-3">
                          <FormMessage />
                          {(field.value?.length ?? 0) > MAX_TITLE_LENGTH - 30 && (
                            <span className="shrink-0 font-geo text-xs tabular-nums text-textSecondary">
                              {field.value?.length ?? 0}/{MAX_TITLE_LENGTH}
                            </span>
                          )}
                        </div>
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
                            <SelectItem value="land">{getPropertyTypeLabel('land')}</SelectItem>
                            <SelectItem value="house">{getPropertyTypeLabel('house')}</SelectItem>
                            <SelectItem value="apartment">{getPropertyTypeLabel('apartment')}</SelectItem>
                            <SelectItem value="commercial">{getPropertyTypeLabel('commercial')}</SelectItem>
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
                            {/* Publishing something nobody can see is not one of
                                three equal options. It stays available while
                                editing, which is where retiring a listing
                                actually happens. */}
                            {(isEditMode || field.value === 'inactive') && (
                              <SelectItem value="inactive">Inactivo (vendido o alquilado)</SelectItem>
                            )}
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
              <div className="space-y-4">
                <div className="rounded-card border border-line bg-white p-4 shadow-card">
                  <h3 className="text-sm font-semibold text-textPrimary">Modo de ubicación</h3>
                  <p className="mt-1 text-xs text-textSecondary">
                    Así verá tu propiedad quien la busque en el mapa.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[
                      {
                        key: 'point',
                        title: 'Solo ubicación',
                        description: 'Un pin exacto en el mapa: de un vistazo se ve dónde está.',
                        badge: null,
                        icon: MapPin,
                        active: locationMode === 'point',
                        onClick: () => handleLocationModeChange('point'),
                      },
                      {
                        key: 'polygon',
                        title: 'Forma del terreno',
                        description: 'Dibuja los límites y la gente ve el terreno tal cual es: forma, tamaño y por dónde llega.',
                        badge: 'Destaca más',
                        icon: Pentagon,
                        active: locationMode === 'polygon',
                        onClick: () => handleLocationModeChange('polygon', false),
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
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold">{option.title}</span>
                            {option.badge && (
                              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">
                                {option.badge}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs text-textSecondary">{option.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

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
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (locationMode === 'polygon') handleClear();
                          else {
                            setLatitude('');
                            setLongitude('');
                          }
                        }}
                        disabled={locationMode === 'polygon' ? polygonCoords.length < 3 : !latitude || !longitude}
                        className="h-9 rounded-button border-error/30 bg-white text-error hover:bg-errorBg hover:text-error"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {locationMode === 'polygon' ? 'Borrar forma' : 'Borrar ubicación'}
                      </Button>
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
                  </div>

                  <div className="relative isolate h-[480px] sm:h-[620px] lg:h-[calc(100dvh-11rem)] lg:min-h-[680px]">
                    <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-1.5rem)] rounded-card border border-line bg-white/95 px-3 py-2 text-xs shadow-card backdrop-blur">
                      <p className="font-semibold text-textPrimary">{locationMapLabel}</p>
                      <p className="mt-0.5 text-textSecondary">
                        {locationMode === 'point'
                          ? latitude && longitude
                            ? 'Punto marcado'
                            : 'Pendiente de marcar punto'
                          : polygonCoords.length >= 3
                            ? `${polygonCoords.length} puntos dibujados${area ? ` · ${area} m²` : ''}`
                            : 'Pendiente de dibujar la forma'}
                      </p>
                    </div>
                    <DrawLocationMap
                      onMapReady={bindMapRef}
                      onPolygonChange={handlePolygonChange}
                      onAreaChange={handleDrawnAreaChange}
                      onLocationChange={locationMode === 'point' ? handlePointLocationChange : undefined}
                      initialPolygon={polygonCoords}
                      selectedLocation={latitude && longitude ? { lat: Number(latitude), lng: Number(longitude) } : null}
                      locationMode={locationMode}
                      userCenter={userLocation ? [userLocation.lat, userLocation.lng] : undefined}
                      // Parcel scale, not city scale: the point of centring on
                      // the person is that they can start drawing their lot
                      // right away. 12 landed on a whole city.
                      userZoom={userLocation ? 17 : undefined}
                      userLocation={userLocation}
                      showMeasurements={showMeasurements}
                      referenceProperties={referenceProperties}
                    />
                  </div>
                </div>

                <aside className="grid gap-4 md:grid-cols-2">
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
                              ? 'Forma del terreno lista para publicar.'
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
                    <label htmlFor="property-total-area" className="text-sm font-semibold text-textPrimary">
                      Área Total (m²){locationMode === 'polygon' ? ' *' : ''}
                    </label>
                    <Input
                      id="property-total-area"
                      type="number"
                      step="0.01"
                      min="0"
                      max={MAX_AREA_M2}
                      value={areaInput}
                      onChange={(e) => {
                        setAreaInput(e.target.value);
                        setAreaFromPolygon(false);
                      }}
                      placeholder="500"
                      className="h-12 rounded-input"
                      aria-describedby="property-total-area-hint"
                    />
                    <p id="property-total-area-hint" className="text-xs text-textSecondary">
                      {areaFromPolygon
                        ? 'Calculada con la forma que dibujaste. Puedes corregirla.'
                        : locationMode === 'polygon'
                          ? 'Dibuja el predio en el mapa y la calculamos por ti.'
                          : 'Superficie total del terreno en metros cuadrados.'}
                    </p>
                  </div>
                  <div className="md:col-span-2 rounded-input border border-line bg-muted/40 px-4 py-3">
                    <p className="text-sm font-semibold text-textPrimary">{locationMapLabel}</p>
                    <p className="mt-1 text-xs text-textSecondary">
                      {locationMode === 'point'
                        ? 'Elegiste publicar con un punto de ubicación en el mapa.'
                        : showMeasurements
                          ? 'Las medidas por lado se configuran directamente en el mapa.'
                          : 'La forma dibujada se usará para mostrar el terreno en el mapa.'}
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
                                'absolute right-2 top-2 rounded-full p-2 text-white shadow-card transition-colors',
                                marked ? 'bg-primary hover:bg-primaryHover' : 'bg-error hover:bg-error/90'
                              )}
                              title={marked ? 'Conservar imagen' : 'Eliminar imagen'}
                              aria-label={marked ? 'Conservar imagen' : 'Eliminar imagen'}
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
                              className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1.5 text-[11px] font-semibold text-white opacity-100 transition-opacity hover:bg-black/90 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                              title="Hacer principal"
                              aria-label="Hacer principal esta imagen"
                            >
                              <Star className="h-3 w-3" strokeWidth={2} aria-hidden />
                              Principal
                            </button>
                          )}

                          <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white font-geo">
                            {img.size} MB
                          </div>

                          {/* Controles de orden */}
                          <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                            <button
                              type="button"
                              onClick={() => moveImage(index, index - 1)}
                              disabled={index === 0}
                              className="rounded-md bg-white/90 p-2 text-textPrimary shadow-card transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                              title="Mover a la izquierda"
                              aria-label="Mover imagen a la izquierda"
                            >
                              <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveImage(index, index + 1)}
                              disabled={index === images.length - 1}
                              className="rounded-md bg-white/90 p-2 text-textPrimary shadow-card transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                              title="Mover a la derecha"
                              aria-label="Mover imagen a la derecha"
                            >
                              <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(index)}
                            className="absolute right-2 top-2 rounded-full bg-error p-2 text-white opacity-100 transition-opacity hover:bg-error/90 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                            title="Eliminar imagen"
                            aria-label="Eliminar imagen"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-input border-2 border-dashed border-line transition-all focus-within:ring-2 focus-within:ring-primary/40 hover:border-primary hover:bg-muted/40">
                  <div className="flex flex-col items-center justify-center px-6 py-4 text-center">
                    <UploadCloud className="mb-3 h-10 w-10 text-textSecondary" />
                    <p className="mb-1 text-sm font-semibold text-textSecondary">Haz clic para subir imágenes</p>
                    <p className="text-xs text-textSecondary">PNG, JPG, WebP • Máx. 10MB por imagen</p>
                    <p className="mt-2 text-xs text-muted-foreground">Opcional, pero los anuncios con fotos suelen recibir más contactos</p>
                    <p className="mt-1 text-xs text-muted-foreground">Máximo 10 imágenes. Se optimizan automáticamente</p>
                  </div>
                  <input
                    type="file"
                    className="sr-only"
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
                      {/* The defaults are the string "0", which is truthy: a
                          plot of land used to advertise "0 hab. · 0 baños". */}
                      {Number(values.rooms) > 0 ? <span className="rounded-md bg-background px-2 py-0.5 font-medium">{values.rooms} hab.</span> : null}
                      {Number(values.bathrooms) > 0 ? <span className="rounded-md bg-background px-2 py-0.5 font-medium">{values.bathrooms} baños</span> : null}
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
              {(isLastStep || isEditMode) && (
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
                        {/* A silent wait with photos in flight reads as a hang.
                            The percentage is the difference between "esto se
                            colgó" and "esto está trabajando". */}
                        {uploadProgress !== null && uploadProgress < 100
                          ? `Subiendo fotos ${uploadProgress}%`
                          : isEditMode
                            ? 'Actualizando...'
                            : 'Guardando...'}
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        {isEditMode ? 'Actualizar propiedad' : token ? 'Guardar Propiedad' : 'Iniciar sesión para publicar'}
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
          <div className="sticky top-[calc(var(--app-header-height)+1.5rem)] space-y-3 rounded-card border border-line bg-surface p-4 shadow-card">
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
              Guardamos el borrador en este navegador. Puedes volver luego, iniciar sesión —o crear una cuenta si aún no tienes— y publicarlo.
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
                  ? 'Inicia sesión con tu cuenta para publicar este anuncio.'
                  : 'Crea una cuenta para publicar este anuncio.'}{' '}
                {/* Only promise what the server confirmed. This copy used to say
                    the draft was saved even when that request had failed. */}
                {draftStoredOnServer
                  ? 'Guardamos tu borrador y tus fotos, no vas a perder nada.'
                  : 'Guardamos tu borrador en este navegador; las fotos hay que volver a subirlas si lo abres en otro dispositivo.'}
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
                // Same contract as signing in with an email: the person pressed
                // Publish, so publishing is what happens once there is a token.
                setPendingPublish(true);
                toast.success('Cuenta conectada. Publicando tu anuncio…');
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
                <label htmlFor="gate-login-email" className="text-sm font-semibold text-textPrimary">Correo</label>
                <Input id="gate-login-email" type="email" autoComplete="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} className="h-11 rounded-input" required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="gate-login-password" className="text-sm font-semibold text-textPrimary">Contraseña</label>
                <Input id="gate-login-password" type="password" autoComplete="current-password" value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} className="h-11 rounded-input" required />
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
                  Crea una
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-4 px-6 pb-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="gate-register-first-name" className="text-sm font-semibold text-textPrimary">Nombre</label>
                  <Input id="gate-register-first-name" autoComplete="given-name" value={accountFirstName} onChange={(e) => setAccountFirstName(e.target.value)} className="h-11 rounded-input" required />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="gate-register-last-name" className="text-sm font-semibold text-textPrimary">Apellido</label>
                  <Input id="gate-register-last-name" autoComplete="family-name" value={accountLastName} onChange={(e) => setAccountLastName(e.target.value)} className="h-11 rounded-input" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="gate-register-email" className="text-sm font-semibold text-textPrimary">Correo</label>
                <Input id="gate-register-email" type="email" autoComplete="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} className="h-11 rounded-input" required />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="gate-register-password" className="text-sm font-semibold text-textPrimary">Contraseña</label>
                <Input id="gate-register-password" type="password" autoComplete="new-password" value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} className="h-11 rounded-input" required />
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
