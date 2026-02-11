'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'react-toastify';

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

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID no está configurado');
      return;
    }

    const initializeGoogleSignIn = () => {
      if (window.google && buttonRef.current) {
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
      }
    };

    // Esperar a que el script de Google se cargue
    if (window.google) {
      initializeGoogleSignIn();
    } else {
      const checkGoogleLoaded = setInterval(() => {
        if (window.google) {
          clearInterval(checkGoogleLoaded);
          initializeGoogleSignIn();
        }
      }, 100);

      return () => clearInterval(checkGoogleLoaded);
    }
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
        router.push('/');
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

  return <div ref={buttonRef} className="w-full" />;
}
