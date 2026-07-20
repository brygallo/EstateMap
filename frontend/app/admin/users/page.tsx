'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  Power,
  PowerOff,
  ShieldCheck,
  Trash2,
  Activity,
  Clock3,
  Eye,
  MousePointerClick,
  UserPlus,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';

interface UserItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_email_verified: boolean;
  date_joined: string;
  last_login: string | null;
  avatar_url: string | null;
  properties_count: number;
  activity_count: number;
  contact_clicks_count: number;
  oauth_provider?: string | null;
  recent_activity?: ActivityEvent[];
  properties?: UserProperty[];
}

interface UserProperty {
  id: number;
  title: string;
  status: string;
  property_type: string;
  price: number | string | null;
  rent_price: number | string | null;
  city: string;
  province: string;
  created_at: string;
  views_count?: number;
}

interface ActivityEvent {
  id: number;
  event_name: string;
  property: number | null;
  property_title: string | null;
  path: string;
  payload: Record<string, unknown>;
  created_at: string;
}

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'inactive', label: 'Inactivos' },
  { key: 'staff', label: 'Staff' },
];

const displayName = (u: UserItem) =>
  u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username;

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' }) : 'Nunca';

const isNewUser = (user: UserItem) => Date.now() - new Date(user.date_joined).getTime() <= 7 * 24 * 60 * 60 * 1000;

const EVENT_LABELS: Record<string, string> = {
  publication_form_viewed: 'Vio el formulario de publicación',
  publication_form_started: 'Empezó a publicar',
  publication_submit_attempted: 'Intentó publicar',
  publication_created: 'Publicación completada',
  publication_create_failed: 'Error al publicar',
  publication_exit_confirmed: 'Abandonó el formulario',
  publication_pending_saved: 'Borrador pendiente guardado',
  property_contact_clicked: 'Hizo clic en contactar',
  property_pin_clicked: 'Abrió una propiedad desde el mapa',
  property_card_details_opened: 'Abrió el detalle de una propiedad',
};

const hasUnfinishedPublication = (events: ActivityEvent[] = []) => {
  const publicationEvents = events.filter((event) => event.event_name.startsWith('publication_'));
  const latestStart = publicationEvents.find((event) => ['publication_form_started', 'publication_submit_attempted'].includes(event.event_name));
  if (!latestStart) return false;
  return !publicationEvents.some((event) => event.event_name === 'publication_created' && new Date(event.created_at) >= new Date(latestStart.created_at));
};

const AdminUsersPage = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState<{ type: string; user: UserItem } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openUserDetail = useCallback(async (user: UserItem) => {
    setSelectedUser(user);
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setSelectedUser(await res.json());
    } catch {
      toast.error('No se pudo cargar el detalle del usuario');
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  const fetchUsers = useCallback(async (pageNum: number, searchValue: string, filterValue: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));
      params.set('page_size', '20');
      if (searchValue) params.set('search', searchValue);

      if (filterValue === 'active') {
        params.set('is_active', 'true');
      } else if (filterValue === 'inactive') {
        params.set('is_active', 'false');
      } else if (filterValue === 'staff') {
        params.set('is_staff', 'true');
      }

      const res = await fetch(`${API_URL}/admin/users/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const json = await res.json();

      setUsers(json.results || []);
      setTotalPages(Math.ceil(json.count / 20) || 1);
    } catch (err) {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      if (token) fetchUsers(1, search, filter);
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [token, search, filter, fetchUsers]);

  useEffect(() => {
    if (token && page > 1) {
      fetchUsers(page, search, filter);
    }
  }, [page, token, fetchUsers, search, filter]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const isSelf = useCallback(
    (u: UserItem) => String(u.id) === String(currentUser?.id),
    [currentUser]
  );

  const handleToggleActive = async (user: UserItem) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (!res.ok) {
        throw new Error();
      }
      toast.success(`Usuario ${!user.is_active ? 'activado' : 'desactivado'}`);
      fetchUsers(page, search, filter);
    } catch {
      toast.error('Error al cambiar estado del usuario');
    }
    setConfirmAction(null);
  };

  const handleToggleStaff = async (user: UserItem) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_staff: !user.is_staff }),
      });
      if (!res.ok) {
        throw new Error();
      }
      toast.success(`Rol admin ${!user.is_staff ? 'otorgado' : 'revocado'}`);
      fetchUsers(page, search, filter);
    } catch {
      toast.error('Error al cambiar rol del usuario');
    }
    setConfirmAction(null);
  };

  const handleDeleteUser = async (user: UserItem) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${user.id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error();
      }
      toast.success('Usuario eliminado');
      fetchUsers(page, search, filter);
    } catch {
      toast.error('Error al eliminar el usuario');
    }
    setConfirmAction(null);
  };

  const columns = useMemo<ColumnDef<UserItem>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (u) => displayName(u),
        header: ({ column }) => <SortHeader column={column} label="Usuario" />,
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-textPrimary">{displayName(u)}</p>
                {isNewUser(u) && (
                  <Badge className="mt-1 border-transparent bg-blue-100 px-1.5 py-0 text-[10px] text-blue-700">Nuevo</Badge>
                )}
                <p className="truncate text-xs text-textSecondary sm:hidden">{u.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'last_login',
        header: ({ column }) => <SortHeader column={column} label="Último acceso" />,
        cell: ({ getValue }) => (
          <span className="text-xs text-textSecondary">{formatDateTime(getValue<string | null>())}</span>
        ),
        meta: { className: 'hidden xl:table-cell' },
      },
      {
        accessorKey: 'email',
        header: ({ column }) => <SortHeader column={column} label="Email" />,
        cell: ({ getValue }) => <span className="text-textSecondary">{getValue<string>()}</span>,
        meta: { className: 'hidden sm:table-cell' },
      },
      {
        accessorKey: 'date_joined',
        header: ({ column }) => <SortHeader column={column} label="Registro" />,
        cell: ({ getValue }) => (
          <span className="text-textSecondary">
            {new Date(getValue<string>()).toLocaleDateString('es-EC')}
          </span>
        ),
        meta: { className: 'hidden md:table-cell' },
      },
      {
        accessorKey: 'is_active',
        header: 'Estado',
        cell: ({ getValue }) => {
          const active = getValue<boolean>();
          return (
            <Badge variant="outline" className={cn('border-transparent', active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
              {active ? 'Activo' : 'Inactivo'}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'is_staff',
        header: 'Rol',
        cell: ({ getValue }) =>
          getValue<boolean>() ? (
            <Badge variant="outline" className="border-transparent bg-purple-100 text-purple-700">Admin</Badge>
          ) : (
            <span className="text-xs text-textSecondary">Usuario</span>
          ),
        meta: { className: 'hidden lg:table-cell' },
      },
      {
        accessorKey: 'properties_count',
        header: ({ column }) => <SortHeader column={column} label="Props." />,
        cell: ({ getValue }) => <span className="font-geo text-textSecondary">{getValue<number>()}</span>,
        meta: { className: 'hidden lg:table-cell' },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Acciones</div>,
        cell: ({ row }) => {
          const u = row.original;
          const self = isSelf(u);
          return (
            <div className="flex items-center justify-end gap-1">
              <ActionButton
                title="Ver detalle y actividad"
                onClick={() => openUserDetail(u)}
                className="text-primary hover:bg-primary/10"
              >
                <Eye className="h-4 w-4" />
              </ActionButton>
              <ActionButton
                title={u.is_active ? 'Desactivar' : 'Activar'}
                disabled={self}
                onClick={() => setConfirmAction({ type: 'toggle_active', user: u })}
                className={u.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}
              >
                {u.is_active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
              </ActionButton>
              <ActionButton
                title={u.is_staff ? 'Revocar admin' : 'Otorgar admin'}
                disabled={self}
                onClick={() => setConfirmAction({ type: 'toggle_staff', user: u })}
                className={u.is_staff ? 'text-purple-600 hover:bg-purple-50' : 'text-textSecondary hover:bg-muted'}
              >
                <ShieldCheck className="h-4 w-4" />
              </ActionButton>
              <ActionButton
                title="Eliminar"
                disabled={self}
                onClick={() => setConfirmAction({ type: 'delete', user: u })}
                className="text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </ActionButton>
            </div>
          );
        },
      },
    ],
    [isSelf, openUserDetail]
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const confirmMeta = confirmAction && {
    title:
      confirmAction.type === 'delete'
        ? 'Eliminar usuario'
        : confirmAction.type === 'toggle_active'
        ? confirmAction.user.is_active
          ? 'Desactivar usuario'
          : 'Activar usuario'
        : confirmAction.user.is_staff
        ? 'Revocar rol admin'
        : 'Otorgar rol admin',
    destructive: confirmAction.type === 'delete',
  };

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100vh-3rem)] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-textPrimary">Gestión de Usuarios</h1>
              <p className="mt-1 text-sm text-textSecondary">Administra las cuentas del portal.</p>
            </div>

            {/* Search & Filters */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
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

            {/* Table */}
            <Card className="overflow-hidden rounded-card shadow-card">
              {loading ? (
                <TableSkeleton cols={7} />
              ) : users.length === 0 ? (
                <div className="py-12 text-center text-textSecondary">No se encontraron usuarios</div>
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

      {/* Confirmation */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => { if (!o) setConfirmAction(null); }}>
        <AlertDialogContent className="rounded-modal">
          {confirmAction && confirmMeta && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmMeta.title}</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmAction.type === 'delete' && (
                    <>¿Estás seguro de eliminar a <strong>{confirmAction.user.first_name || confirmAction.user.username}</strong>? Esta acción no se puede deshacer y eliminará todas sus propiedades.</>
                  )}
                  {confirmAction.type === 'toggle_active' && (
                    <>¿{confirmAction.user.is_active ? 'Desactivar' : 'Activar'} la cuenta de <strong>{confirmAction.user.first_name || confirmAction.user.username}</strong>?</>
                  )}
                  {confirmAction.type === 'toggle_staff' && (
                    <>¿{confirmAction.user.is_staff ? 'Revocar' : 'Otorgar'} permisos de administrador a <strong>{confirmAction.user.first_name || confirmAction.user.username}</strong>?</>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-button">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className={cn('rounded-button', confirmMeta.destructive && 'bg-error text-white hover:bg-error/90')}
                  onClick={() => {
                    if (confirmAction.type === 'delete') handleDeleteUser(confirmAction.user);
                    else if (confirmAction.type === 'toggle_active') handleToggleActive(confirmAction.user);
                    else if (confirmAction.type === 'toggle_staff') handleToggleStaff(confirmAction.user);
                  }}
                >
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Detalle del usuario</SheetTitle>
            <SheetDescription>Cuenta, accesos y actividad reciente dentro de la plataforma.</SheetDescription>
          </SheetHeader>
          {selectedUser && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-3 rounded-card border border-line bg-white p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {(selectedUser.first_name?.[0] || selectedUser.username[0]).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-textPrimary">{displayName(selectedUser)}</p>
                    {isNewUser(selectedUser) && <Badge className="bg-blue-100 text-blue-700">Usuario nuevo</Badge>}
                  </div>
                  <p className="truncate text-sm text-textSecondary">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Metric label="Registro" value={formatDateTime(selectedUser.date_joined)} icon={UserPlus} />
                <Metric label="Último acceso" value={formatDateTime(selectedUser.last_login)} icon={Clock3} />
                <Metric label="Actividades" value={String(selectedUser.activity_count || 0)} icon={Activity} />
                <Metric label="Clics de contacto" value={String(selectedUser.contact_clicks_count || 0)} icon={MousePointerClick} />
              </div>

              <div className="rounded-card border border-line bg-white p-4">
                <h3 className="text-sm font-semibold text-textPrimary">Datos de la cuenta</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <AccountLine label="Usuario" value={`@${selectedUser.username}`} />
                  <AccountLine label="ID" value={`#${selectedUser.id}`} />
                  <AccountLine label="Estado" value={selectedUser.is_active ? 'Cuenta activa' : 'Cuenta desactivada'} />
                  <AccountLine label="Rol" value={selectedUser.is_staff ? 'Administrador' : 'Usuario'} />
                  <AccountLine label="Correo" value={selectedUser.is_email_verified ? 'Verificado' : 'Sin verificar'} />
                  <AccountLine label="Acceso" value={selectedUser.oauth_provider ? `OAuth · ${selectedUser.oauth_provider}` : 'Correo y contraseña'} />
                </div>
              </div>

              {!detailLoading && hasUnfinishedPublication(selectedUser.recent_activity) && (
                <div className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Publicación posiblemente incompleta</p>
                  <p className="mt-1 text-amber-800">El usuario empezó o intentó publicar, pero no se registró una publicación completada después.</p>
                </div>
              )}

              <div>
                <h3 className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold text-textPrimary">
                  <span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Propiedades del usuario</span>
                  <Badge variant="outline">{selectedUser.properties_count || 0}</Badge>
                </h3>
                {detailLoading ? (
                  <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
                ) : selectedUser.properties?.length ? (
                  <div className="space-y-2">
                    {selectedUser.properties.map((property) => {
                      const amount = property.price || property.rent_price;
                      return (
                        <div key={property.id} className="rounded-card border border-line bg-white p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-textPrimary">{property.title || `Propiedad #${property.id}`}</p>
                              <p className="mt-1 text-xs text-textSecondary">{property.city || property.province || 'Sin ubicación'} · {formatDateTime(property.created_at)}</p>
                              <p className="mt-1 text-sm font-semibold text-primary">{amount ? `$${Number(amount).toLocaleString('es-EC')}${property.rent_price && !property.price ? '/mes' : ''}` : 'Precio no registrado'}</p>
                            </div>
                            <Badge variant="outline">{property.status || 'Sin estado'}</Badge>
                          </div>
                          <a href={`/property/${property.id}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                            Abrir propiedad <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-card border border-dashed border-line p-5 text-center text-sm text-textSecondary">Este usuario todavía no tiene propiedades.</p>
                )}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-textPrimary">Actividad reciente</h3>
                {detailLoading ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div>
                ) : selectedUser.recent_activity?.length ? (
                  <div className="space-y-2">
                    {selectedUser.recent_activity.map((event) => (
                      <div key={event.id} className="rounded-card border border-line bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-textPrimary">{EVENT_LABELS[event.event_name] || event.event_name}</p>
                            {event.property && (
                              <p className="mt-0.5 truncate text-xs text-primary">
                                Propiedad #{event.property}{event.property_title ? ` · ${event.property_title}` : ''}
                              </p>
                            )}
                            {event.path && <p className="mt-0.5 truncate text-xs text-textSecondary">{event.path}</p>}
                          </div>
                          <span className="shrink-0 text-[11px] text-textSecondary">{formatDateTime(event.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-card border border-dashed border-line p-5 text-center text-sm text-textSecondary">Aún no hay actividad registrada.</p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminRoute>
  );
};

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

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return (
    <div className="rounded-card border border-line bg-white p-3">
      <Icon className="mb-2 h-4 w-4 text-primary" aria-hidden />
      <p className="text-[11px] font-medium uppercase tracking-wide text-textSecondary">{label}</p>
      <p className="mt-1 text-sm font-semibold text-textPrimary">{value}</p>
    </div>
  );
}

function AccountLine({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] uppercase tracking-wide text-textSecondary">{label}</p><p className="mt-0.5 break-words font-medium text-textPrimary">{value}</p></div>;
}

function ActionButton({
  title,
  disabled,
  onClick,
  className,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-button p-1.5 transition-colors',
        disabled ? 'cursor-not-allowed text-slate-300' : className
      )}
    >
      {children}
    </button>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: 6 }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-5', c === 0 ? 'w-40' : 'w-20', c === cols - 1 && 'ml-auto')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default AdminUsersPage;
