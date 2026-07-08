'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { buildWhatsAppUrl } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  BarChart3,
  Eye,
  Home,
  Inbox,
  LifeBuoy,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Trash2,
} from 'lucide-react';
import PrivateRoute from '@/components/PrivateRoute';
import ShareModal from '@/components/ShareModal';
import PropertyCard from '@/components/PropertyCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { Property } from '@/lib/types';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'for_sale' | 'for_rent' | 'inactive';
type SortMode = 'recent' | 'views' | 'price_desc' | 'price_asc';

interface Lead {
  id: number;
  property: number;
  property_title?: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  status: string;
  created_at: string;
}

const filterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'for_sale', label: 'Venta' },
  { value: 'for_rent', label: 'Alquiler' },
  { value: 'inactive', label: 'Inactivas' },
];

const statusLabels: Record<string, string> = {
  for_sale: 'En venta',
  for_rent: 'En alquiler',
  inactive: 'Inactiva',
};

const leadStatusLabels: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  closed: 'Cerrado',
  archived: 'Archivado',
};

const getNumericValue = (value: number | string | null | undefined) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
};

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat('es-EC', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const formatDate = (value?: string) => {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short' }).format(new Date(value));
};

const MyPropertiesPage = () => {
  const { token, logout, user } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareAllModalOpen, setShareAllModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  useEffect(() => {
    fetchMyProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchMyProperties = async () => {
    if (!token) return;
    setLoading(true);
    setError(false);

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
        setError(true);
        toast.error('Error al cargar las propiedades');
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError(true);
      toast.error('Error al cargar las propiedades');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeads = async () => {
    setLoadingLeads(true);

    try {
      const { apiGet } = await import('@/lib/api');
      const res = await apiGet('/leads/');

      if (res.ok) {
        const data = await res.json();
        setLeads(Array.isArray(data) ? data : data.results ?? []);
      } else if (res.status !== 401) {
        setLeads([]);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      setLeads([]);
    } finally {
      setLoadingLeads(false);
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

  const metrics = useMemo(() => {
    const active = properties.filter((property) => property.status !== 'inactive').length;
    const forSale = properties.filter((property) => property.status === 'for_sale').length;
    const forRent = properties.filter((property) => property.status === 'for_rent').length;
    const inactive = properties.filter((property) => property.status === 'inactive').length;
    const views = properties.reduce((total, property) => total + (property.views_count ?? 0), 0);
    const newLeads = leads.filter((lead) => lead.status === 'new').length;

    return {
      total: properties.length,
      active,
      forSale,
      forRent,
      inactive,
      views,
      newLeads,
      totalLeads: leads.length,
    };
  }, [properties, leads]);

  const filteredProperties = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...properties]
      .filter((property) => {
        const matchesStatus = statusFilter === 'all' || property.status === statusFilter;
        const searchable = [
          property.title,
          property.address,
          property.city,
          property.province,
          property.source_agency,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (sortMode === 'views') return (b.views_count ?? 0) - (a.views_count ?? 0);
        if (sortMode === 'price_desc') return getNumericValue(b.price) - getNumericValue(a.price);
        if (sortMode === 'price_asc') return getNumericValue(a.price) - getNumericValue(b.price);
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });
  }, [properties, query, sortMode, statusFilter]);

  const recentLeads = useMemo(() => leads.slice(0, 4), [leads]);

  const leadsByProperty = useMemo(() => {
    return leads.reduce<Record<number, { count: number; latest: Lead }>>((acc, lead) => {
      const current = acc[lead.property];
      if (!current) {
        acc[lead.property] = { count: 1, latest: lead };
        return acc;
      }

      current.count += 1;
      if (new Date(lead.created_at).getTime() > new Date(current.latest.created_at).getTime()) {
        current.latest = lead;
      }
      return acc;
    }, {});
  }, [leads]);

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
          ) : error ? (
            <div className="rounded-card border border-line bg-surface p-10 text-center shadow-card">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
                <RefreshCw className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <h3 className="text-xl font-semibold text-textPrimary">No se pudo cargar tu panel</h3>
              <p className="mt-2 text-textSecondary">Revisa tu conexión e intenta nuevamente.</p>
              <Button className="mt-6" onClick={fetchMyProperties}>
                Reintentar
              </Button>
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
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[
                  { label: 'Publicadas', value: metrics.total, icon: Home },
                  { label: 'Activas', value: metrics.active, icon: BarChart3 },
                  { label: 'En venta', value: metrics.forSale, icon: Home },
                  { label: 'Vistas', value: formatCompactNumber(metrics.views), icon: Eye },
                  { label: 'Leads nuevos', value: metrics.newLeads, icon: Inbox },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-card border border-line bg-surface p-4 shadow-card">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-textSecondary">{item.label}</p>
                        <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                      </div>
                      <p className="mt-2 text-2xl font-bold text-textPrimary">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-5">
                  <div className="rounded-card border border-line bg-surface p-4 shadow-card">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="relative xl:w-80">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
                        <Input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Buscar por título, ciudad o dirección"
                          className="pl-9"
                        />
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex flex-wrap gap-2">
                          {filterOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setStatusFilter(option.value)}
                              className={cn(
                                'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                                statusFilter === option.value
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-line bg-background text-textSecondary hover:border-primary/40 hover:text-primary'
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                        <select
                          value={sortMode}
                          onChange={(event) => setSortMode(event.target.value as SortMode)}
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm text-textPrimary"
                        >
                          <option value="recent">Más recientes</option>
                          <option value="views">Más vistas</option>
                          <option value="price_desc">Mayor precio</option>
                          <option value="price_asc">Menor precio</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {filteredProperties.length === 0 ? (
                    <div className="rounded-card border border-line bg-surface p-10 text-center shadow-card">
                      <h3 className="text-lg font-semibold text-textPrimary">No hay resultados con estos filtros</h3>
                      <p className="mt-2 text-textSecondary">Limpia la búsqueda o cambia el estado seleccionado.</p>
                      <Button
                        variant="outline"
                        className="mt-5"
                        onClick={() => {
                          setQuery('');
                          setStatusFilter('all');
                        }}
                      >
                        Ver todas
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {filteredProperties.map((property) => (
                        <div key={property.id} className="flex flex-col gap-3">
                          <PropertyCard property={property} />
                          {leadsByProperty[property.id] && (
                            <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-textPrimary">
                                    {leadsByProperty[property.id].count}{' '}
                                    {leadsByProperty[property.id].count === 1 ? 'contacto' : 'contactos'}
                                  </p>
                                  <p className="truncate text-xs text-textSecondary">
                                    Último: {leadsByProperty[property.id].latest.name} ·{' '}
                                    {formatDate(leadsByProperty[property.id].latest.created_at)}
                                  </p>
                                </div>
                                <a
                                  className="shrink-0 text-sm font-medium text-primary hover:underline"
                                  href={`tel:${leadsByProperty[property.id].latest.phone}`}
                                >
                                  Llamar
                                </a>
                              </div>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface p-2 shadow-card">
                            <Badge variant="outline" className="bg-background">
                              {statusLabels[property.status] ?? property.status}
                            </Badge>
                            <div className="flex flex-1 justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-secondary hover:bg-secondary/10 hover:text-secondary"
                                onClick={() => handleShare(property.id)}
                              >
                                <Share2 className="h-4 w-4" strokeWidth={1.75} />
                                Compartir
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:bg-primary/10 hover:text-primary"
                                onClick={() => router.push(`/editar-propiedad/${property.id}`)}
                              >
                                <Pencil className="h-4 w-4" strokeWidth={1.75} />
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-error hover:bg-error/10 hover:text-error"
                                onClick={() => handleDelete(property.id)}
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <aside className="space-y-4">
                  <div className="rounded-card border border-line bg-surface p-5 shadow-card">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-textPrimary">Contactos recientes</h2>
                        <p className="text-sm text-textSecondary">{metrics.totalLeads} contactos recibidos</p>
                      </div>
                      <Inbox className="h-5 w-5 text-primary" strokeWidth={1.75} />
                    </div>

                    <div className="mt-4 space-y-3">
                      {loadingLeads ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <div key={index} className="space-y-2 rounded-lg border border-line p-3">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-3 w-3/4" />
                          </div>
                        ))
                      ) : recentLeads.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-line p-4 text-sm text-textSecondary">
                          Aún no hay contactos para tus propiedades.
                        </div>
                      ) : (
                        recentLeads.map((lead) => (
                          <div key={lead.id} className="rounded-lg border border-line bg-background p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-textPrimary">{lead.name}</p>
                                <p className="truncate text-sm text-textSecondary">
                                  {lead.property_title || `Propiedad #${lead.property}`}
                                </p>
                              </div>
                              <Badge
                                variant={lead.status === 'new' ? 'default' : 'secondary'}
                                className="shrink-0"
                              >
                                {leadStatusLabels[lead.status] ?? lead.status}
                              </Badge>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-textMuted">
                              <span>{formatDate(lead.created_at)}</span>
                              <a className="font-medium text-primary hover:underline" href={`tel:${lead.phone}`}>
                                Llamar
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-card border border-primary/15 bg-primary/5 p-5 shadow-card">
                    <h2 className="text-base font-semibold text-textPrimary">Siguiente mejora recomendada</h2>
                    <p className="mt-2 text-sm text-textSecondary">
                      Convertir estos contactos en una bandeja completa: estados, notas, recordatorios y WhatsApp directo.
                    </p>
                  </div>
                </aside>
              </div>
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
                href={buildWhatsAppUrl('Hola necesito ayuda con mis propiedades')}
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
