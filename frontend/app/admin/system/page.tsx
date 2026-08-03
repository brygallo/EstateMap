'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleX, RefreshCw, ServerCog, TimerReset } from 'lucide-react';
import { toast } from 'sonner';
import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';

type ComponentState = {
  status: 'healthy' | 'error' | 'stale' | 'unknown';
  label: string;
  age_seconds?: number | null;
  failed?: number;
  pending_old?: number;
  stalled?: number;
  failed_24h?: number;
};

type Incident = {
  id: number;
  kind: string;
  severity: 'critical' | 'error' | 'warning';
  status_code: number;
  method: string;
  path: string;
  message: string;
  request_id: string;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
};

type SystemStatus = {
  status: 'healthy' | 'degraded' | 'error';
  components: Record<string, ComponentState>;
  alerts: Array<{ component: string; severity: string; title: string }>;
  incidents: Incident[];
  generated_at: string;
};

const STATUS_LABEL = {
  healthy: 'Saludable',
  degraded: 'Degradado',
  error: 'Con error',
  stale: 'Atrasado',
  unknown: 'Sin confirmar',
};

export default function AdminSystemPage() {
  const { token } = useAuth();
  const [data, setData] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/system-status/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      toast.error('No se pudo consultar el estado del sistema.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolveIncident = async (incidentId: number) => {
    if (!token) return;
    setResolving(incidentId);
    try {
      const response = await fetch(`${API_URL}/admin/system-status/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_id: incidentId, resolved: true }),
      });
      if (!response.ok) throw new Error();
      toast.success('Incidencia marcada como resuelta.');
      await load();
    } catch {
      toast.error('No se pudo actualizar la incidencia.');
    } finally {
      setResolving(null);
    }
  };

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100vh-3rem)] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Operaciones</p>
                <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-textPrimary"><ServerCog className="h-6 w-6" /> Estado del sistema</h1>
                <p className="mt-1 text-sm text-textSecondary">Servicios, procesamiento y errores agrupados sin almacenar datos sensibles.</p>
              </div>
              <Button variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Actualizar
              </Button>
            </div>

            {loading && !data ? <LoadingState /> : data && (
              <>
                <Card className={cn(
                  'mb-5 border-2',
                  data.status === 'healthy' && 'border-green-200 bg-green-50',
                  data.status === 'degraded' && 'border-amber-200 bg-amber-50',
                  data.status === 'error' && 'border-red-200 bg-red-50',
                )}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Estado general</p>
                      <p className="mt-1 text-xl font-bold text-textPrimary">{STATUS_LABEL[data.status]}</p>
                    </div>
                    <p className="text-xs text-textSecondary">Actualizado {new Date(data.generated_at).toLocaleString('es-EC')}</p>
                  </CardContent>
                </Card>

                <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {Object.entries(data.components).map(([key, component]) => (
                    <ComponentCard key={key} component={component} />
                  ))}
                </div>

                {data.alerts.length > 0 && (
                  <Card className="mb-6 border-amber-200">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-600" /> Alertas activas</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {data.alerts.map((alert) => (
                        <div key={`${alert.component}-${alert.title}`} className="rounded-button bg-amber-50 px-3 py-2 text-sm text-amber-900">{alert.title}</div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                <Card className="overflow-hidden">
                  <CardHeader className="border-b border-line">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>Errores sin resolver</span>
                      <Badge variant="outline">{data.incidents.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {data.incidents.length === 0 ? (
                      <div className="p-10 text-center text-sm text-textSecondary"><CheckCircle2 className="mx-auto mb-2 h-7 w-7 text-green-600" />No hay errores pendientes.</div>
                    ) : data.incidents.map((incident) => (
                      <div key={incident.id} className="border-b border-line p-4 last:border-0">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                          <CircleX className="h-5 w-5 shrink-0 text-red-600" />
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-sm font-semibold text-textPrimary">{incident.status_code} · {incident.method} {incident.path}</p>
                            <p className="mt-1 text-xs text-textSecondary">{incident.message} · ID {incident.request_id || 'sin ID'} · última vez {new Date(incident.last_seen_at).toLocaleString('es-EC')}</p>
                          </div>
                          <Badge variant="outline" className="shrink-0">{incident.occurrences} ocurrencias</Badge>
                          <Button size="sm" variant="outline" disabled={resolving === incident.id} onClick={() => void resolveIncident(incident.id)}>
                            <CheckCircle2 className="h-4 w-4" /> Marcar resuelto
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </AdminRoute>
  );
}

function ComponentCard({ component }: { component: ComponentState }) {
  const healthy = component.status === 'healthy';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          {healthy ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <TimerReset className="h-5 w-5 text-amber-600" />}
          <Badge variant="outline" className={healthy ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-800'}>
            {STATUS_LABEL[component.status]}
          </Badge>
        </div>
        <p className="mt-3 text-sm font-semibold text-textPrimary">{component.label}</p>
        <p className="mt-1 text-xs text-textSecondary">{componentDetail(component)}</p>
      </CardContent>
    </Card>
  );
}

function componentDetail(component: ComponentState) {
  if (component.age_seconds != null) return `Señal hace ${component.age_seconds} s`;
  if (component.failed || component.pending_old) return `${component.failed || 0} fallidas · ${component.pending_old || 0} pendientes antiguas`;
  if (component.stalled || component.failed_24h) return `${component.stalled || 0} estancadas · ${component.failed_24h || 0} fallos en 24 h`;
  return component.status === 'healthy' ? 'Sin incidencias' : 'Requiere verificación';
}

function LoadingState() {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-36" />)}</div>;
}
