'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Activity, ChevronDown, ExternalLink, Info, MousePointerClick, RefreshCw, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';

const PAGE_SIZE = 50;
const CONTACT_EVENT = 'property_contact_clicked';

type EventItem = {
  id: number;
  user: number | null;
  user_label: string;
  session_id: string;
  event_name: string;
  property: number | null;
  property_title: string | null;
  path: string;
  payload: Record<string, unknown>;
  is_bot: boolean;
  created_at: string;
};

const EVENT_LABELS: Record<string, string> = {
  property_contact_clicked: 'Clic en contactar',
  property_pin_clicked: 'Abrió propiedad desde el mapa',
  property_card_details_opened: 'Abrió detalle de propiedad',
  publication_form_started: 'Empezó a publicar',
  publication_form_viewed: 'Vio el formulario de publicación',
  publication_created: 'Publicación completada',
  publication_create_failed: 'Error al publicar',
  publication_exit_confirmed: 'Abandonó el formulario',
  publication_pending_saved: 'Borrador pendiente guardado',
  publish_cta_clicked: 'Clic en "Publicar"',
  map_filter_changed: 'Cambió filtros del mapa',
};

const EVENT_OPTIONS = [
  { value: '', label: 'Todos los eventos' },
  { value: CONTACT_EVENT, label: EVENT_LABELS[CONTACT_EVENT] },
  { value: 'property_pin_clicked', label: EVENT_LABELS.property_pin_clicked },
  { value: 'property_card_details_opened', label: EVENT_LABELS.property_card_details_opened },
  { value: 'publication_form_started', label: EVENT_LABELS.publication_form_started },
  { value: 'publication_created', label: EVENT_LABELS.publication_created },
  { value: 'publication_exit_confirmed', label: EVENT_LABELS.publication_exit_confirmed },
  { value: 'publish_cta_clicked', label: EVENT_LABELS.publish_cta_clicked },
  { value: 'map_filter_changed', label: EVENT_LABELS.map_filter_changed },
];

const eventLabel = (eventName: string) => EVENT_LABELS[eventName] || eventName;

const CONTACT_METHOD_LABELS: Record<string, string> = {
  whatsapp: 'Abrió WhatsApp',
  call: 'Inició una llamada',
  source_url: 'Abrió la fuente original',
  phone_reveal: 'Vio el número de teléfono',
};

export default function AdminActivityPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<EventItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [eventName, setEventName] = useState('');
  const [traffic, setTraffic] = useState<'all' | 'human' | 'bot'>('human');
  const [page, setPage] = useState(1);

  const contactsOnly = eventName === CONTACT_EVENT;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(PAGE_SIZE));
      if (eventName) params.set('event_name', eventName);
      if (traffic !== 'all') params.set('is_bot', traffic === 'bot' ? 'true' : 'false');

      const response = await apiGet(`/activity-events/?${params.toString()}`);
      if (!response.ok) throw new Error('Error al cargar la actividad');
      const data = await response.json();
      setItems(data.results || []);
      setCount(data.count ?? 0);
      setError(false);
    } catch {
      setError(true);
      toast.error('No se pudo cargar la actividad');
    } finally {
      setLoading(false);
    }
  }, [token, page, eventName, traffic]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [eventName, traffic]);

  const toggleContactsOnly = () => setEventName((current) => (current === CONTACT_EVENT ? '' : CONTACT_EVENT));

  const statLabel = useMemo(() => {
    if (contactsOnly) return 'Clics de contacto registrados';
    if (eventName) return `Eventos de "${eventLabel(eventName)}" registrados`;
    return 'Eventos registrados';
  }, [contactsOnly, eventName]);

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100dvh-var(--app-header-height))] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <PageHeader onRefresh={() => void load()} />

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <Card className="p-4">
                <MousePointerClick className="h-5 w-5 text-primary" />
                <p className="mt-2 text-2xl font-black text-textPrimary">{count}</p>
                <p className="text-sm text-textSecondary">{statLabel}</p>
              </Card>

              <FiltersCard
                contactsOnly={contactsOnly}
                eventName={eventName}
                onToggleContactsOnly={toggleContactsOnly}
                onEventNameChange={setEventName}
                traffic={traffic}
                onTrafficChange={setTraffic}
              />
            </div>

            <Card className="overflow-hidden">
              <EventsTableHeader />

              {loading ? (
                <LoadingRows />
              ) : error ? (
                <ErrorState onRetry={() => void load()} />
              ) : items.length === 0 ? (
                <EmptyState hasFilter={Boolean(eventName)} />
              ) : (
                items.map((event) => <EventRow key={event.id} event={event} />)
              )}

              {!loading && !error && totalPages > 1 && (
                <div className="border-t border-line p-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          aria-disabled={page === 1}
                          className={cn('rounded-button', page === 1 && 'pointer-events-none opacity-50')}
                          onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <span className="px-3 text-sm text-textSecondary">Página {page} de {totalPages}</span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          aria-disabled={page === totalPages}
                          className={cn('rounded-button', page === totalPages && 'pointer-events-none opacity-50')}
                          onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </AdminRoute>
  );
}

function PageHeader({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary">Actividad y clics</h1>
        <p className="mt-1 text-sm text-textSecondary">Auditoría de contactos, publicaciones y navegación relevante.</p>
      </div>
      <Button variant="outline" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4" />
        Actualizar
      </Button>
    </div>
  );
}

function FiltersCard({
  contactsOnly,
  eventName,
  onToggleContactsOnly,
  onEventNameChange,
  traffic,
  onTrafficChange,
}: {
  contactsOnly: boolean;
  eventName: string;
  onToggleContactsOnly: () => void;
  onEventNameChange: (value: string) => void;
  traffic: 'all' | 'human' | 'bot';
  onTrafficChange: (value: 'all' | 'human' | 'bot') => void;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-textPrimary">Vista actual</p>
        <p className="text-sm text-textSecondary">{contactsOnly ? 'Solo contactos' : 'Toda la actividad'}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={eventName || 'all'} onValueChange={(value) => onEventNameChange(value === 'all' ? '' : value)}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_OPTIONS.map((option) => (
              <SelectItem key={option.value || 'all'} value={option.value || 'all'}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={traffic} onValueChange={(value) => onTrafficChange(value as 'all' | 'human' | 'bot')}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Tipo de tráfico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="human">Personas</SelectItem>
            <SelectItem value="bot">Bots</SelectItem>
            <SelectItem value="all">Todo el tráfico</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={onToggleContactsOnly}>
          {contactsOnly ? 'Ver todo' : 'Solo contactos'}
        </Button>
      </div>
    </Card>
  );
}

function EventsTableHeader() {
  return (
    <div className="grid grid-cols-[1fr_auto] border-b border-line bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-textSecondary sm:grid-cols-[1.1fr_1.2fr_0.8fr_auto]">
      <span>Actividad</span>
      <span className="hidden sm:block">Propiedad</span>
      <span className="hidden sm:block">Usuario</span>
      <span>Fecha</span>
    </div>
  );
}

function EventRow({ event }: { event: EventItem }) {
  const [expanded, setExpanded] = useState(false);
  const method = String(event.payload.method || 'clic');
  const title = event.event_name === CONTACT_EVENT
    ? `Contacto · ${CONTACT_METHOD_LABELS[method] || method}`
    : eventLabel(event.event_name);
  const subtitle = String(event.payload.source || event.path || '');

  const details = eventDetails(event);

  return (
    <div className="border-b border-line last:border-0">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[1.1fr_1.2fr_0.8fr_auto]">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-textPrimary">{title}</p>
          <p className="truncate text-xs text-textSecondary">{subtitle}</p>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            aria-expanded={expanded}
          >
            <Info className="h-3.5 w-3.5" /> {expanded ? 'Ocultar información' : 'Más información'}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
          </button>
        </div>
        <div className="hidden min-w-0 sm:block">
          {event.property ? (
            <Link href={`/propiedad/${event.property}`} target="_blank" className="inline-flex max-w-full items-center gap-1 truncate text-sm text-primary hover:underline">
              #{event.property} {event.property_title || ''}<ExternalLink className="h-3 w-3 shrink-0" />
            </Link>
          ) : <span className="text-sm text-textSecondary">—</span>}
        </div>
        <div className="hidden min-w-0 sm:block">
          {event.user ? (
            <Link href={`/admin/users?user=${event.user}`} className="inline-flex items-center gap-1 truncate text-sm text-primary hover:underline">
              <UserRound className="h-3.5 w-3.5 shrink-0" /> {event.user_label}
            </Link>
          ) : <span className="truncate text-sm text-textSecondary">{event.user_label}</span>}
        </div>
        <span className="whitespace-nowrap text-xs text-textSecondary">
          {new Date(event.created_at).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-line/70 bg-muted/20 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {details.map(({ label, value }) => (
              <div key={label} className="rounded-card border border-line bg-white p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-textSecondary">{label}</p>
                <p className="mt-1 break-words text-sm font-medium text-textPrimary">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {event.property && <Button asChild size="sm" variant="outline"><Link href={`/propiedad/${event.property}`} target="_blank">Abrir propiedad <ExternalLink className="h-3.5 w-3.5" /></Link></Button>}
            {event.user && <Button asChild size="sm" variant="outline"><Link href={`/admin/users?user=${event.user}`}>Ver usuario <UserRound className="h-3.5 w-3.5" /></Link></Button>}
            {event.path && <Button asChild size="sm" variant="ghost"><Link href={event.path} target="_blank">Abrir página registrada <ExternalLink className="h-3.5 w-3.5" /></Link></Button>}
          </div>
          <details className="mt-3 rounded-card border border-line bg-slate-950 text-slate-100">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold">Payload técnico completo</summary>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words border-t border-slate-800 p-3 text-[11px] leading-5">
              {JSON.stringify(event.payload || {}, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function eventDetails(event: EventItem) {
  const payload = event.payload || {};
  const attribution = payload.attribution && typeof payload.attribution === 'object'
    ? payload.attribution as Record<string, unknown>
    : {};
  const candidates = [
    ['Evento', eventLabel(event.event_name)],
    ['Método', CONTACT_METHOD_LABELS[String(payload.method || '')] || payload.method],
    ['Origen del botón', payload.source],
    ['Ruta', event.path],
    ['Propiedad', event.property ? `#${event.property} · ${event.property_title || 'Sin título'}` : null],
    ['Usuario', event.user ? `${event.user_label} (#${event.user})` : event.user_label],
    ['Sesión', event.session_id || 'Sin identificador'],
    ['Tráfico', event.is_bot ? 'Bot o crawler' : 'Persona'],
    ['Ciudad', payload.city],
    ['Provincia', payload.province],
    ['Tipo de propiedad', payload.property_type],
    ['Estado HTTP', payload.status_code],
    ['Canal', attribution.channel],
    ['Campaña', attribution.campaign],
    ['Fecha exacta', new Date(event.created_at).toLocaleString('es-EC', { dateStyle: 'full', timeStyle: 'medium' })],
  ];
  return candidates
    .filter((item): item is [string, unknown] => item[1] !== undefined && item[1] !== null && item[1] !== '')
    .map(([label, value]) => ({ label, value: typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value) }));
}

function LoadingRows() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 7 }).map((_, index) => (
        <Skeleton key={index} className="h-14" />
      ))}
    </div>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="p-10 text-center text-sm text-textSecondary">
      <Activity className="mx-auto mb-2 h-7 w-7" />
      {hasFilter ? 'No hay eventos para este filtro.' : 'Todavía no hay eventos registrados.'}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-textSecondary">
      <AlertCircle className="h-7 w-7 text-error" />
      <p>No se pudo cargar la actividad.</p>
      <Button variant="outline" size="sm" className="rounded-button" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" /> Reintentar
      </Button>
    </div>
  );
}
