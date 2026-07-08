'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Share2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  MapPin,
  MapPinned,
  User,
  Phone,
  ImageIcon,
  Ruler,
  Building2,
  BedDouble,
  Bath,
  Car,
  Layers,
  AlignLeft,
  MessageCircle,
  BadgeCheck,
  Mail,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ShareModal from './ShareModal';
import LeadForm from './LeadForm';
import {
  getPropertyTypeLabel,
  getStatusLabel,
  getStatusBadgeClass,
  formatArea,
  formatPrice,
} from '@/lib/property-labels';

const getValidImages = (images: any[] | undefined) => {
  if (!Array.isArray(images)) return [];
  return images.filter((img) => typeof img?.image === 'string' && img.image.trim().length > 0);
};

const clampImageIndex = (index: number, length: number) => {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
};

const formatDate = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// Image Gallery Component (lightbox a pantalla completa)
const ImageGallery = ({ images, initialIndex, onClose }: any) => {
  const validImages = useMemo(() => getValidImages(images), [images]);
  const [currentIndex, setCurrentIndex] = useState(() => clampImageIndex(initialIndex, validImages.length));

  useEffect(() => {
    if (validImages.length === 0) {
      onClose();
      return;
    }
    setCurrentIndex((prev: number) => clampImageIndex(prev, validImages.length));
  }, [validImages.length, onClose]);

  if (validImages.length === 0) return null;

  const activeImage = validImages[clampImageIndex(currentIndex, validImages.length)];

  const nextImage = () => {
    setCurrentIndex((prev: number) => (prev + 1) % validImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev: number) => (prev - 1 + validImages.length) % validImages.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  };

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/95 outline-none animate-fadeIn"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-label="Galería de imágenes"
    >
      {/* Close Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="fixed right-4 top-4 inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-4 py-2 text-sm font-bold text-black shadow-cardHover transition-all hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        style={{ zIndex: 2147483647 }}
        aria-label="Cerrar galería"
      >
        <X className="h-6 w-6" strokeWidth={3} aria-hidden />
        <span>Cerrar</span>
      </button>

      {/* Image Counter */}
      <div
        className="absolute left-4 top-4 z-10 rounded-card bg-white/10 px-3 py-1.5 text-xs font-medium text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {clampImageIndex(currentIndex, validImages.length) + 1} / {validImages.length}
      </div>

      {/* Main Image */}
      <div className="relative flex h-full w-full items-center justify-center p-4">
        <img
          src={activeImage.image}
          alt={`Imagen ${currentIndex + 1}`}
          className="max-h-full max-w-full rounded-xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Navigation Arrows */}
        {validImages.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-card bg-white/10 p-3 text-white transition-all hover:bg-white/20"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-7 w-7" strokeWidth={2} aria-hidden />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-card bg-white/10 p-3 text-white transition-all hover:bg-white/20"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-7 w-7" strokeWidth={2} aria-hidden />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {validImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex max-w-[90vw] -translate-x-1/2 gap-2 overflow-x-auto rounded-xl bg-white/10 p-3 backdrop-blur-sm">
          {validImages.map((img: any, idx: number) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              className={cn(
                'h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                idx === currentIndex ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              <img src={img.image} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FeatureTile = ({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Ruler;
  value: any;
  label: string;
}) => (
  <div className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface px-1.5 py-2 text-center">
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primaryLight">
      <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden />
    </span>
    <div className="font-geo text-sm font-semibold tabular-nums text-textPrimary">{value}</div>
    <div className="text-[10px] font-medium leading-tight text-textSecondary">{label}</div>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: any }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line/70 py-1.5 last:border-b-0">
      <span className="text-xs font-medium text-textSecondary">{label}</span>
      <span className="max-w-[62%] text-right text-sm font-semibold leading-5 text-textPrimary">{value}</span>
    </div>
  );
};

interface PropertyModalProps {
  property: any;
  isOpen: boolean;
  onClose: () => void;
  /** Centra el mapa en la propiedad (y cierra el panel en móvil). */
  onViewOnMap?: () => void;
}

const PropertyModal = ({ property: initialProperty, isOpen, onClose, onViewOnMap }: PropertyModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [fullProperty, setFullProperty] = useState<any | null>(null);
  const [loadingFullProperty, setLoadingFullProperty] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const property = fullProperty || initialProperty;
  const images = useMemo(() => getValidImages(property?.images), [property?.images]);

  // Cierre con Escape: primero la galería/compartir si están abiertos, luego el panel.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (galleryOpen) { setGalleryOpen(false); return; }
      if (shareModalOpen) { setShareModalOpen(false); return; }
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, galleryOpen, shareModalOpen, onClose]);

  // Lleva el foco al panel al abrir (lectores de pantalla / teclado).
  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
  }, [isOpen, initialProperty?.id]);

  useEffect(() => {
    if (!isOpen) return;
    setFullProperty(null);
    setCurrentImageIndex(0);
    setGalleryOpen(false);
  }, [isOpen, initialProperty?.id]);

  useEffect(() => {
    if (!isOpen || !initialProperty?.id) return;

    let cancelled = false;
    setLoadingFullProperty(true);

    (async () => {
      try {
        const { apiFetch } = await import('@/lib/api');
        const res = await apiFetch(`/properties/${initialProperty.id}/`, { skipAuth: true });
        if (!res.ok || cancelled) return;
        const detail = await res.json();
        if (!cancelled) setFullProperty(detail);
      } catch (error) {
        console.error('No se pudo cargar el detalle completo de la propiedad:', error);
      } finally {
        if (!cancelled) setLoadingFullProperty(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, initialProperty?.id]);

  useEffect(() => {
    if (!isOpen) return;
    if (images.length === 0) {
      setCurrentImageIndex(0);
      setGalleryOpen(false);
      return;
    }
    setCurrentImageIndex((prev) => clampImageIndex(prev, images.length));
  }, [isOpen, images.length]);

  if (!isOpen || !property) return null;

  const hasImages = images.length > 0;
  const safeImageIndex = clampImageIndex(currentImageIndex, images.length);
  const activeImage = hasImages ? images[safeImageIndex] : null;
  const isImported = Boolean(property.is_imported || property.source_url || property.external_id || property.source);
  const contactPhone = typeof property.contact_phone === 'string' ? property.contact_phone.trim() : '';
  const contactEmail = typeof property.contact_email === 'string' ? property.contact_email.trim() : '';
  const whatsappPhone = contactPhone.replace(/[^0-9]/g, '');
  const sourceUrl = typeof property.source_url === 'string' ? property.source_url.trim() : '';
  const sourceAgency = typeof property.source_agency === 'string' ? property.source_agency.trim() : '';
  const publishedDate = formatDate(property.created_at);
  // Mensaje prellenado: el vendedor sabe que el contacto viene de la plataforma, con la URL del anuncio.
  const whatsappPropertyUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/propiedad/${property.id}` : sourceUrl;
  const whatsappMessage = `Hola, vi este anuncio en Geo Propiedades: ${property.title || 'esta propiedad'}\n${whatsappPropertyUrl}`;
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`;
  // Anuncio venta + alquiler a la vez: `price` es la venta y `rent_price` el alquiler.
  const rentPriceNum = Number.parseFloat(String(property.rent_price ?? ''));
  const hasRentPrice = property.rent_price != null && Number.isFinite(rentPriceNum) && rentPriceNum > 0;
  const nextImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Generate share URL using the canonical property route with Open Graph meta tags
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/propiedad/${property.id}`;
  };

  // Build professional title for social sharing
  const getShareTitle = () => {
    const propertyTypeLabel = getPropertyTypeLabel(property.property_type);
    const statusLabel = getStatusLabel(property.status);
    return `${propertyTypeLabel} ${statusLabel} - ${property.title}`;
  };

  // Build detailed description for social sharing
  const getShareDescription = () => {
    const priceFormatted = `$${parseFloat(property.price).toLocaleString()}`;
    const areaFormatted = property.area ? `${Math.round(parseFloat(property.area))} m²` : '';
    const location = [property.city, property.province].filter(Boolean).join(', ');

    let description = `${priceFormatted}`;

    if (areaFormatted) {
      description += ` • ${areaFormatted}`;
    }

    if (property.rooms > 0) {
      description += ` • ${property.rooms} hab.`;
    }

    if (property.bathrooms > 0) {
      description += ` • ${property.bathrooms} baños`;
    }

    if (location) {
      description += ` • ${location}`;
    }

    return description;
  };

  return (
    <>
      {/* Scrim solo en móvil: cierra al tocar fuera sin tapar el mapa en desktop. */}
      <div
        className="fixed inset-0 z-backdrop bg-black/40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="complementary"
        aria-label={`Detalle de ${property.title || 'propiedad'}`}
        className="fixed inset-x-0 bottom-0 z-panel outline-none animate-panelIn lg:relative lg:inset-auto lg:z-0 lg:h-full lg:w-[26rem] lg:flex-shrink-0"
      >
      {/* Panel Container */}
      <div className="relative overflow-hidden rounded-t-modal border border-line bg-background shadow-cardHover lg:h-full lg:rounded-none lg:border-0 lg:border-l lg:border-line lg:shadow-none">
        <div className="flex h-full flex-col">
          {/* Share Button */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="absolute right-12 top-3 z-10 rounded-full bg-black/55 p-2 text-white shadow-card backdrop-blur transition-colors hover:bg-black/75"
            title="Compartir propiedad"
            aria-label="Compartir propiedad"
          >
            <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-full bg-white/95 p-2 text-textPrimary shadow-card backdrop-blur transition-colors hover:bg-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>

          {/* Scrollable Content */}
          <div className="max-h-[86vh] min-h-0 flex-1 overflow-y-auto overscroll-contain lg:max-h-none">
            {/* Image Gallery Section */}
            {activeImage ? (
              <div className="group relative h-48 cursor-pointer bg-slate-900 sm:h-52" onClick={() => setGalleryOpen(true)}>
                <img
                  src={activeImage.image}
                  alt={property.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" aria-hidden />

                {/* Image Counter */}
                <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                  {safeImageIndex + 1} / {images.length}
                </div>

                {/* Expand Icon */}
                <div className="absolute right-24 top-3 rounded-full bg-black/60 p-2 text-white backdrop-blur">
                  <Maximize2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                </div>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-textPrimary shadow-card transition-colors hover:bg-white"
                      aria-label="Imagen anterior"
                    >
                      <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-textPrimary shadow-card transition-colors hover:bg-white"
                      aria-label="Imagen siguiente"
                    >
                      <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </button>
                  </>
                )}

                {/* Thumbnail Strip */}
                {images.length > 1 && (
                  <div className="absolute bottom-3 left-3 right-3 flex gap-1.5 overflow-hidden rounded-lg bg-black/45 p-1.5 backdrop-blur-sm">
                    {images.slice(0, 5).map((img: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                        className={cn(
                          'h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border transition-all',
                          idx === safeImageIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                        )}
                      >
                        <img src={img.image} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                    {images.length > 5 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setGalleryOpen(true); }}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-black/70 text-xs font-bold text-white transition-colors hover:bg-black/90"
                      >
                        +{images.length - 5}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-44 items-center justify-center border-b border-line bg-muted">
                <div className="text-center text-textSecondary">
                  <ImageIcon className="mx-auto mb-1 h-10 w-10" strokeWidth={1.5} aria-hidden />
                  <p className="text-xs font-medium">Sin imágenes</p>
                </div>
              </div>
            )}

            {/* Content Section */}
            <div className="space-y-2.5 p-3">
              {/* Header */}
              <div className="rounded-card border border-line bg-white p-3 shadow-card">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="flex-1 text-lg font-bold leading-snug text-textPrimary">
                    {property.title || 'Propiedad'}
                  </h2>
                  <span className={cn('badge flex-shrink-0', getStatusBadgeClass(property.status))}>
                    {getStatusLabel(property.status)}
                  </span>
                </div>

                {/* Price */}
                <div className="mb-2 flex flex-wrap items-baseline gap-2">
                  <span className="price text-2xl">
                    {formatPrice(property.price)}
                  </span>
                  {hasRentPrice && (
                    <span className="text-xs font-semibold text-textSecondary">
                      · Alquiler {formatPrice(property.rent_price)}/mes
                    </span>
                  )}
                  {property.is_negotiable && (
                    <span className="rounded-md bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                      Negociable
                    </span>
                  )}
                </div>

                {/* Location */}
                {(property.address || property.city) && (
                  <div className="flex items-start gap-1.5 text-textSecondary">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                    <span className="text-xs leading-5">
                      {property.address && <span>{property.address}</span>}
                      {property.address && property.city && <span>, </span>}
                      {property.city && <span>{property.city}</span>}
                      {property.province && <span>, {property.province}</span>}
                    </span>
                  </div>
                )}
              </div>

              {/* Ver en el mapa: centra el mapa real en la propiedad */}
              <div className="grid grid-cols-2 gap-2">
                {onViewOnMap && (property.polygon || (property.latitude && property.longitude)) && (
                  <button
                    type="button"
                    onClick={onViewOnMap}
                    className="flex items-center justify-center gap-2 rounded-button border border-primary/30 bg-primaryLight px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    <MapPinned className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Ver mapa
                  </button>
                )}

                {/* Enlace secundario a la ficha indexable. El panel ya contiene la informacion completa para decidir. */}
                <a
                  href={`/propiedad/${property.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-button border border-line bg-white px-3 py-2 text-xs font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Ficha completa
                </a>
              </div>

              {loadingFullProperty && (
                <div className="flex items-center justify-center gap-2 rounded-card border border-line bg-white px-3 py-1.5 text-xs font-medium text-textSecondary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" strokeWidth={2} aria-hidden />
                  Cargando ficha completa...
                </div>
              )}

              {/* Key Features Grid */}
              <div className="grid grid-cols-3 gap-2">
                <FeatureTile icon={Ruler} value={formatArea(property.area)} label="m² total" />

                {property.built_area && (
                  <FeatureTile icon={Building2} value={formatArea(property.built_area)} label="m² constr." />
                )}

                {property.rooms > 0 && (
                  <FeatureTile icon={BedDouble} value={property.rooms} label="Habitac." />
                )}

                {property.bathrooms > 0 && (
                  <FeatureTile icon={Bath} value={property.bathrooms} label="Baños" />
                )}

                {property.parking_spaces > 0 && (
                  <FeatureTile icon={Car} value={property.parking_spaces} label="Parqueo" />
                )}

                {property.floors && (
                  <FeatureTile icon={Layers} value={property.floors} label={property.floors === 1 ? 'Piso' : 'Pisos'} />
                )}
              </div>

              {/* Description */}
              {property.description && (
                <div className="rounded-card border border-line bg-white p-3 shadow-card">
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-textPrimary">
                    <AlignLeft className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden />
                    Descripción
                  </h3>
                  <p className="whitespace-pre-line text-sm leading-5 text-textSecondary">{property.description}</p>
                </div>
              )}

              {/* Ficha completa en el panel */}
              {(property.year_built || property.furnished || property.show_measurements === false) && (
              <div className="rounded-card border border-line bg-white p-3 shadow-card">
                <h3 className="mb-2 text-sm font-semibold text-textPrimary">Detalles</h3>
                <div className="divide-y-0">
                  {property.year_built && <DetailRow label="Año de construcción" value={property.year_built} />}
                  {property.furnished && <DetailRow label="Amoblado" value="Sí" />}
                  {property.show_measurements === false && <DetailRow label="Medidas" value="Referencia aproximada" />}
                </div>
              </div>
              )}

              {/* Datos de publicacion y fuente */}
              <div className="rounded-card border border-line bg-white p-3 shadow-card">
                <h3 className="mb-2 text-sm font-semibold text-textPrimary">Publicación y contacto</h3>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primaryLight text-primary">
                    <User className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-textSecondary">{isImported ? 'Fuente' : 'Publicado por'}</div>
                    <div className="truncate text-sm font-semibold text-textPrimary">
                      {isImported
                        ? sourceAgency || 'Fuente externa'
                        : property.owner_username || `Usuario ${property.owner}`}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-textSecondary">
                  {isImported && (
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-4 w-4 flex-shrink-0 text-success" strokeWidth={1.75} aria-hidden />
                      <span>Anuncio agregado desde fuente externa</span>
                    </div>
                  )}
                  {contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                      <span>{contactPhone}</span>
                    </div>
                  )}
                  {contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                      <span className="break-all">{contactEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Zona de contacto: las propiedades importadas redirigen al contacto real de origen. */}
              <div className="sticky bottom-0 -mx-3 space-y-2 border-t border-line bg-white/95 px-3 pb-3 pt-2 shadow-[0_-12px_30px_rgba(32,45,40,0.08)] backdrop-blur">
                {isImported ? (
                  contactPhone ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wa-bounce flex w-full items-center justify-center gap-2 rounded-button bg-secondary px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-secondaryHover"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Contactar por WhatsApp
                    </a>
                  ) : sourceUrl ? (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-button bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-primaryHover"
                    >
                      <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
                      Contactar en {sourceAgency || 'la página original'}
                    </a>
                  ) : (
                    <div className="rounded-card border border-line bg-background p-3 text-sm text-textSecondary">
                      Esta propiedad viene de una fuente externa y no tiene contacto disponible.
                    </div>
                  )
                ) : (
                  <>
                    {contactPhone && (
                      <div className="rounded-card bg-primary p-3 text-white">
                        <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
                          <Phone className="h-4 w-4" strokeWidth={2} aria-hidden />
                          Contacto directo
                        </h3>
                        <div className="mb-2 text-sm font-bold">{contactPhone}</div>
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={`tel:${contactPhone}`}
                            className="flex flex-col items-center gap-1 rounded-button bg-white/20 p-2 transition-all hover:bg-white/30"
                          >
                            <span className="rounded-md bg-white/20 p-1.5">
                              <Phone className="h-4 w-4" strokeWidth={2} aria-hidden />
                            </span>
                            <div className="text-xs font-medium">Llamar</div>
                          </a>

                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="wa-bounce flex flex-col items-center gap-1 rounded-button bg-secondary p-2 transition-all hover:bg-secondaryHover"
                          >
                            <span className="rounded-md bg-white/20 p-1.5">
                              <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
                            </span>
                            <div className="text-xs font-medium">WhatsApp</div>
                          </a>
                        </div>
                      </div>
                    )}

                    {contactPhone && (
                      <div className="flex items-center gap-3" aria-hidden>
                        <span className="h-px flex-1 bg-line" />
                        <span className="text-xs font-medium text-textSecondary">o déjanos tus datos</span>
                        <span className="h-px flex-1 bg-line" />
                      </div>
                    )}

                    <LeadForm propertyId={property.id} source="property_modal" />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      {galleryOpen && (
        <ImageGallery
          images={images}
          initialIndex={currentImageIndex}
          onClose={() => setGalleryOpen(false)}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={getShareUrl()}
        title="Compartir Propiedad"
        description="Comparte esta propiedad en redes sociales"
        shareTitle={getShareTitle()}
        shareDescription={getShareDescription()}
      />

      {/* Animaciones: el panel entra con escala + fundido (scale+fade). */}
      <style>{`
        @keyframes panelIn {
          from { transform: translateY(100%); opacity: 0.98; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-panelIn { animation: panelIn 0.25s ease-out; }
        @media (min-width: 1024px) {
          @keyframes panelIn {
            from { transform: translateX(24px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        @keyframes waBounce {
          0%, 100% { transform: translateY(0); }
          35% { transform: translateY(-3px); }
          65% { transform: translateY(-1px); }
        }
        .wa-bounce:hover { animation: waBounce 0.5s ease; }
        @media (prefers-reduced-motion: reduce) {
          .animate-panelIn, .animate-fadeIn, .wa-bounce:hover { animation: none; }
        }
      `}</style>
      </div>
    </>
  );
};

export default PropertyModal;
