'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { getPublicApiUrl } from '@/lib/api-url';

interface AuthUserInfo {
  id?: string;
  username?: string;
  email?: string;
  is_staff?: boolean;
}

interface AuthContextType {
  token: string | null;
  user: AuthUserInfo | null;
  login: (accessToken: string, refreshToken: string, remember: boolean) => void;
  logout: () => void;
  loading: boolean;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = getPublicApiUrl();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const decodeJWT = useCallback((t: string): any | null => {
    try {
      const base64Url = t.split('.')[1];
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
  }, []);

  const setSessionToken = useCallback((newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      const payload = decodeJWT(newToken);
      setUser({
        id: payload?.user_id || payload?.userId || payload?.id,
        username: payload?.username,
        email: payload?.email,
        is_staff: payload?.is_staff || false,
      });
    } else {
      setUser(null);
    }
  }, [decodeJWT]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    setSessionToken(null);

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, [setSessionToken]);

  // Función para renovar el token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refresh = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

    if (!refresh) {
      logout();
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
      });

      if (response.ok) {
        const data = await response.json();
        const newAccessToken = data.access;
        const newRefreshToken = data.refresh || refresh; // SimpleJWT puede rotar el refresh token

        // Guardar los nuevos tokens en el mismo storage que se usó originalmente
        const useLocalStorage = localStorage.getItem('refreshToken') !== null;

        if (useLocalStorage) {
          localStorage.setItem('token', newAccessToken);
          if (newRefreshToken !== refresh) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
        } else {
          sessionStorage.setItem('token', newAccessToken);
          if (newRefreshToken !== refresh) {
            sessionStorage.setItem('refreshToken', newRefreshToken);
          }
        }

        setSessionToken(newAccessToken);
        return true;
      } else {
        // Si el refresh token expiró, cerrar sesión
        logout();
        return false;
      }
    } catch (error) {
      console.error('Error al renovar token:', error);
      return false;
    }
  }, [logout, setSessionToken]);

  const login = (accessToken: string, refreshToken: string, remember: boolean) => {
    // Evitar mezclar una sesión persistente anterior con la nueva.
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');

    if (remember) {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      sessionStorage.setItem('token', accessToken);
      sessionStorage.setItem('refreshToken', refreshToken);
    }
    setSessionToken(accessToken);
  };

  useEffect(() => {
    const stored = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (stored) {
      setSessionToken(stored);
    }
    setLoading(false);
  }, [setSessionToken]);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!token) return;

    const payload = decodeJWT(token);
    const expiresAt = Number(payload?.exp) * 1000;
    // Renovar cinco minutos antes de la expiración real. Un token ya vencido
    // o cercano a vencer se renueva inmediatamente al restaurar la sesión.
    const refreshIn = Number.isFinite(expiresAt)
      ? Math.max(expiresAt - Date.now() - 5 * 60 * 1000, 0)
      : 0;

    refreshTimerRef.current = setTimeout(() => {
      void refreshToken();
    }, refreshIn);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [token, decodeJWT, refreshToken]);

  useEffect(() => {
    const refreshIfNeeded = () => {
      if (document.visibilityState !== 'visible' || !token) return;
      const payload = decodeJWT(token);
      const expiresAt = Number(payload?.exp) * 1000;
      if (!Number.isFinite(expiresAt) || expiresAt - Date.now() < 5 * 60 * 1000) {
        void refreshToken();
      }
    };

    document.addEventListener('visibilitychange', refreshIfNeeded);
    window.addEventListener('focus', refreshIfNeeded);
    return () => {
      document.removeEventListener('visibilitychange', refreshIfNeeded);
      window.removeEventListener('focus', refreshIfNeeded);
    };
  }, [token, decodeJWT, refreshToken]);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
