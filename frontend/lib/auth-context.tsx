'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import {
  clearTokens,
  decodeJWT,
  getAccessToken,
  millisUntilExpiry,
  onTokenChange,
  refreshAccessToken,
  storeTokens,
} from '@/lib/auth-tokens';

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

/** Renovar cinco minutos antes de que caduque el access token. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setSessionToken = useCallback((newToken: string | null) => {
    setToken(newToken);
    if (newToken) {
      const payload = decodeJWT(newToken) as Record<string, any> | null;
      setUser({
        id: payload?.user_id || payload?.userId || payload?.id,
        username: payload?.username,
        email: payload?.email,
        is_staff: payload?.is_staff || false,
      });
    } else {
      setUser(null);
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    return (await refreshAccessToken()) !== null;
  }, []);

  const login = useCallback(
    (accessToken: string, refresh: string, remember: boolean) => {
      storeTokens(accessToken, refresh, remember);
    },
    []
  );

  // El estado de React sigue a lo que haya en el almacenamiento, venga de un
  // login, de un refresco o de otra pestaña.
  useEffect(() => {
    setSessionToken(getAccessToken());
    setLoading(false);
    return onTokenChange(setSessionToken);
  }, [setSessionToken]);

  // Otra pestaña que renueva o cierra sesión debe reflejarse aquí.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== 'token') return;
      setSessionToken(getAccessToken());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [setSessionToken]);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!token) return;

    // Un token ya vencido o cercano a vencer se renueva de inmediato al
    // restaurar la sesión.
    const refreshIn = Math.max(millisUntilExpiry(token) - REFRESH_MARGIN_MS, 0);

    refreshTimerRef.current = setTimeout(() => {
      void refreshAccessToken();
    }, refreshIn);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [token]);

  // Un portátil que despierta tiene el timer atrasado: al volver a la pestaña
  // comprobamos si el token ya caducó mientras el equipo dormía.
  useEffect(() => {
    const refreshIfNeeded = () => {
      if (document.visibilityState !== 'visible') return;
      const stored = getAccessToken();
      if (!stored) return;
      if (millisUntilExpiry(stored) < REFRESH_MARGIN_MS) {
        void refreshAccessToken();
      }
    };

    document.addEventListener('visibilitychange', refreshIfNeeded);
    window.addEventListener('focus', refreshIfNeeded);
    return () => {
      document.removeEventListener('visibilitychange', refreshIfNeeded);
      window.removeEventListener('focus', refreshIfNeeded);
    };
  }, []);

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
