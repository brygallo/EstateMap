/**
 * Cliente API con auto-renovación de tokens
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Decodifica un JWT y devuelve el payload
 */
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Verifica si un token está expirado o está por expirar en los próximos 5 minutos
 */
function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.exp - now;

  // Si expira en menos de 5 minutos (300 segundos), renovar
  return expiresIn < 300;
}

/**
 * Renueva el access token usando el refresh token
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      const newAccessToken = data.access;
      const newRefreshToken = data.refresh || refreshToken;

      // Guardar los nuevos tokens en el mismo storage que se usó originalmente
      const useLocalStorage = localStorage.getItem('refreshToken') !== null;

      if (useLocalStorage) {
        localStorage.setItem('token', newAccessToken);
        if (newRefreshToken !== refreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }
      } else {
        sessionStorage.setItem('token', newAccessToken);
        if (newRefreshToken !== refreshToken) {
          sessionStorage.setItem('refreshToken', newRefreshToken);
        }
      }

      return newAccessToken;
    } else {
      // Si el refresh token expiró, limpiar todo
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');

      // Redirigir al login si estamos en el navegador
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      return null;
    }
  } catch (error) {
    console.error('Error al renovar token:', error);
    return null;
  }
}

/**
 * Cliente fetch mejorado con auto-renovación de tokens
 */
export async function apiFetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options;

  // Si no necesita autenticación, hacer la petición directamente
  if (skipAuth) {
    return fetch(`${API_URL}${endpoint}`, fetchOptions);
  }

  // Obtener el token actual
  let token = localStorage.getItem('token') || sessionStorage.getItem('token');

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
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // Si la respuesta es 401 (no autorizado), intentar renovar el token y reintentar
  if (response.status === 401) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      // Reintentar la petición con el nuevo token
      const retryHeaders = {
        ...fetchOptions.headers,
        Authorization: `Bearer ${newToken}`,
      };

      return fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers: retryHeaders,
      });
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
