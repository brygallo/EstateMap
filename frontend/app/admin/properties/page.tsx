'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import PropertyImage from '@/components/ui/PropertyImage';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Pencil,
  Trash2,
  ExternalLink,
  Building2,
  Tag,
  KeyRound,
  EyeOff,
  CheckCircle2,
  ImageOff,
  MapPin,
  DownloadCloud,
  UserRound,
  UserRoundCog,
  MapPinOff,
  CircleDollarSign,
  GitMerge,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getPropertyTypeLabel, getStatusLabel, getStatusBadgeClass } from '@/lib/property-labels';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

interface PropertyItem {
  id: number;
  title: string;
  property_type: string;
  status: string;
  price: string;
  city: string;
  address: string;
  area: string | number | null;
  views_count: number;
  owner_username: string | null;
  owner_email: string | null;
  created_at: string;
  image_count: number;
  thumbnail_url: string | null;
  is_imported: boolean;
  source_name: string | null;
}

interface PropertyListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PropertyItem[];
}

interface EditForm {
  status: string;
  title: string;
  price: string;
  city: string;
  description: string;
}

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'for_sale', label: 'En venta' },
  { key: 'for_rent', label: 'En alquiler' },
  { key: 'inactive', label: 'Inactivas' },
];

interface AdminStats {
  total: number;
  for_sale: number;
  for_rent: number;
  inactive: number;
  active: number;
  without_images: number;
  without_location: number;
  without_price: number;
  duplicates: number;
  incomplete: number;
  imported: number;
  users: number;
}

const AdminPropertiesPage = () => {
  const { token } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [filter, setFilter] = useState(() => searchParams.get('status') || 'all');
  const [origin, setOrigin] = useState<'all' | 'imported' | 'users'>(() => {
    const value = searchParams.get('origin');
    return value === 'imported' || value === 'users' ? value : 'all';
  });
  const [quality, setQuality] = useState(() => searchParams.get('quality') || 'all');
  const [confirmDelete, setConfirmDelete] = useState<PropertyItem | null>(null);
  const [preview, setPreview] = useState<PropertyItem | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get('page')) || 1));
  const [totalPages, setTotalPages] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('inactive');
  const [bulkSaving, setBulkSaving] = useState(false);

  // Editar propiedad
  const [editing, setEditing] = useState<PropertyItem | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ status: '', title: '', price: '', city: '', description: '' });
  const [editDetailLoading, setEditDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cambiar propietario
  const [transferring, setTransferring] = useState<PropertyItem | null>(null);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferSaving, setTransferSaving] = useState(false);

  // Debounce del buscador: evita disparar una request por cada tecla.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(PAGE_SIZE));
      if (search) params.set('search', search);
      if (filter !== 'all') params.set('status', filter);
      if (origin !== 'all') params.set('origin', origin);
      if (quality !== 'all') params.set('quality', quality);

      const res = await apiGet(`/admin/properties/?${params}`);
      if (!res.ok) throw new Error('Error al cargar propiedades');
      const json: PropertyListResponse = await res.json();

      setProperties(json.results);
      setTotalPages(Math.max(1, Math.ceil(json.count / PAGE_SIZE)));
    } catch {
      toast.error('Error al cargar propiedades');
    } finally {
      setLoading(false);
    }
  }, [search, filter, origin, quality, page]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filter !== 'all') params.set('status', filter);
    if (origin !== 'all') params.set('origin', origin);
    if (quality !== 'all') params.set('quality', quality);
    if (page > 1) params.set('page', String(page));
    const query = params.toString();
    router.replace(query ? `/admin/properties?${query}` : '/admin/properties', { scroll: false });
  }, [filter, origin, page, quality, router, search]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter, origin, page, quality, search]);

  useEffect(() => {
    if (token) fetchProperties();
  }, [token, fetchProperties]);

  // Métricas globales (todo el catálogo), independientes de la página/filtro.
  const fetchStats = useCallback(async () => {
    try {
      const res = await apiGet('/admin/properties/stats/');
      if (res.ok) setStats(await res.json());
    } catch {
      // Las métricas simplemente no se muestran si falla.
    }
  }, []);

  useEffect(() => {
    if (token) fetchStats();
  }, [token, fetchStats]);

  const handleFilterChange = (key: string) => {
    setFilter(key);
    setPage(1);
  };

  const handleBulkStatus = async () => {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      const res = await apiPost('/admin/properties/bulk-status/', {
        ids: Array.from(selectedIds),
        status: bulkStatus,
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || 'No se pudieron actualizar las propiedades');
      toast.success(`${result.updated} propiedades actualizadas`);
      setSelectedIds(new Set());
      await Promise.all([fetchProperties(), fetchStats()]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBulkSaving(false);
    }
  };

  const handleDelete = async (prop: PropertyItem) => {
    try {
      const res = await apiDelete(`/admin/properties/${prop.id}/`);
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Propiedad eliminada');
      fetchProperties();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message);
    }
    setConfirmDelete(null);
  };

  const openTransfer = useCallback((prop: PropertyItem) => {
    setTransferring(prop);
    setTransferEmail('');
  }, []);

  const handleTransfer = async () => {
    if (!transferring) return;
    setTransferSaving(true);
    try {
      const res = await apiPost(`/admin/properties/${transferring.id}/transfer-owner/`, {
        email: transferEmail.trim(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'No se pudo cambiar el propietario');
      }
      toast.success('Propiedad transferida');
      setTransferring(null);
      fetchProperties();
      fetchStats();
    } catch (error: any) {
      toast.error(error.message || 'No se pudo cambiar el propietario');
    } finally {
      setTransferSaving(false);
    }
  };

  const openEdit = useCallback(async (prop: PropertyItem) => {
    setEditing(prop);
    setEditForm({
      status: prop.status,
      title: prop.title || '',
      price: prop.price != null ? String(prop.price) : '',
      city: prop.city || '',
      description: '',
    });
    setEditDetailLoading(true);
    try {
      const res = await apiGet(`/admin/properties/${prop.id}/`);
      if (res.ok) {
        const detail = await res.json();
        setEditForm((f) => ({ ...f, description: detail.description || '' }));
      }
    } catch {
      // Si falla la carga del detalle, se edita igual sin descripción precargada.
    } finally {
      setEditDetailLoading(false);
    }
  }, []);

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await apiPatch(`/admin/properties/${editing.id}/`, {
        status: editForm.status,
        title: editForm.title,
        price: editForm.price,
        city: editForm.city,
        description: editForm.description,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || 'Error al actualizar la propiedad');
      }
      toast.success('Propiedad actualizada');
      setEditing(null);
      fetchProperties();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<ColumnDef<PropertyItem>[]>(
    () => [
      {
        id: 'select',
        header: () => {
          const pageIds = properties.map((property) => property.id);
          const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
          const someSelected = pageIds.some((id) => selectedIds.has(id));
          return (
            <Checkbox
              aria-label="Seleccionar todas las propiedades de esta página"
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              onCheckedChange={(checked) => setSelectedIds((current) => {
                const next = new Set(current);
                pageIds.forEach((id) => checked ? next.add(id) : next.delete(id));
                return next;
              })}
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Seleccionar ${row.original.title || `propiedad ${row.original.id}`}`}
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={(checked) => setSelectedIds((current) => {
              const next = new Set(current);
              if (checked) next.add(row.original.id);
              else next.delete(row.original.id);
              return next;
            })}
          />
        ),
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <SortHeader column={column} label="Título" />,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex min-w-0 items-center gap-2.5">
              {p.thumbnail_url ? (
                <PropertyImage
                  src={p.thumbnail_url}
                  alt={p.title || `Propiedad #${p.id}`}
                  fill
                  sizes="40px"
                  className="object-cover"
                  wrapperClassName="h-10 w-10 flex-shrink-0 rounded-md"
                />
              ) : (
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-muted text-textSecondary">
                  <ImageOff className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="max-w-[220px] truncate font-medium text-textPrimary">{p.title || `Propiedad #${p.id}`}</p>
                <p className="text-xs text-textSecondary">
                  <span className="sm:hidden">{getPropertyTypeLabel(p.property_type)} · </span>
                  {p.image_count} foto{p.image_count === 1 ? '' : 's'} · {p.is_imported ? p.source_name || 'Importada' : 'Usuario'}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'property_type',
        header: 'Tipo',
        cell: ({ getValue }) => (
          <span className="text-textSecondary">{getPropertyTypeLabel(getValue<string>())}</span>
        ),
        meta: { className: 'hidden sm:table-cell' },
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ getValue }) => {
          const s = getValue<string>();
          return (
            <Badge variant="outline" className={cn('border-transparent', getStatusBadgeClass(s))}>
              {getStatusLabel(s)}
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
                aria-label="Vista previa rápida"
                className="rounded-button p-2 text-primary transition-colors hover:bg-primaryLight"
              >
                <Eye className="h-4 w-4" aria-hidden />
              </button>
              <button
                onClick={() => openEdit(p)}
                title="Editar"
                aria-label="Editar"
                className="rounded-button p-2 text-textSecondary transition-colors hover:bg-muted hover:text-textPrimary"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
              <Link
                href={`/property/${p.id}`}
                target="_blank"
                title="Abrir en pestaña nueva"
                aria-label="Abrir en pestaña nueva"
                className="rounded-button p-2 text-textSecondary transition-colors hover:bg-muted hover:text-textPrimary"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
              </Link>
              <button
                onClick={() => openTransfer(p)}
                title="Cambiar propietario"
                aria-label="Cambiar propietario"
                data-testid="transfer-owner-action"
                className="rounded-button p-2 text-textSecondary transition-colors hover:bg-muted hover:text-textPrimary"
              >
                <UserRoundCog className="h-4 w-4" aria-hidden />
              </button>
              <button
                onClick={() => setConfirmDelete(p)}
                title="Eliminar"
                aria-label="Eliminar"
                className="rounded-button p-2 text-red-500 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        },
      },
    ],
    [openEdit, openTransfer, properties, selectedIds]
  );

  const table = useReactTable({
    data: properties,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100dvh-var(--app-header-height))] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-textPrimary">Gestión de Propiedades</h1>
              <p className="mt-1 text-sm text-textSecondary">Modera y administra los listados publicados.</p>
            </div>

            {/* Métricas globales */}
            <div className="mb-6 flex flex-nowrap gap-3 overflow-x-auto pb-2">
              {stats ? (
                <>
                  <MetricTile icon={Building2} label="Total" value={stats.total} tone="primary" />
                  <MetricTile icon={Tag} label="En venta" value={stats.for_sale} tone="green" />
                  <MetricTile icon={KeyRound} label="En alquiler" value={stats.for_rent} tone="amber" />
                  <MetricTile icon={EyeOff} label="Inactivas" value={stats.inactive} tone="slate" />
                  <MetricTile icon={CheckCircle2} label="Activas" value={stats.active} tone="green" />
                  <MetricTile icon={ImageOff} label="Sin imágenes" value={stats.without_images} tone="slate" active={quality === 'without_images'} onClick={() => { setQuality(quality === 'without_images' ? 'all' : 'without_images'); setPage(1); }} />
                  <MetricTile icon={DownloadCloud} label="Importadas" value={stats.imported} tone="primary" />
                  <MetricTile icon={UserRound} label="De usuarios" value={stats.users} tone="green" />
                </>
              ) : (
                Array.from({ length: 6 }).map((_, i) => (
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
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
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
                    onClick={() => handleFilterChange(f.key)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface p-2">
              <span className="px-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">Origen</span>
              {([
                ['all', 'Todas'],
                ['imported', 'Importadas de portales'],
                ['users', 'Publicadas por usuarios'],
              ] as const).map(([key, label]) => (
                <Button
                  key={key}
                  variant={origin === key ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-button"
                  onClick={() => { setOrigin(key); setPage(1); }}
                >
                  {key === 'imported' && <DownloadCloud className="mr-1.5 h-4 w-4" />}
                  {key === 'users' && <UserRound className="mr-1.5 h-4 w-4" />}
                  {label}
                </Button>
              ))}
            </div>

            <div className="mb-6 rounded-card border border-line bg-surface p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Calidad del catálogo</span>
                {quality !== 'all' && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() => { setQuality('all'); setPage(1); }}
                  >
                    Limpiar filtro
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {stats && ([
                  ['without_images', 'Sin imágenes', stats.without_images, ImageOff],
                  ['without_location', 'Sin ubicación', stats.without_location, MapPinOff],
                  ['without_price', 'Sin precio', stats.without_price, CircleDollarSign],
                  ['duplicates', 'Duplicadas', stats.duplicates, GitMerge],
                  ['incomplete', 'Incompletas', stats.incomplete, EyeOff],
                ] as const).map(([key, label, count, Icon]) => (
                  <Button
                    key={key}
                    variant={quality === key ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-button"
                    onClick={() => { setQuality(quality === key ? 'all' : key); setPage(1); }}
                  >
                    <Icon className="mr-1.5 h-4 w-4" />
                    {label}
                    <span className={cn('ml-2 rounded-full px-1.5 py-0.5 text-[11px]', quality === key ? 'bg-white/20' : 'bg-muted')}>
                      {count.toLocaleString('es-EC')}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="sticky top-[calc(var(--app-header-height)+0.5rem)] z-10 mb-4 flex flex-col gap-3 rounded-card border border-primary/20 bg-surface p-3 shadow-card sm:flex-row sm:items-center">
                <p className="text-sm font-semibold text-textPrimary">
                  {selectedIds.size} {selectedIds.size === 1 ? 'propiedad seleccionada' : 'propiedades seleccionadas'}
                </p>
                <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
                  <Select value={bulkStatus} onValueChange={setBulkStatus}>
                    <SelectTrigger className="h-9 w-[170px] rounded-button border-line">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="for_sale">Poner en venta</SelectItem>
                      <SelectItem value="for_rent">Poner en alquiler</SelectItem>
                      <SelectItem value="inactive">Desactivar</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="rounded-button" disabled={bulkSaving} onClick={handleBulkStatus}>
                    {bulkSaving ? 'Actualizando…' : 'Aplicar estado'}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-button" disabled={bulkSaving} onClick={() => setSelectedIds(new Set())}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Table */}
            <Card className="overflow-hidden rounded-card shadow-card">
              {loading ? (
                <TableSkeleton cols={8} />
              ) : properties.length === 0 ? (
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
                {preview.thumbnail_url && (
                  <PropertyImage
                    src={preview.thumbnail_url}
                    alt={preview.title || `Propiedad #${preview.id}`}
                    fill
                    sizes="400px"
                    className="object-cover"
                    wrapperClassName="h-40 w-full rounded-card"
                  />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn('border-transparent', getStatusBadgeClass(preview.status))}
                  >
                    {getStatusLabel(preview.status)}
                  </Badge>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-textSecondary">
                    {getPropertyTypeLabel(preview.property_type)}
                  </span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-textSecondary">
                    {preview.image_count} foto{preview.image_count === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="font-geo text-2xl font-semibold text-primary tabular-nums">
                  ${Number(preview.price).toLocaleString('es-EC')}
                </div>

                <p className="flex items-center gap-1.5 text-sm text-textSecondary">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
                  {[preview.address, preview.city].filter(Boolean).join(', ') || 'Sin ubicación'}
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
                  <div>
                    <dt className="text-xs text-textSecondary">Vistas</dt>
                    <dd className="font-medium text-textPrimary">{preview.views_count}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-textSecondary">Área</dt>
                    <dd className="font-medium text-textPrimary">{preview.area ? `${preview.area} m²` : '—'}</dd>
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
                    <Link href={`/property/${preview.id}`} target="_blank">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Ver completa
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-button"
                    onClick={() => { const p = preview; setPreview(null); openEdit(p); }}
                  >
                    <Pencil className="h-4 w-4" />
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

      {/* Editar propiedad */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="rounded-modal sm:max-w-md">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6 text-left text-base">
                  Editar {editing.title || `propiedad #${editing.id}`}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-status">Estado</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger id="edit-status" className="rounded-button border-line">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent className="rounded-card">
                      <SelectItem value="for_sale">En venta</SelectItem>
                      <SelectItem value="for_rent">En alquiler</SelectItem>
                      <SelectItem value="inactive">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-title">Título</Label>
                  <Input
                    id="edit-title"
                    className="rounded-input"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-price">Precio</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      className="rounded-input"
                      value={editForm.price}
                      onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-city">Ciudad</Label>
                    <Input
                      id="edit-city"
                      className="rounded-input"
                      value={editForm.city}
                      onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-description">Descripción</Label>
                  {editDetailLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <Textarea
                      id="edit-description"
                      rows={4}
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-button" onClick={() => setEditing(null)} disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  className="rounded-button"
                  onClick={handleSaveEdit}
                  disabled={saving || editDetailLoading}
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!transferring} onOpenChange={(o) => { if (!o) setTransferring(null); }}>
        <DialogContent className="max-w-lg rounded-modal">
          {transferring && (
            <>
              <DialogHeader>
                <DialogTitle>Cambiar propietario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-card border border-line p-3 text-sm">
                  <p className="font-medium text-textPrimary">{transferring.title || `Propiedad #${transferring.id}`}</p>
                  <p className="text-textSecondary">
                    Ahora: {transferring.owner_username || transferring.owner_email || 'sin propietario'}
                  </p>
                </div>
                <div>
                  <Label htmlFor="transfer-email">Correo de quien la recibe</Label>
                  <Input
                    id="transfer-email"
                    type="email"
                    autoComplete="off"
                    placeholder="persona@ejemplo.com"
                    value={transferEmail}
                    onChange={(e) => setTransferEmail(e.target.value)}
                  />
                </div>
                <p className="text-xs text-textSecondary">
                  Si ese correo no tiene cuenta, se crea una y se le envía un enlace para definir su
                  contraseña. Los mensajes de personas interesadas pasan con la propiedad, y quien la tenía
                  deja de verlos.
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="rounded-button"
                  onClick={() => setTransferring(null)}
                  disabled={transferSaving}
                >
                  Cancelar
                </Button>
                <Button
                  className="rounded-button"
                  onClick={handleTransfer}
                  disabled={transferSaving || !transferEmail.trim()}
                >
                  {transferSaving ? 'Transfiriendo...' : 'Transferir'}
                </Button>
              </DialogFooter>
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
  active = false,
  onClick,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  tone: 'primary' | 'green' | 'amber' | 'slate';
  active?: boolean;
  onClick?: () => void;
}) {
  const toneClass = {
    primary: 'bg-primaryLight text-primary',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  }[tone];
  const content = (
    <>
      <span className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-card', toneClass)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="font-geo text-xl font-bold tabular-nums text-textPrimary">
          {value.toLocaleString('es-EC')}
        </div>
        <div className="truncate text-xs text-textSecondary">{label}</div>
      </div>
    </>
  );
  const className = cn(
    'flex min-w-[150px] flex-none items-center gap-3 rounded-card border bg-surface p-3 text-left shadow-card',
    active ? 'border-primary ring-2 ring-primary/10' : 'border-line',
    onClick && 'transition-colors hover:border-primary/40 hover:bg-primaryLight/20'
  );
  return onClick ? <button type="button" className={className} onClick={onClick}>{content}</button> : <div className={className}>{content}</div>;
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
