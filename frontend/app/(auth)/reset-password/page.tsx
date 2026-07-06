'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { KeyRound, Lock, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const ResetPassword = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  const validationSchema = Yup.object({
    new_password: Yup.string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .required('Campo requerido'),
    confirm_password: Yup.string()
      .oneOf([Yup.ref('new_password')], 'Las contraseñas no coinciden')
      .required('Campo requerido'),
  });

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    if (!token) {
      toast.error('Token de recuperación no válido');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          new_password: values.new_password,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Error al restablecer la contraseña');
        return;
      }

      toast.success(data.message || 'Contraseña actualizada exitosamente');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
          <AlertTriangle className="h-9 w-9 text-error" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl font-bold text-textPrimary">Token no válido</h1>
        <p className="text-textSecondary">
          El enlace de recuperación no es válido o ha expirado. Por favor, solicita uno nuevo.
        </p>
        <Button
          onClick={() => router.push('/forgot-password')}
          className="h-11 rounded-button bg-primary px-6 font-semibold text-primary-foreground shadow-card hover:bg-primaryHover"
        >
          Solicitar nuevo enlace
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Logo y título */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-primary shadow-card">
          <KeyRound className="h-8 w-8 text-primary-foreground" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl font-bold text-textPrimary">Restablecer contraseña</h1>
        <p className="mt-2 text-sm text-textSecondary">Ingresa tu nueva contraseña</p>
      </div>

      {/* Formulario */}
      <Card className="rounded-card border-line bg-surface shadow-card">
        <CardContent className="p-8">
          <Formik
            initialValues={{
              new_password: '',
              confirm_password: '',
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched }: any) => (
              <Form className="space-y-6">
                {/* Nueva contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="new_password">Nueva contraseña</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Field
                      as={Input}
                      id="new_password"
                      name="new_password"
                      type="password"
                      placeholder="••••••••"
                      className={`h-11 rounded-input pl-10 ${
                        errors.new_password && touched.new_password ? 'border-error focus-visible:ring-error' : ''
                      }`}
                    />
                  </div>
                  <ErrorMessage name="new_password" component="p" className="text-sm text-error" />
                </div>

                {/* Confirmar contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirmar nueva contraseña</Label>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Field
                      as={Input}
                      id="confirm_password"
                      name="confirm_password"
                      type="password"
                      placeholder="••••••••"
                      className={`h-11 rounded-input pl-10 ${
                        errors.confirm_password && touched.confirm_password
                          ? 'border-error focus-visible:ring-error'
                          : ''
                      }`}
                    />
                  </div>
                  <ErrorMessage name="confirm_password" component="p" className="text-sm text-error" />
                </div>

                {/* Requisitos de contraseña */}
                <div className="rounded-input border border-primaryLight bg-primaryLight/50 p-3">
                  <p className="mb-1 text-xs font-medium text-primary">La contraseña debe:</p>
                  <ul className="ml-4 list-disc space-y-1 text-xs text-primary/80">
                    <li>Tener al menos 8 caracteres</li>
                    <li>Contener letras y números</li>
                    <li>No ser una contraseña común</li>
                  </ul>
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
                      Actualizando...
                    </>
                  ) : (
                    <>
                      Restablecer contraseña
                      <ShieldCheck className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </Form>
            )}
          </Formik>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-textSecondary">
        © {new Date().getFullYear()} Geo Propiedades Ecuador. Todos los derechos reservados.
      </p>
    </div>
  );
};

export default ResetPassword;
