'use client';

import Link from 'next/link';
import { BedDouble, Bath, Car, MapPin, User, Layers, Ruler } from 'lucide-react';
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

  const meta = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-textSecondary">
      <span>{typeLabel}</span>
      {area && area !== '0' && (
        <span className="inline-flex items-center gap-1">
          <Ruler className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {area} m²
        </span>
      )}
      {property.rooms ? (
        <span className="inline-flex items-center gap-1">
          <BedDouble className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {property.rooms}
        </span>
      ) : null}
      {property.bathrooms ? (
        <span className="inline-flex items-center gap-1">
          <Bath className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {property.bathrooms}
        </span>
      ) : null}
      {property.parking_spaces ? (
        <span className="inline-flex items-center gap-1">
          <Car className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          {property.parking_spaces}
        </span>
      ) : null}
    </div>
  );

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
        className={`card card-hover p-2.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          selected ? 'ring-2 ring-primary border-primary' : ''
        }`}
      >
        <div className="mb-1.5 flex items-start justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <h3 className="truncate text-sm font-semibold text-textPrimary">{heading}</h3>
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
          <span
            className={`badge ${getStatusBadgeClass(String(property.status))} ml-1.5 flex-shrink-0 !text-[11px]`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mb-1.5 flex items-center gap-1 text-textSecondary">
          <User className="h-3 w-3" strokeWidth={1.75} aria-hidden />
          <span className="text-xs font-medium">
            {property.owner_username || `Usuario ${property.owner}`}
          </span>
        </div>

        <div className="space-y-0.5 text-xs">
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
  const body = (
    <>
      <div className="relative aspect-[4/3] bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getMainImageUrl(property)}
          alt={`${typeLabel} ${statusLabel.toLowerCase()}${location ? ` en ${location}` : ''}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span
          className={`badge ${getStatusBadgeClass(String(property.status))} absolute left-2 top-2 shadow-card`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 text-base font-semibold text-textPrimary">{heading}</h3>
        {location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-textSecondary">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
            <span className="line-clamp-1">{location}</span>
          </p>
        )}
        <p className="price mt-2 text-xl">{formatPrice(property.price)}</p>
        <div className="mt-2">{meta}</div>
      </div>
    </>
  );

  return (
    <article className="overflow-hidden rounded-card border border-line bg-surface transition-shadow hover:shadow-cardHover">
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
