'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { User, Mail, Lock, ShieldCheck, ArrowRight, Check } from 'lucide-react';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import AuthCard from '@/components/auth/AuthCard';
import AuthDivider from '@/components/auth/AuthDivider';
import AuthField from '@/components/auth/AuthField';
import AuthSubmit from '@/components/auth/AuthSubmit';
import { fetchWithTimeout, requestErrorMessage, responseErrorMessage } from '@/lib/form-errors';
import { getPublicApiUrl } from '@/lib/api-url';

const BENEFITS = [
  'Publicar no cuesta nada y no cobramos comisión.',
  'Tu anuncio sale en el mapa con fotos, precio y ubicación.',
  'Te contactan directo por teléfono o WhatsApp.',
];

type RegisterValues = {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm: string;
};

function fieldMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').join(' ');
  return '';
}

export default function RegisterPage() {
  const router = useRouter();
  const API_URL = getPublicApiUrl();

  const validationSchema = z.object({
    username: z.string().min(1, 'Campo requerido'),
    first_name: z.string().min(1, 'Campo requerido'),
    last_name: z.string().min(1, 'Campo requerido'),
    email: z.email('Correo inválido'),
    // Mirrors the server: register runs Django's default validators through
    // validate_password (real_estate/serializers.py), whose minimum is 8.
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirm: z.string().min(1, 'Campo requerido'),
  }).refine((values) => values.password === values.confirm, {
    message: 'Las contraseñas no coinciden', path: ['confirm'],
  });
  const form = useForm<RegisterValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: { username: '', first_name: '', last_name: '', email: '', password: '', confirm: '' },
  });

  const handleSubmit = async (
    values: RegisterValues
  ) => {
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
      const data = await res.json().catch(() => ({})) as Record<string, unknown>;
      if (!res.ok) {
        const formErrors: Partial<Record<keyof RegisterValues, string>> = {};
        let errorMessage = fieldMessage(data.detail);
        for (const [field, value] of Object.entries(data)) {
          if (field in values) formErrors[field as keyof RegisterValues] = fieldMessage(value);
        }
        if (!errorMessage) {
          errorMessage = Object.values(formErrors).filter(Boolean).join(' ');
        }
        for (const [field, message] of Object.entries(formErrors)) {
          if (message) form.setError(field as keyof RegisterValues, { message });
        }
        toast.error(errorMessage || await responseErrorMessage(res, 'Error al registrar'));
        return;
      }

      toast.success('Registro exitoso. Por favor verifica tu correo electrónico.');
      router.push(`/verificar-correo?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      toast.error(requestErrorMessage(err, 'crear la cuenta'));
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

      <FormProvider {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
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

            <AuthSubmit pending={form.formState.isSubmitting} pendingLabel="Creando cuenta…">
              Crear cuenta
              <ArrowRight className="h-4 w-4" aria-hidden />
            </AuthSubmit>
          </form>
      </FormProvider>

      <AuthDivider label="o regístrate con" />
      <GoogleSignInButton text="signup_with" />
    </AuthCard>
  );
}
