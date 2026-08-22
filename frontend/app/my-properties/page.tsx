'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { sameIdentifier } from '@/lib/identifiers';
import { buildWhatsAppUrl } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { requestErrorMessage, responseErrorMessage } from '@/lib/form-errors';
import {
  Archive,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Home,
  KeyRound,
  LifeBuoy,
  Megaphone,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  Trash2,
} from 'lucide-react';
import PrivateRoute from '@/components/PrivateRoute';
import ShareModal from '@/components/ShareModal';
import PullToRefresh from '@/components/ui/PullToRefresh';
import PropertyCard from '@/components/PropertyCard';
import ClaimableProperties from '@/components/ClaimableProperties';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import PropertyImage from '@/components/ui/PropertyImage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Property } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  formatArea,
  formatDate,
  formatPrice,
  getClosedReason,
  getClosureLabel,
  getListingStatusLabel,
  getPropertyTypeLabel,
  getStatusLabel,
  isClosedListing,
  isSuccessfulClosure,
  type ClosedReason,
} from '@/lib/property-labels';

type StatusFilter = 'all' | 'for_sale' | 'for_rent' | 'inactive';
type SortMode = 'recent' | 'views' | 'price_desc' | 'price_asc';
type OriginFilter = 'all' | 'users' | 'imported';

/** Counters the server computes over the whole inventory, not over the page. */
interface InventoryStats {
  total: number;
  active: number;
  for_sale: number;
  for_rent: number;
  inactive: number;
  views: number;
}

interface InventoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Property[];
  stats: InventoryStats;
  scope: 'own' | 'catalog';
}

const emptyStats: InventoryStats = {
  total: 0,
  active: 0,
  for_sale: 0,
  for_rent: 0,
  inactive: 0,
  views: 0,
};

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

// Only offered to staff: an ordinary account never owns imported listings.
const originOptions: Array<{ value: OriginFilter; label: string }> = [
  { value: 'all', label: 'Todo el origen' },
  { value: 'users', label: 'Publicadas por usuarios' },
  { value: 'imported', label: 'Importadas' },
];

// Closing a listing is a PATCH of `closed_reason` and nothing else: the server
// forces `status='inactive'` and stamps `closed_at`. There is no "sold" status.
const closureOptions: Array<{ value: ClosedReason; label: string; hint: string }> = [
  { value: 'sold', label: 'Se vendió', hint: 'La propiedad ya cambió de dueño.' },
  { value: 'rented', label: 'Se arrendó', hint: 'La propiedad ya está arrendada.' },
  { value: 'withdrawn', label: 'La retiro', hint: 'Ya no quiero publicarla; no hubo venta ni arriendo.' },
];

// Reopening is the reverse move: writing an operation back onto `status` is what
// clears the closure server-side. Sending `closed_reason: ''` on its own would
// leave the listing inactive and therefore still out of the catalogue.
const reopenOptions: Array<'for_sale' | 'for_rent'> = ['for_sale', 'for_rent'];

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat('es-EC', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

// Short date for lead rows; falls back when the API sends no timestamp.
const formatLeadDate = (value?: string) =>
  formatDate(value, { day: '2-digit', month: 'short' }) || 'Sin fecha';

const MyPropertiesPage = () => {
  const { token, logout, user } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<InventoryStats>(emptyStats);
  const [scope, setScope] = useState<'own' | 'catalog'>('own');
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareAllModalOpen, setShareAllModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [actionProperty, setActionProperty] = useState<Property | null>(null);
  // Listing whose closure is being decided, and in which direction.
  const [closureProperty, setClosureProperty] = useState<Property | null>(null);
  const [closureMode, setClosureMode] = useState<'close' | 'reopen'>('close');
  const [savingClosure, setSavingClosure] = useState(false);

  const isAdminScope = scope === 'catalog';
  const hasFilters = Boolean(search) || statusFilter !== 'all' || originFilter !== 'all';

  // Typing filters server-side now, so wait for the pause before asking.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search, statusFilter, originFilter, sortMode]);

  useEffect(() => {
    if (!token) return;
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const buildInventoryQuery = (page: number) => {
    const params = new URLSearchParams({ page: String(page), ordering: sortMode });
    if (search) params.set('search', search);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (originFilter !== 'all') params.set('origin', originFilter);
    return params.toString();
  };

  // `page` 1 replaces the list; any other page appends, so "Cargar más" keeps
  // what is already on screen instead of jumping the reader back to the top.
  // `silent` refreshes the list and the counters without flashing the skeletons,
  // for the case where the reader is looking at the row that just changed.
  const fetchInventory = async (page = 1, { silent = false } = {}) => {
    if (!token) return;
    if (page === 1) {
      if (!silent) setLoading(true);
      setError(false);
    } else {
      setLoadingMore(true);
    }

    try {
      const { apiGet } = await import('@/lib/api');

      const res = await apiGet(`/properties/my_properties/?${buildInventoryQuery(page)}`);

      if (res.ok) {
        const data: InventoryResponse = await res.json();
        const results = data.results ?? [];
        setProperties((current) => (page === 1 ? results : [...current, ...results]));
        setStats(data.stats ?? emptyStats);
        setScope(data.scope ?? 'own');
        setNextPage(data.next ? page + 1 : null);
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
      setLoadingMore(false);
    }
  };

  const fetchLeads = async () => {
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
        fetchInventory();
      } else if (res.status === 401) {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        logout();
        router.push('/iniciar-sesion');
      } else {
        toast.error(await responseErrorMessage(res, 'No se pudo eliminar la propiedad.'));
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error(requestErrorMessage(err, 'eliminar la propiedad'));
    }
  };

  /**
   * Write the closure of a listing, or undo it.
   *
   * Closing sends `closed_reason` alone — the server is what forces the listing
   * out of the catalogue and stamps the date. Reopening sends the operation on
   * `status`, which is what clears the closure; `closed_reason: ''` on its own
   * would leave it inactive and just as invisible.
   */
  const applyClosure = async (property: Property, payload: Record<string, string>) => {
    setSavingClosure(true);
    try {
      const { apiPatch } = await import('@/lib/api');
      const res = await apiPatch(`/properties/${property.id}/`, payload);

      if (res.ok) {
        const updated: Property = await res.json();
        setProperties((current) =>
          current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
        );
        setActionProperty((current) =>
          current && current.id === updated.id ? { ...current, ...updated } : current
        );
        toast.success(
          isClosedListing(updated)
            ? `Anuncio marcado como ${getClosureLabel(updated).toLowerCase()}.`
            : 'Anuncio publicado de nuevo.'
        );
        setClosureProperty(null);
        // The counters and the active filter are decided by the server.
        fetchInventory(1, { silent: true });
      } else if (res.status === 401) {
        toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        logout();
        router.push('/iniciar-sesion');
      } else {
        toast.error(await responseErrorMessage(res, 'No se pudo actualizar el anuncio.'));
      }
    } catch (err) {
      console.error('Error updating listing closure:', err);
      toast.error(requestErrorMessage(err, 'actualizar el anuncio'));
    } finally {
      setSavingClosure(false);
    }
  };

  const openClosureDialog = (property: Property, mode: 'close' | 'reopen') => {
    setClosureMode(mode);
    setClosureProperty(property);
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

  // The counters come from the server, which sees the whole inventory.
  const metrics = stats;

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
      {/* The list goes stale as soon as you publish or edit from another tab,
          and on a phone the reflex for that is to pull down, not to hunt for a
          reload button. */}
      <PullToRefresh
        onRefresh={async () => {
          await Promise.all([fetchInventory(), fetchLeads()]);
        }}
        disabled={loading}
      >
      <div className="min-h-[calc(100dvh-var(--app-header-height))] bg-background">
        {/* Header */}
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-primary">{isAdminScope ? 'Administración' : 'Cuenta'}</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-textPrimary md:text-4xl">
                  {isAdminScope ? 'Todas las propiedades' : 'Mis propiedades'}
                </h1>
                <p className="mt-2 text-textSecondary">
                  {isAdminScope
                    ? 'Ves el catálogo completo: propias, de otras cuentas e importadas.'
                    : 'Administra tus propiedades registradas.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleShareAll}
                  disabled={loading || metrics.total === 0}
                  className="border-secondary/30 text-secondary hover:bg-secondary/10 hover:text-secondary"
                >
                  <Share2 className="h-4 w-4" strokeWidth={1.75} />
                  <span className="hidden md:inline">Compartir mis propiedades</span>
                  <span className="md:hidden">Compartir</span>
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
          {/* Above the inventory on purpose: an advertiser whose listings we
              imported arrives here to find out what is already theirs, and
              that answer cannot be below a list that starts empty. Renders
              nothing at all for the accounts it does not apply to. */}
          {!isAdminScope && <ClaimableProperties onClaimed={() => void fetchInventory()} />}
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
              <Button className="mt-6" onClick={() => fetchInventory()}>
                Reintentar
              </Button>
            </div>
          ) : properties.length === 0 && !hasFilters ? (
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
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Publicadas', value: formatCompactNumber(metrics.total), icon: Home },
                  { label: 'Activas', value: formatCompactNumber(metrics.active), icon: BarChart3 },
                  { label: 'En venta', value: formatCompactNumber(metrics.for_sale), icon: Home },
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

              <div>
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
                        {isAdminScope && (
                          <select
                            value={originFilter}
                            onChange={(event) => setOriginFilter(event.target.value as OriginFilter)}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-textPrimary"
                          >
                            {originOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
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

                  {properties.length === 0 ? (
                    <div className="rounded-card border border-line bg-surface p-10 text-center shadow-card">
                      <h3 className="text-lg font-semibold text-textPrimary">No hay resultados con estos filtros</h3>
                      <p className="mt-2 text-textSecondary">Limpia la búsqueda o cambia el estado seleccionado.</p>
                      <Button
                        variant="outline"
                        className="mt-5"
                        onClick={() => {
                          setQuery('');
                          setStatusFilter('all');
                          setOriginFilter('all');
                        }}
                      >
                        Ver todas
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {properties.map((property) => {
                        const closureLabel = getClosureLabel(property);
                        const closedOn = formatDate(property.closed_at, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        });
                        return (
                          <div key={property.id} className="flex flex-col gap-2">
                            <PropertyCard
                              property={property}
                              onClick={() => router.push(`/mis-propiedades/${property.id}`)}
                            />
                            {/* Cierre del anuncio: el dueño marca aquí que se
                                vendió o se arrendó, y desde aquí lo reabre. */}
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-surface px-3 py-2 shadow-card">
                              {closureLabel ? (
                                <>
                                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-textPrimary">
                                    {isSuccessfulClosure(property) ? (
                                      <CheckCircle2 className="h-4 w-4 text-primary" strokeWidth={2} aria-hidden />
                                    ) : (
                                      <Archive className="h-4 w-4 text-textSecondary" strokeWidth={2} aria-hidden />
                                    )}
                                    {closureLabel}
                                    {closedOn && (
                                      <span className="font-normal text-textSecondary">· {closedOn}</span>
                                    )}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    data-testid="reopen-listing-action"
                                    onClick={() => openClosureDialog(property, 'reopen')}
                                  >
                                    <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                                    Reabrir
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span className="text-sm font-medium text-textSecondary">
                                    {getListingStatusLabel(property)}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    data-testid="close-listing-action"
                                    onClick={() => openClosureDialog(property, 'close')}
                                  >
                                    <KeyRound className="h-4 w-4" strokeWidth={1.75} />
                                    Ya se vendió o arrendó
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {nextPage !== null && (
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => fetchInventory(nextPage)}
                        disabled={loadingMore}
                      >
                        {loadingMore ? 'Cargando…' : 'Cargar más'}
                      </Button>
                      <p className="text-sm text-textMuted">
                        {properties.length} de {metrics.total}
                      </p>
                    </div>
                  )}
                </div>
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

        <Dialog open={Boolean(actionProperty)} onOpenChange={(open) => !open && setActionProperty(null)}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
            {actionProperty && (
              <>
                <DialogHeader>
                  <DialogTitle className="pr-8">{actionProperty.title || `Propiedad #${actionProperty.id}`}</DialogTitle>
                  <DialogDescription>
                    {[actionProperty.city, actionProperty.province].filter(Boolean).join(', ') || 'Gestiona esta publicación'}
                  </DialogDescription>
                </DialogHeader>

                {actionProperty.images?.[0] && (
                  <div className="relative aspect-[16/9] overflow-hidden rounded-card bg-background">
                    <PropertyImage
                      src={actionProperty.images.find((image) => image.is_main)?.image || actionProperty.images[0].image}
                      alt={actionProperty.title || `Propiedad #${actionProperty.id}`}
                      fill
                      sizes="(max-width: 640px) 100vw, 672px"
                      className="object-cover"
                      wrapperClassName="absolute inset-0"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="bg-background">
                    {getListingStatusLabel(actionProperty)}
                  </Badge>
                  {getClosedReason(actionProperty) && actionProperty.closed_at && (
                    <Badge variant="secondary">
                      Cerrado el {formatDate(actionProperty.closed_at, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Badge>
                  )}
                  {isAdminScope && actionProperty.is_imported && (
                    <Badge variant="secondary">
                      Importada{actionProperty.source_agency ? ` · ${actionProperty.source_agency}` : ''}
                    </Badge>
                  )}
                  {isAdminScope && !actionProperty.is_imported && !sameIdentifier(actionProperty.owner, user?.id) && (
                    <Badge variant="secondary">
                      De {actionProperty.owner_username || `cuenta #${actionProperty.owner}`}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    ['Precio', formatPrice(actionProperty.price)],
                    ['Tipo', getPropertyTypeLabel(actionProperty.property_type)],
                    ['Área', formatArea(actionProperty.area) || 'Sin especificar'],
                    ['Habitaciones', actionProperty.rooms || '—'],
                    ['Baños', actionProperty.bathrooms || '—'],
                    ['Vistas', actionProperty.views_count || 0],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-card bg-background p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-textSecondary">{label}</p>
                      <p className="mt-1 break-words font-geo text-sm font-semibold text-textPrimary">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 rounded-card border border-line p-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Ubicación</p>
                    <p className="mt-1 text-textPrimary">
                      {[actionProperty.address, actionProperty.city, actionProperty.province]
                        .filter(Boolean)
                        .join(', ') || 'Sin ubicación especificada'}
                    </p>
                  </div>
                  {actionProperty.description && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Descripción</p>
                      <p className="mt-1 whitespace-pre-line leading-5 text-textPrimary">{actionProperty.description}</p>
                    </div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Contacto</p>
                      <p className="mt-1 text-textPrimary">{actionProperty.contact_phone || 'Sin teléfono'}</p>
                      {actionProperty.contact_email && <p className="break-all text-textSecondary">{actionProperty.contact_email}</p>}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Publicación</p>
                      <p className="mt-1 text-textPrimary">
                        {formatDate(actionProperty.created_at, { day: '2-digit', month: 'short', year: 'numeric' }) || 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                </div>

                {leadsByProperty[actionProperty.id] && (
                  <div className="rounded-card border border-primary/15 bg-primary/5 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-textPrimary">
                          {leadsByProperty[actionProperty.id].count}{' '}
                          {leadsByProperty[actionProperty.id].count === 1 ? 'contacto' : 'contactos'}
                        </p>
                        <p className="truncate text-xs text-textSecondary">
                          Último: {leadsByProperty[actionProperty.id].latest.name} ·{' '}
                          {formatLeadDate(leadsByProperty[actionProperty.id].latest.created_at)}
                        </p>
                      </div>
                      <a
                        className="shrink-0 text-sm font-medium text-primary hover:underline"
                        href={`tel:${leadsByProperty[actionProperty.id].latest.phone}`}
                      >
                        Llamar
                      </a>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => router.push(`/property/${actionProperty.id}`)}>
                    <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                    Ver publicación
                  </Button>
                  <Button
                    variant="outline"
                    className="text-secondary hover:bg-secondary/10 hover:text-secondary"
                    onClick={() => {
                      setActionProperty(null);
                      handleShare(actionProperty.id);
                    }}
                  >
                    <Share2 className="h-4 w-4" strokeWidth={1.75} />
                    Compartir
                  </Button>
                  <Button
                    variant="outline"
                    data-testid="promote-property-action"
                    onClick={() => router.push(`/propiedad/${actionProperty.id}/promocionar`)}
                  >
                    <Megaphone className="h-4 w-4" strokeWidth={1.75} />
                    Promocionar
                  </Button>
                  <Button
                    variant="outline"
                    className="text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={() => router.push(`/editar-propiedad/${actionProperty.id}`)}
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    className="col-span-2"
                    onClick={() => {
                      const target = actionProperty;
                      setActionProperty(null);
                      openClosureDialog(target, isClosedListing(target) ? 'reopen' : 'close');
                    }}
                  >
                    {isClosedListing(actionProperty) ? (
                      <>
                        <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                        Reabrir anuncio
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-4 w-4" strokeWidth={1.75} />
                        Ya se vendió o arrendó
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="col-span-2 text-error hover:bg-error/10 hover:text-error"
                    onClick={() => {
                      const propertyId = actionProperty.id;
                      setActionProperty(null);
                      handleDelete(propertyId);
                    }}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    Eliminar
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Cierre / reapertura del anuncio. Se confirma siempre: marcarlo como
            vendido lo saca del catálogo público. */}
        <Dialog
          open={Boolean(closureProperty)}
          onOpenChange={(open) => {
            if (!open && !savingClosure) setClosureProperty(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            {closureProperty && closureMode === 'close' && (
              <>
                <DialogHeader>
                  <DialogTitle className="pr-8">¿Cómo se cerró este anuncio?</DialogTitle>
                  <DialogDescription>
                    «{closureProperty.title || `Propiedad #${closureProperty.id}`}» saldrá del catálogo
                    público y dejará de recibir contactos. Su ficha seguirá abierta con la marca de
                    cerrado, para que el código y el QR que ya imprimiste sigan funcionando. Puedes
                    reabrirlo cuando quieras.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  {closureOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={savingClosure}
                      data-testid={`close-listing-${option.value}`}
                      onClick={() => applyClosure(closureProperty, { closed_reason: option.value })}
                      className="rounded-card border border-line bg-background px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="block font-semibold text-textPrimary">{option.label}</span>
                      <span className="mt-0.5 block text-sm text-textSecondary">{option.hint}</span>
                    </button>
                  ))}
                </div>
                <Button variant="ghost" disabled={savingClosure} onClick={() => setClosureProperty(null)}>
                  Cancelar
                </Button>
              </>
            )}

            {closureProperty && closureMode === 'reopen' && (
              <>
                <DialogHeader>
                  <DialogTitle className="pr-8">Volver a publicar el anuncio</DialogTitle>
                  <DialogDescription>
                    «{closureProperty.title || `Propiedad #${closureProperty.id}`}» está marcado como{' '}
                    {getClosureLabel(closureProperty).toLowerCase()}. Al reabrirlo vuelve al catálogo y
                    al mapa, y se borra la marca de cierre. Elige con qué operación vuelve.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  {reopenOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={savingClosure}
                      data-testid={`reopen-listing-${status}`}
                      onClick={() => applyClosure(closureProperty, { status, closed_reason: '' })}
                      className="rounded-card border border-line bg-background px-4 py-3 text-left font-semibold text-textPrimary transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" disabled={savingClosure} onClick={() => setClosureProperty(null)}>
                  Cancelar
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>

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
      </PullToRefresh>
    </PrivateRoute>
  );
};

export default MyPropertiesPage;
