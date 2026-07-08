'use client';

import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  BedDouble,
  Bath,
  Car,
  Heart,
  Home,
  Building,
  Building2,
  Trees,
  MapPin,
  Layers,
  Ruler,
  Navigation,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PropertyImage from '@/components/ui/PropertyImage';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import {
  getPropertyTypeLabel,
  getStatusLabel,
  getStatusBadgeClass,
  formatArea,
  formatPrice,
} from '@/lib/property-labels';
import { getMainImageUrl } from '@/lib/properties';
import type { Property } from '@/lib/types';

interface PropertyCardProps {
  property: Property;
  /** `grid`: tarjeta con imagen que enlaza al detalle (páginas SEO).
   *  `compact`: fila densa clicable que abre el modal (panel del mapa). */
  variant?: 'grid' | 'compact';
  /** Si se pasa, la tarjeta enlaza a esta URL (variante `grid`). */
  href?: string;
  /** Si se pasa, la tarjeta es clicable sin navegar (variante `compact`). */
  onClick?: () => void;
  onOpenDetails?: () => void;
  selected?: boolean;
  distanceLabel?: string | null;
}

const FAVORITES_KEY = 'geo:favorite-properties';

function readFavoriteIds(): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const ids = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function writeFavoriteIds(ids: Set<number>) {
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage puede fallar en modo privado; el favorito solo vive en memoria.
  }
}

/** Corazón que se llena con una pequeña animación de resorte al marcar/desmarcar favorito. */
function FavoriteButton({ propertyId }: { propertyId: number }) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setIsFavorite(readFavoriteIds().has(propertyId));
  }, [propertyId]);

  const toggleFavorite = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const ids = readFavoriteIds();
    const next = !isFavorite;
    if (next) ids.add(propertyId);
    else ids.delete(propertyId);
    writeFavoriteIds(ids);
    setIsFavorite(next);
  };

  return (
    <motion.button
      type="button"
      onClick={toggleFavorite}
      whileTap={{ scale: 0.85 }}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}
      className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-card bg-white/90 shadow-card backdrop-blur-sm transition-colors hover:bg-white"
    >
      <motion.span
        key={isFavorite ? 'liked' : 'unliked'}
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        className="flex"
      >
        <Heart
          className={cn(
            'h-[18px] w-[18px] transition-colors',
            isFavorite ? 'fill-error text-error' : 'fill-none text-textSecondary'
          )}
          strokeWidth={2}
        />
      </motion.span>
    </motion.button>
  );
}

function StatTile({
  icon: Icon,
  label,
}: {
  icon: typeof Ruler;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-0.5 text-[11px] font-medium text-textSecondary">
      <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden />
      {label}
    </span>
  );
}

/** Icono representativo según el tipo de propiedad (para placeholder e info). */
function typeIcon(type: string): typeof Home {
  if (type === 'land') return Trees;
  if (type === 'commercial') return Building2;
  if (type === 'apartment') return Building;
  return Home; // house / other
}

/**
 * Placeholder cuando la propiedad no tiene imagen: en vez de un logo genérico,
 * muestra un icono acorde al tipo sobre un degradado sobrio de la marca.
 */
function ImagePlaceholder({
  type,
  className,
  iconClassName,
}: {
  type: string;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = typeIcon(type);
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-gradient-to-br from-muted to-background',
        className
      )}
      aria-hidden
    >
      <Icon className={cn('text-textSecondary/40', iconClassName)} strokeWidth={1.5} />
    </div>
  );
}

/** Skeleton de card, mismo layout de la variante `grid`, para estados de carga del listado. */
export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-7 w-2/5" />
        <div className="flex gap-2 border-t border-line pt-4">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * Tarjeta única de propiedad para todo el producto. Antes existían tres diseños
 * distintos (grid SEO, lista del mapa y detalle) con precios de tres colores;
 * este componente centraliza el lenguaje visual (precio en `.price`, badge de
 * estado por token, meta con iconos lucide) en dos variantes de densidad.
 */
export default function PropertyCard({
  property,
  variant = 'grid',
  href,
  onClick,
  onOpenDetails,
  selected = false,
  distanceLabel = null,
}: PropertyCardProps) {
  const typeLabel = getPropertyTypeLabel(String(property.property_type));
  const statusLabel = getStatusLabel(String(property.status));
  const location = [property.city, property.province].filter(Boolean).join(', ');
  const heading = property.title || `${typeLabel} ${statusLabel.toLowerCase()}`;
  const area = formatArea(property.area);
  const operationBadgeClass = getStatusBadgeClass(String(property.status));
  const isRent = property.status === 'for_rent';
  // Anuncio venta + alquiler a la vez: `price` es la venta y `rent_price` el alquiler.
  const rentPriceNum = Number.parseFloat(String(property.rent_price ?? ''));
  const hasRentPrice = property.rent_price != null && Number.isFinite(rentPriceNum) && rentPriceNum > 0;

  // Imagen principal compartida por ambas variantes. La miniatura del backend
  // (más liviana) se usa en compact; el placeholder por tipo cubre el caso sin foto.
  const mainImage = property.images?.find((img) => img.is_main) || property.images?.[0];
  const hasImage = Boolean(mainImage?.image || mainImage?.thumbnail);

  if (variant === 'compact') {
    const thumbUrl = mainImage?.thumbnail || mainImage?.image || null;
    const TypeIcon = typeIcon(String(property.property_type));
    const meta: { icon: typeof Ruler; label: string }[] = [
      { icon: TypeIcon, label: typeLabel },
      ...(area && area !== '0' ? [{ icon: Ruler, label: `${area} m²` }] : []),
      ...((property.rooms ?? 0) > 0 ? [{ icon: BedDouble, label: String(property.rooms) }] : []),
      ...((property.bathrooms ?? 0) > 0 ? [{ icon: Bath, label: String(property.bathrooms) }] : []),
    ];

    return (
      <div
        aria-pressed={selected}
        className={`card card-hover flex gap-2.5 p-2 ${
          selected ? 'ring-2 ring-primary border-primary' : ''
        }`}
      >
        {/* Miniatura */}
        <div className="relative h-[76px] w-[76px] flex-shrink-0 overflow-hidden rounded-lg">
          {thumbUrl ? (
            <PropertyImage
              src={thumbUrl}
              alt={heading}
              fill
              sizes="76px"
              className="object-cover"
              wrapperClassName="absolute inset-0"
            />
          ) : (
            <ImagePlaceholder
              type={String(property.property_type)}
              className="h-full w-full"
              iconClassName="h-7 w-7"
            />
          )}
          {property.polygon && (
            <span
              className="absolute bottom-1 left-1 flex h-4 w-4 items-center justify-center rounded-md bg-white/90 shadow-card"
              title="Polígono delimitado"
            >
              <Layers className="h-2.5 w-2.5 text-success" strokeWidth={2.5} aria-hidden />
            </span>
          )}
        </div>

        {/* Contenido */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="line-clamp-2 text-[13px] font-semibold leading-tight text-textPrimary">
              {heading}
            </h3>
            <span className={`badge ${operationBadgeClass} flex-shrink-0`}>{statusLabel}</span>
          </div>

          <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="price text-[15px] font-bold">{formatPrice(property.price)}</span>
            {isRent && !hasRentPrice && <span className="text-[11px] font-medium text-textSecondary">/mes</span>}
            {hasRentPrice && (
              <span className="text-[11px] font-medium text-textSecondary">
                · Alquiler {formatPrice(property.rent_price)}/mes
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-textSecondary">
            {distanceLabel && (
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                <Navigation className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                {distanceLabel}
              </span>
            )}
            {meta.map(({ icon: Icon, label }, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} aria-hidden />
                {label}
              </span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onClick}
              className="rounded-md border border-line bg-white px-2 py-1 text-[11px] font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Ver mapa
            </button>
            <button
              type="button"
              onClick={onOpenDetails}
              className="rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-primaryHover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Detalle
            </button>
          </div>
        </div>
      </div>
    );
  }

  // variant === 'grid'
  const priceNum = Number.parseFloat(String(property.price ?? ''));
  const hasPrice = Number.isFinite(priceNum);

  const statTiles: { icon: typeof Ruler; label: string }[] = [
    { icon: Home, label: typeLabel },
    ...(area && area !== '0' ? [{ icon: Ruler, label: `${area} m²` }] : []),
    ...((property.rooms ?? 0) > 0 ? [{ icon: BedDouble, label: `${property.rooms}` }] : []),
    ...((property.bathrooms ?? 0) > 0 ? [{ icon: Bath, label: `${property.bathrooms}` }] : []),
    ...((property.parking_spaces ?? 0) > 0
      ? [{ icon: Car, label: `${property.parking_spaces}` }]
      : []),
  ];

  const body = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden">
        {hasImage ? (
          <PropertyImage
            src={getMainImageUrl(property)}
            alt={`${typeLabel} ${statusLabel.toLowerCase()}${location ? ` en ${location}` : ''}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            wrapperClassName="absolute inset-0"
          />
        ) : (
          <ImagePlaceholder
            type={String(property.property_type)}
            className="absolute inset-0"
            iconClassName="h-14 w-14"
          />
        )}
        <div className="absolute left-2.5 top-2.5 z-10">
          <Badge className={cn('border-transparent shadow-card', operationBadgeClass)}>
            {statusLabel}
          </Badge>
        </div>
        <FavoriteButton propertyId={property.id} />
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 text-base font-semibold text-textPrimary">{heading}</h3>
        {location && (
          <p className="mt-1.5 flex items-center gap-1 text-sm text-textSecondary">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
            <span className="line-clamp-1">{location}</span>
          </p>
        )}
        <div className="mt-2.5 flex flex-wrap items-baseline gap-1.5">
          {hasPrice ? (
            <AnimatedNumber
              value={priceNum}
              format={{ maximumFractionDigits: 0 }}
              prefix="$"
              className="price font-geo text-xl font-semibold"
            />
          ) : (
            <span className="price font-geo text-xl font-semibold">{formatPrice(property.price)}</span>
          )}
          {isRent && !hasRentPrice && (
            <span className="text-sm font-medium text-textSecondary">/mes</span>
          )}
          {hasRentPrice && (
            <span className="text-sm font-medium text-textSecondary">
              · Alquiler {formatPrice(property.rent_price)}/mes
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          {statTiles.map((tile, i) => (
            <StatTile key={i} icon={tile.icon} label={tile.label} />
          ))}
        </div>
      </div>
    </>
  );

  return (
    <article className="overflow-hidden rounded-card border border-line bg-surface shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardHover">
      {href ? (
        <Link href={href} className="block">
          {body}
        </Link>
      ) : (
        <div onClick={onClick} className={onClick ? 'block cursor-pointer' : 'block'}>
          {body}
        </div>
      )}
    </article>
  );
}
