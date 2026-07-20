'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  DownloadCloud,
  ExternalLink,
  Globe2,
  History,
  ImageOff,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Copy,
  TerminalSquare,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';

interface Source {
  slug: string;
  nombre: string;
  base_url: string;
  activa: boolean;
  total: number;
  activas: number;
  retiradas: number;
  disponibles: number;
  disponibles_at: string | null;
  last_import_at: string | null;
}

interface Run {
  id: number;
  fuente: string;
  estado: 'pending' | 'running' | 'done' | 'error' | 'cancelled';
  estado_label: string;
  modo: 'load' | 'refresh' | 'verify';
  modo_label: string;
  limit: number | null;
  con_imagenes: boolean;
  solo_nuevas: boolean;
  vistos: number;
  revisados: number;
  saltados: number;
  creadas: number;
  actualizadas: number;
  duplicadas: number;
  caducadas: number;
  sin_ubicacion: number;
  errores: number;
  cargadas: number;
  mensaje: string;
  log: string;
  current_stage: string;
  error_detail: string;
  cancel_requested: boolean;
  lanzado_por: string;
  started_at: string | null;
  heartbeat_at: string | null;
  finished_at: string | null;
  created_at: string;
}

interface ImportedProp {
  id: number;
  title: string;
  price: number | null;
  rent_price: number | null;
  status: string;
  property_type: string;
  city: string;
  province: string;
  is_duplicate: boolean;
  source_agency: string;
  source_url: string;
  external_id: string;
  imported_at: string | null;
  last_seen_at: string | null;
  thumbnail: string | null;
}

interface ImportedResponse {
  total: number;
  page: number;
  page_size: number;
  num_pages: number;
  results: ImportedProp[];
}

type ImpEstado = 'activas' | 'inactivas' | 'duplicadas' | 'todas';

const IMP_ESTADOS: { value: ImpEstado; label: string }[] = [
  { value: 'activas', label: 'Activas' },
  { value: 'inactivas', label: 'Inactivas' },
  { value: 'duplicadas', label: 'Duplicadas' },
  { value: 'todas', label: 'Todas' },
];

const PROP_TYPE_LABEL: Record<string, string> = {
  land: 'Terreno',
  house: 'Casa',
  apartment: 'Departamento',
  commercial: 'Comercial',
  other: 'Otro',
};

// Portales previstos que aún no tienen scraper (se muestran como "próximamente").
const PORTALES_PROXIMOS = ['Plusvalía', 'Icasas', 'OLX Ecuador', 'Vive1', 'Remax Ecuador'];

const ESTADO_STYLE: Record<Run['estado'], string> = {
  running: 'bg-amber-100 text-amber-800 border-amber-200',
  done: 'bg-green-100 text-green-800 border-green-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-orange-100 text-orange-800 border-orange-200',
};

const IngestaPage = () => {
  const { token } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [launching, setLaunching] = useState<string>('');
  const [cancelling, setCancelling] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [runDetailLoading, setRunDetailLoading] = useState(false);
  const [runFilter, setRunFilter] = useState<'all' | Run['estado']>('all');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pestaña "Propiedades importadas".
  const [activeTab, setActiveTab] = useState<'gestion' | 'importadas'>('gestion');
  const [impSource, setImpSource] = useState('');
  const [impEstado, setImpEstado] = useState<ImpEstado>('activas');
  const [impSearch, setImpSearch] = useState('');
  const [impQuery, setImpQuery] = useState('');
  const [impPage, setImpPage] = useState(1);
  const [impData, setImpData] = useState<ImportedResponse | null>(null);
  const [impLoading, setImpLoading] = useState(false);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token],
  );

  const fetchAll = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      const [sRes, rRes] = await Promise.all([
        fetch(`${API_URL}/admin/ingesta/sources/`, { headers: authHeaders() }),
        fetch(`${API_URL}/admin/ingesta/runs/`, { headers: authHeaders() }),
      ]);
      if (!sRes.ok || !rRes.ok) {
        throw new Error('No se pudo cargar la información de importación.');
      }
      setSources(await sRes.json());
      setRuns(await rRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la página de importación.');
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  // Carga inicial + poll cada 4s (para ver el progreso en vivo).
  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchAll]);

  const launch = async (
    source: string,
    opts: { limit?: number | null; only_new?: boolean; modo?: 'load' | 'refresh' | 'verify'; label: string },
  ) => {
    if (opts.label.includes('todo')) {
      if (!confirm('¿Ejecutar la ingesta de TODO el país? Puede tardar horas.')) return;
    }
    if (opts.modo === 'refresh') {
      if (!confirm('¿Actualizar todos los datos de las propiedades importadas? Este proceso puede tardar.')) return;
    }
    if (opts.modo === 'verify') {
      if (!confirm('¿Comprobar vigencia y retirar del mapa los anuncios que Plusvalía confirme como desaparecidos?')) return;
    }
    setLaunching(source + opts.label);
    try {
      const res = await fetch(`${API_URL}/admin/ingesta/launch/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          source,
          limit: opts.limit ?? null,
          only_new: opts.only_new ?? false,
          modo: opts.modo ?? 'load',
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.warning(data.error || 'Ya hay una ejecución en curso.');
      } else if (!res.ok) {
        toast.error(data.error || 'No se pudo lanzar la ingesta.');
      } else {
        toast.success(`Ingesta lanzada (${opts.label}). Sigue el progreso abajo.`);
      }
      await fetchAll();
    } catch {
      toast.error('Error de conexión al lanzar la ingesta.');
    } finally {
      setLaunching('');
    }
  };

  const launchOnlyNew = (source: string) => {
    const requested = window.prompt('¿Cuántas propiedades nuevas deseas importar?', '500');
    if (requested === null) return;
    const limit = Number(requested.trim());
    if (!Number.isInteger(limit) || limit < 1 || limit > 5000) {
      toast.error('Ingresa un número entero entre 1 y 5.000.');
      return;
    }
    launch(source, {
      limit,
      only_new: true,
      label: `siguientes ${limit}`,
    });
  };

  const cancelRun = async (runId: number) => {
    if (!confirm('¿Detener esta ingesta? Se conservará lo ya importado.')) return;
    setCancelling(true);
    try {
      const res = await fetch(`${API_URL}/admin/ingesta/cancel/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ run_id: runId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'No se pudo cancelar la ingesta.');
      } else {
        toast.success('Cancelación solicitada. Se detendrá en unos segundos.');
      }
      await fetchAll();
    } catch {
      toast.error('Error de conexión al cancelar la ingesta.');
    } finally {
      setCancelling(false);
    }
  };

  const openRunDetail = useCallback(async (run: Run) => {
    setSelectedRun(run);
    setRunDetailLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/ingesta/runs/${run.id}/`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      setSelectedRun(await res.json());
    } catch {
      toast.error('No se pudo cargar el detalle de la importación.');
    } finally {
      setRunDetailLoading(false);
    }
  }, [authHeaders]);

  const fetchImported = useCallback(async () => {
    if (!token || !impSource) return;
    setImpLoading(true);
    try {
      const params = new URLSearchParams({
        source: impSource,
        estado: impEstado,
        page: String(impPage),
      });
      if (impQuery.trim()) params.set('q', impQuery.trim());
      const res = await fetch(`${API_URL}/admin/ingesta/properties/?${params.toString()}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error();
      setImpData(await res.json());
    } catch {
      toast.error('No se pudieron cargar las propiedades importadas.');
    } finally {
      setImpLoading(false);
    }
  }, [token, impSource, impEstado, impPage, impQuery, authHeaders]);

  // Fija la fuente por defecto cuando llegan las fuentes.
  useEffect(() => {
    if (!impSource && sources.length) setImpSource(sources[0].slug);
  }, [sources, impSource]);

  // Carga la lista al entrar a la pestaña o cambiar filtros/página.
  useEffect(() => {
    if (activeTab === 'importadas') fetchImported();
  }, [activeTab, fetchImported]);

  const runActive = runs.some((r) => r.estado === 'running' || r.estado === 'pending');
  const activeRun = runs.find((r) => r.estado === 'running' || r.estado === 'pending');
  const totalImported = sources.reduce((sum, source) => sum + source.total, 0);
  const totalActive = sources.reduce((sum, source) => sum + source.activas, 0);

  const formatDate = (value: string | null) => {
    if (!value) return 'Sin registro';
    return new Date(value).toLocaleString('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const progressPct = (run: Run) => {
    if (run.solo_nuevas) {
      const available = sources.find((source) => source.slug === run.fuente)?.disponibles;
      if (!available) return null;
      return Math.min(100, Math.round((run.revisados / available) * 100));
    }
    if (!run.limit) return null;
    return Math.min(100, Math.round((run.vistos / run.limit) * 100));
  };

  const runsBySource = (source: Source) =>
    runs.filter((run) => run.fuente === source.slug).slice(0, 4);
  const filteredRuns = runFilter === 'all' ? runs : runs.filter((run) => run.estado === runFilter);

  useEffect(() => {
    if (!selectedRun) return;
    const updated = runs.find((run) => run.id === selectedRun.id);
    if (updated) setSelectedRun(updated);
  }, [runs, selectedRun?.id]);

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100vh-3rem)] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                  Agregador inmobiliario
                </p>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-textPrimary sm:text-3xl">
                  <DownloadCloud className="h-7 w-7" /> Importar propiedades
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-textSecondary">
                  Trae anuncios de otros portales al mapa. Las propiedades importadas
                  conservan su fuente original: si tienen teléfono se contactan por
                  WhatsApp; si no, se envía al anuncio externo.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Actualizar
              </Button>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2} />
                <div>
                  <p className="font-semibold">No se pudo cargar importación</p>
                  <p className="mt-1">{error}</p>
                </div>
              </div>
            )}

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-button bg-primaryLight text-primary">
                    <Database className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-textSecondary">Importadas</p>
                    <p className="font-geo text-2xl font-semibold text-textPrimary">{totalImported}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-button bg-green-100 text-green-700">
                    <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-textSecondary">Activas en mapa</p>
                    <p className="font-geo text-2xl font-semibold text-textPrimary">{totalActive}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-button bg-amber-100 text-amber-700">
                    <Clock3 className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-textSecondary">Estado</p>
                    <p className="text-sm font-semibold text-textPrimary">
                      {activeRun ? `Ejecutando #${activeRun.id}` : 'Sin ejecución activa'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {activeRun && (
              <Card className="mb-6 border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Ingesta en curso: {activeRun.fuente}
                      </p>
                      <p className="mt-1 text-xs text-amber-800">
                        {activeRun.cargadas} cargadas · {activeRun.creadas} nuevas · {activeRun.actualizadas} actualizadas · {activeRun.revisados} revisados · {activeRun.saltados} ya importados · vistos {activeRun.vistos}
                        {activeRun.errores > 0 && ` · ${activeRun.errores} con error`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {progressPct(activeRun) !== null && (
                        <div className="min-w-[180px]">
                          <div className="mb-1 text-right text-xs font-semibold text-amber-900">
                            {progressPct(activeRun)}%
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-amber-200">
                            <div
                              className="h-full rounded-full bg-amber-600 transition-all"
                              style={{ width: `${progressPct(activeRun)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelRun(activeRun.id)}
                        disabled={cancelling || activeRun.cancel_requested}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {cancelling || activeRun.cancel_requested ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        {activeRun.cancel_requested ? 'Deteniendo…' : 'Cancelar'}
                      </Button>
                    </div>
                  </div>
                  {activeRun.mensaje && (
                    <p className="mt-3 rounded-md bg-white/70 px-3 py-2 text-xs text-amber-900">
                      {activeRun.mensaje}
                    </p>
                  )}
                  {activeRun.log && (
                    <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-amber-950/90 px-3 py-2 text-[11px] leading-5 text-amber-50">
                      {activeRun.log.split('\n').slice(-12).join('\n')}
                    </pre>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pestañas */}
            <div className="mb-6 flex gap-1 border-b border-line">
              {([
                { key: 'gestion', label: 'Gestión de portales', icon: DownloadCloud },
                { key: 'importadas', label: 'Propiedades importadas', icon: Building2 },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                    activeTab === t.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  <t.icon className="h-4 w-4" strokeWidth={2} />
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'gestion' && (
            <>
            {/* Portales */}
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-textPrimary">Portales conectados</h2>
                <p className="mt-1 text-sm text-textSecondary">
                  Cada portal se maneja por separado: carga una tanda, trae solo nuevas,
                  actualiza existentes o importa todo ese portal.
                </p>
              </div>
              {loading && sources.length === 0
                ? [0, 1].map((i) => <Skeleton key={i} className="h-64 w-full" />)
                : sources.length === 0 ? (
                    <Card>
                      <CardContent className="py-10 text-center">
                        <DownloadCloud className="mx-auto h-10 w-10 text-textSecondary" strokeWidth={1.5} />
                        <h2 className="mt-3 text-lg font-semibold text-textPrimary">
                          No hay fuentes disponibles
                        </h2>
                        <p className="mt-1 text-sm text-textSecondary">
                          No se encontraron scrapers registrados para importar propiedades.
                        </p>
                      </CardContent>
                    </Card>
                  )
                : sources.map((s) => (
                    <Card key={s.slug}>
                      <CardHeader className="border-b border-line pb-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex items-start gap-3">
                            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-button bg-primaryLight text-primary">
                              <Globe2 className="h-5 w-5" strokeWidth={2} />
                            </span>
                            <div>
                              <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                                {s.nombre}
                                <Badge variant={s.activa ? 'secondary' : 'outline'}>
                                  {s.activa ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </CardTitle>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-textSecondary">
                                <span className="rounded-full bg-muted px-2.5 py-1 font-mono">{s.slug}</span>
                                {s.base_url && (
                                  <a
                                    href={s.base_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                                  >
                                    Ver portal
                                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:min-w-[620px]">
                            <div className="rounded-card bg-background p-3">
                              <p className="text-xs text-textSecondary">En portal</p>
                              <p className="font-geo text-xl font-semibold text-textPrimary">
                                {s.disponibles ? s.disponibles.toLocaleString('es-EC') : '—'}
                              </p>
                            </div>
                            <div className="rounded-card bg-background p-3">
                              <p className="text-xs text-textSecondary">Importadas</p>
                              <p className="font-geo text-xl font-semibold text-textPrimary">{s.total}</p>
                            </div>
                            <div className="rounded-card bg-background p-3">
                              <p className="text-xs text-textSecondary">En mapa</p>
                              <p className="font-geo text-xl font-semibold text-primary">{s.activas}</p>
                            </div>
                            <div className="rounded-card bg-background p-3">
                              <p className="text-xs text-textSecondary">Retiradas</p>
                              <p className="font-geo text-xl font-semibold text-amber-700">{s.retiradas}</p>
                            </div>
                            <div className="rounded-card bg-background p-3">
                              <p className="text-xs text-textSecondary">Última</p>
                              <p className="truncate text-xs font-semibold text-textPrimary">{formatDate(s.last_import_at)}</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5 p-4 sm:p-5">
                        {s.disponibles > 0 && (
                          <div>
                            <div className="mb-1 flex justify-between text-xs text-textSecondary">
                              <span>Progreso de importación</span>
                              <span>{Math.min(100, Math.round((s.total / s.disponibles) * 100))}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-background">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(100, Math.round((s.total / s.disponibles) * 100))}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-textSecondary">
                          Disponibles revisados: <span className="font-medium text-textPrimary">{formatDate(s.disponibles_at)}</span>
                        </p>
                        <div className="flex flex-wrap gap-2 border-b border-line pb-5">
                          <Button
                            size="sm"
                            disabled={!s.activa || !!launching || runActive}
                            onClick={() => launchOnlyNew(s.slug)}
                          >
                            {launching.startsWith(s.slug + 'siguientes ') ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="mr-2 h-4 w-4" />
                            )}
                            Buscar solo nuevas
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!s.activa || !!launching || runActive || s.total === 0}
                            title="Solo comprueba si el anuncio continúa publicado; no procesa datos ni imágenes"
                            onClick={() => launch(s.slug, { modo: 'verify', label: 'retirar desaparecidas' })}
                          >
                            {launching === s.slug + 'retirar desaparecidas' ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="mr-2 h-4 w-4" />
                            )}
                            Retirar desaparecidas
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!s.activa || !!launching || runActive || s.total === 0}
                            title="Actualiza precio, descripción, contacto y demás datos de todas las propiedades existentes"
                            onClick={() =>
                              launch(s.slug, { modo: 'refresh', label: 'actualizar todos los datos' })
                            }
                          >
                            {launching === s.slug + 'actualizar todos los datos' ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Actualizar todos los datos
                          </Button>
                        </div>
                        {runActive && (
                          <p className="text-xs text-amber-600">
                            Hay una ejecución en curso; espera a que termine para lanzar otra.
                          </p>
                        )}

                        <div>
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-textPrimary">
                            <History className="h-4 w-4 text-primary" strokeWidth={2} />
                            Últimas ejecuciones de este portal
                          </h3>
                          <div className="overflow-x-auto rounded-card border border-line">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Estado</TableHead>
                                  <TableHead>Modo</TableHead>
                                  <TableHead>Progreso</TableHead>
                                  <TableHead>Resultado</TableHead>
                                  <TableHead>Cuándo</TableHead>
                                  <TableHead className="text-right">Detalle</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {runsBySource(s).length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={6} className="py-6 text-center text-textSecondary">
                                      Este portal todavía no tiene ejecuciones.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  runsBySource(s).map((r) => (
                                    <TableRow key={r.id}>
                                      <TableCell>
                                        <Badge variant="outline" className={ESTADO_STYLE[r.estado]}>
                                          {r.estado === 'running' && (
                                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                          )}
                                          {r.estado === 'error' && (
                                            <XCircle className="mr-1 h-3 w-3" />
                                          )}
                                          {r.estado_label}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {r.modo_label}
                                        {r.solo_nuevas && (
                                          <span className="ml-1 text-xs text-textSecondary">(solo nuevas)</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        vistos {r.vistos}{r.limit ? ` / ${r.limit}` : ''}
                                        {progressPct(r) !== null && (
                                          <span className="ml-2 text-xs font-semibold text-primary">{progressPct(r)}%</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {r.creadas} nuevas · {r.actualizadas} act. · {r.caducadas} cad.
                                        {r.mensaje && (
                                          <p className="mt-1 max-w-xs truncate text-xs text-textSecondary">{r.mensaje}</p>
                                        )}
                                      </TableCell>
                                      <TableCell className="whitespace-nowrap text-sm text-textSecondary">
                                        {formatDate(r.created_at)}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openRunDetail(r)}>
                                          <Eye className="mr-1.5 h-4 w-4" /> Ver
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

              <div>
                <h2 className="mt-8 text-lg font-semibold text-textPrimary">Portales próximos</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PORTALES_PROXIMOS.map((portal) => (
                    <div key={portal} className="rounded-card border border-dashed border-line bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Globe2 className="h-4 w-4 text-textSecondary" strokeWidth={2} />
                          <span className="text-sm font-semibold text-textPrimary">{portal}</span>
                        </div>
                        <Badge variant="outline">Próximamente</Badge>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-textSecondary">
                        Se conectará como portal independiente con sus propias ejecuciones.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ejecuciones */}
            <div className="mt-8">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-textPrimary">Historial general</h2>
                  <p className="mt-1 text-xs text-textSecondary">Abre cualquier ejecución para consultar su configuración, resultado, errores y log.</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {([
                    ['all', 'Todas'], ['error', 'Con error'], ['running', 'En curso'],
                    ['done', 'Completadas'], ['cancelled', 'Canceladas'],
                  ] as const).map(([value, label]) => (
                    <Button key={value} variant={runFilter === value ? 'default' : 'outline'} size="sm" onClick={() => setRunFilter(value)}>
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fuente</TableHead>
                        <TableHead>Progreso</TableHead>
                        <TableHead>Actualizadas</TableHead>
                        <TableHead>Duplicadas</TableHead>
                        <TableHead>Caducadas</TableHead>
                        <TableHead>Sin ubicación</TableHead>
                        <TableHead>Errores</TableHead>
                        <TableHead>Lanzó</TableHead>
                        <TableHead>Cuándo</TableHead>
                        <TableHead className="text-right">Detalle</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRuns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="py-8 text-center text-textSecondary">
                            {runs.length ? 'No hay ejecuciones con este estado.' : 'Aún no hay ejecuciones. Lanza una arriba.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRuns.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Badge variant="outline" className={ESTADO_STYLE[r.estado]}>
                                {r.estado === 'running' && (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                )}
                                {r.estado === 'error' && (
                                  <XCircle className="mr-1 h-3 w-3" />
                                )}
                                {r.estado_label}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {r.fuente}
                              {r.solo_nuevas && (
                                <span className="ml-1 text-xs text-textSecondary">
                                  (tanda)
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <b>{r.cargadas}</b> cargadas
                              <span className="text-textSecondary">
                                {' '}
                                ({r.creadas} nuevas · vistos {r.vistos}
                                {r.limit ? ` / ${r.limit}` : ''})
                              </span>
                              {r.mensaje && (
                                <p className="mt-1 max-w-md truncate text-xs text-textSecondary">
                                  {r.mensaje}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>{r.actualizadas}</TableCell>
                            <TableCell>{r.duplicadas}</TableCell>
                            <TableCell>{r.caducadas}</TableCell>
                            <TableCell>{r.sin_ubicacion}</TableCell>
                            <TableCell className={r.errores ? 'font-semibold text-red-700' : ''}>{r.errores}</TableCell>
                            <TableCell className="text-textSecondary">{r.lanzado_por}</TableCell>
                            <TableCell className="whitespace-nowrap text-textSecondary">
                              {formatDate(r.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => openRunDetail(r)}>
                                <Eye className="mr-1.5 h-4 w-4" /> Abrir
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            </>
            )}

            {activeTab === 'importadas' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-textPrimary">Propiedades importadas</h2>
                  <p className="mt-1 text-sm text-textSecondary">
                    Lo que se trajo de cada portal. Filtra por estado, busca y abre el
                    anuncio original o la propiedad en el mapa.
                  </p>
                </div>

                {/* Selector de portal */}
                <div className="flex flex-wrap gap-2">
                  {sources.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => {
                        setImpSource(s.slug);
                        setImpPage(1);
                      }}
                      className={`rounded-button border px-3 py-1.5 text-sm font-medium transition-colors ${
                        impSource === s.slug
                          ? 'border-primary bg-primaryLight text-primary'
                          : 'border-line text-textSecondary hover:text-textPrimary'
                      }`}
                    >
                      {s.nombre}
                      <span className="ml-1.5 text-xs text-textSecondary">{s.total}</span>
                    </button>
                  ))}
                </div>

                {/* Filtros de estado + búsqueda */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-1">
                    {IMP_ESTADOS.map((e) => (
                      <button
                        key={e.value}
                        type="button"
                        onClick={() => {
                          setImpEstado(e.value);
                          setImpPage(1);
                        }}
                        className={`rounded-button px-3 py-1.5 text-xs font-semibold transition-colors ${
                          impEstado === e.value
                            ? 'bg-primary text-white'
                            : 'bg-muted text-textSecondary hover:text-textPrimary'
                        }`}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                  <form
                    className="flex items-center gap-2"
                    onSubmit={(ev) => {
                      ev.preventDefault();
                      setImpPage(1);
                      setImpQuery(impSearch);
                    }}
                  >
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
                      <Input
                        value={impSearch}
                        onChange={(ev) => setImpSearch(ev.target.value)}
                        placeholder="Título, ciudad, id…"
                        className="h-9 w-56 pl-8"
                      />
                    </div>
                    <Button type="submit" variant="outline" size="sm">
                      Buscar
                    </Button>
                  </form>
                </div>

                {/* Grid de propiedades */}
                {impLoading && !impData ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-28 w-full" />
                    ))}
                  </div>
                ) : impData && impData.results.length === 0 ? (
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-textSecondary">
                      No hay propiedades para este filtro.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {impData?.results.map((p) => (
                      <Card key={p.id} className={impLoading ? 'opacity-60' : ''}>
                        <CardContent className="flex gap-3 p-3">
                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-button bg-muted">
                            {p.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.thumbnail}
                                alt={p.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-textSecondary">
                                <ImageOff className="h-6 w-6" strokeWidth={1.5} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-textPrimary" title={p.title}>
                                {p.title || `#${p.external_id}`}
                              </p>
                              {p.is_duplicate ? (
                                <Badge variant="outline" className="border-orange-200 bg-orange-100 text-orange-800">
                                  Duplicada
                                </Badge>
                              ) : p.status === 'inactive' ? (
                                <Badge variant="outline" className="border-red-200 bg-red-100 text-red-800">
                                  Inactiva
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-green-200 bg-green-100 text-green-800">
                                  Activa
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-sm font-bold text-primary">
                              {p.price != null
                                ? `$${p.price.toLocaleString('es-EC')}`
                                : p.rent_price != null
                                  ? `$${p.rent_price.toLocaleString('es-EC')}/mes`
                                  : 'A consultar'}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-textSecondary">
                              {PROP_TYPE_LABEL[p.property_type] || p.property_type}
                              {p.city ? ` · ${p.city}` : ''}
                              {p.source_agency ? ` · ${p.source_agency}` : ''}
                            </p>
                            <div className="mt-1.5 flex items-center gap-3 text-xs">
                              <a
                                href={`/property/${p.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-primary hover:underline"
                              >
                                Ver en el mapa
                              </a>
                              {p.source_url && (
                                <a
                                  href={p.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-textSecondary hover:text-textPrimary"
                                >
                                  <ExternalLink className="h-3 w-3" /> Original
                                </a>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Paginación */}
                {impData && impData.num_pages > 1 && (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-textSecondary">
                      {impData.total} propiedades · página {impData.page} de {impData.num_pages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={impPage <= 1 || impLoading}
                        onClick={() => setImpPage((n) => Math.max(1, n - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={impPage >= impData.num_pages || impLoading}
                        onClick={() => setImpPage((n) => n + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <Sheet open={!!selectedRun} onOpenChange={(open) => { if (!open) setSelectedRun(null); }}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Detalle de importación #{selectedRun?.id}</SheetTitle>
            <SheetDescription>
              Diagnóstico persistente de la ejecución. Puedes volver a consultarlo cuando lo necesites.
            </SheetDescription>
          </SheetHeader>
          {selectedRun && (
            <div className="mt-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{selectedRun.fuente}</p>
                  <p className="mt-1 font-semibold text-textPrimary">{selectedRun.modo_label}</p>
                </div>
                <Badge variant="outline" className={ESTADO_STYLE[selectedRun.estado]}>{selectedRun.estado_label}</Badge>
              </div>

              {selectedRun.estado === 'error' && (
                <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> La importación falló</p>
                  <p className="mt-2">{selectedRun.mensaje || 'No se registró un mensaje resumido.'}</p>
                  {selectedRun.current_stage && <p className="mt-2 text-xs text-red-700">Etapa: {selectedRun.current_stage}</p>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Progreso', progressPct(selectedRun) !== null ? `${progressPct(selectedRun)}%` : '—'],
                  ['Revisados', selectedRun.revisados], ['Ya importados', selectedRun.saltados],
                  ['Vistos', selectedRun.vistos], ['Cargadas', selectedRun.cargadas],
                  ['Nuevas', selectedRun.creadas], ['Actualizadas', selectedRun.actualizadas],
                  ['Duplicadas', selectedRun.duplicadas], ['Caducadas', selectedRun.caducadas],
                  ['Sin ubicación', selectedRun.sin_ubicacion], ['Con error', selectedRun.errores],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-card border border-line bg-white p-3">
                    <p className="text-xs text-textSecondary">{label}</p>
                    <p className="mt-1 font-geo text-xl font-semibold text-textPrimary">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 rounded-card border border-line bg-white p-4 text-sm sm:grid-cols-2">
                <DetailLine label="Etapa" value={selectedRun.current_stage || 'Sin registro'} />
                <DetailLine label="Lanzó" value={selectedRun.lanzado_por || 'Sistema'} />
                <DetailLine label="Inicio" value={formatDate(selectedRun.started_at)} />
                <DetailLine label="Fin" value={formatDate(selectedRun.finished_at)} />
                <DetailLine label="Última señal" value={formatDate(selectedRun.heartbeat_at)} />
                <DetailLine label="Configuración" value={`${selectedRun.limit ? `límite ${selectedRun.limit}` : 'sin límite'} · ${selectedRun.solo_nuevas ? 'solo nuevas' : 'todas'} · ${selectedRun.con_imagenes ? 'con imágenes' : 'sin imágenes'}`} />
              </div>

              {selectedRun.error_detail && (
                <LogPanel title="Detalle técnico del error" value={selectedRun.error_detail} tone="error" />
              )}
              <LogPanel
                title="Registro de ejecución"
                value={selectedRun.log || 'Esta ejecución no generó líneas de registro.'}
                tone="default"
              />

              <Button variant="outline" className="w-full" disabled={runDetailLoading} onClick={() => openRunDetail(selectedRun)}>
                {runDetailLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Actualizar detalle
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminRoute>
  );
};

function DetailLine({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-textSecondary">{label}</p><p className="mt-0.5 font-medium text-textPrimary">{value}</p></div>;
}

function LogPanel({ title, value, tone }: { title: string; value: string; tone: 'error' | 'default' }) {
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    toast.success('Registro copiado');
  };
  return (
    <div className={`overflow-hidden rounded-card border ${tone === 'error' ? 'border-red-300' : 'border-line'}`}>
      <div className="flex items-center justify-between bg-slate-900 px-3 py-2 text-slate-100">
        <p className="flex items-center gap-2 text-xs font-semibold"><TerminalSquare className="h-4 w-4" /> {title}</p>
        <Button variant="ghost" size="sm" className="h-7 text-slate-200 hover:bg-white/10 hover:text-white" onClick={copy}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar
        </Button>
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">{value}</pre>
    </div>
  );
}

export default IngestaPage;
