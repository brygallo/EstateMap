'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import AuthCard from '@/components/auth/AuthCard';
import AuthDivider from '@/components/auth/AuthDivider';
import AuthField from '@/components/auth/AuthField';
import AuthSubmit from '@/components/auth/AuthSubmit';
import { fetchWithTimeout, requestErrorMessage, responseErrorMessage } from '@/lib/form-errors';
import { getPublicApiUrl } from '@/lib/api-url';

export default function LoginPage() {
  const router = useRouter();
  const { login, token, user, loading } = useAuth();
  const API_URL = getPublicApiUrl();

  useEffect(() => {
    if (!loading && token && user) {
      router.replace('/');
    }
  }, [loading, token, user, router]);

  const validationSchema = z.object({
    email: z.email('Correo inválido'),
    password: z.string().min(1, 'Campo requerido'),
    remember: z.boolean(),
  });
  type LoginValues = z.infer<typeof validationSchema>;
  const form = useForm<LoginValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: { email: '', password: '', remember: true },
  });

  if (loading || (token && user)) {
    return null;
  }
  type ErrorPayload = Record<string, unknown>;

  const normalizeErrorMessage = (value: unknown): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(normalizeErrorMessage).join(' ');
    if (value && typeof value === 'object') {
      const payload = value as ErrorPayload;
      return (
        normalizeErrorMessage(payload.detail) ||
        normalizeErrorMessage(payload.message) ||
        normalizeErrorMessage(Object.values(payload)[0])
      );
    }
    return '';
  };

  const handleSubmit = async (values: LoginValues) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      const data = await res.json().catch(() => ({})) as ErrorPayload;
      if (!res.ok) {
        const errorDetail = normalizeErrorMessage(data.detail || data.error);
        const errorCode =
          (typeof data.code === 'string' && data.code) ||
          (data.detail && typeof data.detail === 'object' && 'code' in data.detail &&
            typeof data.detail.code === 'string' && data.detail.code) ||
          '';
        const isUnverified =
          errorCode === 'email_not_verified' ||
          (typeof errorDetail === 'string' && errorDetail.toLowerCase().includes('no ha sido verificada'));

        if (isUnverified) {
          const emailToVerify = typeof data.email === 'string' ? data.email : values.email;
          const params = new URLSearchParams();
          if (emailToVerify) params.set('email', emailToVerify);

          toast.error('Tu cuenta no ha sido verificada. Redirigiendo para verificarla.');
          router.push(`/verificar-correo${params.toString() ? `?${params.toString()}` : ''}`);
          return;
        }

        let errorMessage = 'Credenciales incorrectas';
        if (data.detail) {
          errorMessage = normalizeErrorMessage(data.detail) || errorMessage;
        } else if (data.email) {
          errorMessage = normalizeErrorMessage(data.email) || errorMessage;
        } else if (data.password) {
          errorMessage = normalizeErrorMessage(data.password) || errorMessage;
        }
        toast.error(errorMessage || await responseErrorMessage(res, 'Credenciales incorrectas'));
        return;
      }
      if (typeof data.access !== 'string' || typeof data.refresh !== 'string') {
        toast.error('El servidor no devolvió una sesión válida');
        return;
      }
      login(data.access, data.refresh, values.remember);
      toast.success('Inicio de sesión exitoso');
      const hasPropertyDraft =
        typeof window !== 'undefined' && localStorage.getItem('propertyPublicationDraft');
      router.push(hasPropertyDraft ? '/publicar-propiedad' : '/');
    } catch (err) {
      toast.error(requestErrorMessage(err, 'iniciar sesión'));
    }
  };

  return (
    <AuthCard
      eyebrow="Acceso"
      title="Entra a tu cuenta"
      description="Publica y gestiona tus propiedades."
      footer={
        <>
          ¿Todavía no tienes cuenta?{' '}
          <Link href="/registro" className="font-semibold text-primary transition-colors hover:text-secondary">
            Publica gratis
          </Link>
        </>
      }
    >
      <FormProvider {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <AuthField
              id="email"
              name="email"
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              icon={Mail}
            />

            <AuthField
              id="password"
              name="password"
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              icon={Lock}
            />

            {/*
              The recovery link is deliberately not green. Green is the colour
              of the one action this screen wants, and it sits directly below.
            */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={form.watch('remember')}
                  onCheckedChange={(checked) => form.setValue('remember', checked === true)}
                />
                <Label htmlFor="remember" className="font-normal text-textSecondary">
                  Recordar sesión
                </Label>
              </div>
              <Link
                href="/recuperar-contrasena"
                className="text-sm text-textSecondary underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                Olvidé mi contraseña
              </Link>
            </div>

            <AuthSubmit pending={form.formState.isSubmitting} pendingLabel="Iniciando sesión…">
              Iniciar sesión
              <ArrowRight className="h-4 w-4" aria-hidden />
            </AuthSubmit>
          </form>
      </FormProvider>

      <AuthDivider label="o continúa con" />
      <GoogleSignInButton text="signin_with" />
    </AuthCard>
  );
}
