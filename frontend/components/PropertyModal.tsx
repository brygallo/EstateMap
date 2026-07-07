'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  MapPin,
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

// Image Gallery Component (lightbox a pantalla completa)
const ImageGallery = ({ images, initialIndex, onClose }: any) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const nextImage = () => {
    setCurrentIndex((prev: number) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev: number) => (prev - 1 + images.length) % images.length);
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
        className="absolute right-4 top-4 z-10 rounded-card bg-white/10 p-2.5 text-white transition-all hover:bg-white/20"
        aria-label="Cerrar galería"
      >
        <X className="h-7 w-7" strokeWidth={2} aria-hidden />
      </button>

      {/* Image Counter */}
      <div
        className="absolute left-4 top-4 z-10 rounded-card bg-white/10 px-3 py-1.5 text-xs font-medium text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {currentIndex + 1} / {images.length}
      </div>

      {/* Main Image */}
      <div className="relative flex h-full w-full items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={images[currentIndex].image}
          alt={`Imagen ${currentIndex + 1}`}
          className="max-h-full max-w-full rounded-xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
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
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex max-w-[90vw] -translate-x-1/2 gap-2 overflow-x-auto rounded-xl bg-white/10 p-3 backdrop-blur-sm">
          {images.map((img: any, idx: number) => (
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
  <div className="flex flex-col items-center justify-center gap-1 rounded-card border border-line bg-surface px-1.5 py-2.5 text-center">
    <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden />
    <div className="font-geo text-sm font-semibold tabular-nums text-textPrimary">{value}</div>
    <div className="text-xs text-textSecondary">{label}</div>
  </div>
);

interface PropertyModalProps {
  property: any;
  isOpen: boolean;
  onClose: () => void;
}

const PropertyModal = ({ property, isOpen, onClose }: PropertyModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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
  }, [isOpen, property?.id]);

  if (!isOpen || !property) return null;

  const images = property.images || [];
  const hasImages = images.length > 0;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
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
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${property.title || 'propiedad'}`}
        className="fixed right-2 top-1/2 z-panel w-[calc(100%-1rem)] max-w-sm -translate-y-1/2 outline-none animate-panelIn sm:right-4 sm:w-full"
      >
      {/* Panel Container */}
      <div className="relative overflow-hidden rounded-modal border border-line bg-white shadow-cardHover">
        <div>
          {/* Share Button */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="absolute right-12 top-3 z-10 rounded-card bg-primary/90 p-2 text-white shadow-card transition-colors hover:bg-primary"
            title="Compartir propiedad"
            aria-label="Compartir propiedad"
          >
            <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-card bg-white/90 p-2 text-textPrimary shadow-card transition-colors hover:bg-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>

          {/* Scrollable Content */}
          <div className="max-h-[calc(100vh-6rem)] overflow-y-auto">
            {/* Image Gallery Section */}
            {hasImages ? (
              <div className="group relative h-44 cursor-pointer bg-slate-900" onClick={() => setGalleryOpen(true)}>
                <img
                  src={images[currentImageIndex].image}
                  alt={property.title}
                  className="h-full w-full object-cover"
                />

                {/* Image Counter */}
                <div className="absolute left-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
                  {currentImageIndex + 1} / {images.length}
                </div>

                {/* Expand Icon */}
                <div className="absolute right-14 top-3 rounded-md bg-black/60 p-2 text-white backdrop-blur">
                  <Maximize2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                </div>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-card bg-white/90 p-2 text-textPrimary shadow-card transition-colors hover:bg-white"
                      aria-label="Imagen anterior"
                    >
                      <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-card bg-white/90 p-2 text-textPrimary shadow-card transition-colors hover:bg-white"
                      aria-label="Imagen siguiente"
                    >
                      <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </button>
                  </>
                )}

                {/* Thumbnail Strip */}
                {images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-lg bg-black/50 p-1.5 backdrop-blur-sm">
                    {images.slice(0, 5).map((img: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                        className={cn(
                          'h-10 w-10 overflow-hidden rounded-md border transition-all',
                          idx === currentImageIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                        )}
                      >
                        <img src={img.image} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                    {images.length > 5 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setGalleryOpen(true); }}
                        className="flex h-10 w-10 items-center justify-center rounded-md bg-black/70 text-xs font-bold text-white transition-colors hover:bg-black/90"
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
            <div className="p-3">
              {/* Header */}
              <div className="mb-3">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <h2 className="flex-1 text-base font-bold text-textPrimary">
                    {property.title || 'Propiedad'}
                  </h2>
                  <span className={cn('badge flex-shrink-0', getStatusBadgeClass(property.status))}>
                    {getStatusLabel(property.status)}
                  </span>
                </div>

                {/* Owner info */}
                <div className="mb-2 flex items-center gap-2 rounded-card bg-background p-2">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-card bg-primaryLight text-primary">
                    <User className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-textSecondary">Publicado por</div>
                    <div className="truncate text-sm font-semibold text-textPrimary">
                      {property.owner_username || `Usuario ${property.owner}`}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-1.5 flex items-baseline gap-2">
                  <span className="price text-xl">
                    {formatPrice(property.price)}
                  </span>
                  {property.is_negotiable && (
                    <span className="rounded-md bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                      Negociable
                    </span>
                  )}
                </div>

                {/* Location */}
                {(property.address || property.city) && (
                  <div className="flex items-center gap-1.5 text-textSecondary">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                    <span className="text-sm">
                      {property.address && <span>{property.address}</span>}
                      {property.address && property.city && <span>, </span>}
                      {property.city && <span>{property.city}</span>}
                      {property.province && <span>, {property.province}</span>}
                    </span>
                  </div>
                )}
              </div>

              {/* Key Features Grid */}
              <div className="mb-3 grid grid-cols-3 gap-1.5">
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
                <div className="mb-3">
                  <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-textPrimary">
                    <AlignLeft className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden />
                    Descripción
                  </h3>
                  <p className="text-sm leading-relaxed text-textSecondary">{property.description}</p>
                </div>
              )}

              {/* Additional Details */}
              <div className="mb-3 grid grid-cols-2 gap-1.5">
                <div className="rounded-card bg-background p-2">
                  <div className="mb-0.5 text-xs font-semibold text-textSecondary">Tipo</div>
                  <div className="text-sm font-semibold text-textPrimary">{getPropertyTypeLabel(property.property_type)}</div>
                </div>

                {property.year_built && (
                  <div className="rounded-card bg-background p-2">
                    <div className="mb-0.5 text-xs font-semibold text-textSecondary">Año</div>
                    <div className="text-sm font-semibold text-textPrimary">{property.year_built}</div>
                  </div>
                )}

                {property.furnished && (
                  <div className="rounded-card bg-background p-2">
                    <div className="mb-0.5 text-xs font-semibold text-textSecondary">Amoblado</div>
                    <div className="text-sm font-semibold text-success">Sí</div>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              {property.contact_phone && (
                <div className="rounded-card bg-primary p-3 text-white">
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
                    <Phone className="h-4 w-4" strokeWidth={2} aria-hidden />
                    Contacto
                  </h3>
                  <div className="mb-2 text-sm font-bold">{property.contact_phone}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Phone Call Button */}
                    <a
                      href={`tel:${property.contact_phone}`}
                      className="flex flex-col items-center gap-1 rounded-button bg-white/20 p-2 transition-all hover:bg-white/30"
                    >
                      <span className="rounded-md bg-white/20 p-1.5">
                        <Phone className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </span>
                      <div className="text-xs font-medium">Llamar</div>
                    </a>

                    {/* WhatsApp Button */}
                    <a
                      href={`https://wa.me/${property.contact_phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wa-bounce flex flex-col items-center gap-1 rounded-button bg-secondary p-2 transition-all hover:bg-secondaryHover"
                    >
                      <span className="rounded-md bg-white/20 p-1.5">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </span>
                      <div className="text-xs font-medium">WhatsApp</div>
                    </a>
                  </div>
                </div>
              )}

              {/* Formulario de contacto (lead) */}
              <div className="mt-3">
                <LeadForm propertyId={property.id} source="property_modal" />
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
          from { transform: translateY(-50%) scale(0.96); opacity: 0; }
          to { transform: translateY(-50%) scale(1); opacity: 1; }
        }
        .animate-panelIn { animation: panelIn 0.25s ease-out; }
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
