'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import AuthCard from '@/components/auth/AuthCard';
import AuthDivider from '@/components/auth/AuthDivider';
import AuthField from '@/components/auth/AuthField';
import AuthSubmit from '@/components/auth/AuthSubmit';
import { fetchWithTimeout, requestErrorMessage } from '@/lib/form-errors';
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

  if (loading || (token && user)) {
    return null;
  }

  const validationSchema = Yup.object({
    email: Yup.string().email('Correo inválido').required('Campo requerido'),
    password: Yup.string().required('Campo requerido'),
  });

  const normalizeErrorMessage = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(normalizeErrorMessage).join(' ');
    if (typeof value === 'object') {
      return (
        normalizeErrorMessage(value.detail) ||
        normalizeErrorMessage(value.message) ||
        normalizeErrorMessage(Object.values(value)[0])
      );
    }
    return '';
  };

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errorDetail = normalizeErrorMessage(data.detail || data.error);
        const errorCode =
          data.code ||
          (typeof data.detail === 'object' && data.detail?.code) ||
          '';
        const isUnverified =
          errorCode === 'email_not_verified' ||
          (typeof errorDetail === 'string' && errorDetail.toLowerCase().includes('no ha sido verificada'));

        if (isUnverified) {
          const emailToVerify = data.email || values.email;
          const params = new URLSearchParams();
          if (emailToVerify) params.set('email', emailToVerify);

          toast.error('Tu cuenta no ha sido verificada. Redirigiendo para verificarla.');
          router.push(`/verificar-correo${params.toString() ? `?${params.toString()}` : ''}`);
          return;
        }

        let errorMessage = 'Credenciales incorrectas';
        if (data.detail) {
          errorMessage = Array.isArray(data.detail) ? data.detail[0] : data.detail;
        } else if (data.email) {
          errorMessage = Array.isArray(data.email) ? data.email[0] : data.email;
        } else if (data.password) {
          errorMessage = Array.isArray(data.password) ? data.password[0] : data.password;
        }
        toast.error(errorMessage);
        return;
      }
      login(data.access, data.refresh, values.remember);
      toast.success('Inicio de sesión exitoso');
      const hasPropertyDraft =
        typeof window !== 'undefined' && localStorage.getItem('propertyPublicationDraft');
      router.push(hasPropertyDraft ? '/publicar-propiedad' : '/');
    } catch (err) {
      toast.error(requestErrorMessage(err, 'iniciar sesión'));
    } finally {
      setSubmitting(false);
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
      <Formik
        initialValues={{ email: '', password: '', remember: false }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form className="space-y-4">
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
                  checked={values.remember}
                  onCheckedChange={(checked) => setFieldValue('remember', checked === true)}
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

            <AuthSubmit pending={isSubmitting} pendingLabel="Iniciando sesión…">
              Iniciar sesión
              <ArrowRight className="h-4 w-4" aria-hidden />
            </AuthSubmit>
          </Form>
        )}
      </Formik>

      <AuthDivider label="o continúa con" />
      <GoogleSignInButton text="signin_with" />
    </AuthCard>
  );
}
