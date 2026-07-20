'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GalleryImage {
  image: string;
}

interface PropertyGalleryProps {
  images: GalleryImage[];
  title: string;
  statusLabel: string;
  propertyTypeLabel: string;
  statusClassName: string;
}

export default function PropertyGallery({
  images,
  title,
  statusLabel,
  propertyTypeLabel,
  statusClassName,
}: PropertyGalleryProps) {
  const validImages = useMemo(
    () => images.filter((item) => typeof item.image === 'string' && item.image.trim()),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const show = useCallback((index: number) => {
    setActiveIndex(Math.min(Math.max(index, 0), validImages.length - 1));
    setLightboxOpen(true);
  }, [validImages.length]);

  const previous = useCallback(() => {
    setActiveIndex((current) => (current - 1 + validImages.length) % validImages.length);
  }, [validImages.length]);

  const next = useCallback(() => {
    setActiveIndex((current) => (current + 1) % validImages.length);
  }, [validImages.length]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') next();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxOpen, next, previous]);

  if (validImages.length === 0) return null;

  const previewImages = validImages.slice(1, 5);

  return (
    <>
      <section aria-label={`Galería de ${title}`} className="relative overflow-hidden rounded-hero border border-line bg-slate-900 shadow-cardHover">
        <div className={cn('grid gap-1', validImages.length > 1 && 'md:grid-cols-2')}>
          <button
            type="button"
            onClick={() => show(0)}
            className="group relative block aspect-[16/10] overflow-hidden text-left sm:aspect-[16/8] md:aspect-auto md:h-[32rem]"
            aria-label="Ampliar imagen principal"
          >
            <img src={validImages[0].image} alt={`${title} — imagen 1`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
          </button>

          {validImages.length > 1 && (
            <div className="hidden h-[32rem] grid-cols-2 gap-1 md:grid">
              {previewImages.map((item, index) => {
                const imageIndex = index + 1;
                const hiddenCount = validImages.length - 5;
                return (
                  <button
                    key={`${item.image}-${imageIndex}`}
                    type="button"
                    onClick={() => show(imageIndex)}
                    className="group relative min-h-0 overflow-hidden"
                    aria-label={`Ampliar imagen ${imageIndex + 1}`}
                  >
                    <img src={item.image} alt={`${title} — imagen ${imageIndex + 1}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    {index === 3 && hiddenCount > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-bold text-white">+{hiddenCount} fotos</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
          <span className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-cardHover ${statusClassName}`}>{statusLabel}</span>
          <span className="inline-flex items-center rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-semibold text-textPrimary shadow-cardHover backdrop-blur">{propertyTypeLabel}</span>
        </div>

        <button
          type="button"
          onClick={() => show(0)}
          className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-textPrimary shadow-cardHover transition-colors hover:bg-slate-100"
        >
          <Images className="h-4 w-4" aria-hidden />
          Ver las {validImages.length} {validImages.length === 1 ? 'foto' : 'fotos'}
        </button>
      </section>

      {lightboxOpen && (
        <div className="fixed inset-0 z-modal flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label={`Galería de ${title}`} onClick={() => setLightboxOpen(false)}>
          <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(event) => event.stopPropagation()}>
            <span className="text-sm font-semibold">{activeIndex + 1} / {validImages.length}</span>
            <button type="button" onClick={() => setLightboxOpen(false)} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black" aria-label="Cerrar galería">
              <X className="h-5 w-5" aria-hidden /> Cerrar
            </button>
          </div>

          <div className="relative min-h-0 flex-1" onClick={(event) => event.stopPropagation()}>
            <img src={validImages[activeIndex].image} alt={`${title} — imagen ${activeIndex + 1}`} className="h-full w-full object-contain px-4 pb-4" />
            {validImages.length > 1 && (
              <>
                <button type="button" onClick={previous} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-3 text-black shadow-cardHover" aria-label="Imagen anterior"><ChevronLeft className="h-6 w-6" aria-hidden /></button>
                <button type="button" onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/95 p-3 text-black shadow-cardHover" aria-label="Imagen siguiente"><ChevronRight className="h-6 w-6" aria-hidden /></button>
              </>
            )}
          </div>

          {validImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-4 pt-2" onClick={(event) => event.stopPropagation()}>
              {validImages.map((item, index) => (
                <button key={`${item.image}-thumb-${index}`} type="button" onClick={() => setActiveIndex(index)} className={cn('h-16 w-24 flex-none overflow-hidden rounded-lg border-2', index === activeIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100')} aria-label={`Ver imagen ${index + 1}`}>
                  <img src={item.image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
