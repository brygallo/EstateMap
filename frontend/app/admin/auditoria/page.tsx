'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, RefreshCw, ScrollText, Search } from 'lucide-react';
import { toast } from 'sonner';
import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet } from '@/lib/api';
import { downloadAdminCsv } from '@/lib/admin-export';
import { cn } from '@/lib/utils';

interface AuditEntry {
  id: number;
  action: string;
  action_label: string;
  actor_id: number | null;
  actor_label: string;
  target_type: string;
  target_id: string;
  target_label: string;
  changes: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}

interface AuditPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditEntry[];
  actions: string[];
}

const WINDOWS = [
  { value: '1', label: 'Último día' },
  { value: '7', label: 'Última semana' },
  { value: '30', label: 'Último mes' },
  { value: 'all', label: 'Todo' },
];

// Rojo lo que destruye, ámbar lo que reasigna, gris lo demás. Un listado en el
// que todo pesa igual obliga a leerlo entero para encontrar lo que importa.
const SEVERE_ACTIONS = ['property.purge', 'user.delete', 'property.delete'];
const NOTABLE_ACTIONS = ['property.transfer_owner', 'user.update', 'property.bulk_status', 'export.download'];

export default function AdminAuditPage() {
  const [page, setPage] = useState<AuditPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('all');
  const [days, setDays] = useState('7');
  const [pageNumber, setPageNumber] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pageNumber), page_size: '50' });
      if (query.trim()) params.set('q', query.trim());
      if (action !== 'all') params.set('action', action);
      if (days !== 'all') params.set('days', days);
      const response = await apiGet(`/admin/audit/?${params.toString()}`);
      if (!response.ok) throw new Error();
      setPage(await response.json());
    } catch {
      toast.error('No se pudo cargar la bitácora.');
    } finally {
      setLoading(false);
    }
  }, [pageNumber, query, action, days]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadAdminCsv('audit');
      toast.success('Bitácora exportada.');
    } catch {
      toast.error('No se pudo exportar la bitácora.');
    } finally {
      setExporting(false);
    }
  };

  const entries = page?.results || [];
  const totalPages = page ? Math.max(1, Math.ceil(page.count / 50)) : 1;

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100dvh-var(--app-header-height))] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Operaciones</p>
                <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-textPrimary">
                  <ScrollText className="h-6 w-6" /> Bitácora del panel
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-textSecondary">
                  Quién hizo qué, cuándo y sobre qué. Se conserva dos años y sobrevive a los despliegues,
                  a diferencia del log del contenedor.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void load()} disabled={loading}>
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Actualizar
                </Button>
                <Button variant="outline" onClick={exportCsv} disabled={exporting}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Exportar
                </Button>
              </div>
            </header>

            <Card className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
                  <Input
                    value={query}
                    onChange={(event) => {
                      setPageNumber(1);
                      setQuery(event.target.value);
                    }}
                    placeholder="Buscar por administrador, objetivo o acción"
                    className="pl-9"
                  />
                </div>
                <Select
                  value={action}
                  onValueChange={(value) => {
                    setPageNumber(1);
                    setAction(value);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las acciones</SelectItem>
                    {(page?.actions || []).map((value) => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={days}
                  onValueChange={(value) => {
                    setPageNumber(1);
                    setDays(value);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WINDOWS.map((window) => (
                      <SelectItem key={window.value} value={window.value}>{window.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loading && !page ? (
                <div className="flex h-56 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : entries.length === 0 ? (
                <div className="p-12 text-center text-sm text-textSecondary">
                  No hay acciones registradas con esos filtros.
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {entries.map((entry) => (
                    <article key={entry.id} className="flex flex-col gap-2 p-4 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              'border-0 font-mono text-[11px]',
                              SEVERE_ACTIONS.includes(entry.action)
                                ? 'bg-red-100 text-red-700'
                                : NOTABLE_ACTIONS.includes(entry.action)
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-muted text-textSecondary',
                            )}
                          >
                            {entry.action}
                          </Badge>
                          <span className="truncate font-medium text-textPrimary">
                            {entry.target_label || `${entry.target_type} ${entry.target_id}` || '—'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-textSecondary">
                          {entry.actor_label || 'sistema'} · {new Date(entry.created_at).toLocaleString('es-EC')}
                          {entry.ip ? ` · ${entry.ip}` : ''}
                        </p>
                        {Object.keys(entry.changes || {}).length > 0 && (
                          <p className="mt-1 break-words font-mono text-[11px] text-textSecondary">
                            {Object.entries(entry.changes)
                              .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join(',') : String(value)}`)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-textSecondary">{entry.action_label}</span>
                    </article>
                  ))}
                </div>
              )}

              {page && page.count > 50 && (
                <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
                  <span className="text-textSecondary">{page.count} acciones · página {pageNumber} de {totalPages}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={!page.previous} onClick={() => setPageNumber((n) => n - 1)}>Anterior</Button>
                    <Button size="sm" variant="outline" disabled={!page.next} onClick={() => setPageNumber((n) => n + 1)}>Siguiente</Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </AdminRoute>
  );
}
