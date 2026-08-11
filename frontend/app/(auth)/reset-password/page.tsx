'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthCard from '@/components/auth/AuthCard';
import AuthField from '@/components/auth/AuthField';
import AuthNotice from '@/components/auth/AuthNotice';
import AuthSubmit from '@/components/auth/AuthSubmit';
import { fetchWithTimeout, requestErrorMessage, responseErrorMessage } from '@/lib/form-errors';
import { getPublicApiUrl } from '@/lib/api-url';

const ResetPassword = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const API_URL = getPublicApiUrl();

  const validationSchema = z.object({
    new_password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirm_password: z.string().min(1, 'Campo requerido'),
  }).refine((values) => values.new_password === values.confirm_password, {
    message: 'Las contraseñas no coinciden', path: ['confirm_password'],
  });
  type ResetPasswordValues = z.infer<typeof validationSchema>;
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(validationSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  });

  const handleSubmit = async (
    values: ResetPasswordValues
  ) => {
    if (!token) {
      toast.error('Token de recuperación no válido');
      return;
    }

    try {
      const res = await fetchWithTimeout(`${API_URL}/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          new_password: values.new_password,
        }),
      });
      const data = await res.json().catch(() => ({})) as Record<string, unknown>;

      if (!res.ok) {
        toast.error(
          (typeof data.error === 'string' && data.error) ||
          await responseErrorMessage(res, 'No se pudo restablecer la contraseña.')
        );
        return;
      }

      toast.success(
        typeof data.message === 'string' ? data.message : 'Contraseña actualizada exitosamente'
      );
      setTimeout(() => router.push('/iniciar-sesion'), 1500);
    } catch (err) {
      toast.error(requestErrorMessage(err, 'restablecer la contraseña'));
    }
  };

  if (!token) {
    return (
      <AuthNotice
        tone="error"
        title="Este enlace ya no sirve"
        description="Los enlaces de recuperación caducan. Pide uno nuevo y te llega al correo en unos segundos."
      >
        <Button
          onClick={() => router.push('/recuperar-contrasena')}
          className="h-11 px-6 text-sm font-semibold"
        >
          Pedir un enlace nuevo
        </Button>
      </AuthNotice>
    );
  }

  return (
    <AuthCard
      eyebrow="Recuperar acceso"
      step={{ current: 2, total: 2 }}
      title="Elige una contraseña nueva"
      description="Con ella entrarás a partir de ahora."
    >
      <FormProvider {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <AuthField
              id="new_password"
              name="new_password"
              label="Nueva contraseña"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              icon={Lock}
              hint="Mínimo 8 caracteres. Evita algo obvio o solo números."
            />

            <AuthField
              id="confirm_password"
              name="confirm_password"
              label="Confirmar nueva contraseña"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              icon={ShieldCheck}
            />

            <AuthSubmit pending={form.formState.isSubmitting} pendingLabel="Guardando…">
              Guardar contraseña
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </AuthSubmit>
          </form>
      </FormProvider>
    </AuthCard>
  );
};

export default ResetPassword;
