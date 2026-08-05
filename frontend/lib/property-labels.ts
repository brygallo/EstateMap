// Shared property labels and formatters (single source of truth).
// Every screen must import these instead of keeping a local copy: the inline
// duplicates used to diverge ("Apartamento" vs "Departamento", '$0' vs
// 'Precio a consultar') and both variants could render on the same page.

export { formatDistance } from './geo';

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  house: 'Casa',
  apartment: 'Departamento',
  land: 'Terreno',
  commercial: 'Local comercial',
  other: 'Propiedad',
};

// Plural variants for aggregate copy (stats pages, llms.txt summaries).
export const PROPERTY_TYPE_PLURAL_LABELS: Record<string, string> = {
  house: 'Casas',
  apartment: 'Departamentos',
  land: 'Terrenos',
  commercial: 'Locales comerciales',
  other: 'Otros',
};

const STATUS_LABELS: Record<string, string> = {
  for_sale: 'En venta',
  for_rent: 'En alquiler',
  sold: 'Vendido',
  rented: 'Alquilado',
  pending: 'Pendiente',
  inactive: 'Inactiva',
};

// --- Closure --------------------------------------------------------------
// A closed listing is NOT a new status: it is `status: 'inactive'` plus a
// `closed_reason`. `status` alone cannot tell "vendido" from "retirado", so
// anything that shows the state of a listing has to read both fields — hence
// these helpers take the listing, not the bare status string.

/** Values the API can put in `closed_reason`; empty string means still open. */
export type ClosedReason = 'sold' | 'rented' | 'withdrawn';

/** The little the label helpers need to know about a listing. */
export interface ListingState {
  status?: string | null;
  closed_reason?: string | null;
  closed_at?: string | null;
}

const CLOSED_REASON_LABELS: Record<ClosedReason, string> = {
  sold: 'Vendido',
  rented: 'Arrendado',
  withdrawn: 'Retirado',
};

// Closures where the deal went through, as opposed to giving up on the ad.
// Only these deserve a congratulation; a withdrawn listing gets none.
const SUCCESSFUL_CLOSURES: ClosedReason[] = ['sold', 'rented'];

// Chip per closure. A finished deal reads as a solid stamp so it cannot be
// mistaken for one of the "available" chips; a withdrawal is muted, because
// there is nothing to celebrate about it.
//
// Only class names that also appear under `app/` or `components/` can be used
// here: tailwind.config.js does not scan `lib/`, so a utility written only in
// this file is never generated and silently renders as no background at all.
const CLOSED_BADGE_CLASS: Record<ClosedReason, string> = {
  sold: 'bg-textSecondary text-white',
  rented: 'bg-textSecondary text-white',
  withdrawn: 'bg-muted text-textSecondary',
};

/** Normalized closure reason, or '' when the listing is still open. */
export function getClosedReason(listing?: ListingState | null): ClosedReason | '' {
  const reason = (listing?.closed_reason || '') as ClosedReason;
  return reason in CLOSED_REASON_LABELS ? reason : '';
}

/** True once the owner closed the listing, whatever the reason. */
export function isClosedListing(listing?: ListingState | null): boolean {
  return getClosedReason(listing) !== '';
}

/** True only for a closure that means the property changed hands. */
export function isSuccessfulClosure(listing?: ListingState | null): boolean {
  const reason = getClosedReason(listing);
  return reason !== '' && SUCCESSFUL_CLOSURES.includes(reason);
}

/** "Vendido" / "Arrendado" / "Retirado"; empty string while the listing is open. */
export function getClosureLabel(listing?: ListingState | null): string {
  const reason = getClosedReason(listing);
  return reason === '' ? '' : CLOSED_REASON_LABELS[reason];
}

/**
 * Status label that knows about closures.
 *
 * `getStatusLabel` takes a bare status and is called from a dozen screens and
 * from the social images, so it keeps its signature; this is the variant to use
 * wherever a closed listing can show up.
 */
export function getListingStatusLabel(listing?: ListingState | null): string {
  return getClosureLabel(listing) || getStatusLabel(listing?.status || undefined);
}

/** Badge class matching `getListingStatusLabel`. */
export function getListingStatusBadgeClass(listing?: ListingState | null): string {
  const reason = getClosedReason(listing);
  return reason === ''
    ? getStatusBadgeClass(listing?.status || undefined)
    : CLOSED_BADGE_CLASS[reason];
}

/** Overlay class (chip printed on a photo) matching `getListingStatusLabel`. */
export function getListingStatusOverlayClass(listing?: ListingState | null): string {
  const reason = getClosedReason(listing);
  return reason === ''
    ? getStatusOverlayClass(listing?.status || undefined)
    : CLOSED_BADGE_CLASS[reason];
}

// Solid background for markers/dots where only the base color is needed.
const STATUS_DOT_CLASS: Record<string, string> = {
  for_sale: 'bg-primary',
  for_rent: 'bg-secondary',
  inactive: 'bg-muted',
};

// Tinted chip (background + text) for status badges. Brand tokens only —
// never raw Tailwind palette classes (green-100, amber-100, ...).
const STATUS_BADGE_CLASS: Record<string, string> = {
  for_sale: 'bg-primaryLight text-primary',
  for_rent: 'bg-secondary/15 text-secondary',
  pending: 'bg-muted text-textSecondary',
  inactive: 'bg-muted text-textSecondary',
};

// Solid chip for status overlays printed on photos. `for_rent` must use the
// secondary token: `success` resolves to the same green as `primary` in the
// token export, which made sale and rent overlays indistinguishable.
const STATUS_OVERLAY_CLASS: Record<string, string> = {
  for_sale: 'bg-primary text-white',
  for_rent: 'bg-secondary text-white',
  pending: 'bg-muted text-textSecondary',
  inactive: 'bg-textSecondary text-white',
};

export function getPropertyTypeLabel(type?: string): string {
  return PROPERTY_TYPE_LABELS[type || ''] || type || 'Propiedad';
}

export function getStatusLabel(status?: string): string {
  return STATUS_LABELS[status || ''] || status || '';
}

export function getStatusColor(status?: string): string {
  return STATUS_DOT_CLASS[status || ''] || 'bg-muted';
}

export function getStatusBadgeClass(status?: string): string {
  return STATUS_BADGE_CLASS[status || ''] || 'bg-muted text-textSecondary';
}

export function getStatusOverlayClass(status?: string): string {
  return STATUS_OVERLAY_CLASS[status || ''] || 'bg-primary text-white';
}

// Price in local currency format; missing/zero prices read as negotiable
// instead of a misleading "$0".
export function formatPrice(price?: number | string | null): string {
  const value = Number.parseFloat(String(price ?? ''));
  if (!Number.isFinite(value) || value <= 0) return 'Precio a consultar';
  return `$${value.toLocaleString('es-EC')}`;
}

// Bare rounded area number ("1.250"), for tiles whose label already says m².
export function formatAreaValue(area?: number | string | null): string {
  const value = Number.parseFloat(String(area ?? ''));
  if (!Number.isFinite(value) || value <= 0) return '';
  return Math.round(value).toLocaleString('es-EC');
}

// Area with unit ("1.250 m²"), empty string when invalid.
export function formatArea(area?: number | string | null): string {
  const value = formatAreaValue(area);
  return value ? `${value} m²` : '';
}

// Date in es-EC; defaults to a long date ("3 de agosto de 2026").
// Pass Intl options to shorten (e.g. { day: '2-digit', month: 'short' }).
export function formatDate(
  value?: string | number | Date | null,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-EC', options).format(date);
}

// Human-readable byte size for storage metrics (admin dashboards).
export function formatBytes(value: number): string {
  if (!value) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}
