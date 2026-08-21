'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Map } from 'lucide-react';

import PropertyCard from '@/components/PropertyCard';
import type { NearbyProperty } from '@/lib/properties';
import { formatDistance } from '@/lib/geo';

/**
 * Nearby listings as a rail you push sideways instead of a grid that stops.
 *
 * The grid showed four and ended, which is the moment a visitor leaves. The
 * candidates were already there: `getNearbyProperties` asks the API for sixty
 * inside the same window and throws away all but the ones it renders, so
 * showing more costs no request at all.
 *
 * They are revealed in batches rather than all at once, because a page that
 * mounts thirty cards with their photos pays for thirty images nobody scrolled
 * to. The sentinel at the end of the rail asks for the next batch when it comes
 * into view, so there is always one more card to the right until the list is
 * genuinely finished — and then the last card is a way into the map.
 */

const BATCH = 8;

type NearbyRailProps = {
  properties: NearbyProperty[];
  mapHref: string;
  mapLabel: string;
};

export default function NearbyRail({ properties, mapHref, mapLabel }: NearbyRailProps) {
  const [shown, setShown] = useState(() => Math.min(BATCH, properties.length));
  const railRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const hasMore = shown < properties.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown((current) => Math.min(current + BATCH, properties.length));
        }
      },
      // The rail itself is the scroll container, and the margin asks for the
      // next batch a card early so the edge never looks like the end.
      { root: railRef.current, rootMargin: '0px 320px 0px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, properties.length]);

  const syncArrows = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    setCanScrollLeft(rail.scrollLeft > 8);
    setCanScrollRight(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 8);
  }, []);

  useEffect(() => {
    syncArrows();
    const rail = railRef.current;
    if (!rail) return;
    rail.addEventListener('scroll', syncArrows, { passive: true });
    window.addEventListener('resize', syncArrows);
    return () => {
      rail.removeEventListener('scroll', syncArrows);
      window.removeEventListener('resize', syncArrows);
    };
  }, [syncArrows, shown]);

  const nudge = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.8, 280),
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  const arrow =
    'hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-textPrimary shadow-card transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex';

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={!canScrollLeft}
          aria-label="Ver propiedades anteriores"
          className={arrow}
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={!canScrollRight}
          aria-label="Ver más propiedades cercanas"
          className={arrow}
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div
        ref={railRef}
        className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0"
        style={{ scrollbarWidth: 'thin' }}
      >
        {properties.slice(0, shown).map((nearby) => (
          <div
            key={nearby.id}
            className="w-[78vw] max-w-[20rem] flex-shrink-0 snap-start sm:w-[19rem]"
          >
            <PropertyCard
              property={nearby}
              href={`/propiedad/${nearby.id}`}
              distanceLabel={`${formatDistance(nearby.distanceKm)} de distancia`}
            />
          </div>
        ))}

        {hasMore && <div ref={sentinelRef} aria-hidden className="w-1 flex-shrink-0" />}

        {!hasMore && (
          <Link
            href={mapHref}
            className="flex w-[78vw] max-w-[20rem] flex-shrink-0 snap-start flex-col items-start justify-center gap-3 rounded-card border border-dashed border-line bg-surface p-6 transition-colors hover:border-primary sm:w-[19rem]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-button bg-primaryLight text-primary">
              <Map className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-base font-bold text-textPrimary">Sigue explorando la zona</span>
            <span className="text-sm leading-6 text-textSecondary">
              Abre el mapa para ver todo lo publicado alrededor, con filtros por precio y tipo.
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              {mapLabel} <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
