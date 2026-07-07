'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Share2, Pencil, Trash2, Plus, Home, LifeBuoy, MessageCircle } from 'lucide-react';
import PrivateRoute from '@/components/PrivateRoute';
import ShareModal from '@/components/ShareModal';
import PropertyCard from '@/components/PropertyCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Property } from '@/lib/types';

const MyPropertiesPage = () => {
  const { token, logout, user } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareAllModalOpen, setShareAllModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  useEffect(() => {
    fetchMyProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchMyProperties = async () => {
    try {
      const { apiGet } = await import('@/lib/api');

      const res = await apiGet('/properties/my_properties/');

      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      } else if (res.status === 401) {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        logout();
        router.push('/iniciar-sesion');
      } else {
        toast.error('Error al cargar las propiedades');
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
      toast.error('Error al cargar las propiedades');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta propiedad?')) {
      return;
    }

    try {
      const { apiDelete } = await import('@/lib/api');

      const res = await apiDelete(`/properties/${id}/`);

      if (res.ok) {
        toast.success('Propiedad eliminada exitosamente');
        fetchMyProperties();
      } else if (res.status === 401) {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        logout();
        router.push('/iniciar-sesion');
      } else {
        toast.error('Error al eliminar la propiedad');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error de conexión');
    }
  };

  const handleShare = (propertyId: number) => {
    setSelectedPropertyId(propertyId);
    setShareModalOpen(true);
  };

  const handleShareAll = () => {
    setShareAllModalOpen(true);
  };

  const getShareUrl = () => {
    if (typeof window === 'undefined' || !selectedPropertyId) return '';
    const url = new URL(window.location.origin);
    url.searchParams.set('property', selectedPropertyId.toString());
    return url.toString();
  };

  const getShareAllUrl = () => {
    if (typeof window === 'undefined' || !user?.id) return '';
    const url = new URL(window.location.origin);
    url.searchParams.set('user', user.id.toString());
    return url.toString();
  };

  return (
    <PrivateRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-primary">Cuenta</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-textPrimary md:text-4xl">
                  Mis propiedades
                </h1>
                <p className="mt-2 text-textSecondary">Administra tus propiedades registradas.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleShareAll}
                  disabled={loading || properties.length === 0}
                  className="border-secondary/30 text-secondary hover:bg-secondary/10 hover:text-secondary"
                >
                  <Share2 className="h-4 w-4" strokeWidth={1.75} />
                  <span className="hidden md:inline">Compartir mis propiedades</span>
                  <span className="md:hidden">Compartir</span>
                  {properties.length > 0 && (
                    <span className="ml-1 rounded-full bg-secondary/15 px-2 py-0.5 text-xs font-bold text-secondary">
                      {properties.length}
                    </span>
                  )}
                </Button>
                <Button onClick={() => router.push('/publicar-propiedad')}>
                  <Plus className="h-4 w-4" strokeWidth={2} />
                  Nueva propiedad
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/3] w-full rounded-card" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-card border border-line bg-surface p-12 text-center shadow-card">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Home className="h-8 w-8" strokeWidth={1.75} />
              </div>
              <h3 className="text-xl font-semibold text-textPrimary">No tienes propiedades registradas</h3>
              <p className="mt-2 text-textSecondary">Comienza agregando tu primera propiedad.</p>
              <Button className="mt-6" onClick={() => router.push('/publicar-propiedad')}>
                <Plus className="h-4 w-4" strokeWidth={2} />
                Agregar propiedad
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <div key={property.id} className="flex flex-col gap-3">
                  <PropertyCard property={property} />
                  <div className="flex gap-2 rounded-lg border border-line bg-surface p-2 shadow-card">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-secondary hover:bg-secondary/10 hover:text-secondary"
                      onClick={() => handleShare(property.id)}
                    >
                      <Share2 className="h-4 w-4" strokeWidth={1.75} />
                      Compartir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-primary hover:bg-primary/10 hover:text-primary"
                      onClick={() => router.push(`/editar-propiedad/${property.id}`)}
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-error hover:bg-error/10 hover:text-error"
                      onClick={() => handleDelete(property.id)}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Support */}
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 rounded-card border border-primary/15 bg-primary/5 p-6 shadow-card md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LifeBuoy className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-base font-semibold text-textPrimary sm:text-lg">¿Problemas técnicos o dudas?</p>
                <p className="mt-1 text-sm text-textSecondary">
                  Escríbenos y te ayudamos a publicar o gestionar tus propiedades rápidamente.
                </p>
              </div>
            </div>
            <Button asChild className="w-full md:w-auto">
              <a
                href="https://wa.me/593983738151?text=Hola%20necesito%20ayuda%20con%20mis%20propiedades"
                target="_blank"
                rel="noreferrer"
              >
                Chatear por WhatsApp
                <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
              </a>
            </Button>
          </div>
        </div>

        {/* Share Modal - Individual Property */}
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          shareUrl={getShareUrl()}
          title="Compartir Propiedad"
        />

        {/* Share Modal - All Properties */}
        <ShareModal
          isOpen={shareAllModalOpen}
          onClose={() => setShareAllModalOpen(false)}
          shareUrl={getShareAllUrl()}
          title="Compartir Solo Mis Propiedades"
        />
      </div>
    </PrivateRoute>
  );
};

export default MyPropertiesPage;
