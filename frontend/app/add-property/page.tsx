'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Info,
  MapPin,
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
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import LocationSelect from '@/components/LocationSelect';
import LocationPermissionModal from '@/components/LocationPermissionModal';

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

const propertySchema = z
  .object({
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
  })
  .superRefine((val, ctx) => {
    const needsBuilt = ['house', 'apartment', 'commercial'].includes(val.propertyType);
    if (needsBuilt && !val.builtArea?.trim()) {
      ctx.addIssue({ path: ['builtArea'], code: 'custom', message: 'El área construida es obligatoria' });
    }
    if (needsBuilt && !val.bathrooms?.trim()) {
      ctx.addIssue({ path: ['bathrooms'], code: 'custom', message: 'Los baños son obligatorios' });
    }
    if (['house', 'apartment'].includes(val.propertyType) && !val.rooms?.trim()) {
      ctx.addIssue({ path: ['rooms'], code: 'custom', message: 'Las habitaciones son obligatorias' });
    }
    if (val.propertyType === 'house' && !val.floors?.trim()) {
      ctx.addIssue({ path: ['floors'], code: 'custom', message: 'El número de pisos es obligatorio' });
    }
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
      <div className="bg-gradient-to-r from-primary to-secondary px-5 py-4">
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
  const mapRef = useRef<any>(null);
  const [polygonCoords, setPolygonCoords] = useState<any[]>([]);
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
      if (draft.polygon) setPolygonCoords(draft.polygon);
      if (draft.area) setArea(Number(draft.area));
      if (draft.show_measurements !== undefined) setShowMeasurements(Boolean(draft.show_measurements));
      setDraftLoaded(true);
    } catch (error) {
      console.error('Error loading property draft:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              maximumAge: 0,
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

    return `https://wa.me/593983738151?text=${encodeURIComponent(message)}`;
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

  const draftSignature = JSON.stringify({
    ...values,
    city,
    province,
    latitude,
    longitude,
    area,
    showMeasurements,
    polygonLen: polygonCoords.length,
    imagesLen: images.length,
  });

  useEffect(() => {
    if (!formStartedRef.current || !hasDraftContent()) return;

    const timeout = setTimeout(() => {
      savePublicationDraft();
    }, 800);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSignature]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasDraftContent()) return;

      savePublicationDraft();
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSignature]);

  const onSubmit = async (v: PropertyValues) => {
    if (!area) {
      toast.error('Ingresa el área total del predio');
      return;
    }

    trackEvent('publication_submit_attempted', {
      has_session: Boolean(token),
      has_polygon: polygonCoords.length >= 3,
      has_images: imageFiles.length > 0,
      property_type: v.propertyType,
      status: v.status,
    });

    if (!token) {
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
      if (polygonCoords.length >= 3) {
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

      imageFiles.forEach((file) => {
        formData.append('uploaded_images', file);
      });

      const { apiFetch } = await import('@/lib/api');

      const res = await apiFetch('/properties/', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(PROPERTY_DRAFT_STORAGE_KEY);
        }
        trackEvent('publication_created', {
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
            colors: ['#2563EB', '#06B6D4', '#10B981'],
          });
        } catch {}
        toast.success('Propiedad creada exitosamente');
        setTimeout(() => router.push('/my-properties'), 650);
      } else if (res.status === 401) {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        logout();
        router.push('/login');
      } else {
        const errorData = await res.json();
        console.error('Error:', errorData);
        trackEvent('publication_create_failed', {
          status_code: res.status,
          property_type: v.propertyType,
          has_polygon: polygonCoords.length >= 3,
        });
        toast.error('No se pudo guardar la propiedad');
      }
    } catch (error) {
      console.error('Error:', error);
      trackEvent('publication_create_failed', {
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

    const totalImages = images.length + files.length;
    if (totalImages > MAX_IMAGES) {
      toast.error(`Máximo ${MAX_IMAGES} imágenes por propiedad. Ya tienes ${images.length}.`);
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

  const steps = [
    { label: 'Datos', done: Boolean(values.title?.trim()) },
    { label: 'Ubicacion', done: polygonCoords.length >= 3 || Boolean(city.trim()) },
    { label: 'Precio', done: Boolean(values.price?.trim()) },
    { label: 'Contacto', done: Boolean(values.contactPhone?.trim()) },
  ];

  const showBuiltGroup = ['house', 'apartment', 'commercial'].includes(propertyType);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-line bg-surface shadow-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-textPrimary">Publicar propiedad gratis</h1>
              <p className="mt-1 text-sm text-textSecondary">
                Completa los datos principales. Si algo se complica, te ayudamos por WhatsApp.
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
        <div className="space-y-4 lg:space-y-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              onChange={trackFormStarted}
              className="space-y-4 lg:space-y-6"
            >
              {/* Progress + autosave */}
              <div className="sticky top-12 z-[600] rounded-modal border border-line bg-surface/95 p-4 shadow-cardHover backdrop-blur">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-bold text-textSecondary sm:text-xs">
                    {steps.map((step) => (
                      <div
                        key={step.label}
                        className={cn(
                          'rounded-lg px-2 py-2 transition-colors',
                          step.done ? 'bg-primary text-white' : 'bg-muted text-textSecondary'
                        )}
                      >
                        {step.label}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-medium text-textSecondary">
                    {draftSavedAt
                      ? `Borrador guardado ${draftSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Tu borrador se guarda automáticamente'}
                  </p>
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

              <div className="rounded-card border border-primary/15 bg-surface p-5 shadow-card">
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

              {/* Map Section */}
              <div className="overflow-hidden rounded-card bg-surface shadow-card">
                <div className="bg-gradient-to-r from-primary to-secondary px-5 py-4">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-white lg:text-lg">
                    <MapPin className="h-5 w-5" />
                    Ubicación en el Mapa
                  </h2>
                  <p className="mt-1 text-xs text-white/90 lg:text-sm">
                    Opcional: dibuja el área para mostrar medidas exactas. También puedes publicar con ubicación aproximada.
                  </p>
                  <p className="mt-1 text-[11px] text-white/90 lg:text-xs">
                    Tip: si estás en móvil y se complica, completa el área manualmente y publica. Luego podemos ayudarte a mejorar el mapa.
                  </p>
                </div>
                <div className="relative h-[400px] sm:h-[500px] lg:h-[600px]">
                  <button
                    type="button"
                    onClick={handleGetMyLocation}
                    disabled={loadingLocation}
                    className="absolute bottom-3 right-3 z-[500] rounded-full bg-surface p-2.5 text-primary shadow-cardHover transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 sm:p-3"
                    aria-label="Mi ubicación"
                    title="Ir a mi ubicación"
                  >
                    {loadingLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                    ) : (
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
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
                <div className="border-t border-line bg-muted/50 px-4 py-3">
                  <Button type="button" variant="outline" onClick={handleClear} className="w-full rounded-button border-line bg-surface">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Limpiar polígono opcional
                  </Button>
                </div>
              </div>

              {/* Characteristics */}
              <SectionCard icon={<Ruler className="h-5 w-5" />} title="Características del Predio">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-textPrimary">Área Total (m²) *</label>
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

                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-textPrimary">Medidas del Polígono</label>
                    <label
                      htmlFor="showMeasurements"
                      className="mt-2 flex cursor-pointer items-start gap-3 rounded-input border border-line bg-muted/40 px-4 py-3"
                    >
                      <Checkbox
                        id="showMeasurements"
                        checked={showMeasurements}
                        onCheckedChange={(c) => setShowMeasurements(Boolean(c))}
                        className="mt-0.5"
                      />
                      <span className="text-sm text-textPrimary">
                        Mostrar medidas del polígono si lo dibujas
                        <span className="mt-1 block text-xs text-textSecondary">
                          Puedes publicar sin polígono. Si lo agregas, el área se calcula automáticamente.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                {(propertyType === 'house' || propertyType === 'apartment' || propertyType === 'commercial') && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="builtArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Área Construida (m²) *</FormLabel>
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
                            <FormLabel className="font-semibold">Habitaciones *</FormLabel>
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
                          <FormLabel className="font-semibold">Baños *</FormLabel>
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
                          <FormLabel className="font-semibold">Número de Pisos *</FormLabel>
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

              {/* Location */}
              <SectionCard icon={<MapPin className="h-5 w-5" />} title="Ubicación">
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
                      <FormLabel className="font-semibold">Dirección</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Av. Principal #123" className="h-12 rounded-input" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </SectionCard>

              {/* Financial Information */}
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

              {/* Images */}
              <SectionCard icon={<ImagePlus className="h-5 w-5" />} title="Imágenes de la Propiedad">
                {images.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-textPrimary">
                      Nuevas Imágenes ({images.length}/10)
                      <span className="ml-2 text-xs font-normal text-muted-foreground">Se optimizan automáticamente</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                      {images.map((img, index) => (
                        <div key={index} className="group relative">
                          <PreviewImage src={img.preview} />
                          <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white font-geo">
                            {img.size} MB
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

              {/* Action Buttons */}
              <div className="rounded-card bg-surface p-6 shadow-card">
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-button bg-gradient-to-r from-primary to-secondary py-6 text-lg font-semibold shadow-cardHover sm:flex-1"
                  >
                    <Check className="mr-2 h-5 w-5" />
                    {token ? 'Guardar Propiedad' : 'Crear cuenta para publicar'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleWhatsAppHelp}
                    className="w-full rounded-button border-2 border-primary py-6 font-semibold text-primary hover:bg-primary/5 sm:w-auto"
                  >
                    Publicar con ayuda
                  </Button>
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
            </form>
          </Form>

          {/* Contact Support */}
          <div className="rounded-card border border-primary/15 bg-gradient-to-r from-primary/10 via-surface to-secondary/10 p-6 shadow-card sm:p-8">
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
                className="rounded-button bg-gradient-to-r from-primary to-secondary font-semibold shadow-card"
              >
                <a
                  href="https://wa.me/593983738151?text=Hola%20necesito%20ayuda%20para%20publicar%20mi%20propiedad"
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Chatear por WhatsApp
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
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
        <div className="fixed left-1/2 top-20 z-[9999] -translate-x-1/2">
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
              className="w-full rounded-button bg-gradient-to-r from-primary to-secondary font-bold"
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
                router.push(token ? '/my-properties' : '/');
              }}
            >
              Salir y mantener borrador
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Modal */}
      <Dialog open={showAccountModal} onOpenChange={setShowAccountModal}>
        <DialogContent className="rounded-modal">
          <DialogHeader>
            <DialogTitle>Tu anuncio está listo</DialogTitle>
            <DialogDescription>
              Crea tu cuenta para guardar y publicar este anuncio. El borrador ya está guardado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-textPrimary">Nombre</label>
                <Input value={accountFirstName} onChange={(e) => setAccountFirstName(e.target.value)} className="h-12 rounded-input" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-textPrimary">Apellido</label>
                <Input value={accountLastName} onChange={(e) => setAccountLastName(e.target.value)} className="h-12 rounded-input" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-textPrimary">Correo</label>
              <Input type="email" value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} className="h-12 rounded-input" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-textPrimary">Contraseña</label>
              <Input type="password" value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} className="h-12 rounded-input" required />
            </div>
            <Button type="submit" disabled={creatingAccount} className="w-full rounded-button bg-gradient-to-r from-primary to-secondary font-bold">
              {creatingAccount ? 'Creando cuenta...' : 'Crear cuenta y publicar'}
            </Button>
            <Button type="button" variant="outline" className="w-full rounded-button border-line font-semibold text-textSecondary" onClick={() => setShowAccountModal(false)}>
              Seguir editando
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AddPropertyPage;
