'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface GoogleSignInButtonProps {
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

const PROPERTY_DRAFT_STORAGE_KEY = 'propertyPublicationDraft';

export default function GoogleSignInButton({
  text = 'continue_with',
  onSuccess,
  onError,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { login } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  // 'loading' mientras carga el script de Google; 'ready' cuando el botón se
  // renderiza; 'error' si no llega tras el timeout (red lenta / bloqueado).
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID no está configurado');
      return;
    }

    let cancelled = false;

    const initializeGoogleSignIn = () => {
      if (cancelled || !window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: text,
        shape: 'rectangular',
        logo_alignment: 'left',
        width: buttonRef.current.offsetWidth,
      });
      setStatus('ready');
    };

    if (window.google) {
      initializeGoogleSignIn();
      return;
    }

    // Poll acotado: reintenta hasta ~6s y luego muestra el fallback en vez de
    // sondear para siempre en silencio (el problema anterior).
    let attempts = 0;
    const maxAttempts = 60; // 60 × 100ms = 6s
    const checkGoogleLoaded = setInterval(() => {
      if (window.google) {
        clearInterval(checkGoogleLoaded);
        initializeGoogleSignIn();
      } else if (++attempts >= maxAttempts) {
        clearInterval(checkGoogleLoaded);
        if (!cancelled) setStatus('error');
      }
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(checkGoogleLoaded);
    };
  }, [GOOGLE_CLIENT_ID, text]);

  const handleCredentialResponse = async (response: any) => {
    try {
      const token = response.credential;

      // Enviar el token al backend
      const res = await fetch(`${API_URL}/auth/google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.error || 'Error al iniciar sesión con Google';
        toast.error(errorMessage);
        if (onError) onError(errorMessage);
        return;
      }

      // Login exitoso
      login(data.access, data.refresh, true); // remember = true por defecto para OAuth
      toast.success('Inicio de sesión exitoso con Google');
      if (onSuccess) {
        onSuccess();
      } else {
        const hasPropertyDraft =
          typeof window !== 'undefined' && localStorage.getItem(PROPERTY_DRAFT_STORAGE_KEY);
        router.push(hasPropertyDraft ? '/add-property' : '/');
      }
    } catch (err) {
      const errorMessage = 'Error de conexión con el servidor';
      toast.error(errorMessage);
      if (onError) onError(errorMessage);
    }
  };

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Reservamos la altura del botón (min-h) para evitar salto de layout (CLS);
          el skeleton se superpone mientras carga y desaparece al renderizar. */}
      <div className="relative min-h-[44px] w-full">
        <div ref={buttonRef} className="w-full" />
        {status === 'loading' && (
          <div
            className="absolute inset-0 animate-pulse rounded-input border border-line bg-background"
            aria-hidden="true"
          />
        )}
      </div>
      {status === 'error' && (
        <p className="mt-1 text-center text-xs text-textSecondary" role="status">
          No se pudo cargar el acceso con Google. Usa tu correo y contraseña más abajo.
        </p>
      )}
    </div>
  );
}
