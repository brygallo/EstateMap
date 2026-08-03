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
        const label = field === 'detail' || field === 'non_field_errors' ? '' : `${field.replaceAll('_', ' ')}: `;
        return `${label}${message}`;
      }
    }
  }
  return null;
}

export async function responseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      const data = await response.clone().json();
      const message = firstMessage(data);
      if (message) return message;
    }
  } catch {
    // Fall through to a stable status-based message.
  }
  return STATUS_MESSAGES[response.status] || fallback;
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
