'use client';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { useAuth } from '@/lib/auth-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  DownloadCloud,
  ExternalLink,
  Globe2,
  History,
  Loader2,
  PlayCircle,
  Plus,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface Source {
  slug: string;
  nombre: string;
  base_url: string;
  activa: boolean;
  total: number;
  activas: number;
  disponibles: number;
  disponibles_at: string | null;
  last_import_at: string | null;
}

interface Run {
  id: number;
  fuente: string;
  estado: 'pending' | 'running' | 'done' | 'error';
  estado_label: string;
  modo: 'load' | 'refresh';
  modo_label: string;
  limit: number | null;
  solo_nuevas: boolean;
  vistos: number;
  creadas: number;
  actualizadas: number;
  duplicadas: number;
  caducadas: number;
  sin_ubicacion: number;
  cargadas: number;
  mensaje: string;
  lanzado_por: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

// Portales previstos que aún no tienen scraper (se muestran como "próximamente").
const PORTALES_PROXIMOS = ['Plusvalía', 'Icasas', 'OLX Ecuador', 'Vive1', 'Remax Ecuador'];

const ESTADO_STYLE: Record<Run['estado'], string> = {
  running: 'bg-amber-100 text-amber-800 border-amber-200',
  done: 'bg-green-100 text-green-800 border-green-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-gray-100 text-gray-700 border-gray-200',
};

const IngestaPage = () => {
  const { token } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [launching, setLaunching] = useState<string>('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    opts: { limit?: number | null; only_new?: boolean; modo?: 'load' | 'refresh'; label: string },
  ) => {
    if (opts.label.includes('todo')) {
      if (!confirm('¿Ejecutar la ingesta de TODO el país? Puede tardar horas.')) return;
    }
    if (opts.modo === 'refresh') {
      if (!confirm('¿Actualizar las propiedades ya importadas y verificar cuáles siguen vigentes?')) return;
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
    if (!run.limit) return null;
    return Math.min(100, Math.round((run.vistos / run.limit) * 100));
  };

  const runsBySource = (source: Source) =>
    runs.filter((run) => run.fuente === source.slug).slice(0, 4);

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
                        {activeRun.cargadas} cargadas · {activeRun.creadas} nuevas · {activeRun.actualizadas} actualizadas · vistos {activeRun.vistos}
                      </p>
                    </div>
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
                  </div>
                  {activeRun.mensaje && (
                    <p className="mt-3 rounded-md bg-white/70 px-3 py-2 text-xs text-amber-900">
                      {activeRun.mensaje}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

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
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
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
                            variant="outline"
                            disabled={!s.activa || !!launching || runActive}
                            onClick={() =>
                              launch(s.slug, { limit: 500, label: 'primeras 500' })
                            }
                          >
                            {launching === s.slug + 'primeras 500' ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="mr-2 h-4 w-4" />
                            )}
                            Cargar 500
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!s.activa || !!launching || runActive}
                            onClick={() =>
                              launch(s.slug, {
                                limit: 500,
                                only_new: true,
                                label: 'siguientes 500',
                              })
                            }
                          >
                            {launching === s.slug + 'siguientes 500' ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="mr-2 h-4 w-4" />
                            )}
                            Cargar nuevas
                          </Button>
                          <Button
                            size="sm"
                            disabled={!s.activa || !!launching || runActive}
                            onClick={() =>
                              launch(s.slug, { limit: null, label: 'todo el país' })
                            }
                          >
                            {launching === s.slug + 'todo el país' ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <PlayCircle className="mr-2 h-4 w-4" />
                            )}
                            Todo el país
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!s.activa || !!launching || runActive || s.total === 0}
                            title="Re-visita las ya importadas: actualiza sus datos y marca inactivas las que ya no existen en el portal"
                            onClick={() =>
                              launch(s.slug, { modo: 'refresh', label: 'actualizar y verificar vigencia' })
                            }
                          >
                            {launching === s.slug + 'actualizar y verificar vigencia' ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Actualizar / vigencia
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
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {runsBySource(s).length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="py-6 text-center text-textSecondary">
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
              <h2 className="mb-3 text-lg font-semibold text-textPrimary">
                Historial general
              </h2>
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
                        <TableHead>Lanzó</TableHead>
                        <TableHead>Cuándo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="py-8 text-center text-textSecondary">
                            Aún no hay ejecuciones. Lanza una arriba.
                          </TableCell>
                        </TableRow>
                      ) : (
                        runs.map((r) => (
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
                            <TableCell className="text-textSecondary">{r.lanzado_por}</TableCell>
                            <TableCell className="whitespace-nowrap text-textSecondary">
                              {formatDate(r.created_at)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </AdminRoute>
  );
};

export default IngestaPage;
