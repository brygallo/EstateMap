'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { toast } from 'sonner';
import { User, Mail, Lock, ShieldCheck, ArrowRight, Check } from 'lucide-react';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import AuthCard from '@/components/auth/AuthCard';
import AuthDivider from '@/components/auth/AuthDivider';
import AuthField from '@/components/auth/AuthField';
import AuthSubmit from '@/components/auth/AuthSubmit';
import { fetchWithTimeout, requestErrorMessage } from '@/lib/form-errors';
import { getPublicApiUrl } from '@/lib/api-url';

const BENEFITS = [
  'Publicar no cuesta nada y no cobramos comisión.',
  'Tu anuncio sale en el mapa con fotos, precio y ubicación.',
  'Te contactan directo por teléfono o WhatsApp.',
];

export default function RegisterPage() {
  const router = useRouter();
  const API_URL = getPublicApiUrl();

  const validationSchema = Yup.object({
    username: Yup.string().required('Campo requerido'),
    first_name: Yup.string().required('Campo requerido'),
    last_name: Yup.string().required('Campo requerido'),
    email: Yup.string().email('Correo inválido').required('Campo requerido'),
    // Mirrors the server: register runs Django's default validators through
    // validate_password (real_estate/serializers.py), whose minimum is 8.
    password: Yup.string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .required('Campo requerido'),
    confirm: Yup.string()
      .oneOf([Yup.ref('password')], 'Las contraseñas no coinciden')
      .required('Campo requerido'),
  });

  const handleSubmit = async (values: any, { setSubmitting, setErrors }: any) => {
    try {
      const res = await fetchWithTimeout(`${API_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: values.username,
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          password: values.password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const formErrors: any = {};
        let errorMessage = data.detail;
        Object.keys(data).forEach((field) => {
          const messages = Array.isArray(data[field]) ? data[field] : [data[field]];
          formErrors[field] = messages.join(' ');
        });
        if (!errorMessage) {
          errorMessage = Object.values(formErrors).join(' ');
        }
        setErrors(formErrors);
        toast.error(errorMessage || 'Error al registrar');
        setSubmitting(false);
        return;
      }

      toast.success('Registro exitoso. Por favor verifica tu correo electrónico.');
      router.push(`/verificar-correo?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      toast.error(requestErrorMessage(err, 'crear la cuenta'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      eyebrow="Crear cuenta"
      step={{ current: 1, total: 2 }}
      title="Publica tu propiedad gratis"
      description="Crea tu cuenta y tu anuncio queda visible en el mapa."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link href="/iniciar-sesion" className="font-semibold text-primary transition-colors hover:text-secondary">
            Inicia sesión
          </Link>
        </>
      }
    >
      <ul className="mb-6 space-y-2">
        {BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-start gap-2 text-sm text-textSecondary">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden />
            {benefit}
          </li>
        ))}
      </ul>

      <Formik
        initialValues={{
          username: '',
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          confirm: '',
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-4">
            <AuthField
              id="username"
              name="username"
              label="Usuario"
              type="text"
              autoComplete="username"
              placeholder="tu_usuario"
              icon={User}
            />

            <div className="grid grid-cols-2 gap-3">
              <AuthField
                id="first_name"
                name="first_name"
                label="Nombre"
                type="text"
                autoComplete="given-name"
                placeholder="Juan"
              />
              <AuthField
                id="last_name"
                name="last_name"
                label="Apellido"
                type="text"
                autoComplete="family-name"
                placeholder="Pérez"
              />
            </div>

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
              autoComplete="new-password"
              placeholder="••••••••"
              icon={Lock}
              hint="Mínimo 8 caracteres. Evita algo obvio o solo números."
            />

            <AuthField
              id="confirm"
              name="confirm"
              label="Confirmar contraseña"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              icon={ShieldCheck}
            />

            <AuthSubmit pending={isSubmitting} pendingLabel="Creando cuenta…">
              Crear cuenta
              <ArrowRight className="h-4 w-4" aria-hidden />
            </AuthSubmit>
          </Form>
        )}
      </Formik>

      <AuthDivider label="o regístrate con" />
      <GoogleSignInButton text="signup_with" />
    </AuthCard>
  );
}
