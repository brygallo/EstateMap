'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!token) {
        router.push('/iniciar-sesion');
      } else if (!user?.is_staff) {
        router.push('/');
      }
    }
  }, [token, user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-textSecondary">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!token || !user?.is_staff) {
    return null;
  }

  return <>{children}</>;
};

export default AdminRoute;
