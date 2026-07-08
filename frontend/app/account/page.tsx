'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KeyRound, Mail, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Profile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
}

const AccountPage = () => {
  const { token, logout } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: '', fresh: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [emailForm, setEmailForm] = useState({ newEmail: '', code: '' });
  const [emailCodeSent, setEmailCodeSent] = useState(false);

  // Redirect unauthenticated users
  useEffect(() => {
    if (token === null) {
      router.push('/iniciar-sesion');
    }
  }, [token, router]);

  // Load current profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      try {
        const res = await apiGet('/me/');
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        } else if (res.status === 401) {
          logout();
          router.push('/iniciar-sesion');
        } else {
          toast.error('No se pudo cargar tu perfil');
        }
      } catch (error) {
        console.error('Error cargando perfil:', error);
        toast.error('Error de conexión al cargar perfil');
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfile();
  }, [token, logout, router]);

  const handleProfileSave = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      const res = await apiPatch('/me/', {
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name,
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        toast.success('Perfil actualizado');
      } else {
        const data = await res.json().catch(() => ({}));
        const errorMessage = data.detail || data.username?.[0] || 'No se pudo actualizar el perfil';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error guardando perfil:', error);
      toast.error('Error de conexión al guardar');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.old || !passwordForm.fresh) {
      toast.error('Completa todos los campos de contraseña');
      return;
    }
    if (passwordForm.fresh !== passwordForm.confirm) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await apiPost('/change-password/', {
        old_password: passwordForm.old,
        new_password: passwordForm.fresh,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Contraseña actualizada');
        setPasswordForm({ old: '', fresh: '', confirm: '' });
      } else {
        const errorMessage =
          data.old_password?.[0] ||
          data.new_password?.[0] ||
          data.detail ||
          data.error ||
          'No se pudo cambiar la contraseña';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      toast.error('Error de conexión al cambiar contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestEmailChange = async () => {
    if (!emailForm.newEmail) {
      toast.error('Ingresa el nuevo correo');
      return;
    }
    try {
      const res = await apiPost('/request-email-change/', { new_email: emailForm.newEmail });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || 'Código enviado a tu nuevo correo');
        setEmailCodeSent(true);
      } else {
        const errorMessage = data.new_email?.[0] || data.error || data.detail || 'No se pudo enviar el código';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error solicitando cambio de email:', error);
      toast.error('Error de conexión al solicitar cambio de email');
    }
  };

  const handleVerifyEmailChange = async () => {
    if (!emailForm.code) {
      toast.error('Ingresa el código enviado a tu nuevo correo');
      return;
    }
    try {
      const res = await apiPost('/verify-email-change/', { code: emailForm.code });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || 'Correo actualizado');
        setEmailForm({ newEmail: '', code: '' });
        setEmailCodeSent(false);
        setProfile((prev) => (prev ? { ...prev, email: data.new_email || prev.email, is_email_verified: true } : prev));
      } else {
        const errorMessage = data.error || data.detail || 'No se pudo verificar el código';
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error verificando cambio de email:', error);
      toast.error('Error de conexión al verificar código');
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 md:py-16">
        <header>
          <p className="text-sm font-semibold text-primary">Cuenta</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-textPrimary md:text-4xl">Tu perfil</h1>
          <p className="mt-2 text-textSecondary">Administra tus datos, correo y contraseña.</p>
        </header>

        {/* Profile data */}
        <Card className="rounded-card border-line shadow-card">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <CardTitle className="text-lg">Datos de la cuenta</CardTitle>
                <CardDescription>Nombre, usuario y visibilidad del correo.</CardDescription>
              </div>
            </div>
            <Button onClick={handleProfileSave} disabled={savingProfile || loadingProfile || !profile}>
              {savingProfile ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </CardHeader>
          <CardContent>
            {loadingProfile ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : profile ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name">Nombre</Label>
                  <Input
                    id="first_name"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    placeholder="Nombre"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name">Apellido</Label>
                  <Input
                    id="last_name"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    placeholder="Apellido"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="username">Usuario</Label>
                  <Input
                    id="username"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    placeholder="Nombre de usuario"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email">Correo</Label>
                    <Badge
                      variant={profile.is_email_verified ? 'default' : 'secondary'}
                      className={
                        profile.is_email_verified
                          ? 'bg-successBg text-success hover:bg-successBg'
                          : 'bg-warning/10 text-warning hover:bg-warning/10'
                      }
                    >
                      {profile.is_email_verified ? 'Verificado' : 'Sin verificar'}
                    </Badge>
                  </div>
                  <Input id="email" type="email" value={profile.email} readOnly className="bg-muted text-muted-foreground" />
                </div>
              </div>
            ) : (
              <p className="text-sm text-error">No se pudo cargar tu perfil.</p>
            )}
          </CardContent>
        </Card>

        {/* Email change */}
        <Card className="rounded-card border-line shadow-card">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <Mail className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <CardTitle className="text-lg">Cambiar correo</CardTitle>
              <CardDescription>Enviaremos un código al nuevo correo para confirmarlo.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="newEmail">Nuevo correo</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={emailForm.newEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                  placeholder="nuevo@email.com"
                />
              </div>
              <div className="flex items-end">
                <Button variant="secondary" onClick={handleRequestEmailChange} className="w-full">
                  Enviar código
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="emailCode">Código de verificación</Label>
                <Input
                  id="emailCode"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={emailForm.code}
                  onChange={(e) => setEmailForm({ ...emailForm, code: e.target.value })}
                  placeholder="123456"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleVerifyEmailChange} disabled={!emailCodeSent} className="w-full">
                  Verificar y actualizar
                </Button>
              </div>
            </div>
            {!emailCodeSent && <p className="text-xs text-textSecondary">Primero envía el código al nuevo correo.</p>}
          </CardContent>
        </Card>

        {/* Password change */}
        <Card className="rounded-card border-line shadow-card">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <CardTitle className="text-lg">Cambiar contraseña</CardTitle>
              <CardDescription>Usa tu contraseña actual y define una nueva.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="oldPassword">Contraseña actual</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  value={passwordForm.old}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.fresh}
                  onChange={(e) => setPasswordForm({ ...passwordForm, fresh: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Repetir nueva</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={handlePasswordChange} disabled={changingPassword}>
              {changingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AccountPage;
