'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { KeyRound, Mail, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const ForgotPassword = () => {
  const [emailSent, setEmailSent] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  const validationSchema = Yup.object({
    email: Yup.string().email('Correo inválido').required('Campo requerido'),
  });

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      const res = await fetch(`${API_URL}/request-password-reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Error al enviar el correo');
        return;
      }

      setEmailSent(true);
      toast.success(data.message || 'Correo enviado exitosamente');
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="space-y-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-9 w-9 text-success" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="mb-4 text-3xl font-bold text-textPrimary">Revisa tu correo</h1>
          <p className="text-textSecondary">
            Te hemos enviado un enlace para restablecer tu contraseña. Por favor, revisa tu bandeja de entrada y sigue
            las instrucciones.
          </p>
        </div>
        <Button asChild className="h-11 rounded-button bg-primary px-6 font-semibold text-primary-foreground shadow-card hover:bg-primaryHover">
          <Link href="/iniciar-sesion">Volver al inicio de sesión</Link>
        </Button>

        <p className="text-sm text-textSecondary">
          © {new Date().getFullYear()} Geo Propiedades Ecuador. Todos los derechos reservados.
        </p>
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
        <h1 className="text-3xl font-bold text-textPrimary">¿Olvidaste tu contraseña?</h1>
        <p className="mt-2 text-sm text-textSecondary">
          No te preocupes, te enviaremos instrucciones para restablecerla
        </p>
      </div>

      {/* Formulario */}
      <Card className="rounded-card border-line bg-surface shadow-card">
        <CardContent className="p-8">
          <Formik
            initialValues={{ email: '' }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched }: any) => (
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

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-button bg-primary text-base font-semibold text-primary-foreground shadow-card transition-transform hover:bg-primaryHover active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar enlace de recuperación
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </Form>
            )}
          </Formik>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <Link href="/iniciar-sesion" className="text-sm font-medium text-primary transition-colors hover:text-secondary">
              ← Volver al inicio de sesión
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-textSecondary">
        © {new Date().getFullYear()} Geo Propiedades Ecuador. Todos los derechos reservados.
      </p>
    </div>
  );
};

export default ForgotPassword;
