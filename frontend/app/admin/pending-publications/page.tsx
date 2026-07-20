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
import { ArrowUpDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';

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

export default function PendingPublicationsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<PendingPublication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PendingPublication | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/pending-publications/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar pendientes');
      const json = await res.json();
      setItems(json.results || json || []);
    } catch (error: any) {
      toast.error(error.message || 'Error al cargar pendientes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchItems();
  }, [token, fetchItems]);

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
    return `https://wa.me/${item.contact_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
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
          return (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="rounded-button" onClick={() => setSelected(item)}>
                <Eye className="h-4 w-4" /> Ver
              </Button>
              {item.contact_phone && (
                <Button asChild size="sm" className="rounded-button">
                  <a href={whatsappUrl(item)} target="_blank" rel="noreferrer">WhatsApp</a>
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

            <Card className="overflow-hidden rounded-card shadow-card">
              {loading ? (
                <TableSkeleton cols={6} />
              ) : items.length === 0 ? (
                <div className="py-12 text-center text-textSecondary">No hay solicitudes pendientes</div>
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
                <pre className="max-h-56 overflow-auto rounded-card border border-line bg-muted/40 p-4 text-xs">
                  {JSON.stringify(selected.draft || {}, null, 2)}
                </pre>
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
