'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuth } from '@/lib/auth-context';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

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
      router.push('/login');
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
          router.push('/login');
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Cuenta</p>
            <h1 className="text-3xl font-bold text-gray-900">Tu perfil</h1>
            <p className="text-gray-600 text-sm mt-1">Administra tus datos, correo y contraseña.</p>
          </div>
        </header>

        {/* Profile data */}
        <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Datos de la cuenta</h2>
              <p className="text-sm text-gray-500">Nombre, usuario y visibilidad del correo.</p>
            </div>
            <button
              onClick={handleProfileSave}
              disabled={savingProfile || loadingProfile || !profile}
              className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingProfile ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>

          {loadingProfile ? (
            <p className="text-sm text-gray-500">Cargando perfil...</p>
          ) : profile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Nombre</label>
                <input
                  type="text"
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  placeholder="Nombre"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Apellido</label>
                <input
                  type="text"
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  placeholder="Apellido"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Usuario</label>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  placeholder="Nombre de usuario"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 flex items-center justify-between">
                  <span>Correo</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${profile.is_email_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {profile.is_email_verified ? 'Verificado' : 'Sin verificar'}
                  </span>
                </label>
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-red-600">No se pudo cargar tu perfil.</p>
          )}
        </section>

        {/* Email change */}
        <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cambiar correo</h2>
              <p className="text-sm text-gray-500">Enviaremos un código al nuevo correo para confirmarlo.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-gray-600">Nuevo correo</label>
              <input
                type="email"
                value={emailForm.newEmail}
                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                placeholder="nuevo@email.com"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRequestEmailChange}
                className="w-full px-4 py-2 rounded-lg bg-secondary text-white font-semibold hover:bg-secondary/90"
              >
                Enviar código
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-gray-600">Código de verificación</label>
              <input
                type="text"
                value={emailForm.code}
                onChange={(e) => setEmailForm({ ...emailForm, code: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                placeholder="123456"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleVerifyEmailChange}
                disabled={!emailCodeSent}
                className="w-full px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verificar y actualizar
              </button>
            </div>
          </div>
          {!emailCodeSent && <p className="text-xs text-gray-500 mt-2">Primero envía el código al nuevo correo.</p>}
        </section>

        {/* Password change */}
        <section className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cambiar contraseña</h2>
              <p className="text-sm text-gray-500">Usa tu contraseña actual y define una nueva.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Contraseña actual</label>
              <input
                type="password"
                value={passwordForm.old}
                onChange={(e) => setPasswordForm({ ...passwordForm, old: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Nueva contraseña</label>
              <input
                type="password"
                value={passwordForm.fresh}
                onChange={(e) => setPasswordForm({ ...passwordForm, fresh: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">Repetir nueva</label>
              <input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handlePasswordChange}
              disabled={changingPassword}
              className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {changingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AccountPage;
