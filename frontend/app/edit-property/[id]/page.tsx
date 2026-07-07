'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  RotateCcw,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import PrivateRoute from '@/components/PrivateRoute';
import LocationSelect from '@/components/LocationSelect';

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

function PreviewImage({ src, className }: { src: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cn('relative h-32 w-full overflow-hidden rounded-lg border-2 bg-muted', className)}>
      {!loaded && <Skeleton className="absolute inset-0" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Imagen"
        onLoad={() => setLoaded(true)}
        className={cn('h-full w-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
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

const EditPropertyPage = () => {
  const params = useParams();
  const propertyId = params?.id as string;
  const mapRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [polygonCoords, setPolygonCoords] = useState<any[]>([]);
  const [area, setArea] = useState(0);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [referenceProperties, setReferenceProperties] = useState<any[]>([]);

  // Location
  const [city, setCity] = useState('Macas');
  const [province, setProvince] = useState('Morona Santiago');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Images
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [newImages, setNewImages] = useState<any[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<number[]>([]);

  // Geocoding
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { token, logout } = useAuth();
  const router = useRouter();

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

  const propertyType = form.watch('propertyType');

  // Load property data
  useEffect(() => {
    const loadProperty = async () => {
      if (!propertyId) return;

      try {
        const { apiGet } = await import('@/lib/api');
        const res = await apiGet(`/properties/${propertyId}/`);

        if (res.ok) {
          const property = await res.json();

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
          }

          setArea(parseFloat(property.area) || 0);
          setShowMeasurements(property.show_measurements !== undefined ? property.show_measurements : true);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId, logout, router]);

  // Load all properties to show as reference (excluding the one being edited)
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { apiFetch } = await import('@/lib/api');
        const res = await apiFetch('/properties/', {
          skipAuth: !token,
        });

        if (res.ok) {
          const data = await res.json();
          const properties = Array.isArray(data) ? data : data.results || [];
          const filtered = properties.filter((p: any) => p.id.toString() !== propertyId);
          setReferenceProperties(filtered);
        } else {
          console.error('Error loading reference properties');
        }
      } catch (error) {
        console.error('Error fetching reference properties:', error);
      }
    };

    if (propertyId) {
      fetchProperties();
    }
  }, [token, propertyId]);

  const onSubmit = async (v: PropertyValues) => {
    if (polygonCoords.length < 3) {
      toast.error('Debes dibujar un polígono en el mapa para definir la ubicación de la propiedad.');
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

      if (imagesToDelete.length > 0) {
        formData.append('images_to_delete', JSON.stringify(imagesToDelete));
      }

      newImageFiles.forEach((file) => {
        formData.append('uploaded_images', file);
      });

      const { apiFetch } = await import('@/lib/api');

      const res = await apiFetch(`/properties/${propertyId}/`, {
        method: 'PUT',
        body: formData,
      });

      if (res.ok) {
        try {
          const confetti = (await import('canvas-confetti')).default;
          confetti({
            particleCount: 90,
            spread: 70,
            origin: { y: 0.7 },
            colors: ['#2563EB', '#06B6D4', '#10B981'],
          });
        } catch {}
        toast.success('Propiedad actualizada exitosamente');
        setTimeout(() => router.push('/my-properties'), 650);
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

    const totalImages = existingImages.length - imagesToDelete.length + newImages.length + files.length;
    if (totalImages > MAX_IMAGES) {
      toast.error(
        `Máximo ${MAX_IMAGES} imágenes por propiedad. Ya tienes ${existingImages.length - imagesToDelete.length + newImages.length}.`
      );
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
      setNewImageFiles([...newImageFiles, ...validFiles]);

      const newImagesPreview = validFiles.map((file) => {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
          file,
          preview: URL.createObjectURL(file),
          size: sizeMB,
          name: file.name,
        };
      });
      setNewImages([...newImages, ...newImagesPreview]);
    }

    e.target.value = '';
  };

  const handleRemoveNewImage = (index: number) => {
    const newImagesFiltered = newImages.filter((_, i) => i !== index);
    const newFilesFiltered = newImageFiles.filter((_, i) => i !== index);
    setNewImages(newImagesFiltered);
    setNewImageFiles(newFilesFiltered);
  };

  const handleDeleteExistingImage = (imageId: number) => {
    if (imagesToDelete.includes(imageId)) {
      setImagesToDelete(imagesToDelete.filter((id) => id !== imageId));
    } else {
      setImagesToDelete([...imagesToDelete, imageId]);
    }
  };

  if (loading) {
    return (
      <PrivateRoute>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-textSecondary">Cargando propiedad...</p>
          </div>
        </div>
      </PrivateRoute>
    );
  }

  return (
    <PrivateRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-line bg-surface shadow-card">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-textPrimary">Editar Propiedad</h1>
                <p className="mt-1 text-sm text-textSecondary">Actualiza la información de tu propiedad</p>
              </div>
              <Button variant="outline" onClick={() => router.push('/my-properties')} className="rounded-button border-line">
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 lg:space-y-6">
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
                  <div className="bg-primary px-5 py-4">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-white lg:text-lg">
                      <MapPin className="h-5 w-5" />
                      Ubicación en el Mapa
                    </h2>
                    <p className="mt-1 text-[11px] text-white/90 lg:text-xs">
                      Tip: El polígono se dibuja mejor con mouse o trackpad; en móvil suele fallar. Si necesitas ayuda, escríbenos por WhatsApp.
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
                      onPolygonChange={setPolygonCoords}
                      initialPolygon={polygonCoords}
                      userLocation={userLocation}
                      showMeasurements={showMeasurements}
                      referenceProperties={referenceProperties}
                    />
                  </div>
                  <div className="border-t border-line bg-muted/50 px-4 py-3">
                    <Button type="button" variant="outline" onClick={handleClear} className="w-full rounded-button border-line bg-surface">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Limpiar Polígono
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
                          Mostrar medidas exactas en el mapa
                          <span className="mt-1 block text-xs text-textSecondary">
                            Desactiva esta opción si solo conoces la forma aproximada pero no las medidas exactas
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
                  {existingImages.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-textPrimary">
                        Imágenes Actuales ({existingImages.length - imagesToDelete.length}/{existingImages.length})
                      </h4>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {existingImages.map((img) => {
                          const marked = imagesToDelete.includes(img.id);
                          return (
                            <div key={img.id} className="group relative">
                              <PreviewImage
                                src={img.image}
                                className={marked ? 'border-error opacity-50' : 'border-line'}
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteExistingImage(img.id)}
                                className={cn(
                                  'absolute right-2 top-2 rounded-full p-1 text-white opacity-0 transition-opacity group-hover:opacity-100',
                                  marked ? 'bg-success hover:bg-success/90' : 'bg-error hover:bg-error/90'
                                )}
                                title={marked ? 'Restaurar imagen' : 'Eliminar imagen'}
                              >
                                {marked ? <RotateCcw className="h-4 w-4" /> : <X className="h-4 w-4" />}
                              </button>
                              {marked && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                                  <span className="text-xs font-bold text-white">Se eliminará</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {newImages.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-textPrimary">
                        Nuevas Imágenes ({newImages.length})
                        <span className="ml-2 text-xs font-normal text-muted-foreground">Se optimizan automáticamente</span>
                      </h4>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {newImages.map((img, index) => (
                          <div key={index} className="group relative">
                            <PreviewImage src={img.preview} className="border-line" />
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
                      <p className="mt-2 text-xs text-muted-foreground">Optimización automática sin pérdida de calidad</p>
                      <p className="mt-1 text-xs text-muted-foreground">
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
                </SectionCard>

                {/* Action Buttons */}
                <div className="rounded-card bg-surface p-6 shadow-card">
                  <div className="flex flex-col items-center gap-4 sm:flex-row">
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-button bg-primary py-6 text-lg font-semibold shadow-cardHover sm:flex-1"
                    >
                      <Check className="mr-2 h-5 w-5" />
                      Actualizar Propiedad
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => router.push('/my-properties')}
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
            <div className="mt-2 rounded-card border border-primary/15 bg-primaryLight/40 p-6 shadow-card sm:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <Info className="mt-1 h-6 w-6 text-primary" />
                  <div>
                    <p className="text-base font-semibold text-textPrimary sm:text-lg">¿Problemas técnicos o dudas?</p>
                    <p className="mt-1 text-sm text-textSecondary">
                      Escríbenos y te ayudamos a actualizar tu propiedad sin complicaciones.
                    </p>
                  </div>
                </div>
                <Button asChild className="rounded-button bg-primary font-semibold shadow-card">
                  <a
                    href="https://wa.me/593983738151?text=Hola%20necesito%20ayuda%20para%20editar%20mi%20propiedad"
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
      </div>
    </PrivateRoute>
  );
};

export default EditPropertyPage;
