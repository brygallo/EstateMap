'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { Building2, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

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
      const res = await fetch(`${API_URL}/login/`, {
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
          router.push(`/verify-email${params.toString() ? `?${params.toString()}` : ''}`);
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
      router.push(hasPropertyDraft ? '/add-property' : '/');
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Logo y título */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-primary shadow-card">
          <Building2 className="h-8 w-8 text-primary-foreground" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl font-bold text-textPrimary">Geo Propiedades Ecuador</h1>
        <p className="mt-2 text-sm text-textSecondary">
          Entra para publicar o gestionar tus propiedades.
        </p>
      </div>

      {/* Formulario */}
      <Card className="rounded-card border-line bg-surface shadow-card">
        <CardContent className="p-8">
          <Formik
            initialValues={{ email: '', password: '', remember: false }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form className="space-y-6">
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Field
                      as={Input}
                      id="email"
                      name="email"
                      type="email"
                      placeholder="tu@email.com"
                      className={`h-11 rounded-input pl-10 ${
                        errors.email && touched.email ? 'border-error focus-visible:ring-error' : ''
                      }`}
                    />
                  </div>
                  <ErrorMessage name="email" component="p" className="text-sm text-error" />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Field
                      as={Input}
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className={`h-11 rounded-input pl-10 ${
                        errors.password && touched.password ? 'border-error focus-visible:ring-error' : ''
                      }`}
                    />
                  </div>
                  <ErrorMessage name="password" component="p" className="text-sm text-error" />
                </div>

                {/* Remember me */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Field
                      id="remember"
                      name="remember"
                      type="checkbox"
                      className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
                    />
                    <Label htmlFor="remember" className="font-normal text-textSecondary">
                      Recordar sesión
                    </Label>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary transition-colors hover:text-secondary"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-button bg-primary text-base font-semibold text-primary-foreground shadow-card transition-transform hover:bg-primaryHover active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    <>
                      Iniciar Sesión
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </Form>
            )}
          </Formik>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-surface px-4 text-textSecondary">O continúa con</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <div className="mb-6">
            <GoogleSignInButton text="signin_with" />
          </div>

          {/* Registro */}
          <p className="text-center text-sm text-textSecondary">
            ¿Quieres publicar una propiedad gratis?{' '}
            <Link href="/register" className="font-semibold text-primary transition-colors hover:text-secondary">
              Crea tu cuenta
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-textSecondary">
        © {new Date().getFullYear()} Geo Propiedades Ecuador. Todos los derechos reservados.
      </p>
    </div>
  );
}
