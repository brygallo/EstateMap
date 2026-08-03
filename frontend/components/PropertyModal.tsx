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
  Mail,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { PhoneReveal } from '@/components/PropertyContactActions';
import RevealableDescription from '@/components/RevealableDescription';
import { ecuadorPhoneHref, normalizeEcuadorPhone } from '@/lib/phone';
import ShareModal from './ShareModal';
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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressCloseRef = useRef(false);

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

  const handleGalleryTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch || validImages.length < 2) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;

    suppressCloseRef.current = true;
    deltaX < 0 ? nextImage() : prevImage();
    window.setTimeout(() => {
      suppressCloseRef.current = false;
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
  };

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/95 outline-none animate-fadeIn"
      onClick={(event) => {
        if (event.target === event.currentTarget && !suppressCloseRef.current) onClose();
      }}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={handleGalleryTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-label="Galería de imágenes"
    >
      {/* Close Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="fixed right-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white text-black shadow-cardHover transition-all hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:right-4 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-2"
        style={{ zIndex: 2147483647, top: 'max(0.75rem, env(safe-area-inset-top))' }}
        aria-label="Cerrar galería"
      >
        <X className="h-6 w-6" strokeWidth={3} aria-hidden />
        <span className="hidden sm:inline">Cerrar</span>
      </button>

      {/* Image Counter */}
      <div
        className="absolute left-4 top-4 z-10 rounded-card bg-white/10 px-3 py-1.5 text-xs font-medium text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {clampImageIndex(currentIndex, validImages.length) + 1} / {validImages.length}
      </div>

      {/* Main Image */}
      <div className="relative flex h-full w-full items-center justify-center p-4" onClick={() => { if (!suppressCloseRef.current) onClose(); }}>
        <img
          src={activeImage.image}
          alt={`Imagen ${currentIndex + 1}`}
          decoding="async"
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
              <img src={img.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
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
  /** Builds a share URL that can preserve the current map viewport and filters. */
  getContextualShareUrl?: () => string;
}

const PropertyModal = ({ property: initialProperty, isOpen, onClose, onViewOnMap, getContextualShareUrl }: PropertyModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [fullProperty, setFullProperty] = useState<any | null>(null);
  const [loadingFullProperty, setLoadingFullProperty] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [sheetDismissing, setSheetDismissing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetScrollRef = useRef<HTMLDivElement>(null);
  const sheetTouchStartRef = useRef<{ x: number; y: number; scrollTop: number; distanceToBottom: number } | null>(null);
  const sheetDismissTimerRef = useRef<number | null>(null);
  const carouselTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const carouselSwipedRef = useRef(false);
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

  useEffect(() => () => {
    if (sheetDismissTimerRef.current != null) {
      window.clearTimeout(sheetDismissTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setFullProperty(null);
    setCurrentImageIndex(0);
    setGalleryOpen(false);
    setSheetExpanded(false);
    setSheetDragOffset(0);
    setSheetDismissing(false);
    if (sheetDismissTimerRef.current != null) {
      window.clearTimeout(sheetDismissTimerRef.current);
      sheetDismissTimerRef.current = null;
    }
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
  const whatsappPhone = normalizeEcuadorPhone(contactPhone);
  const callablePhone = ecuadorPhoneHref(contactPhone);
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
  const canWhatsApp = Boolean(contactPhone && whatsappPhone);
  const canCall = Boolean(contactPhone);
  const trackContact = (method: string, source: string) => {
    trackEvent('property_contact_clicked', {
      method,
      source,
      property_id: property.id,
      city: property.city,
      province: property.province,
      property_type: property.property_type,
      status: property.status,
      imported: isImported,
    });
  };
  const nextImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handleSheetTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    const scrollElement = sheetScrollRef.current;
    sheetTouchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      scrollTop: scrollElement?.scrollTop ?? 0,
      distanceToBottom: scrollElement
        ? scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight
        : Number.POSITIVE_INFINITY,
    };
  };

  const handleSheetTouchMove = (event: React.TouchEvent) => {
    const start = sheetTouchStartRef.current;
    const touch = event.touches[0];
    if (!start || !touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaY) <= Math.abs(deltaX) * 1.15) return;

    const scrollElement = sheetScrollRef.current;
    const distanceToBottom = scrollElement
      ? scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight
      : Number.POSITIVE_INFINITY;
    const draggingDownFromTop = deltaY > 0 && start.scrollTop <= 2;
    const draggingUpToExpand = deltaY < 0 && !sheetExpanded;
    const draggingPastBottom = deltaY < 0 && sheetExpanded && distanceToBottom <= 3;

    if (draggingDownFromTop) {
      setSheetDragOffset(Math.min(deltaY * 0.72, 180));
    } else if (draggingUpToExpand) {
      setSheetDragOffset(Math.max(deltaY * 0.28, -56));
    } else if (draggingPastBottom) {
      setSheetDragOffset(Math.max(deltaY * 0.12, -18));
    }
  };

  const dismissSheet = () => {
    if (sheetDismissing) return;
    if (window.innerWidth >= 1024 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose();
      return;
    }
    setSheetDragOffset(0);
    setSheetDismissing(true);
    sheetDismissTimerRef.current = window.setTimeout(() => {
      sheetDismissTimerRef.current = null;
      onClose();
    }, 240);
  };

  const cancelSheetGesture = () => {
    sheetTouchStartRef.current = null;
    setSheetDragOffset(0);
  };

  const collapseSheet = () => {
    setSheetExpanded(false);
    sheetScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSheetTouchEnd = (event: React.TouchEvent) => {
    const start = sheetTouchStartRef.current;
    sheetTouchStartRef.current = null;
    setSheetDragOffset(0);
    const touch = event.changedTouches[0];
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    // Preserve horizontal carousel gestures. The sheet only reacts to a
    // clearly vertical movement to prevent accidental transitions.
    if (Math.abs(deltaY) < 36 || Math.abs(deltaY) <= Math.abs(deltaX) * 1.15) return;

    if (deltaY < 0 && !sheetExpanded) {
      setSheetExpanded(true);
      return;
    }

    // After reaching the end of the details, one additional deliberate upward
    // swipe dismisses the sheet. The high threshold prevents accidental closes
    // during normal scrolling or horizontal gallery gestures.
    if (deltaY < -72 && sheetExpanded) {
      const scrollElement = sheetScrollRef.current;
      const distanceToBottom = scrollElement
        ? scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight
        : Number.POSITIVE_INFINITY;
      if (start.distanceToBottom <= 3 && distanceToBottom <= 3) dismissSheet();
      return;
    }

    // A downward gesture controls the sheet only when the content is already
    // at the top. Otherwise, regular scrolling remains in control.
    if (deltaY > 0 && start.scrollTop <= 2) {
      if (sheetExpanded) collapseSheet();
      else dismissSheet();
    }
  };

  const prevImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleCarouselTouchEnd = (event: React.TouchEvent) => {
    const start = carouselTouchStartRef.current;
    const touch = event.changedTouches[0];
    carouselTouchStartRef.current = null;
    if (!start || !touch || images.length < 2) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;

    carouselSwipedRef.current = true;
    deltaX < 0 ? nextImage() : prevImage();
    window.setTimeout(() => {
      carouselSwipedRef.current = false;
    }, 0);
  };

  // Generate share URL using the canonical property route with Open Graph meta tags
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const contextualUrl = getContextualShareUrl?.();
    if (contextualUrl) return contextualUrl;
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
        className="fixed inset-x-0 bottom-0 top-[var(--app-header-height)] z-backdrop bg-black/40 lg:hidden"
        onClick={dismissSheet}
        style={{
          opacity: sheetDismissing ? 0 : Math.max(0.18, 1 - Math.max(sheetDragOffset, 0) / 260),
          transition: sheetDragOffset !== 0 ? 'none' : 'opacity 240ms ease-out',
        }}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="complementary"
        aria-label={`Detalle de ${property.title || 'propiedad'}`}
        className={cn(
          'fixed inset-x-0 bottom-0 z-panel outline-none animate-panelIn will-change-transform lg:relative lg:inset-auto lg:z-0 lg:h-full lg:w-[26rem] lg:flex-shrink-0 lg:transform-none',
          sheetExpanded ? 'mobile-sheet-expanded' : 'mobile-sheet-compact'
        )}
        style={{
          transform: sheetDismissing ? 'translateY(105%)' : `translateY(${sheetDragOffset}px)`,
          transition: sheetDragOffset !== 0 ? 'none' : 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
      {/* Panel Container */}
      <div
        className={cn(
          'property-detail-panel relative overflow-hidden rounded-t-modal border border-line bg-background shadow-cardHover transition-[height] duration-300 ease-out lg:h-full lg:rounded-none lg:border-0 lg:border-l lg:border-line lg:shadow-none',
          sheetExpanded ? 'h-[calc(100dvh-var(--app-header-height))]' : 'h-[48dvh] min-h-[360px]'
        )}
      >
        <button
          type="button"
          onClick={() => sheetExpanded ? collapseSheet() : setSheetExpanded(true)}
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          onTouchCancel={cancelSheetGesture}
          className="absolute inset-x-0 top-0 z-20 flex h-11 touch-none items-center justify-center bg-white/95 backdrop-blur lg:hidden"
          aria-label={sheetExpanded ? 'Contraer ficha' : 'Expandir ficha'}
        >
          <span className="h-1.5 w-11 rounded-full bg-slate-300" aria-hidden />
        </button>
        <div className="flex h-full flex-col">
          {/* Share Button */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="absolute right-16 top-12 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white shadow-card backdrop-blur transition-colors hover:bg-black/75 lg:right-12 lg:top-3 lg:h-8 lg:w-8"
            title="Compartir propiedad"
            aria-label="Compartir propiedad"
          >
            <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>

          {/* Close Button */}
          <button
            onClick={dismissSheet}
            className="absolute right-3 top-12 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-textPrimary shadow-card backdrop-blur transition-colors hover:bg-white lg:top-3 lg:h-8 lg:w-8"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>

          {/* Scrollable Content */}
          <div
            ref={sheetScrollRef}
            className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pb-24 pt-11 lg:max-h-none lg:pb-0 lg:pt-0"
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
            onTouchCancel={cancelSheetGesture}
          >
            {/* Image Gallery Section */}
            {activeImage ? (
              <div
                className="property-detail-gallery group relative h-48 touch-pan-y cursor-pointer bg-slate-900 sm:h-56 lg:h-64"
                onClick={() => {
                  if (!carouselSwipedRef.current) setGalleryOpen(true);
                }}
                onTouchStart={(event) => {
                  const touch = event.touches[0];
                  carouselTouchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
                }}
                onTouchEnd={handleCarouselTouchEnd}
              >
                <img
                  src={activeImage.image}
                  alt={property.title}
                  decoding="async"
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
                        <img src={img.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
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
                  <RevealableDescription
                    text={property.description}
                    source="modal_description_text"
                    propertyId={property.id}
                    city={property.city}
                    province={property.province}
                    propertyType={property.property_type}
                    status={property.status}
                    imported={isImported}
                    className="whitespace-pre-line text-sm leading-5 text-textSecondary"
                  />
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
                  {contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                      <PhoneReveal
                        phone={callablePhone}
                        source="modal_publication_contact"
                        propertyId={property.id}
                        city={property.city}
                        province={property.province}
                        propertyType={property.property_type}
                        status={property.status}
                        imported={isImported}
                      />
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

              {/* Contact actions share the same visual structure for every listing source. */}
              <div className="hidden lg:block">
                {contactPhone ? (
                      <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
                        <div className="flex items-center gap-3 border-b border-line bg-primaryLight/60 px-4 py-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                            <Phone className="h-4 w-4" strokeWidth={2} aria-hidden />
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-textPrimary">Teléfono del anunciante</h3>
                            <p className="text-[11px] text-textSecondary">Elige cómo comunicarte</p>
                          </div>
                        </div>
                        <div className="p-4">
                          <PhoneReveal
                            phone={callablePhone}
                            source="modal_contact_box"
                            propertyId={property.id}
                            city={property.city}
                            province={property.province}
                            propertyType={property.property_type}
                            status={property.status}
                            imported={isImported}
                            className="mb-3 block w-full rounded-button bg-background px-3 py-2.5 text-center font-geo text-base font-bold tabular-nums text-primary transition-colors hover:bg-primaryLight hover:underline"
                          />
                          <div className="grid grid-cols-2 gap-2">
                          <a
                            href={`tel:${callablePhone}`}
                            onClick={() => trackContact('call', 'modal_contact_box')}
                            className="flex min-h-11 items-center justify-center gap-2 rounded-button border border-line bg-white px-3 py-2.5 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:bg-primaryLight hover:text-primary"
                          >
                            <Phone className="h-4 w-4" strokeWidth={2} aria-hidden />
                            <span>Llamar</span>
                          </a>

                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => trackContact('whatsapp', 'modal_contact_box')}
                            className="wa-bounce flex min-h-11 items-center justify-center gap-2 rounded-button bg-secondary px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-secondaryHover"
                          >
                            <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                        </div>
                      </div>
                ) : sourceUrl ? (
                  <div className="overflow-hidden rounded-card border border-line bg-white shadow-card">
                    <div className="flex items-center gap-3 border-b border-line bg-primaryLight/60 px-4 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm">
                        <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-textPrimary">Anuncio original</h3>
                        <p className="text-[11px] text-textSecondary">Publicado por {sourceAgency || 'una fuente externa'}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackContact('source_url', 'modal_source')}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-button bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primaryHover"
                      >
                        <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
                        Ver anuncio original
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-card border border-line bg-background p-3 text-sm text-textSecondary">
                    Información del anunciante no disponible.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.10)] backdrop-blur lg:hidden">
            {canWhatsApp ? (
              <div className="grid grid-cols-[0.82fr_1.18fr] gap-2">
                {canCall && (
                  <a
                    href={`tel:${callablePhone}`}
                    onClick={() => trackContact('call', 'mobile_sticky')}
                    className="flex items-center justify-center gap-2 rounded-button border border-line bg-white px-3 py-3 text-sm font-semibold text-textPrimary"
                  >
                    <Phone className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Llamar
                  </a>
                )}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackContact('whatsapp', 'mobile_sticky')}
                  className="wa-bounce flex items-center justify-center gap-2 rounded-button bg-secondary px-3 py-3 text-sm font-semibold text-white shadow-card"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
                  WhatsApp
                </a>
              </div>
            ) : sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackContact('source_url', 'mobile_sticky')}
                className="flex w-full items-center justify-center gap-2 rounded-button bg-primary px-3 py-3 text-sm font-semibold text-white shadow-card"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
                Ver anuncio original
              </a>
            ) : (
              <a
                href={`/propiedad/${property.id}`}
                onClick={() => trackContact('full_page', 'mobile_sticky')}
                className="flex w-full items-center justify-center gap-2 rounded-button bg-primary px-3 py-3 text-sm font-semibold text-white shadow-card"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
                Ficha completa
              </a>
            )}
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
        .mobile-sheet-compact,
        .mobile-sheet-expanded {
          max-height: 92dvh;
        }
        @media (min-width: 1024px) {
          .mobile-sheet-compact,
          .mobile-sheet-expanded {
            max-height: none;
          }
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
          .mobile-sheet-compact, .mobile-sheet-expanded { transition: none !important; }
        }
      `}</style>
      </div>
    </>
  );
};

export default PropertyModal;
