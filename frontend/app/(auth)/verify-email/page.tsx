'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { Mail, ShieldCheck } from 'lucide-react';
import AuthCard from '@/components/auth/AuthCard';
import AuthField from '@/components/auth/AuthField';
import AuthSubmit from '@/components/auth/AuthSubmit';
import { fetchWithTimeout, requestErrorMessage } from '@/lib/form-errors';
import { getPublicApiUrl } from '@/lib/api-url';

const VerifyEmail = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resending, setResending] = useState(false);
  const API_URL = getPublicApiUrl();

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
      const res = await fetchWithTimeout(`${API_URL}/verify-email/`, {
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
      setTimeout(() => router.push('/iniciar-sesion'), 1500);
    } catch (err) {
      toast.error(requestErrorMessage(err, 'verificar el correo'));
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
      const res = await fetchWithTimeout(`${API_URL}/resend-verification/`, {
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
      toast.error(requestErrorMessage(err, 'reenviar el código'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthCard
      eyebrow="Crear cuenta"
      step={{ current: 2, total: 2 }}
      title="Verifica tu correo"
      description="Escribe el código de 6 dígitos que te enviamos."
      footer={
        <>
          ¿Ya verificaste tu cuenta?{' '}
          <Link href="/iniciar-sesion" className="font-semibold text-primary transition-colors hover:text-secondary">
            Inicia sesión
          </Link>
        </>
      }
    >
      <Formik
        initialValues={{
          email: emailFromUrl,
          code: '',
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, values }: any) => (
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
              id="code"
              name="code"
              label="Código de verificación"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              className="h-14 text-center font-geo text-2xl tracking-[0.4em]"
            />

            <AuthSubmit pending={isSubmitting} pendingLabel="Verificando…">
              Verificar correo
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </AuthSubmit>

            <div className="text-center">
              <button
                type="button"
                onClick={() => handleResend(values.email)}
                disabled={resending || !values.email}
                className="text-sm text-textSecondary underline-offset-4 transition-colors hover:text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-textSecondary disabled:hover:no-underline"
              >
                {resending ? 'Reenviando…' : 'Enviar el código otra vez'}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </AuthCard>
  );
};

export default VerifyEmail;
