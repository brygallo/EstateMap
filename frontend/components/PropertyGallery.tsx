'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { Images } from 'lucide-react';
import { cn } from '@/lib/utils';
import GalleryViewer from '@/components/ui/GalleryViewer';

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

  if (validImages.length === 0) return null;

  const previewImages = validImages.slice(1, 5);

  return (
    <>
      <section aria-label={`Galería de ${title}`} className="relative overflow-hidden rounded-hero border border-line bg-slate-900 shadow-cardHover">
        {/* Mobile: a scroll-snap strip of every photo. Native scrolling brings
            its own momentum, rubber-banding and scrollbar-free feel for free —
            a JS carousel only ever approximates those. Desktop keeps the
            hero-plus-grid mosaic below. */}
        <div
          className="flex snap-x snap-mandatory overflow-x-auto md:hidden"
          onScroll={(event) => {
            const strip = event.currentTarget;
            const position = Math.round(strip.scrollLeft / strip.clientWidth);
            setActiveIndex(Math.min(Math.max(position, 0), validImages.length - 1));
          }}
          aria-label={`${validImages.length} fotos de ${title}`}
        >
          {validImages.map((item, index) => (
            <button
              key={`${item.image}-strip-${index}`}
              type="button"
              onClick={() => show(index)}
              className="relative aspect-[16/10] w-full flex-none snap-center snap-always overflow-hidden sm:aspect-[16/8]"
              aria-label={`Ampliar imagen ${index + 1}`}
            >
              <Image
                src={item.image}
                alt={`${title} — imagen ${index + 1}`}
                fill
                sizes="100vw"
                // The first photo is the LCP element on a listing page; the rest
                // must not compete with it for bandwidth on a 3G connection.
                priority={index === 0}
                className="object-cover"
              />
            </button>
          ))}
        </div>

        {validImages.length > 1 && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold tabular-nums text-white backdrop-blur md:hidden">
            {activeIndex + 1} / {validImages.length}
          </div>
        )}

        <div className={cn('hidden gap-1 md:grid', validImages.length > 1 && 'md:grid-cols-2')}>
          <button
            type="button"
            onClick={() => show(0)}
            className="group relative block overflow-hidden text-left md:h-[32rem]"
            aria-label="Ampliar imagen principal"
          >
            <Image
              src={validImages[0].image}
              alt={`${title} — imagen 1`}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              priority
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
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
                    <Image
                      src={item.image}
                      alt={`${title} — imagen ${imageIndex + 1}`}
                      fill
                      sizes="(min-width: 768px) 25vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
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
          onClick={() => show(activeIndex)}
          className="absolute bottom-4 right-4 inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-textPrimary shadow-cardHover transition-colors hover:bg-slate-100"
        >
          <Images className="h-4 w-4" aria-hidden />
          Ver las {validImages.length} {validImages.length === 1 ? 'foto' : 'fotos'}
        </button>
      </section>

      {lightboxOpen && (
        <GalleryViewer
          images={validImages}
          index={activeIndex}
          onIndexChange={setActiveIndex}
          onClose={() => setLightboxOpen(false)}
          title={title}
        />
      )}
    </>
  );
}
