const STATUS_MESSAGES: Record<number, string> = {
  400: 'Revisa los datos ingresados e inténtalo nuevamente.',
  401: 'Tu sesión expiró. Inicia sesión nuevamente.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No se encontró la información solicitada.',
  408: 'La solicitud tardó demasiado. Inténtalo nuevamente.',
  413: 'Los archivos seleccionados superan el tamaño permitido.',
  429: 'Se realizaron demasiados intentos. Espera un momento y vuelve a intentar.',
  500: 'El servidor no pudo completar la solicitud. Inténtalo nuevamente.',
  502: 'El servicio no está disponible temporalmente.',
  503: 'El servicio no está disponible temporalmente.',
  504: 'El servidor tardó demasiado en responder.',
};

/**
 * How each API field is named in the interface.
 *
 * The API answers with its own column names, so a rejected title used to reach
 * the person as "title: …" — a word that appears nowhere on their screen. Any
 * field missing here falls back to its own name with the underscores removed.
 */
const FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  description: 'Descripción',
  property_type: 'Tipo de propiedad',
  status: 'Estado',
  address: 'Dirección',
  city: 'Ciudad',
  province: 'Provincia',
  latitude: 'Latitud',
  longitude: 'Longitud',
  polygon: 'Forma del terreno',
  area: 'Área total',
  built_area: 'Área construida',
  rooms: 'Habitaciones',
  bathrooms: 'Baños',
  parking_spaces: 'Estacionamientos',
  floors: 'Pisos',
  year_built: 'Año de construcción',
  price: 'Precio',
  rent_price: 'Precio de alquiler',
  contact_phone: 'Teléfono',
  uploaded_images: 'Fotos',
  images_to_delete: 'Fotos por eliminar',
  email: 'Correo',
  password: 'Contraseña',
  username: 'Usuario',
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.replaceAll('_', ' ');
}

function firstMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstMessage(item);
      if (message) return message;
    }
  }
  if (value && typeof value === 'object') {
    for (const [field, detail] of Object.entries(value)) {
      const message = firstMessage(detail);
      if (message) {
        const label = field === 'detail' || field === 'non_field_errors' ? '' : `${fieldLabel(field)}: `;
        return `${label}${message}`;
      }
    }
  }
  return null;
}

export async function responseErrorMessage(response: Response, fallback: string): Promise<string> {
  const requestId = response.headers.get('x-request-id');
  const reference = requestId ? ` Código de seguimiento: ${requestId}.` : '';
  if (response.status >= 500) {
    return `${STATUS_MESSAGES[response.status] || fallback}${reference}`;
  }
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      const data = await response.clone().json();
      const message = firstMessage(data);
      if (message) return `${message}${reference}`;
    }
  } catch {
    // Fall through to a stable status-based message.
  }
  return `${STATUS_MESSAGES[response.status] || fallback}${reference}`;
}

export function requestErrorMessage(error: unknown, action: string): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return `La solicitud para ${action} tardó demasiado. Inténtalo nuevamente.`;
  }
  if (error instanceof TypeError) {
    return `No se pudo comunicar con el servidor para ${action}. Verifica tu acceso a internet e inténtalo nuevamente.`;
  }
  return `Ocurrió un problema inesperado al ${action}. Inténtalo nuevamente.`;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 30_000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort();
  upstreamSignal?.addEventListener('abort', abortFromUpstream, { once: true });
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
    upstreamSignal?.removeEventListener('abort', abortFromUpstream);
  }
}
