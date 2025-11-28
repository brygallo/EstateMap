'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';

interface AuthUserInfo {
  id?: string;
  username?: string;
  email?: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const decodeJWT = (t: string): any | null => {
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
  };

  const setSessionToken = (newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      const payload = decodeJWT(newToken);
      setUser({
        id: payload?.user_id || payload?.userId || payload?.id,
        username: payload?.username,
        email: payload?.email,
      });
    } else {
      setUser(null);
    }
  };

  // Función para renovar el token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const refresh = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');

    if (!refresh) {
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
        scheduleTokenRefresh();
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
  }, []);

  // Programar la renovación automática del token
  const scheduleTokenRefresh = useCallback(() => {
    // Limpiar timer existente
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Renovar el token 5 minutos antes de que expire (expira en 1 hora)
    // 55 minutos = 3300000 ms
    const refreshTime = 55 * 60 * 1000;

    refreshTimerRef.current = setTimeout(() => {
      refreshToken();
    }, refreshTime);
  }, [refreshToken]);

  const login = (accessToken: string, refreshToken: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    } else {
      sessionStorage.setItem('token', accessToken);
      sessionStorage.setItem('refreshToken', refreshToken);
    }
    setSessionToken(accessToken);
    scheduleTokenRefresh();
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    setSessionToken(null);

    // Limpiar timer de renovación
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (stored) {
      setSessionToken(stored);
      scheduleTokenRefresh();
    }
    setLoading(false);

    // Limpiar timer al desmontar
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [scheduleTokenRefresh]);

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
