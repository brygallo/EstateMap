'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthCard from '@/components/auth/AuthCard';
import AuthField from '@/components/auth/AuthField';
import AuthNotice from '@/components/auth/AuthNotice';
import AuthSubmit from '@/components/auth/AuthSubmit';
import { fetchWithTimeout, requestErrorMessage, responseErrorMessage } from '@/lib/form-errors';
import { getPublicApiUrl } from '@/lib/api-url';

const ForgotPassword = () => {
  const [emailSent, setEmailSent] = useState(false);
  const API_URL = getPublicApiUrl();

  const validationSchema = Yup.object({
    email: Yup.string().email('Correo inválido').required('Campo requerido'),
  });

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/request-password-reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error || await responseErrorMessage(res, 'No se pudo enviar el correo.'));
        return;
      }

      setEmailSent(true);
      toast.success(data.message || 'Correo enviado exitosamente');
    } catch (err) {
      toast.error(requestErrorMessage(err, 'solicitar la recuperación de contraseña'));
    } finally {
      setSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <AuthNotice
        tone="success"
        title="Revisa tu correo"
        description="Te enviamos un enlace para elegir una contraseña nueva. Si no aparece en unos minutos, mira en la carpeta de spam."
      >
        <Button asChild className="h-11 px-6 text-sm font-semibold">
          <Link href="/iniciar-sesion">Volver al inicio de sesión</Link>
        </Button>
      </AuthNotice>
    );
  }

  return (
    <AuthCard
      eyebrow="Recuperar acceso"
      step={{ current: 1, total: 2 }}
      title="Recupera tu contraseña"
      description="Te enviamos un enlace al correo de tu cuenta."
      footer={
        <Link
          href="/iniciar-sesion"
          className="inline-flex items-center gap-1.5 font-medium text-primary transition-colors hover:text-secondary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al inicio de sesión
        </Link>
      }
    >
      <Formik
        initialValues={{ email: '' }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }: any) => (
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

            <AuthSubmit pending={isSubmitting} pendingLabel="Enviando…">
              Enviar enlace
              <ArrowRight className="h-4 w-4" aria-hidden />
            </AuthSubmit>
          </Form>
        )}
      </Formik>
    </AuthCard>
  );
};

export default ForgotPassword;
