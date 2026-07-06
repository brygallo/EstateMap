'use client';

import { useState, useEffect, useRef } from 'react';
import ShareModal from './ShareModal';
import LeadForm from './LeadForm';
import {
  getPropertyTypeLabel,
  getStatusLabel,
  getStatusBadgeClass,
  formatArea,
  formatPrice,
} from '@/lib/property-labels';

// Image Gallery Component
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
      className="fixed inset-0 z-modal bg-black/95 flex items-center justify-center outline-none"
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
        className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black/50 rounded-full p-3 transition-all hover:scale-110 z-10"
        aria-label="Cerrar galería"
      >
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image Counter */}
      <div
        className="absolute top-4 left-4 text-white bg-black/50 px-4 py-2 rounded-full text-sm font-medium z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {currentIndex + 1} / {images.length}
      </div>

      {/* Main Image */}
      <div className="relative w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={images[currentIndex].image}
          alt={`Imagen ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-black/50 rounded-full p-4 transition-all hover:scale-110"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-black/50 rounded-full p-4 transition-all hover:scale-110"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 p-3 rounded-lg backdrop-blur-sm max-w-[90vw] overflow-x-auto">
          {images.map((img: any, idx: number) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
              className={`w-16 h-16 rounded overflow-hidden border-2 transition-all flex-shrink-0 ${
                idx === currentIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img.image} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FEATURE_ICONS = {
  area: 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4',
  built: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m4-14h2m-2 4h2m-2 4h2m4-8h2m-2 4h2m-2 4h2',
  rooms: 'M4 11V7a2 2 0 012-2h12a2 2 0 012 2v4m-16 0h16m-16 0v6m16-6v6M4 15h16',
  baths: 'M12 3s5 5.5 5 9a5 5 0 01-10 0c0-3.5 5-9 5-9z',
  parking: 'M9 17V7h4a3 3 0 010 6H9m-4 8V5a2 2 0 012-2h10a2 2 0 012 2v14',
  floors: 'M12 4l8 4-8 4-8-4 8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
};

const FeatureTile = ({ icon, value, label }: { icon: string; value: any; label: string }) => (
  <div className="stat-tile !px-1.5 !py-2 gap-0.5">
    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
    </svg>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{label}</div>
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

  // Generate share URL using new dynamic route with Open Graph meta tags
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/property/${property.id}`;
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
        className="fixed top-1/2 -translate-y-1/2 right-2 sm:right-4 w-[calc(100%-1rem)] sm:w-full max-w-sm max-h-[calc(100vh-4rem)] animate-slideIn outline-none z-panel"
      >
      {/* Panel Container */}
      <div className="relative bg-white rounded-lg shadow-2xl overflow-hidden border border-line">
        <div>
          {/* Share Button */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="absolute top-3 right-12 z-10 bg-primary/90 hover:bg-primary text-white rounded-full p-1.5 shadow-lg transition-colors"
            title="Compartir propiedad"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white text-gray-800 rounded-full p-1.5 shadow-lg transition-all hover:scale-110"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[calc(100vh-6rem)]">
            {/* Image Gallery Section */}
            {hasImages ? (
              <div className="relative h-40 bg-gray-900 cursor-pointer" onClick={() => setGalleryOpen(true)}>
                <img
                  src={images[currentImageIndex].image}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />

                {/* Image Counter */}
                <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-0.5 rounded-full text-xs font-medium">
                  {currentImageIndex + 1} / {images.length}
                </div>

                {/* Expand Icon */}
                <div className="absolute top-3 right-14 bg-black/70 text-white p-2 rounded-full">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </div>

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all hover:scale-110"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all hover:scale-110"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}

                {/* Thumbnail Strip */}
                {images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/50 p-1.5 rounded backdrop-blur-sm">
                    {images.slice(0, 5).map((img: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                        className={`w-10 h-10 rounded overflow-hidden border transition-all ${
                          idx === currentImageIndex ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img.image} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                    {images.length > 5 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setGalleryOpen(true); }}
                        className="w-10 h-10 rounded bg-black/70 flex items-center justify-center text-white text-xs font-bold hover:bg-black/90 transition-colors"
                      >
                        +{images.length - 5}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-40 bg-slate-100 flex items-center justify-center border-b border-line">
                <div className="text-center text-slate-400">
                  <svg className="h-12 w-12 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs font-medium">Sin imágenes</p>
                </div>
              </div>
            )}

            {/* Content Section */}
            <div className="p-2.5">
              {/* Header */}
              <div className="mb-2.5">
                <div className="flex items-start justify-between mb-1.5">
                  <h2 className="text-base font-bold text-gray-900 flex-1">
                    {property.title || 'Propiedad'}
                  </h2>
                  <span className={`badge ${getStatusBadgeClass(property.status)} ml-2 flex-shrink-0`}>
                    {getStatusLabel(property.status)}
                  </span>
                </div>

                {/* Owner info */}
                <div className="flex items-center gap-1.5 mb-1.5 bg-background p-1.5 rounded">
                  <svg className="h-3.5 w-3.5 text-textSecondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <div className="text-xs text-textSecondary font-medium">Publicado por</div>
                    <div className="text-sm text-textPrimary font-semibold">
                      {property.owner_username || `Usuario ${property.owner}`}
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="price text-2xl">
                    {formatPrice(property.price)}
                  </span>
                  {property.is_negotiable && (
                    <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                      Negociable
                    </span>
                  )}
                </div>

                {/* Location */}
                {(property.address || property.city) && (
                  <div className="flex items-center gap-1.5 text-textSecondary">
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
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
              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                <FeatureTile icon={FEATURE_ICONS.area} value={formatArea(property.area)} label="m² total" />

                {property.built_area && (
                  <FeatureTile icon={FEATURE_ICONS.built} value={formatArea(property.built_area)} label="m² constr." />
                )}

                {property.rooms > 0 && (
                  <FeatureTile icon={FEATURE_ICONS.rooms} value={property.rooms} label="Habitac." />
                )}

                {property.bathrooms > 0 && (
                  <FeatureTile icon={FEATURE_ICONS.baths} value={property.bathrooms} label="Baños" />
                )}

                {property.parking_spaces > 0 && (
                  <FeatureTile icon={FEATURE_ICONS.parking} value={property.parking_spaces} label="Parqueo" />
                )}

                {property.floors && (
                  <FeatureTile icon={FEATURE_ICONS.floors} value={property.floors} label={property.floors === 1 ? 'Piso' : 'Pisos'} />
                )}
              </div>

              {/* Description */}
              {property.description && (
                <div className="mb-2.5">
                  <h3 className="text-sm font-semibold text-textPrimary mb-1 flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Descripción
                  </h3>
                  <p className="text-sm text-textSecondary leading-relaxed">{property.description}</p>
                </div>
              )}

              {/* Additional Details */}
              <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                <div className="bg-background p-1.5 rounded">
                  <div className="text-xs font-semibold text-textSecondary mb-0.5">Tipo</div>
                  <div className="text-sm font-semibold text-textPrimary">{getPropertyTypeLabel(property.property_type)}</div>
                </div>

                {property.year_built && (
                  <div className="bg-background p-1.5 rounded">
                    <div className="text-xs font-semibold text-textSecondary mb-0.5">Año</div>
                    <div className="text-sm font-semibold text-textPrimary">{property.year_built}</div>
                  </div>
                )}

                {property.furnished && (
                  <div className="bg-background p-1.5 rounded">
                    <div className="text-xs font-semibold text-textSecondary mb-0.5">Amoblado</div>
                    <div className="text-sm font-semibold text-success">Sí</div>
                  </div>
                )}
              </div>

              {/* Contact Information */}
              {property.contact_phone && (
                <div className="bg-primary p-2.5 rounded text-white">
                  <h3 className="text-xs font-bold mb-1.5 flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Contacto
                  </h3>
                  <div className="text-sm font-bold mb-2">{property.contact_phone}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Phone Call Button */}
                    <a
                      href={`tel:${property.contact_phone}`}
                      className="flex flex-col items-center gap-1 bg-white/20 hover:bg-white/30 transition-all p-2 rounded"
                    >
                      <div className="bg-white/20 p-1.5 rounded-full">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div className="text-xs font-medium">Llamar</div>
                    </a>

                    {/* WhatsApp Button */}
                    <a
                      href={`https://wa.me/${property.contact_phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 bg-white/20 hover:bg-white/30 transition-all p-2 rounded"
                    >
                      <div className="bg-white/20 p-1.5 rounded-full">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <div className="text-xs font-medium">WhatsApp</div>
                    </a>
                  </div>
                </div>
              )}

              {/* Formulario de contacto (lead) */}
              <div className="mt-2.5">
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

      {/* Custom Animation */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%) translateY(-50%);
            opacity: 0;
          }
          to {
            transform: translateX(0) translateY(-50%);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-slideIn { animation: none; }
        }
      `}</style>
      </div>
    </>
  );
};

export default PropertyModal;
