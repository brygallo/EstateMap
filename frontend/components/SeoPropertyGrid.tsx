import type { Property } from '@/lib/types';
import PropertyCard, { PropertyCardSkeleton } from '@/components/PropertyCard';
import { Home } from 'lucide-react';

/**
 * Crawlable grid of property cards. Each card links to the individual property
 * page (`/propiedad/[id]`) so search engines discover the full inventory through
 * internal links, and the map deep-link stays available for humans.
 */
export default function SeoPropertyGrid({
  properties,
  emptyMessage = 'Todavía no hay propiedades publicadas para esta búsqueda.',
  loading = false,
  skeletonCount = 6,
}: {
  properties: Property[];
  emptyMessage?: string;
  /** Muestra un grid de skeletons de card en vez de las propiedades. */
  loading?: boolean;
  skeletonCount?: number;
}) {
  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!properties.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background">
          <Home className="h-6 w-6 text-textSecondary" strokeWidth={1.75} aria-hidden />
        </span>
        <p className="text-sm text-textSecondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          variant="grid"
          href={`/propiedad/${property.id}`}
        />
      ))}
    </div>
  );
}
