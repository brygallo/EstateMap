'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Users,
  Building2,
  Tag,
  KeyRound,
  Ban,
  CheckCircle2,
  Eye,
  Mail,
  Clock,
  UserPlus,
  ImageOff,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  CircleDollarSign,
  DownloadCloud,
  GitMerge,
  MapPinOff,
  ServerCog,
  Activity,
  BarChart3,
  FileText,
  MousePointerClick,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';

interface DashboardData {
  total_users: number;
  total_properties: number;
  properties_for_sale: number;
  properties_for_rent: number;
  properties_inactive: number;
  properties_active: number;
  total_views: number;
  total_leads: number;
  leads_new: number;
  pending_publications: number;
  pending_publications_new: number;
  new_users_30d: number;
  properties_without_images: number;
  properties_incomplete: number;
  quality: {
    without_images: number;
    without_location: number;
    without_price: number;
    duplicates: number;
    inactive: number;
  };
  ingestion: {
    active_runs: number;
    failed_24h: number;
    retired_total: number;
    imported_total: number;
    sources: SourceHealth[];
  };
  owner: OwnerMetrics;
  generated_at: string;
  recent_users: any[];
  recent_properties: any[];
  recent_leads: any[];
}

interface OwnerPeriodMetric {
  value: number;
  change: number;
}

interface OwnerMetrics {
  period: Record<'sessions' | 'new_users' | 'details' | 'contacts' | 'publications', OwnerPeriodMetric>;
  funnel: Array<{ label: string; value: number; rate: number }>;
  trends: Array<{ date: string; events: number; users: number; properties: number; leads: number }>;
  top_properties: Array<{
    id: number;
    title: string;
    city: string;
    source__slug: string | null;
    detail_events: number;
    contact_events: number;
  }>;
  source_performance: Array<{
    slug: string;
    name: string;
    active: number;
    retired: number;
    details_30d: number;
    contacts_30d: number;
    conversion: number;
    last_import_at: string | null;
  }>;
  acquisition_channels: Array<{
    source: string;
    channel: string;
    sessions: number;
    contacts: number;
    conversion: number;
  }>;
  audience: { active_30d: number; recurring_30d: number; high_intent_users_30d: number };
  alerts: Array<{ severity: 'critical' | 'warning' | 'ok'; title: string; value: number; href: string }>;
  weekly_summary: string[];
  technical: {
    database: string;
    storage_bytes: number;
    release: string;
    environment: string;
    failed_runs_24h: number;
    removed_listings: number;
  };
}

interface SourceHealth {
  slug: string;
  nombre: string;
  status: 'healthy' | 'running' | 'error' | 'stale' | 'never';
  last_import_at: string | null;
  latest_run_id: number | null;
  latest_run_status: string | null;
  imported: number;
  retired: number;
}

const AdminDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    const isRefresh = data !== null;
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/admin/dashboard/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar datos');
      const json = await res.json();
      setData(json);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (token) fetchDashboard();
  }, [token]);

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100vh-3rem)] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-textPrimary">Dashboard</h1>
                <p className="mt-1 text-sm text-textSecondary">
                  Resumen general de tu portal inmobiliario.
                </p>
              </div>
              <button
                onClick={fetchDashboard}
                disabled={refreshing}
                className={cn(
                  'inline-flex items-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary/90',
                  refreshing && 'opacity-60 cursor-not-allowed'
                )}
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                Actualizar
              </button>
            </div>

            {error && (
              <div className="mb-6 rounded-card border border-error/20 bg-error/5 p-4 text-sm text-error">
                {error}
              </div>
            )}

            {loading ? (
              <DashboardSkeleton />
            ) : data ? (
              <>
                <OwnerExecutive metrics={data.owner} />
                <OperationsCenter data={data} />

                {/* KPI cards */}
                <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                  <KpiCard label="Usuarios" value={data.total_users} icon={Users} tone="blue" />
                  <KpiCard label="Propiedades" value={data.total_properties} icon={Building2} tone="indigo" />
                  <KpiCard label="En venta" value={data.properties_for_sale} icon={Tag} tone="green" />
                  <KpiCard label="En alquiler" value={data.properties_for_rent} icon={KeyRound} tone="amber" />
                  <KpiCard label="Inactivas" value={data.properties_inactive} icon={Ban} tone="slate" />
                </div>

                {/* Panel comercial */}
                <h2 className="mb-3 text-lg font-bold text-textPrimary">Panel comercial</h2>
                <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4">
                  <KpiCard label="Activas" value={data.properties_active} icon={CheckCircle2} tone="green" />
                  <KpiCard label="Vistas totales" value={data.total_views} icon={Eye} tone="sky" />
                  <KpiCard label="Contactos" value={data.total_leads} icon={Mail} tone="violet" />
                  <KpiCard label="Contactos nuevos" value={data.leads_new} icon={Mail} tone="rose" />
                  <KpiCard label="Pendientes" value={data.pending_publications_new} icon={Clock} tone="fuchsia" />
                  <KpiCard label="Nuevos usuarios (30d)" value={data.new_users_30d} icon={UserPlus} tone="blue" />
                  <KpiCard label="Sin imágenes" value={data.properties_without_images} icon={ImageOff} tone="amber" />
                  <KpiCard label="Incompletas" value={data.properties_incomplete} icon={AlertTriangle} tone="orange" />
                </div>

                {/* Charts / breakdowns */}
                <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <Card className="rounded-card shadow-card">
                    <CardHeader>
                      <CardTitle className="text-base">Distribución de propiedades</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <BreakdownBar label="En venta" value={data.properties_for_sale} total={data.total_properties} barClass="bg-green-500" />
                      <BreakdownBar label="En alquiler" value={data.properties_for_rent} total={data.total_properties} barClass="bg-amber-500" />
                      <BreakdownBar label="Inactivas" value={data.properties_inactive} total={data.total_properties} barClass="bg-slate-400" />
                    </CardContent>
                  </Card>

                  <Card className="rounded-card shadow-card">
                    <CardHeader>
                      <CardTitle className="text-base">Calidad del inventario</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <BreakdownBar label="Activas" value={data.properties_active} total={data.total_properties} barClass="bg-primary" />
                      <BreakdownBar label="Sin imágenes" value={data.properties_without_images} total={data.total_properties} barClass="bg-orange-400" />
                      <BreakdownBar label="Incompletas" value={data.properties_incomplete} total={data.total_properties} barClass="bg-rose-400" />
                    </CardContent>
                  </Card>
                </div>

                {/* Quick links */}
                <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <QuickLink href="/admin/users" title="Gestionar Usuarios" desc="Activar, moderar y administrar" icon={Users} tone="blue" />
                  <QuickLink href="/admin/properties" title="Gestionar Propiedades" desc="Ver y moderar contenido" icon={Building2} tone="indigo" />
                  <QuickLink href="/admin/pending-publications" title="Publicaciones Pendientes" desc="Contactar interesados" icon={Clock} tone="fuchsia" />
                </div>

                {/* Recent users */}
                <TableCard
                  title="Usuarios Recientes"
                  action={<Link href="/admin/users" className="text-sm font-medium text-primary hover:underline">Ver todos</Link>}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Registro</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recent_users.map((u: any) => (
                        <TableRow key={u.id} className="cursor-pointer transition-colors hover:bg-muted/50">
                          <TableCell>
                            <Link href="/admin/users" className="flex items-center gap-2 hover:no-underline">
                              <Avatar name={u.first_name || u.username} />
                              <span className="font-medium text-textPrimary">
                                {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-textSecondary">{u.email}</TableCell>
                          <TableCell className="text-textSecondary">{new Date(u.date_joined).toLocaleDateString('es-EC')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={u.is_active ? 'border-transparent bg-green-100 text-green-700' : 'border-transparent bg-red-100 text-red-700'}>
                              {u.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableCard>

                {/* Recent properties */}
                <TableCard
                  className="mt-6"
                  title="Propiedades Recientes"
                  action={<Link href="/admin/properties" className="text-sm font-medium text-primary hover:underline">Ver todas</Link>}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Propietario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recent_properties.map((p: any) => (
                        <TableRow key={p.id} className="cursor-pointer transition-colors hover:bg-muted/50">
                          <TableCell className="font-medium text-textPrimary">
                            <Link href={`/property/${p.id}`} className="hover:no-underline">
                              {p.title || `Propiedad #${p.id}`}
                            </Link>
                          </TableCell>
                          <TableCell className="text-textSecondary">{typeLabel(p.property_type)}</TableCell>
                          <TableCell><StatusBadge status={p.status} /></TableCell>
                          <TableCell className="font-geo text-textSecondary">${Number(p.price).toLocaleString('es-EC')}</TableCell>
                          <TableCell className="text-textSecondary">{p.owner_username || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableCard>

                {/* Recent leads */}
                <TableCard
                  className="mt-6"
                  title="Contactos Recientes"
                  action={<span className="text-sm text-textSecondary">{data.total_leads} en total</span>}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Propiedad</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recent_leads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-textSecondary">
                            Aún no hay contactos registrados
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.recent_leads.map((l: any) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-medium text-textPrimary">{l.name}</TableCell>
                            <TableCell className="text-textSecondary">{l.phone}</TableCell>
                            <TableCell className="text-textSecondary">{l.property_title || `#${l.property}`}</TableCell>
                            <TableCell className="text-textSecondary">{leadSourceLabel(l.source)}</TableCell>
                            <TableCell><LeadStatusBadge status={l.status} /></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableCard>
              </>
            ) : null}
          </div>
        </main>
      </div>
    </AdminRoute>
  );
};

const SOURCE_STATUS = {
  healthy: { label: 'Al día', className: 'bg-green-100 text-green-700 border-green-200' },
  running: { label: 'Ejecutándose', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  error: { label: 'Con error', className: 'bg-red-100 text-red-700 border-red-200' },
  stale: { label: 'Desactualizada', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  never: { label: 'Sin ejecutar', className: 'bg-slate-100 text-slate-700 border-slate-200' },
} satisfies Record<SourceHealth['status'], { label: string; className: string }>;

function OwnerExecutive({ metrics }: { metrics: OwnerMetrics }) {
  const periodCards = [
    { key: 'sessions', label: 'Sesiones activas', icon: Activity },
    { key: 'new_users', label: 'Usuarios nuevos', icon: UserPlus },
    { key: 'details', label: 'Detalles abiertos', icon: Eye },
    { key: 'contacts', label: 'Contactos', icon: MousePointerClick },
    { key: 'publications', label: 'Publicaciones', icon: Building2 },
  ] as const;
  const maxEvents = Math.max(1, ...metrics.trends.map((item) => item.events));

  return (
    <section className="mb-8 space-y-4" aria-labelledby="executive-title">
      <div>
        <h2 id="executive-title" className="text-xl font-bold text-textPrimary">Vista ejecutiva</h2>
        <p className="mt-1 text-sm text-textSecondary">Crecimiento, intención y decisiones de los últimos 7 días frente a los 7 anteriores.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {periodCards.map(({ key, label, icon: Icon }) => {
          const metric = metrics.period[key];
          const positive = metric.change >= 0;
          const ChangeIcon = positive ? TrendingUp : TrendingDown;
          return (
            <Card key={key} className="rounded-card shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className={cn('flex items-center gap-1 text-xs font-semibold', positive ? 'text-green-700' : 'text-red-700')}>
                    <ChangeIcon className="h-3.5 w-3.5" /> {metric.change > 0 ? '+' : ''}{metric.change}%
                  </span>
                </div>
                <p className="mt-3 font-geo text-2xl font-bold text-textPrimary">{metric.value.toLocaleString('es-EC')}</p>
                <p className="text-xs text-textSecondary">{label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)]">
        <Card className="rounded-card shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" /> Actividad de los últimos 14 días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-1.5 border-b border-line pb-1 sm:gap-2">
              {metrics.trends.map((item) => (
                <div key={item.date} className="group flex h-full min-w-0 flex-1 items-end" title={`${item.date}: ${item.events} eventos`}>
                  <div
                    className="w-full rounded-t-sm bg-primary/75 transition-colors group-hover:bg-primary"
                    style={{ height: `${Math.max(3, (item.events / maxEvents) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-textSecondary">
              <span>{new Date(metrics.trends[0]?.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}</span>
              <span>Eventos funcionales registrados</span>
              <span>{new Date(metrics.trends.at(-1)?.date || '').toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-card shadow-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Audiencia útil · 30 días</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-2">
            <AudienceMetric label="Activas" value={metrics.audience.active_30d} icon={Activity} />
            <AudienceMetric label="Recurrentes" value={metrics.audience.recurring_30d} icon={RefreshCw} />
            <AudienceMetric label="Alta intención" value={metrics.audience.high_intent_users_30d} icon={UserCheck} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-card shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base">Embudo de intención · 30 días</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {metrics.funnel.map((stage) => (
              <div key={stage.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-textPrimary">{stage.label}</span>
                  <span className="text-textSecondary">{stage.value.toLocaleString('es-EC')} · {stage.rate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(stage.value ? 2 : 0, stage.rate)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-card shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base">Decisiones para esta semana</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {metrics.alerts.map((alert) => (
              <Link key={alert.title} href={alert.href} className={cn(
                'flex items-center gap-3 rounded-card border p-3 text-sm transition-colors',
                alert.severity === 'critical' && 'border-red-200 bg-red-50 text-red-900',
                alert.severity === 'warning' && 'border-amber-200 bg-amber-50 text-amber-900',
                alert.severity === 'ok' && 'border-green-200 bg-green-50 text-green-900',
              )}>
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="flex-1 font-medium">{alert.title}</span>
                {alert.value > 0 && <span className="font-geo text-lg font-bold">{alert.value}</span>}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ExecutiveTable
          title="Origen de usuarios · 30 días"
          headers={['Origen', 'Canal', 'Sesiones', 'Contactos', 'Conversión']}
          rows={(metrics.acquisition_channels || []).map((source) => [
            source.source,
            source.channel,
            source.sessions.toLocaleString('es-EC'),
            source.contacts.toLocaleString('es-EC'),
            `${source.conversion}%`,
          ])}
          empty="La atribución aparecerá cuando ingresen nuevas sesiones."
        />
        <ExecutiveTable
          title="Rendimiento por fuente · 30 días"
          headers={['Fuente', 'Activas', 'Detalles', 'Contactos', 'Conversión']}
          rows={metrics.source_performance.map((source) => [
            source.name,
            source.active.toLocaleString('es-EC'),
            source.details_30d.toLocaleString('es-EC'),
            source.contacts_30d.toLocaleString('es-EC'),
            `${source.conversion}%`,
          ])}
          empty="Todavía no hay fuentes con datos."
        />
        <ExecutiveTable
          title="Propiedades con mayor intención · 30 días"
          headers={['Propiedad', 'Ciudad', 'Detalles', 'Contactos']}
          rows={metrics.top_properties.map((property) => [
            <Link key={property.id} href={`/property/${property.id}`} target="_blank" className="block max-w-[240px] truncate font-medium text-primary hover:underline">{property.title || `Propiedad #${property.id}`}</Link>,
            property.city || '—',
            property.detail_events.toLocaleString('es-EC'),
            property.contact_events.toLocaleString('es-EC'),
          ])}
          empty="Aún no hay aperturas o contactos registrados."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
        <Card className="rounded-card shadow-card">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Resumen semanal</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-textSecondary">
              {metrics.weekly_summary.map((line) => <li key={line} className="flex gap-2"><span className="text-primary">•</span><span>{line}</span></li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="rounded-card shadow-card">
          <CardHeader className="pb-3"><CardTitle className="text-base">Diagnóstico técnico</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DiagnosticLine label="Base de datos" value={metrics.technical.database === 'online' ? 'En línea' : metrics.technical.database} good />
            <DiagnosticLine label="Entorno" value={metrics.technical.environment} />
            <DiagnosticLine label="Versión" value={metrics.technical.release} />
            <DiagnosticLine label="Imágenes" value={formatBytes(metrics.technical.storage_bytes)} />
            <DiagnosticLine label="Fallos 24 h" value={String(metrics.technical.failed_runs_24h)} good={metrics.technical.failed_runs_24h === 0} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function AudienceMetric({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-card bg-background p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-2 font-geo text-xl font-bold text-textPrimary">{value.toLocaleString('es-EC')}</p>
      <p className="text-[11px] text-textSecondary">{label}</p>
    </div>
  );
}

function ExecutiveTable({ title, headers, rows, empty }: { title: string; headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <Card className="overflow-hidden rounded-card shadow-card">
      <div className="border-b border-line px-5 py-4"><h3 className="font-semibold text-textPrimary">{title}</h3></div>
      {rows.length === 0 ? <p className="p-6 text-center text-sm text-textSecondary">{empty}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 text-xs text-textSecondary"><tr>{headers.map((header) => <th key={header} className="whitespace-nowrap px-4 py-2.5 font-medium">{header}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={index} className="border-t border-line">{row.map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-4 py-3 text-textSecondary">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function DiagnosticLine({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-textSecondary">{label}</span><span className={cn('truncate font-medium text-textPrimary', good && 'text-green-700')}>{value}</span></div>;
}

function formatBytes(value: number) {
  if (!value) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function OperationsCenter({ data }: { data: DashboardData }) {
  const alerts = [
    {
      label: 'Sin imágenes',
      value: data.quality.without_images,
      description: 'No generan una ficha visual completa.',
      icon: ImageOff,
      tone: 'amber',
      href: '/admin/properties',
    },
    {
      label: 'Sin ubicación',
      value: data.quality.without_location,
      description: 'No pueden mostrarse correctamente en el mapa.',
      icon: MapPinOff,
      tone: 'rose',
      href: '/admin/properties',
    },
    {
      label: 'Sin precio',
      value: data.quality.without_price,
      description: 'Requieren revisión comercial o de la fuente.',
      icon: CircleDollarSign,
      tone: 'orange',
      href: '/admin/properties',
    },
    {
      label: 'Duplicadas',
      value: data.quality.duplicates,
      description: 'Están ocultas del mapa por deduplicación.',
      icon: GitMerge,
      tone: 'violet',
      href: '/admin/ingesta?tab=importadas&estado=duplicadas',
    },
  ];

  return (
    <section className="mb-8" aria-labelledby="operations-title">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="operations-title" className="text-lg font-bold text-textPrimary">Centro de operaciones</h2>
          <p className="text-sm text-textSecondary">Problemas que requieren atención y estado actual de las fuentes.</p>
        </div>
        <p className="text-xs text-textSecondary">
          Actualizado {new Date(data.generated_at).toLocaleString('es-EC')}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,1fr)]">
        <Card className="rounded-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Calidad del catálogo</span>
              <Badge variant="outline" className="border-line bg-background text-textSecondary">
                {alerts.reduce((sum, alert) => sum + alert.value, 0)} incidencias
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <Link
                  key={alert.label}
                  href={alert.href}
                  className="group flex items-start gap-3 rounded-card border border-line bg-background p-3 transition-colors hover:border-primary/30 hover:bg-primaryLight/30"
                >
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-button', TONES[alert.tone])}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-textPrimary">{alert.label}</span>
                      <span className="font-geo text-lg font-bold text-textPrimary">{alert.value}</span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-textSecondary">{alert.description}</span>
                  </span>
                  <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-textSecondary transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><ServerCog className="h-4 w-4" /> Salud de ingestas</span>
              <Link href="/admin/ingesta" className="text-xs font-medium text-primary hover:underline">Abrir ingestas</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-2">
              <MiniMetric label="En curso" value={data.ingestion.active_runs} />
              <MiniMetric label="Errores 24 h" value={data.ingestion.failed_24h} danger={data.ingestion.failed_24h > 0} />
              <MiniMetric label="Retiradas" value={data.ingestion.retired_total} />
            </div>
            <div className="space-y-2">
              {data.ingestion.sources.length === 0 ? (
                <p className="rounded-card bg-background p-4 text-center text-sm text-textSecondary">No hay fuentes configuradas.</p>
              ) : data.ingestion.sources.map((source) => {
                const status = SOURCE_STATUS[source.status];
                return (
                  <div key={source.slug} className="flex items-center gap-3 rounded-card border border-line px-3 py-2.5">
                    <DownloadCloud className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-textPrimary">{source.nombre}</p>
                      <p className="text-xs text-textSecondary">{source.imported.toLocaleString('es-EC')} importadas · {source.retired.toLocaleString('es-EC')} retiradas</p>
                    </div>
                    <Badge variant="outline" className={status.className}>{status.label}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function MiniMetric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={cn('rounded-card bg-background p-2.5 text-center', danger && 'bg-red-50')}>
      <p className={cn('font-geo text-xl font-bold text-textPrimary', danger && 'text-red-700')}>{value}</p>
      <p className={cn('text-[11px] text-textSecondary', danger && 'text-red-700')}>{label}</p>
    </div>
  );
}

const TONES: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  green: 'bg-green-100 text-green-600',
  amber: 'bg-amber-100 text-amber-600',
  slate: 'bg-slate-100 text-slate-600',
  sky: 'bg-sky-100 text-sky-600',
  violet: 'bg-violet-100 text-violet-600',
  rose: 'bg-rose-100 text-rose-600',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-600',
  orange: 'bg-orange-100 text-orange-600',
};

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Card className="rounded-card shadow-card transition-shadow hover:shadow-cardHover">
      <CardContent className="p-5">
        <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-button', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <AnimatedNumber value={value} className="font-geo text-2xl font-bold text-textPrimary" />
        <p className="mt-0.5 text-sm text-textSecondary">{label}</p>
      </CardContent>
    </Card>
  );
}

function BreakdownBar({ label, value, total, barClass }: { label: string; value: number; total: number; barClass: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-textSecondary">{label}</span>
        <span className="font-geo font-medium text-textPrimary">{value} <span className="text-textSecondary">· {pct}%</span></span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-500', barClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  desc,
  icon: Icon,
  tone,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-cardHover"
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-button', TONES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-textPrimary">{title}</h3>
        <p className="truncate text-sm text-textSecondary">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-textSecondary transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function TableCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('overflow-hidden rounded-card shadow-card', className)}>
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="font-semibold text-textPrimary">{title}</h2>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

function Avatar({ name }: { name?: string }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      {(name?.[0] || '?').toUpperCase()}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="rounded-card shadow-card">
            <CardContent className="p-5">
              <Skeleton className="mb-3 h-10 w-10 rounded-button" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="mt-2 h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="rounded-card shadow-card">
            <CardContent className="p-5">
              <Skeleton className="mb-3 h-10 w-10 rounded-button" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="mt-2 h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-card shadow-card">
        <CardContent className="space-y-3 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    for_sale: 'bg-green-100 text-green-700',
    for_rent: 'bg-amber-100 text-amber-700',
    inactive: 'bg-slate-100 text-slate-600',
  };
  const labels: Record<string, string> = {
    for_sale: 'En venta',
    for_rent: 'En alquiler',
    inactive: 'Inactiva',
  };
  return (
    <Badge variant="outline" className={cn('border-transparent', styles[status] || 'bg-slate-100 text-slate-600')}>
      {labels[status] || status}
    </Badge>
  );
}

function LeadStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-rose-100 text-rose-700',
    contacted: 'bg-blue-100 text-blue-700',
    closed: 'bg-slate-100 text-slate-600',
  };
  const labels: Record<string, string> = {
    new: 'Nuevo',
    contacted: 'Contactado',
    closed: 'Cerrado',
  };
  return (
    <Badge variant="outline" className={cn('border-transparent', styles[status] || 'bg-slate-100 text-slate-600')}>
      {labels[status] || status}
    </Badge>
  );
}

function leadSourceLabel(s: string) {
  const map: Record<string, string> = {
    property_modal: 'Modal del mapa',
    property_page: 'Página',
    whatsapp: 'WhatsApp',
    phone: 'Teléfono',
    other: 'Otro',
  };
  return map[s] || s;
}

function typeLabel(t: string) {
  const map: Record<string, string> = {
    house: 'Casa',
    land: 'Terreno',
    apartment: 'Departamento',
    commercial: 'Comercial',
    other: 'Otro',
  };
  return map[t] || t;
}

export default AdminDashboard;
