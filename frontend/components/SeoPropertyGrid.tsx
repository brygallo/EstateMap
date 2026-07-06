import Link from 'next/link';
import {
  Property,
  formatPrice,
  formatArea,
  getPropertyTypeLabel,
  getStatusLabel,
  getMainImageUrl,
} from '@/lib/properties';

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
      <p className="rounded-lg border border-line bg-white p-6 text-sm text-textSecondary">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => {
        const typeLabel = getPropertyTypeLabel(property.property_type);
        const statusLabel = getStatusLabel(property.status);
        const location = [property.city, property.province]
          .filter(Boolean)
          .join(', ');
        const area = formatArea(property.area);
        const heading =
          property.title || `${typeLabel} ${statusLabel.toLowerCase()}`;

        return (
          <article
            key={property.id}
            className="overflow-hidden rounded-lg border border-line bg-white transition-shadow hover:shadow-md"
          >
            <Link href={`/property/${property.id}`} className="block">
              <div className="relative aspect-[4/3] bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getMainImageUrl(property)}
                  alt={`${typeLabel} ${statusLabel.toLowerCase()}${
                    location ? ` en ${location}` : ''
                  }`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                  {statusLabel}
                </span>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-1 text-base font-semibold text-textPrimary">
                  {heading}
                </h3>
                {location && (
                  <p className="mt-1 line-clamp-1 text-sm text-textSecondary">
                    {location}
                  </p>
                )}
                <p className="mt-2 text-lg font-bold text-primary">
                  {formatPrice(property.price)}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-textSecondary">
                  <span>{typeLabel}</span>
                  {area && <span>{area}</span>}
                  {property.rooms ? <span>{property.rooms} hab.</span> : null}
                  {property.bathrooms ? (
                    <span>{property.bathrooms} baños</span>
                  ) : null}
                </div>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
