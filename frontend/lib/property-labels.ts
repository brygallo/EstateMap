// Etiquetas y formateadores compartidos de propiedades.
// Centralizados aqui para evitar duplicar los mismos mapas en cada pantalla.

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  house: 'Casa',
  land: 'Terreno',
  apartment: 'Apartamento',
  commercial: 'Comercial',
  other: 'Otro',
};

const STATUS_LABELS: Record<string, string> = {
  for_sale: 'En venta',
  for_rent: 'En alquiler',
  inactive: 'Inactivo',
};

// Fondo solido para marcadores/badges donde solo se necesita el color base.
const STATUS_DOT_CLASS: Record<string, string> = {
  for_sale: 'bg-primary',
  for_rent: 'bg-secondary',
  inactive: 'bg-muted',
};

// Badge completo (fondo + texto) sobrio para etiquetas de estado, en tokens de marca.
const STATUS_BADGE_CLASS: Record<string, string> = {
  for_sale: 'bg-primaryLight text-primary',
  for_rent: 'bg-secondary/15 text-secondaryHover',
  inactive: 'bg-muted text-textSecondary',
};

export function getPropertyTypeLabel(type: string): string {
  return PROPERTY_TYPE_LABELS[type] || type;
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function getStatusColor(status: string): string {
  return STATUS_DOT_CLASS[status] || 'bg-muted';
}

export function getStatusBadgeClass(status: string): string {
  return STATUS_BADGE_CLASS[status] || 'bg-muted text-textSecondary';
}

// Area redondeada a entero como string.
export function formatArea(area: unknown): string {
  const n = parseFloat(String(area ?? ''));
  return Number.isFinite(n) ? Math.round(n).toString() : '0';
}

// Precio en formato de moneda local.
export function formatPrice(price: unknown): string {
  const n = parseFloat(String(price ?? ''));
  return Number.isFinite(n) ? `$${n.toLocaleString()}` : '$0';
}
