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
  recent_users: any[];
  recent_properties: any[];
  recent_leads: any[];
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
