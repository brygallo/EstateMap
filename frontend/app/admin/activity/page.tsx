'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Activity, ExternalLink, MousePointerClick, RefreshCw } from 'lucide-react';
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';
const PAGE_SIZE = 50;
const CONTACT_EVENT = 'property_contact_clicked';

type EventItem = {
  id: number;
  user_label: string;
  event_name: string;
  property: number | null;
  property_title: string | null;
  path: string;
  payload: Record<string, unknown>;
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

export default function AdminActivityPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<EventItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [eventName, setEventName] = useState('');
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

      const response = await fetch(`${API_URL}/activity-events/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
  }, [token, page, eventName]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [eventName]);

  const toggleContactsOnly = () => setEventName((current) => (current === CONTACT_EVENT ? '' : CONTACT_EVENT));

  const statLabel = useMemo(() => {
    if (contactsOnly) return 'Clics de contacto registrados';
    if (eventName) return `Eventos de "${eventLabel(eventName)}" registrados`;
    return 'Eventos registrados';
  }, [contactsOnly, eventName]);

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100vh-3rem)] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-auto">
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
}: {
  contactsOnly: boolean;
  eventName: string;
  onToggleContactsOnly: () => void;
  onEventNameChange: (value: string) => void;
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
  const title = event.event_name === CONTACT_EVENT
    ? `Contacto · ${String(event.payload.method || 'clic')}`
    : eventLabel(event.event_name);
  const subtitle = String(event.payload.source || event.path || '');

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[1.1fr_1.2fr_0.8fr_auto]">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-textPrimary">{title}</p>
        <p className="truncate text-xs text-textSecondary">{subtitle}</p>
      </div>
      <div className="hidden min-w-0 sm:block">
        {event.property ? (
          <Link
            href={`/property/${event.property}`}
            className="inline-flex max-w-full items-center gap-1 truncate text-sm text-primary"
          >
            #{event.property} {event.property_title || ''}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </Link>
        ) : (
          <span className="text-sm text-textSecondary">—</span>
        )}
      </div>
      <span className="hidden truncate text-sm text-textSecondary sm:block">{event.user_label}</span>
      <span className="whitespace-nowrap text-xs text-textSecondary">
        {new Date(event.created_at).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}
      </span>
    </div>
  );
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
