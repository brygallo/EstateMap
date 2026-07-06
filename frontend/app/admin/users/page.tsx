'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
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
  Power,
  PowerOff,
  ShieldCheck,
  Trash2,
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
  avatar_url: string | null;
  properties_count: number;
}

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'inactive', label: 'Inactivos' },
  { key: 'staff', label: 'Staff' },
];

const displayName = (u: UserItem) =>
  u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username;

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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));

      const res = await fetch(`${API_URL}/admin/users/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar usuarios');
      const json = await res.json();

      if (json.results) {
        setUsers(json.results);
        setTotalPages(Math.ceil(json.count / (json.results.length || 10)) || 1);
      } else {
        setUsers(Array.isArray(json) ? json : []);
        setTotalPages(1);
      }
    } catch {
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [token, search, page]);

  useEffect(() => {
    if (token) fetchUsers();
  }, [token, fetchUsers]);

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        if (filter === 'active') return u.is_active;
        if (filter === 'inactive') return !u.is_active;
        if (filter === 'staff') return u.is_staff;
        return true;
      }),
    [users, filter]
  );

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
        const err = await res.json();
        throw new Error(err.error || 'Error');
      }
      toast.success(`Usuario ${!user.is_active ? 'activado' : 'desactivado'}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
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
        const err = await res.json();
        throw new Error(err.error || 'Error');
      }
      toast.success(`Rol admin ${!user.is_staff ? 'otorgado' : 'revocado'}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
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
        const err = await res.json();
        throw new Error(err.error || 'Error');
      }
      toast.success('Usuario eliminado');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
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
                <p className="truncate text-xs text-textSecondary sm:hidden">{u.email}</p>
              </div>
            </div>
          );
        },
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
    [isSelf]
  );

  const table = useReactTable({
    data: filteredUsers,
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
                <TableSkeleton cols={7} />
              ) : filteredUsers.length === 0 ? (
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
