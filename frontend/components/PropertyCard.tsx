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
  MapPin,
  User,
  Layers,
  Ruler,
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
  selected?: boolean;
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
  selected = false,
}: PropertyCardProps) {
  const typeLabel = getPropertyTypeLabel(String(property.property_type));
  const statusLabel = getStatusLabel(String(property.status));
  const location = [property.city, property.province].filter(Boolean).join(', ');
  const heading = property.title || `${typeLabel} ${statusLabel.toLowerCase()}`;
  const area = formatArea(property.area);
  const operationBadgeClass = getStatusBadgeClass(String(property.status));

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        className={`card card-hover cursor-pointer p-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          selected ? 'ring-2 ring-primary border-primary' : ''
        }`}
      >
        <div className="mb-1.5 flex items-start justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <h3 className="truncate text-[13px] font-semibold text-textPrimary">{heading}</h3>
            {property.polygon ? (
              <Layers
                className="h-3 w-3 flex-shrink-0 text-success"
                strokeWidth={2}
                aria-label="Propiedad con polígono delimitado"
              />
            ) : (
              <MapPin
                className="h-3 w-3 flex-shrink-0 text-secondary"
                strokeWidth={2}
                aria-label="Propiedad mostrada como marcador"
              />
            )}
          </div>
          <span className={`badge ${operationBadgeClass} ml-1.5 flex-shrink-0`}>
            {statusLabel}
          </span>
        </div>

        <div className="mb-1.5 flex items-center gap-1 text-textSecondary">
          <User className="h-3 w-3" strokeWidth={1.75} aria-hidden />
          <span className="text-xs font-medium">
            {property.owner_username || `Usuario ${property.owner}`}
          </span>
        </div>

        <div className="space-y-0.5 text-[11px] leading-4">
          <div className="flex items-center gap-1">
            <span className="font-semibold">Tipo:</span>
            <span>{typeLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">Área:</span>
            <span>{area} m²</span>
          </div>
          {property.built_area ? (
            <div className="flex items-center gap-1">
              <span className="font-semibold">Construida:</span>
              <span>{formatArea(property.built_area)} m²</span>
            </div>
          ) : null}
          <div className="flex items-center gap-1">
            <span className="font-semibold">Precio:</span>
            <span className="price">{formatPrice(property.price)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-textSecondary">
            {(property.rooms ?? 0) > 0 && <span>{property.rooms} hab.</span>}
            {(property.bathrooms ?? 0) > 0 && <span>{property.bathrooms} baños</span>}
            {property.floors ? (
              <span>
                {property.floors} {property.floors === 1 ? 'piso' : 'pisos'}
              </span>
            ) : null}
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
        <PropertyImage
          src={getMainImageUrl(property)}
          alt={`${typeLabel} ${statusLabel.toLowerCase()}${location ? ` en ${location}` : ''}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          wrapperClassName="absolute inset-0"
        />
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
        <div className="mt-2.5 flex items-baseline gap-1.5">
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
          {property.status === 'for_rent' && (
            <span className="text-sm font-medium text-textSecondary">/mes</span>
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
