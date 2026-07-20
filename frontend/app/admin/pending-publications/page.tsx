'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { AlertCircle, ArrowUpDown, Eye, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';
const PAGE_SIZE = 20;

interface PendingPublication {
  id: number;
  title: string;
  contact_phone: string;
  contact_email: string;
  city: string;
  province: string;
  property_type: string;
  operation: string;
  price: string;
  source: string;
  status: string;
  draft: any;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  converted: 'Convertido',
  discarded: 'Descartado',
};

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-fuchsia-100 text-fuchsia-700',
  contacted: 'bg-blue-100 text-blue-700',
  converted: 'bg-green-100 text-green-700',
  discarded: 'bg-slate-100 text-slate-600',
};

const SOURCE_LABELS: Record<string, string> = {
  account_required: 'Intento sin cuenta',
  whatsapp_help: 'Ayuda WhatsApp',
  exit_prompt: 'Abandono',
  other: 'Otro',
};

const STATUS_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'new', label: STATUS_LABELS.new },
  { key: 'contacted', label: STATUS_LABELS.contacted },
  { key: 'converted', label: STATUS_LABELS.converted },
  { key: 'discarded', label: STATUS_LABELS.discarded },
];

const digitsOnly = (phone: string) => (phone || '').replace(/\D/g, '');

const isValidPhone = (phone: string) => {
  const digits = digitsOnly(phone);
  return digits.length >= 8 && digits.length <= 15;
};

export default function PendingPublicationsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<PendingPublication[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<PendingPublication | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the search box before it hits the query string.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(PAGE_SIZE));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`${API_URL}/pending-publications/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar pendientes');
      const json = await res.json();
      setItems(json.results || []);
      setCount(json.count ?? 0);
      setError(false);
    } catch (error: any) {
      setError(true);
      toast.error(error.message || 'Error al cargar pendientes');
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, search]);

  useEffect(() => {
    if (token) fetchItems();
  }, [token, fetchItems]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const updateStatus = async (item: PendingPublication, status: string) => {
    try {
      const res = await fetch(`${API_URL}/pending-publications/${item.id}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar');
      toast.success('Estado actualizado');
      fetchItems();
      if (selected?.id === item.id) setSelected({ ...item, status });
    } catch (error: any) {
      toast.error(error.message || 'No se pudo actualizar');
    }
  };

  const whatsappUrl = (item: PendingPublication) => {
    const message = [
      'Hola, te escribimos de Geo Propiedades Ecuador.',
      'Vimos que querías publicar una propiedad y podemos ayudarte a terminarla.',
      '',
      `Propiedad: ${item.title || 'Sin título'}`,
      `Ciudad: ${item.city || 'Sin ciudad'}`,
    ].join('\n');
    return `https://wa.me/${digitsOnly(item.contact_phone)}?text=${encodeURIComponent(message)}`;
  };

  const columns = useMemo<ColumnDef<PendingPublication>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <SortHeader column={column} label="Propiedad" />,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div>
              <p className="font-medium text-textPrimary">{item.title || `Pendiente #${item.id}`}</p>
              <p className="font-geo text-xs text-textSecondary">${item.price || 'Sin precio'}</p>
            </div>
          );
        },
      },
      {
        id: 'contact',
        accessorFn: (i) => i.contact_phone,
        header: 'Contacto',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="text-textSecondary">
              <p>{item.contact_phone || 'Sin teléfono'}</p>
              {item.contact_email && <p className="text-xs">{item.contact_email}</p>}
            </div>
          );
        },
      },
      {
        accessorKey: 'city',
        header: 'Ciudad',
        cell: ({ getValue }) => <span className="text-textSecondary">{getValue<string>() || '—'}</span>,
        meta: { className: 'hidden md:table-cell' },
      },
      {
        accessorKey: 'source',
        header: 'Origen',
        cell: ({ getValue }) => (
          <span className="text-textSecondary">{SOURCE_LABELS[getValue<string>()] || getValue<string>()}</span>
        ),
        meta: { className: 'hidden lg:table-cell' },
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ getValue }) => {
          const s = getValue<string>();
          return (
            <Badge variant="outline" className={cn('border-transparent', STATUS_STYLES[s] || 'bg-slate-100 text-slate-600')}>
              {STATUS_LABELS[s] || s}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Acciones</div>,
        cell: ({ row }) => {
          const item = row.original;
          const hasPhone = Boolean(item.contact_phone);
          const validPhone = hasPhone && isValidPhone(item.contact_phone);
          return (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="rounded-button" onClick={() => setSelected(item)}>
                <Eye className="h-4 w-4" /> Ver
              </Button>
              {hasPhone && (
                <Button
                  asChild={validPhone}
                  disabled={!validPhone}
                  size="sm"
                  className="rounded-button"
                  title={validPhone ? undefined : 'Teléfono inválido, no se puede abrir WhatsApp'}
                >
                  {validPhone ? (
                    <a href={whatsappUrl(item)} target="_blank" rel="noreferrer">WhatsApp</a>
                  ) : (
                    'WhatsApp'
                  )}
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const hasFilters = statusFilter !== 'all' || Boolean(search);

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100vh-3rem)] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-textPrimary">Publicaciones Pendientes</h1>
              <p className="mt-1 text-sm text-textSecondary">Contacta a quienes no terminaron de publicar.</p>
            </div>

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                  {STATUS_TABS.map((tab) => (
                    <TabsTrigger key={tab.key} value={tab.key}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="relative sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre, ciudad, teléfono..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="rounded-input pl-9"
                />
              </div>
            </div>

            <Card className="overflow-hidden rounded-card shadow-card">
              {loading ? (
                <TableSkeleton cols={6} />
              ) : error ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <AlertCircle className="h-8 w-8 text-error" />
                  <p className="text-textSecondary">No se pudieron cargar las publicaciones pendientes.</p>
                  <Button variant="outline" size="sm" className="rounded-button" onClick={() => fetchItems()}>
                    <RefreshCw className="h-4 w-4" /> Reintentar
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center text-textSecondary">
                  {hasFilters ? 'No hay pendientes que coincidan con el filtro.' : 'No hay solicitudes pendientes'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((hg) => (
                        <TableRow key={hg.id} className="bg-muted/40">
                          {hg.headers.map((header) => (
                            <TableHead key={header.id} className={(header.column.columnDef.meta as any)?.className}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className={cn('py-3', (cell.column.columnDef.meta as any)?.className)}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-auto rounded-modal">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title || `Pendiente #${selected.id}`}</DialogTitle>
                <DialogDescription>{new Date(selected.created_at).toLocaleString('es-EC')}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Teléfono" value={selected.contact_phone || '—'} />
                <Info label="Email" value={selected.contact_email || '—'} />
                <Info label="Ciudad" value={`${selected.city || '—'}${selected.province ? `, ${selected.province}` : ''}`} />
                <Info label="Precio" value={selected.price || '—'} />
                <Info label="Origen" value={SOURCE_LABELS[selected.source] || selected.source} />
                <Info label="Estado" value={STATUS_LABELS[selected.status] || selected.status} />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-textPrimary">Borrador</p>
                <DraftSummary draft={selected.draft} />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {['new', 'contacted', 'converted', 'discarded'].map((status) => (
                  <Button
                    key={status}
                    variant={selected.status === status ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-button"
                    onClick={() => updateStatus(selected, status)}
                  >
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminRoute>
  );
}

function humanizeKey(key: string) {
  const spaced = key.replace(/_/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatDraftValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) {
    if (!value.length) return '—';
    return value.map((v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v))).join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function DraftSummary({ draft }: { draft: any }) {
  const [showRaw, setShowRaw] = useState(false);
  const entries = draft && typeof draft === 'object' ? Object.entries(draft) : [];

  if (!entries.length) {
    return <p className="rounded-card border border-dashed border-line p-4 text-center text-sm text-textSecondary">Sin datos de borrador.</p>;
  }

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-card border border-line p-3">
            <p className="text-xs font-semibold uppercase text-textSecondary">{humanizeKey(key)}</p>
            <p className="mt-1 break-words text-sm text-textPrimary">{formatDraftValue(value)}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-2 text-xs font-medium text-textSecondary underline-offset-2 hover:text-textPrimary hover:underline"
        onClick={() => setShowRaw((v) => !v)}
      >
        {showRaw ? 'Ocultar JSON crudo' : 'Ver JSON crudo'}
      </button>
      {showRaw && (
        <pre className="mt-2 max-h-56 overflow-auto rounded-card border border-line bg-muted/40 p-4 text-xs">
          {JSON.stringify(draft || {}, null, 2)}
        </pre>
      )}
    </div>
  );
}

function SortHeader({ column, label }: { column: any; label: string }) {
  return (
    <button
      className="-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium text-textSecondary transition-colors hover:text-textPrimary"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </button>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: 6 }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-5', c === 0 ? 'w-40' : 'w-24', c === cols - 1 && 'ml-auto')} />
          ))}
        </div>
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line p-3">
      <p className="text-xs font-semibold uppercase text-textSecondary">{label}</p>
      <p className="mt-1 text-textPrimary">{value}</p>
    </div>
  );
}
