/**
 * Cliente API con auto-renovación de tokens
 */

import { fetchWithTimeout } from '@/lib/form-errors';
import { getPublicApiUrl } from '@/lib/api-url';
import { uploadWithProgress, type UploadProgress } from '@/lib/upload-with-progress';
import {
  getAccessToken,
  getRefreshToken,
  isTokenExpiringSoon,
  refreshAccessToken,
} from '@/lib/auth-tokens';

const API_URL = getPublicApiUrl();

/** XHR sets headers one by one, so the three shapes HeadersInit allows collapse here. */
function headersToRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers } as Record<string, string>;
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  /**
   * Ask for upload progress. Passing this switches the request to XHR, which
   * also replaces the blanket 30 s abort with an inactivity timeout — the only
   * way a photo upload over mobile data can finish. Requires a FormData body.
   */
  onUploadProgress?: (progress: UploadProgress) => void;
}

/**
 * Cliente fetch mejorado con auto-renovación de tokens
 */
export async function apiFetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth = false, onUploadProgress, ...fetchOptions } = options;
  const url = `${API_URL}${endpoint}`;

  // One place decides how the request actually travels, so the auth handling
  // below is identical whether it goes out over fetch or over XHR.
  const send = (headers?: HeadersInit) =>
    onUploadProgress && fetchOptions.body instanceof FormData
      ? uploadWithProgress(url, fetchOptions.body, {
          method: fetchOptions.method || 'POST',
          headers: headersToRecord(headers),
          onProgress: onUploadProgress,
          signal: fetchOptions.signal ?? undefined,
        })
      : fetchWithTimeout(url, { ...fetchOptions, headers });

  // Si no necesita autenticación, hacer la petición directamente
  if (skipAuth) {
    return send(fetchOptions.headers);
  }

  // Obtener el token actual
  let token = getAccessToken();

  // Si el token está por expirar, renovarlo antes de hacer la petición
  if (token && isTokenExpiringSoon(token)) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
    }
  }

  // Agregar el token al header de autorización
  const headers = {
    ...fetchOptions.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  // Hacer la petición
  const response = await send(headers);

  // Si la respuesta es 401 (no autorizado), intentar renovar el token y reintentar
  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      // Reintentar la petición con el nuevo token
      return send({
        ...fetchOptions.headers,
        Authorization: `Bearer ${newToken}`,
      });
    }

    // Solo mandamos al login cuando la sesión murió de verdad. Si el refresco
    // falló por red, los tokens siguen guardados y el siguiente intento sirve.
    if (typeof window !== 'undefined' && !getRefreshToken()) {
      window.location.href = '/iniciar-sesion';
    }
  }

  return response;
}

/**
 * Helper para hacer peticiones GET
 */
export async function apiGet(endpoint: string, options: FetchOptions = {}) {
  return apiFetch(endpoint, { ...options, method: 'GET' });
}

/**
 * Helper para hacer peticiones POST
 */
export async function apiPost(endpoint: string, data?: any, options: FetchOptions = {}) {
  return apiFetch(endpoint, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Helper para hacer peticiones PUT
 */
export async function apiPut(endpoint: string, data?: any, options: FetchOptions = {}) {
  return apiFetch(endpoint, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Helper para hacer peticiones PATCH
 */
export async function apiPatch(endpoint: string, data?: any, options: FetchOptions = {}) {
  return apiFetch(endpoint, {
    ...options,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Helper para hacer peticiones DELETE
 */
export async function apiDelete(endpoint: string, options: FetchOptions = {}) {
  return apiFetch(endpoint, { ...options, method: 'DELETE' });
}
