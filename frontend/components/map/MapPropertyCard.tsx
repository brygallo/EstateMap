'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import PropertyCard from '@/components/PropertyCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Property } from '@/lib/types';

interface MapPropertyCardProps {
  property: Property;
  selected?: boolean;
  distanceLabel?: string | null;
  onMapClick: () => void;
  onOpenDetails: () => void;
}

/** Ítem único para representar una propiedad en cualquier superficie del mapa. */
export default function MapPropertyCard({
  property,
  selected = false,
  distanceLabel = null,
  onMapClick,
  onOpenDetails,
}: MapPropertyCardProps) {
  return (
    <div className="overflow-hidden rounded-card">
      <PropertyCard
        property={property}
        variant="compact"
        selected={selected}
        distanceLabel={distanceLabel}
        onClick={onMapClick}
        onOpenDetails={onOpenDetails}
      />
      {selected && (
        <Link
          href={`/propiedad/${property.id}`}
          className="mt-1.5 flex items-center justify-center gap-1.5 rounded-button border border-line bg-white px-3 py-2 text-[13px] font-semibold text-primary transition-colors hover:border-primary hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={2} aria-hidden />
          Ver página completa
        </Link>
      )}
    </div>
  );
}

/** Skeleton con las mismas proporciones del ítem compacto del mapa. */
export function MapPropertyCardSkeleton() {
  return (
    <div className="flex gap-2.5 rounded-card border border-line bg-surface p-2 shadow-card">
      <Skeleton className="h-[76px] w-[76px] flex-shrink-0 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-4/5" />
        <div className="grid grid-cols-2 gap-1.5">
          <Skeleton className="h-6 rounded-md" />
          <Skeleton className="h-6 rounded-md" />
        </div>
      </div>
    </div>
  );
}
