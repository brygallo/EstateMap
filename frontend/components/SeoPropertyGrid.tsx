import type { Property } from '@/lib/types';
import PropertyCard from '@/components/PropertyCard';

/**
 * Crawlable grid of property cards. Each card links to the individual property
 * page (`/property/[id]`) so search engines discover the full inventory through
 * internal links, and the map deep-link stays available for humans.
 */
export default function SeoPropertyGrid({
  properties,
  emptyMessage = 'Todavía no hay propiedades publicadas para esta búsqueda.',
}: {
  properties: Property[];
  emptyMessage?: string;
}) {
  if (!properties.length) {
    return (
      <p className="rounded-card border border-line bg-white p-6 text-sm text-textSecondary">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          variant="grid"
          href={`/property/${property.id}`}
        />
      ))}
    </div>
  );
}
