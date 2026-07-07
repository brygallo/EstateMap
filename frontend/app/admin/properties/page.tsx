'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Search,
  ArrowUpDown,
  Eye,
  Trash2,
  ExternalLink,
  Building2,
  Tag,
  KeyRound,
  EyeOff,
  MapPin,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface PropertyItem {
  id: number;
  title: string;
  property_type: string;
  status: string;
  price: string;
  city: string;
  province: string;
  owner: number | null;
  owner_username: string | null;
  owner_email: string | null;
  created_at: string;
}

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'for_sale', label: 'En venta' },
  { key: 'for_rent', label: 'En alquiler' },
  { key: 'inactive', label: 'Inactivas' },
];

const TYPE_LABELS: Record<string, string> = {
  house: 'Casa',
  land: 'Terreno',
  apartment: 'Departamento',
  commercial: 'Comercial',
  other: 'Otro',
};

const STATUS_STYLES: Record<string, string> = {
  for_sale: 'bg-green-100 text-green-700',
  for_rent: 'bg-amber-100 text-amber-700',
  inactive: 'bg-slate-100 text-slate-600',
};

const STATUS_LABELS: Record<string, string> = {
  for_sale: 'En venta',
  for_rent: 'En alquiler',
  inactive: 'Inactiva',
};

interface AdminStats {
  total_properties: number;
  properties_for_sale: number;
  properties_for_rent: number;
  properties_inactive: number;
  properties_active: number;
  total_views: number;
}

const AdminPropertiesPage = () => {
  const { token } = useAuth();
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<PropertyItem | null>(null);
  const [preview, setPreview] = useState<PropertyItem | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));

      const res = await fetch(`${API_URL}/admin/properties/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar propiedades');
      const json = await res.json();

      if (json.results) {
        setProperties(json.results);
        setTotalPages(Math.ceil(json.count / (json.results.length || 10)) || 1);
      } else {
        setProperties(Array.isArray(json) ? json : []);
        setTotalPages(1);
      }
    } catch {
      toast.error('Error al cargar propiedades');
    } finally {
      setLoading(false);
    }
  }, [token, search, page]);

  useEffect(() => {
    if (token) fetchProperties();
  }, [token, fetchProperties]);

  // Métricas globales (todo el catálogo), independientes de la página/filtro.
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/dashboard/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch {
      // Las métricas simplemente no se muestran si falla.
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchStats();
  }, [token, fetchStats]);

  const filteredProperties = useMemo(
    () => properties.filter((p) => (filter === 'all' ? true : p.status === filter)),
    [properties, filter]
  );

  const handleDelete = async (prop: PropertyItem) => {
    try {
      const res = await fetch(`${API_URL}/admin/properties/${prop.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Propiedad eliminada');
      fetchProperties();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message);
    }
    setConfirmDelete(null);
  };

  const columns = useMemo<ColumnDef<PropertyItem>[]>(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => <SortHeader column={column} label="Título" />,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="min-w-0">
              <p className="max-w-[220px] truncate font-medium text-textPrimary">{p.title || `Propiedad #${p.id}`}</p>
              <p className="text-xs text-textSecondary sm:hidden">{TYPE_LABELS[p.property_type] || p.property_type}</p>
            </div>
          );
        },
      },
      {
        accessorKey: 'property_type',
        header: 'Tipo',
        cell: ({ getValue }) => (
          <span className="text-textSecondary">{TYPE_LABELS[getValue<string>()] || getValue<string>()}</span>
        ),
        meta: { className: 'hidden sm:table-cell' },
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
        accessorKey: 'price',
        header: ({ column }) => <SortHeader column={column} label="Precio" />,
        cell: ({ getValue }) => (
          <span className="font-geo text-textSecondary">${Number(getValue<string>()).toLocaleString('es-EC')}</span>
        ),
        sortingFn: (a, b) => Number(a.original.price) - Number(b.original.price),
        meta: { className: 'hidden md:table-cell' },
      },
      {
        accessorKey: 'owner_username',
        header: 'Propietario',
        cell: ({ getValue }) => <span className="text-textSecondary">{getValue<string>() || '—'}</span>,
        meta: { className: 'hidden lg:table-cell' },
      },
      {
        accessorKey: 'city',
        header: 'Ciudad',
        cell: ({ getValue }) => <span className="text-textSecondary">{getValue<string>() || '—'}</span>,
        meta: { className: 'hidden lg:table-cell' },
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => <SortHeader column={column} label="Fecha" />,
        cell: ({ getValue }) => (
          <span className="text-textSecondary">{new Date(getValue<string>()).toLocaleDateString('es-EC')}</span>
        ),
        meta: { className: 'hidden xl:table-cell' },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Acciones</div>,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex items-center justify-end gap-0.5">
              <button
                onClick={() => setPreview(p)}
                title="Vista previa rápida"
                className="rounded-button p-1.5 text-primary transition-colors hover:bg-primaryLight"
              >
                <Eye className="h-4 w-4" />
              </button>
              <Link
                href={`/propiedad/${p.id}`}
                target="_blank"
                title="Abrir en pestaña nueva"
                className="rounded-button p-1.5 text-textSecondary transition-colors hover:bg-muted hover:text-textPrimary"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setConfirmDelete(p)}
                title="Eliminar"
                className="rounded-button p-1.5 text-red-500 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredProperties,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100vh-3rem)] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-textPrimary">Gestión de Propiedades</h1>
              <p className="mt-1 text-sm text-textSecondary">Modera y administra los listados publicados.</p>
            </div>

            {/* Métricas globales */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {stats ? (
                <>
                  <MetricTile icon={Building2} label="Total" value={stats.total_properties} tone="primary" />
                  <MetricTile icon={Tag} label="En venta" value={stats.properties_for_sale} tone="green" />
                  <MetricTile icon={KeyRound} label="En alquiler" value={stats.properties_for_rent} tone="amber" />
                  <MetricTile icon={EyeOff} label="Inactivas" value={stats.properties_inactive} tone="slate" />
                  <MetricTile icon={Eye} label="Vistas" value={stats.total_views} tone="primary" />
                </>
              ) : (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-[74px] rounded-card" />
                ))
              )}
            </div>

            {/* Search & Filters */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
                <Input
                  type="text"
                  placeholder="Buscar por título o propietario..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="rounded-input pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FILTERS.map((f) => (
                  <Button
                    key={f.key}
                    variant={filter === f.key ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-button"
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Table */}
            <Card className="overflow-hidden rounded-card shadow-card">
              {loading ? (
                <TableSkeleton cols={8} />
              ) : filteredProperties.length === 0 ? (
                <div className="py-12 text-center text-textSecondary">No se encontraron propiedades</div>
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
                        <TableRow key={row.id} className="transition-colors hover:bg-muted/40">
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className={cn('py-2 text-sm', (cell.column.columnDef.meta as any)?.className)}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {totalPages > 1 && (
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

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent className="rounded-modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar propiedad</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar <strong>{confirmDelete?.title || `Propiedad #${confirmDelete?.id}`}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-button">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-button bg-error text-white hover:bg-error/90"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vista previa rápida (sin salir del panel) */}
      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="rounded-modal sm:max-w-md">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6 text-left text-base">
                  {preview.title || `Propiedad #${preview.id}`}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn('border-transparent', STATUS_STYLES[preview.status] || 'bg-slate-100 text-slate-600')}
                  >
                    {STATUS_LABELS[preview.status] || preview.status}
                  </Badge>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-textSecondary">
                    {TYPE_LABELS[preview.property_type] || preview.property_type}
                  </span>
                </div>

                <div className="font-geo text-2xl font-semibold text-primary tabular-nums">
                  ${Number(preview.price).toLocaleString('es-EC')}
                </div>

                <p className="flex items-center gap-1.5 text-sm text-textSecondary">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                  {[preview.city, preview.province].filter(Boolean).join(', ') || 'Sin ubicación'}
                </p>

                <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
                  <div>
                    <dt className="text-xs text-textSecondary">Propietario</dt>
                    <dd className="font-medium text-textPrimary">{preview.owner_username || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-textSecondary">Publicada</dt>
                    <dd className="font-medium text-textPrimary">
                      {new Date(preview.created_at).toLocaleDateString('es-EC')}
                    </dd>
                  </div>
                  {preview.owner_email && (
                    <div className="col-span-2 min-w-0">
                      <dt className="text-xs text-textSecondary">Email</dt>
                      <dd className="truncate font-medium text-textPrimary">{preview.owner_email}</dd>
                    </div>
                  )}
                </dl>

                <div className="flex gap-2 pt-1">
                  <Button asChild className="flex-1 rounded-button">
                    <Link href={`/propiedad/${preview.id}`} target="_blank">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Ver completa
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-button border-error/40 text-error hover:bg-red-50"
                    onClick={() => { setConfirmDelete(preview); setPreview(null); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminRoute>
  );
};

function MetricTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  tone: 'primary' | 'green' | 'amber' | 'slate';
}) {
  const toneClass = {
    primary: 'bg-primaryLight text-primary',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-card">
      <span className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-card', toneClass)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="font-geo text-xl font-bold tabular-nums text-textPrimary">
          {value.toLocaleString('es-EC')}
        </div>
        <div className="truncate text-xs text-textSecondary">{label}</div>
      </div>
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
            <Skeleton key={c} className={cn('h-5', c === 0 ? 'w-48' : 'w-20', c === cols - 1 && 'ml-auto')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default AdminPropertiesPage;
