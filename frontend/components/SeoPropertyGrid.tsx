import Link from 'next/link';
import type { Property } from '@/lib/types';
import PropertyCard, { PropertyCardSkeleton } from '@/components/PropertyCard';
import { ArrowRight, Home, MapPin, PlusCircle } from 'lucide-react';

type RelatedLink = { label: string; href: string };

/**
 * Crawlable grid of property cards. Each card links to the individual property
 * page (`/propiedad/[id]`) so search engines discover the full inventory through
 * internal links, and the map deep-link stays available for humans.
 */
export default function SeoPropertyGrid({
  properties,
  emptyMessage = 'Todavía no hay propiedades publicadas para esta búsqueda.',
  mapHref,
  relatedLinks = [],
  loading = false,
  skeletonCount = 6,
  priorityCount = 0,
}: {
  properties: Property[];
  emptyMessage?: string;
  mapHref?: string;
  relatedLinks?: RelatedLink[];
  /** Muestra un grid de skeletons de card en vez de las propiedades. */
  loading?: boolean;
  skeletonCount?: number;
  /** Nº de primeras tarjetas que cargan su imagen con `priority` (LCP). */
  priorityCount?: number;
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
      <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div className="flex gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background">
              <Home className="h-6 w-6 text-textSecondary" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-textPrimary">
                No hay publicaciones exactas por ahora
              </h3>
              <p className="mt-2 text-sm leading-6 text-textSecondary">
                {emptyMessage}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                {mapHref && (
                  <Link
                    href={mapHref}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
                  >
                    <MapPin className="h-4 w-4" aria-hidden />
                    Explorar mapa
                  </Link>
                )}
                <Link
                  href="/publicar-propiedad"
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-textPrimary hover:border-primary hover:text-primary"
                >
                  <PlusCircle className="h-4 w-4" aria-hidden />
                  Publicar propiedad
                </Link>
              </div>
            </div>
          </div>

          {relatedLinks.length > 0 && (
            <div className="rounded-lg bg-white p-4">
              <p className="text-sm font-semibold text-textPrimary">
                También puedes revisar
              </p>
              <div className="mt-3 space-y-2">
                {relatedLinks.slice(0, 4).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm text-textSecondary hover:bg-surface hover:text-primary"
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {properties.map((property, index) => (
        <PropertyCard
          key={property.id}
          property={property}
          variant="grid"
          href={`/propiedad/${property.id}`}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}
