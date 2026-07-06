'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { MailCheck, Mail, KeyRound, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

const VerifyEmail = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resending, setResending] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  // Obtener email de la URL si existe
  const emailFromUrl = searchParams.get('email') || '';

  const validationSchema = Yup.object({
    email: Yup.string().email('Correo inválido').required('Campo requerido'),
    code: Yup.string()
      .required('Campo requerido')
      .length(6, 'El código debe tener 6 dígitos')
      .matches(/^\d+$/, 'El código solo debe contener números'),
  });

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      const res = await fetch(`${API_URL}/verify-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Error al verificar el código');
        return;
      }

      toast.success(data.message || 'Correo verificado exitosamente');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (email: string) => {
    if (!email) {
      toast.error('Por favor ingresa tu correo electrónico');
      return;
    }

    setResending(true);
    try {
      const res = await fetch(`${API_URL}/resend-verification/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || 'Error al reenviar el código');
        return;
      }

      toast.success(data.message || 'Código reenviado exitosamente');
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Logo y título */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-primary shadow-card">
          <MailCheck className="h-8 w-8 text-primary-foreground" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl font-bold text-textPrimary">Verifica tu correo</h1>
        <p className="mt-2 text-sm text-textSecondary">
          Ingresa el código de 6 dígitos que te enviamos por correo
        </p>
      </div>

      {/* Formulario */}
      <Card className="rounded-card border-line bg-surface shadow-card">
        <CardContent className="p-8">
          <Formik
            initialValues={{
              email: emailFromUrl,
              code: '',
            }}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, errors, touched, values }: any) => (
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

                {/* Código de verificación */}
                <div className="space-y-2">
                  <Label htmlFor="code">Código de verificación</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Field
                      as={Input}
                      id="code"
                      name="code"
                      type="text"
                      placeholder="123456"
                      maxLength={6}
                      className={`h-12 rounded-input pl-10 text-center font-geo text-2xl tracking-widest ${
                        errors.code && touched.code ? 'border-error focus-visible:ring-error' : ''
                      }`}
                    />
                  </div>
                  <ErrorMessage name="code" component="p" className="text-sm text-error" />
                </div>

                {/* Botón reenviar código */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => handleResend(values.email)}
                    disabled={resending || !values.email}
                    className="text-sm font-medium text-primary transition-colors hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resending ? 'Reenviando...' : '¿No recibiste el código? Reenviar'}
                  </button>
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
                      Verificando...
                    </>
                  ) : (
                    <>
                      Verificar correo
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

export default VerifyEmail;
