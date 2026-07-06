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
  for_sale: 'bg-success',
  for_rent: 'bg-primary',
  inactive: 'bg-slate-400',
};

// Badge completo (fondo + texto) sobrio para etiquetas de estado.
const STATUS_BADGE_CLASS: Record<string, string> = {
  for_sale: 'bg-emerald-50 text-emerald-700',
  for_rent: 'bg-blue-50 text-blue-700',
  inactive: 'bg-slate-100 text-slate-600',
};

export function getPropertyTypeLabel(type: string): string {
  return PROPERTY_TYPE_LABELS[type] || type;
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

export function getStatusColor(status: string): string {
  return STATUS_DOT_CLASS[status] || 'bg-slate-400';
}

export function getStatusBadgeClass(status: string): string {
  return STATUS_BADGE_CLASS[status] || 'bg-slate-100 text-slate-600';
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
