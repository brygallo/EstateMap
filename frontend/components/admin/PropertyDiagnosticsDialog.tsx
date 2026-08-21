'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiGet } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Finding {
  code: string;
  label: string;
  detail: string;
  fix: string;
}

interface Diagnostics {
  property: {
    id: number;
    title: string;
    short_code: string | null;
    status: string;
    city: string;
    price: number | null;
    owner: { id: number; email: string; is_active: boolean } | null;
  };
  visible: boolean;
  blockers: Finding[];
  warnings: Finding[];
  images: {
    total: number;
    by_status: Record<string, number>;
    failed: Array<{ id: number; status: string; error: string }>;
  };
  location: {
    latitude: number | null;
    longitude: number | null;
    has_polygon: boolean;
    sector_key: string;
    sector: { key: string; name: string; count: number; absorbed_into: string | null } | null;
  };
  seo: {
    in_sitemap: boolean;
    combo: { city: string; count: number; threshold: number; has_page: boolean; missing: number };
  };
  origin: {
    is_imported: boolean;
    source: string | null;
    external_id: string;
    source_url: string;
    last_seen_at: string | null;
    is_duplicate: boolean;
  };
  activity: {
    views_count: number;
    human_events_30d: number;
    bot_events_30d: number;
    detail_opens_30d: number;
    contacts_30d: number;
    leads_total: number;
  };
  trash: {
    deleted: boolean;
    deleted_at?: string;
    deleted_by?: string | null;
    purge_at?: string;
  };
  cache: { versions: Record<string, number> };
}

interface Props {
  propertyId: number | null;
  onClose: () => void;
}

const PropertyDiagnosticsDialog = ({ propertyId, onClose }: Props) => {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setData(null);
    try {
      const response = await apiGet(`/admin/properties/${id}/diagnostics/`);
      if (!response.ok) throw new Error();
      setData(await response.json());
    } catch {
      toast.error('No se pudo cargar el diagnóstico.');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [onClose]);

  useEffect(() => {
    if (propertyId != null) void load(propertyId);
  }, [propertyId, load]);

  return (
    <Dialog open={propertyId != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto rounded-modal">
        <DialogHeader>
          <DialogTitle>Diagnóstico de la propiedad</DialogTitle>
        </DialogHeader>

        {loading || !data ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5" data-testid="property-diagnostics">
            <div
              className={cn(
                'rounded-card border-2 p-4',
                data.visible ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50',
              )}
            >
              <p className="flex items-center gap-2 text-base font-bold text-textPrimary">
                {data.visible
                  ? <><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Se ve en el portal</>
                  : <><CircleX className="h-5 w-5 text-red-600" /> No se ve en el portal</>}
              </p>
              <p className="mt-1 text-sm text-textSecondary">
                {data.property.title || `Propiedad #${data.property.id}`}
                {data.property.short_code ? ` · ${data.property.short_code}` : ''} · {data.property.city}
              </p>
            </div>

            {data.blockers.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-textPrimary">Lo que la está ocultando</h3>
                {data.blockers.map((finding) => (
                  <FindingRow key={finding.code} finding={finding} tone="red" />
                ))}
              </section>
            )}

            {data.warnings.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-textPrimary">Lo que la deja peor colocada</h3>
                {data.warnings.map((finding) => (
                  <FindingRow key={finding.code} finding={finding} tone="amber" />
                ))}
              </section>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Panel title="Fotos">
                <Row label="Total" value={String(data.images.total)} />
                {Object.entries(data.images.by_status).map(([status, count]) => (
                  <Row key={status} label={status} value={String(count)} />
                ))}
                {data.images.failed.map((image) => (
                  <p key={image.id} className="mt-1 break-words rounded bg-red-50 p-2 text-xs text-red-700">
                    #{image.id}: {image.error || 'sin detalle'}
                  </p>
                ))}
              </Panel>

              <Panel title="Ubicación y zona">
                <Row
                  label="Coordenadas"
                  value={data.location.latitude != null && data.location.longitude != null
                    ? `${data.location.latitude.toFixed(5)}, ${data.location.longitude.toFixed(5)}`
                    : data.location.has_polygon ? 'solo polígono' : 'ninguna'}
                />
                <Row label="Clave de zona" value={data.location.sector_key || '—'} />
                {data.location.sector && (
                  <>
                    <Row label="Zona resuelta" value={`${data.location.sector.name} (${data.location.sector.count})`} />
                    {data.location.sector.absorbed_into && (
                      <Row label="Absorbida por" value={data.location.sector.absorbed_into} />
                    )}
                  </>
                )}
              </Panel>

              <Panel title="Búsqueda y páginas">
                <Row label="Entra al sitemap" value={data.seo.in_sitemap ? 'sí' : 'no'} />
                <Row
                  label="Página del combo"
                  value={data.seo.combo.has_page
                    ? `abierta (${data.seo.combo.count} anuncios)`
                    : `faltan ${data.seo.combo.missing} de ${data.seo.combo.threshold}`}
                />
              </Panel>

              <Panel title="Actividad · 30 días">
                <Row label="Visitas registradas" value={String(data.activity.views_count)} />
                <Row label="Aperturas de ficha" value={String(data.activity.detail_opens_30d)} />
                <Row label="Contactos" value={String(data.activity.contacts_30d)} />
                <Row label="Eventos de bots" value={String(data.activity.bot_events_30d)} />
                <Row label="Leads acumulados" value={String(data.activity.leads_total)} />
              </Panel>

              <Panel title="Origen">
                <Row label="Importada" value={data.origin.is_imported ? 'sí' : 'no'} />
                {data.origin.source && <Row label="Fuente" value={data.origin.source} />}
                {data.origin.external_id && <Row label="ID externo" value={data.origin.external_id} />}
                <Row label="Duplicada" value={data.origin.is_duplicate ? 'sí' : 'no'} />
                {data.origin.last_seen_at && (
                  <Row label="Vista por última vez" value={new Date(data.origin.last_seen_at).toLocaleString('es-EC')} />
                )}
              </Panel>

              <Panel title="Caché">
                {Object.entries(data.cache.versions).map(([scope, version]) => (
                  <Row key={scope} label={scope} value={`v${version}`} />
                ))}
              </Panel>
            </div>

            {data.trash.deleted && (
              <div className="rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                En la papelera desde {new Date(data.trash.deleted_at!).toLocaleString('es-EC')}
                {data.trash.deleted_by ? ` por ${data.trash.deleted_by}` : ''}. Se borra sola el{' '}
                {new Date(data.trash.purge_at!).toLocaleDateString('es-EC')}.
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

function FindingRow({ finding, tone }: { finding: Finding; tone: 'red' | 'amber' }) {
  return (
    <div
      className={cn(
        'rounded-card border p-3',
        tone === 'red' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50',
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
        {tone === 'red'
          ? <CircleX className="h-4 w-4 shrink-0 text-red-600" />
          : <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
        {finding.label}
      </p>
      <p className="mt-1 text-xs text-textSecondary">{finding.detail}</p>
      <p className="mt-1 text-xs font-medium text-textPrimary">→ {finding.fix}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">{title}</h4>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-textSecondary">{label}</span>
      <span className="truncate font-medium text-textPrimary">{value}</span>
    </div>
  );
}

export default PropertyDiagnosticsDialog;
