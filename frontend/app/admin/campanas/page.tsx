'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CalendarClock,
  Copy,
  DollarSign,
  ImagePlus,
  Megaphone,
  MessageCircle,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiDelete, apiFetch, apiGet, apiPatch, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * Advertising — one screen.
 *
 * A direct consequence of how the selling works: the whole negotiation happens
 * on WhatsApp and only its outcome is written down here. With three data points
 * per campaign — what, until when, how much was charged — the interface that
 * captures them is a form, not a flow with states.
 *
 * Two warnings earn the summary at the top. Campaigns expiring this week,
 * because without automatic reminders that notice is the only thing preventing a
 * lost renewal. And oversold placements: the API hands out a maximum number of
 * creatives per placement, so going over leaves the lightest ones never showing
 * at all, silently.
 */

type Kind = 'paid' | 'partner' | 'promo';
type State = 'live' | 'scheduled' | 'paused' | 'ended';

type Campaign = {
  id: number;
  advertiser: number | null;
  advertiser_name: string | null;
  placement: string;
  placement_label: string;
  kind: Kind;
  headline: string;
  body: string;
  cta_label: string;
  target_url: string;
  image: string | null;
  image_alt: string;
  starts_at: string | null;
  ends_at: string | null;
  target_cities: string[];
  target_provinces: string[];
  weight: number;
  is_active: boolean;
  amount_charged_usd: string | null;
  click_count: number;
  state: State;
};

type Advertiser = {
  id: number;
  name: string;
  slug: string;
  website: string;
  tagline: string;
  logo: string | null;
  logo_alt: string;
  contact_name: string;
  contact_phone: string;
  is_active: boolean;
  live_campaigns: number;
  total_clicks: number;
};

type PlacementOption = { code: string; label: string; geo_targetable: boolean };

type Summary = {
  live_count: number;
  charged_live_usd: string | number;
  expiring: Campaign[];
  expiring_window_days: number;
  overbooked: { placement: string; label: string; live: number; served: number }[];
  max_per_placement: number;
};

const kindLabel: Record<Kind, string> = {
  paid: 'Pagada',
  partner: 'Del grupo',
  promo: 'Espacio disponible',
};

const stateLabel: Record<State, string> = {
  live: 'En línea',
  scheduled: 'Programada',
  paused: 'Pausada',
  ended: 'Terminada',
};

const stateClass: Record<State, string> = {
  live: 'bg-successBg text-success',
  scheduled: 'bg-warningBg text-warning',
  paused: 'bg-muted text-textSecondary',
  ended: 'bg-muted text-textSecondary',
};

const emptyForm = {
  advertiser: '',
  placement: '',
  kind: 'paid' as Kind,
  headline: '',
  body: '',
  cta_label: 'Saber más',
  target_url: '',
  image_alt: '',
  starts_at: '',
  ends_at: '',
  target_cities: '',
  target_provinces: '',
  weight: '10',
  amount_charged_usd: '',
};

const emptyAdvertiserForm = {
  name: '', website: '', tagline: '', logo_alt: '', contact_name: '', contact_phone: '', is_active: true,
};

function toEcuadorInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

function ecuadorInputToIso(value: string): string | null {
  return value ? new Date(`${value}:00-05:00`).toISOString() : null;
}

export default function AdsAdminPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [placements, setPlacements] = useState<PlacementOption[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Campaign | null | 'new'>(null);
  const [campaignImage, setCampaignImage] = useState<File | null>(null);
  const [audienceScope, setAudienceScope] = useState<'country' | 'province' | 'city'>('country');
  const [confirmDelete, setConfirmDelete] = useState<Campaign | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [advertiserOpen, setAdvertiserOpen] = useState(false);
  const [editingAdvertiser, setEditingAdvertiser] = useState<Advertiser | null>(null);
  const [advertiserLogo, setAdvertiserLogo] = useState<File | null>(null);
  const [advertiserForm, setAdvertiserForm] = useState({ ...emptyAdvertiserForm });
  const [stateFilter, setStateFilter] = useState<'all' | State>('all');
  const [kindFilter, setKindFilter] = useState<'all' | Kind>('all');
  const [placementFilter, setPlacementFilter] = useState('all');
  const [advertiserFilter, setAdvertiserFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignRes, advertiserRes, placementRes, summaryRes] = await Promise.all([
        apiGet('/admin/ads/campaigns/?page_size=100'),
        apiGet('/admin/ads/advertisers/?page_size=100'),
        apiGet('/admin/ads/campaigns/placements/'),
        apiGet('/admin/ads/campaigns/summary/'),
      ]);
      const campaignData = await campaignRes.json();
      const advertiserData = await advertiserRes.json();
      setCampaigns(campaignData.results ?? campaignData);
      setAdvertisers(advertiserData.results ?? advertiserData);
      setPlacements(await placementRes.json());
      setSummary(await summaryRes.json());
    } catch (error) {
      toast.error('No se pudo cargar la publicidad');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const openNew = () => {
    setForm({ ...emptyForm });
    setCampaignImage(null);
    setAudienceScope('country');
    setEditing('new');
  };

  const openEdit = (campaign: Campaign) => {
    setForm({
      advertiser: campaign.advertiser ? String(campaign.advertiser) : '',
      placement: campaign.placement,
      kind: campaign.kind,
      headline: campaign.headline,
      body: campaign.body,
      cta_label: campaign.cta_label,
      target_url: campaign.target_url,
      image_alt: campaign.image_alt,
      starts_at: toEcuadorInput(campaign.starts_at),
      ends_at: toEcuadorInput(campaign.ends_at),
      target_cities: campaign.target_cities.join(', '),
      target_provinces: campaign.target_provinces.join(', '),
      weight: String(campaign.weight),
      amount_charged_usd: campaign.amount_charged_usd ?? '',
    });
    setCampaignImage(null);
    setAudienceScope(campaign.target_cities.length ? 'city' : campaign.target_provinces.length ? 'province' : 'country');
    setEditing(campaign);
  };

  const duplicate = async (campaign: Campaign) => {
    const response = await apiPost(`/admin/ads/campaigns/${campaign.id}/duplicate/`);
    if (!response.ok) {
      toast.error('No se pudo duplicar la campaña');
      return;
    }
    const copy = await response.json() as Campaign;
    toast.success('Campaña duplicada como pausada');
    await load();
    openEdit(copy);
  };

  const save = async () => {
    setSaving(true);
    const payload = new FormData();
    const values: Record<string, string> = {
      advertiser: form.kind === 'promo' ? '' : form.advertiser,
      placement: form.placement, kind: form.kind, headline: form.headline, body: form.body,
      cta_label: form.cta_label, target_url: form.kind === 'promo' ? '' : form.target_url,
      image_alt: form.image_alt, starts_at: ecuadorInputToIso(form.starts_at) ?? '',
      ends_at: ecuadorInputToIso(form.ends_at) ?? '',
      target_cities: JSON.stringify(form.target_cities.split(',').map((city) => city.trim()).filter(Boolean)),
      target_provinces: JSON.stringify(form.target_provinces.split(',').map((province) => province.trim()).filter(Boolean)),
      weight: String(Number(form.weight) || 10),
      amount_charged_usd: form.kind === 'paid' ? form.amount_charged_usd : '',
    };
    Object.entries(values).forEach(([key, value]) => payload.append(key, value));
    if (campaignImage) payload.append('image', campaignImage);

    try {
      const response =
        editing === 'new'
          ? await apiFetch('/admin/ads/campaigns/', { method: 'POST', body: payload })
          : await apiFetch(`/admin/ads/campaigns/${(editing as Campaign).id}/`, { method: 'PATCH', body: payload });

      // apiFetch resolves on 4xx too, so the status has to be read: without
      // this a paid campaign missing its amount would look saved and not be.
      if (!response.ok) {
        toast.error(`No se pudo guardar. ${await fieldErrors(response)}`);
        return;
      }

      toast.success(editing === 'new' ? 'Campaña creada' : 'Campaña actualizada');
      setEditing(null);
      await load();
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (campaign: Campaign) => {
    const action = campaign.is_active ? 'pause' : 'resume';
    const response = await apiPost(`/admin/ads/campaigns/${campaign.id}/${action}/`);
    if (!response.ok) {
      toast.error('No se pudo cambiar el estado');
      return;
    }
    toast.success(campaign.is_active ? 'Campaña pausada' : 'Campaña reanudada');
    await load();
  };

  const remove = async (campaign: Campaign) => {
    const response = await apiDelete(`/admin/ads/campaigns/${campaign.id}/`);
    if (!response.ok) {
      toast.error('No se pudo eliminar');
      return;
    }
    toast.success('Campaña eliminada');
    setConfirmDelete(null);
    await load();
  };

  const openAdvertiser = (advertiser?: Advertiser) => {
    setEditingAdvertiser(advertiser ?? null);
    setAdvertiserLogo(null);
    setAdvertiserForm(advertiser ? {
      name: advertiser.name, website: advertiser.website, tagline: advertiser.tagline,
      logo_alt: advertiser.logo_alt, contact_name: advertiser.contact_name,
      contact_phone: advertiser.contact_phone, is_active: advertiser.is_active,
    } : { ...emptyAdvertiserForm });
    setAdvertiserOpen(true);
  };

  const saveAdvertiser = async () => {
    setSaving(true);
    try {
      const data = new FormData();
      Object.entries({ ...advertiserForm, slug: slugify(advertiserForm.name) }).forEach(([key, value]) => data.append(key, String(value)));
      if (advertiserLogo) data.append('logo', advertiserLogo);
      const response = await apiFetch(
        editingAdvertiser ? `/admin/ads/advertisers/${editingAdvertiser.id}/` : '/admin/ads/advertisers/',
        { method: editingAdvertiser ? 'PATCH' : 'POST', body: data }
      );
      if (!response.ok) {
        toast.error(`No se pudo crear el anunciante. ${await fieldErrors(response)}`);
        return;
      }
      toast.success(editingAdvertiser ? 'Anunciante actualizado' : 'Anunciante creado');
      setAdvertiserOpen(false);
      setAdvertiserForm({ ...emptyAdvertiserForm });
      setEditingAdvertiser(null);
      await load();
    } catch {
      toast.error('No se pudo crear el anunciante');
    } finally {
      setSaving(false);
    }
  };

  const selectedPlacement = useMemo(
    () => placements.find((option) => option.code === form.placement),
    [placements, form.placement]
  );

  const expiringIds = useMemo(
    () => new Set((summary?.expiring ?? []).map((campaign) => campaign.id)),
    [summary]
  );

  const visibleCampaigns = useMemo(() => campaigns.filter((campaign) =>
    (stateFilter === 'all' || campaign.state === stateFilter) &&
    (kindFilter === 'all' || campaign.kind === kindFilter) &&
    (placementFilter === 'all' || campaign.placement === placementFilter) &&
    (advertiserFilter === 'all' || String(campaign.advertiser ?? '') === advertiserFilter)
  ), [campaigns, stateFilter, kindFilter, placementFilter, advertiserFilter]);

  const campaignImagePreview = useMemo(
    () => campaignImage ? URL.createObjectURL(campaignImage) : null,
    [campaignImage]
  );
  useEffect(() => () => {
    if (campaignImagePreview) URL.revokeObjectURL(campaignImagePreview);
  }, [campaignImagePreview]);

  const renewalUrl = (campaign: Campaign) => {
    const advertiser = advertisers.find((item) => item.id === campaign.advertiser);
    if (!advertiser?.contact_phone) return null;
    const phone = advertiser.contact_phone.replace(/\D/g, '').replace(/^0/, '593');
    const message = `Hola ${advertiser.contact_name || advertiser.name}, quiero conversar sobre la renovación de “${campaign.headline}” en ${campaign.placement_label}, que termina el ${campaign.ends_at ? new Date(campaign.ends_at).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' }) : 'periodo actual'}.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100dvh-var(--app-header-height))]">
        <AdminSidebar />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-textPrimary">
                  <Megaphone className="h-6 w-6 text-primary" aria-hidden />
                  Publicidad
                </h1>
                <p className="mt-1 text-sm text-textSecondary">
                  Se vende por WhatsApp. Aquí solo se anota qué se publica, hasta
                  cuándo y cuánto se cobró.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openAdvertiser()}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Anunciante
                </Button>
                <Button onClick={openNew}>
                  <Plus className="h-4 w-4" aria-hidden />
                  Campaña
                </Button>
              </div>
            </header>

            {summary && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
                    En línea ahora
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-textPrimary">
                    {summary.live_count}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-textSecondary">
                    <DollarSign className="h-3.5 w-3.5" aria-hidden />
                    Cobrado (campañas vivas)
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-textPrimary">
                    ${Number(summary.charged_live_usd || 0).toLocaleString('es-EC')}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-textSecondary">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                    Vencen en {summary.expiring_window_days} días
                  </p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-textPrimary">
                    {summary.expiring.length}
                  </p>
                </Card>
              </div>
            )}

            {summary && summary.overbooked.length > 0 && (
              <Card className="border-danger/40 bg-dangerBg p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-danger">
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                  Hay ubicaciones sobrevendidas
                </p>
                <p className="mt-1 text-sm text-textSecondary">
                  Cada ubicación entrega como máximo {summary.max_per_placement} creativos,
                  ordenados por peso. Las campañas que sobran no se muestran nunca —
                  y nadie se enteraría hasta que el anunciante pregunte.
                </p>
                <ul className="mt-3 space-y-1 text-sm text-textPrimary">
                  {summary.overbooked.map((row) => (
                    <li key={row.placement}>
                      <strong>{row.label}</strong>: {row.live} campañas vivas, se sirven{' '}
                      {row.served}.
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect label="Estado" value={stateFilter} onChange={(value) => setStateFilter(value as typeof stateFilter)} options={Object.entries(stateLabel)} />
              <FilterSelect label="Clase" value={kindFilter} onChange={(value) => setKindFilter(value as typeof kindFilter)} options={Object.entries(kindLabel)} />
              <FilterSelect label="Ubicación" value={placementFilter} onChange={setPlacementFilter} options={placements.map((item) => [item.code, item.label])} />
              <FilterSelect label="Anunciante" value={advertiserFilter} onChange={setAdvertiserFilter} options={advertisers.map((item) => [String(item.id), item.name])} />
            </Card>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] text-sm">
                  <thead className="bg-muted text-left text-xs uppercase tracking-wide text-textSecondary">
                    <tr>
                      <th className="px-4 py-3 font-medium">Campaña</th>
                      <th className="px-4 py-3 font-medium">Ubicación</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Hasta</th>
                      <th className="px-4 py-3 text-right font-medium">Peso</th>
                      <th className="px-4 py-3 text-right font-medium">Clics</th>
                      <th className="px-4 py-3 text-right font-medium">Cobrado</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-textSecondary">
                          Cargando…
                        </td>
                      </tr>
                    )}
                    {!loading && campaigns.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-textSecondary">
                          Todavía no hay campañas. Los espacios libres muestran el
                          reclamo de «espacio disponible» mientras tanto.
                        </td>
                      </tr>
                    )}
                    {visibleCampaigns.map((campaign) => (
                      <tr
                        key={campaign.id}
                        className={cn(
                          'border-t border-line',
                          expiringIds.has(campaign.id) && 'bg-warningBg/40'
                        )}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openEdit(campaign)}
                            className="text-left font-medium text-textPrimary hover:text-primary"
                          >
                            {campaign.headline}
                          </button>
                          <p className="text-xs text-textSecondary">
                            {campaign.advertiser_name ?? kindLabel[campaign.kind]}
                            {campaign.target_cities.length > 0 &&
                              ` · ${campaign.target_cities.join(', ')}`}
                            {campaign.target_provinces.length > 0 &&
                              ` · ${campaign.target_provinces.join(', ')}`}
                            {campaign.target_cities.length === 0 && campaign.target_provinces.length === 0 && ' · Todo Ecuador'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-textSecondary">
                          {campaign.placement_label}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn('rounded-full border-transparent', stateClass[campaign.state])}>
                            {stateLabel[campaign.state]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-textSecondary">
                          {campaign.ends_at
                            ? new Date(campaign.ends_at).toLocaleDateString('es-EC')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-textSecondary">
                          {campaign.weight}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-textSecondary">
                          {campaign.click_count}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-textPrimary">
                          {campaign.amount_charged_usd
                            ? `$${Number(campaign.amount_charged_usd).toLocaleString('es-EC')}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {expiringIds.has(campaign.id) && renewalUrl(campaign) && (
                              <Button size="sm" variant="ghost" asChild aria-label="Contactar para renovar">
                                <a href={renewalUrl(campaign)!} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" aria-hidden /></a>
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => void duplicate(campaign)} aria-label="Duplicar">
                              <Copy className="h-4 w-4" aria-hidden />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggle(campaign)}
                              aria-label={campaign.is_active ? 'Pausar' : 'Reanudar'}
                            >
                              {campaign.is_active ? (
                                <Pause className="h-4 w-4" aria-hidden />
                              ) : (
                                <Play className="h-4 w-4" aria-hidden />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmDelete(campaign)}
                              aria-label="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-danger" aria-hidden />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-sm font-bold text-textPrimary">Anunciantes</h2>
              <ul className="mt-3 divide-y divide-line text-sm">
                {advertisers.map((advertiser) => (
                  <li key={advertiser.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <p className="font-medium text-textPrimary">{advertiser.name}</p>
                      <p className="text-xs text-textSecondary">
                        {advertiser.contact_phone || 'sin teléfono'} · {advertiser.website}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs tabular-nums text-textSecondary">
                        {advertiser.live_campaigns} en línea · {advertiser.total_clicks} clics
                      </p>
                      <Button size="sm" variant="ghost" onClick={() => openAdvertiser(advertiser)} aria-label={`Editar ${advertiser.name}`}>
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </li>
                ))}
                {advertisers.length === 0 && (
                  <li className="py-2 text-textSecondary">Ninguno todavía.</li>
                )}
              </ul>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Nueva campaña' : 'Editar campaña'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Clase">
              <Select
                value={form.kind}
                onValueChange={(value) => setForm((f) => ({ ...f, kind: value as Kind }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Pagada</SelectItem>
                  <SelectItem value="partner">Del grupo (sin coste)</SelectItem>
                  <SelectItem value="promo">Espacio disponible</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Anunciante">
              <Select
                value={form.advertiser}
                onValueChange={(value) => setForm((f) => ({ ...f, advertiser: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent>
                  {advertisers.map((advertiser) => (
                    <SelectItem key={advertiser.id} value={String(advertiser.id)}>
                      {advertiser.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Ubicación">
              <Select
                value={form.placement}
                onValueChange={(value) => {
                  const geoTargetable = placements.find((option) => option.code === value)?.geo_targetable;
                  if (!geoTargetable) setAudienceScope('country');
                  setForm((f) => ({
                    ...f,
                    placement: value,
                    target_cities: geoTargetable ? f.target_cities : '',
                    target_provinces: geoTargetable ? f.target_provinces : '',
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elige un espacio" />
                </SelectTrigger>
                <SelectContent>
                  {placements.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Peso">
              <Input
                type="number"
                min={1}
                value={form.weight}
                onChange={(event) => setForm((f) => ({ ...f, weight: event.target.value }))}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Titular">
                <Input
                  value={form.headline}
                  maxLength={120}
                  onChange={(event) => setForm((f) => ({ ...f, headline: event.target.value }))}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Texto">
                <Textarea
                  value={form.body}
                  maxLength={400}
                  rows={3}
                  onChange={(event) => setForm((f) => ({ ...f, body: event.target.value }))}
                />
              </Field>
            </div>

            <Field label="Texto del botón">
              <Input
                value={form.cta_label}
                onChange={(event) => setForm((f) => ({ ...f, cta_label: event.target.value }))}
              />
            </Field>

            <Field label="URL de destino">
              <Input
                value={form.target_url}
                placeholder="https://…"
                onChange={(event) => setForm((f) => ({ ...f, target_url: event.target.value }))}
              />
            </Field>

            <Field label="Imagen del creativo">
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCampaignImage(event.target.files?.[0] ?? null)} />
            </Field>

            <Field label="Descripción de la imagen">
              <Input value={form.image_alt} placeholder="Qué se ve en la imagen" onChange={(event) => setForm((f) => ({ ...f, image_alt: event.target.value }))} />
            </Field>

            <Field label="Inicio (hora de Ecuador)">
              <Input
                type="datetime-local"
                value={form.starts_at}
                onChange={(event) => setForm((f) => ({ ...f, starts_at: event.target.value }))}
              />
            </Field>

            <Field label="Fin (hora de Ecuador)">
              <Input
                type="datetime-local"
                value={form.ends_at}
                onChange={(event) => setForm((f) => ({ ...f, ends_at: event.target.value }))}
              />
            </Field>

            <Field label="Alcance geográfico">
              <Select
                value={audienceScope}
                disabled={selectedPlacement ? !selectedPlacement.geo_targetable : false}
                onValueChange={(value) => {
                  setAudienceScope(value as typeof audienceScope);
                  setForm((f) => ({ ...f, target_cities: '', target_provinces: '' }));
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="country">Todo Ecuador</SelectItem>
                  <SelectItem value="province">Una o más provincias</SelectItem>
                  <SelectItem value="city">Una o más ciudades</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {audienceScope === 'province' && (
              <Field label="Provincias (separadas por coma)">
                <Input value={form.target_provinces} placeholder="Morona Santiago, Pichincha" onChange={(event) => setForm((f) => ({ ...f, target_provinces: event.target.value, target_cities: '' }))} />
              </Field>
            )}
            {audienceScope === 'city' && (
              <Field label="Ciudades (separadas por coma)">
                <Input value={form.target_cities} placeholder="Macas, Sucúa" onChange={(event) => setForm((f) => ({ ...f, target_cities: event.target.value, target_provinces: '' }))} />
              </Field>
            )}

            <Field label="Importe cobrado (USD)">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={form.amount_charged_usd}
                disabled={form.kind !== 'paid'}
                placeholder={form.kind === 'paid' ? '45.00' : 'Solo en pagadas'}
                onChange={(event) =>
                  setForm((f) => ({ ...f, amount_charged_usd: event.target.value }))
                }
              />
            </Field>
          </div>

          <Preview
            headline={form.headline}
            body={form.body}
            cta={form.cta_label}
            name={
              advertisers.find((advertiser) => String(advertiser.id) === form.advertiser)?.name ??
              kindLabel[form.kind]
            }
            isHouse={form.kind === 'promo'}
            variant={placementVariant(form.placement)}
            imageUrl={campaignImagePreview ?? (editing !== 'new' && editing ? editing.image : null)}
            imageAlt={form.image_alt}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={advertiserOpen} onOpenChange={setAdvertiserOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo anunciante</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Nombre">
              <Input
                value={advertiserForm.name}
                onChange={(event) =>
                  setAdvertiserForm((f) => ({ ...f, name: event.target.value }))
                }
              />
            </Field>
            <Field label="Sitio web">
              <Input
                value={advertiserForm.website}
                placeholder="https://…"
                onChange={(event) =>
                  setAdvertiserForm((f) => ({ ...f, website: event.target.value }))
                }
              />
            </Field>
            <Field label="Descriptor">
              <Input
                value={advertiserForm.tagline}
                onChange={(event) =>
                  setAdvertiserForm((f) => ({ ...f, tagline: event.target.value }))
                }
              />
            </Field>
            <Field label="Logotipo">
              <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAdvertiserLogo(event.target.files?.[0] ?? null)} />
            </Field>
            <Field label="Descripción del logotipo">
              <Input value={advertiserForm.logo_alt} placeholder="Logotipo de la empresa" onChange={(event) => setAdvertiserForm((f) => ({ ...f, logo_alt: event.target.value }))} />
            </Field>
            <Field label="Contacto">
              <Input
                value={advertiserForm.contact_name}
                onChange={(event) =>
                  setAdvertiserForm((f) => ({ ...f, contact_name: event.target.value }))
                }
              />
            </Field>
            <Field label="Teléfono (para renovar)">
              <Input
                value={advertiserForm.contact_phone}
                onChange={(event) =>
                  setAdvertiserForm((f) => ({ ...f, contact_phone: event.target.value }))
                }
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-textPrimary">
              <input type="checkbox" checked={advertiserForm.is_active} onChange={(event) => setAdvertiserForm((f) => ({ ...f, is_active: event.target.checked }))} />
              Anunciante activo
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAdvertiserOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveAdvertiser} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar campaña</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán “{confirmDelete?.headline}” y su historial de clics. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-danger text-white hover:bg-danger/90" onClick={() => confirmDelete && void remove(confirmDelete)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminRoute>
  );
}

/** Turn DRF's per-field errors into one line, so the reason is on screen. */
async function fieldErrors(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data === 'string') return data;
    return Object.entries(data)
      .map(([field, messages]) => `${field}: ${[messages].flat().join(' ')}`)
      .join(' · ');
  } catch {
    return 'Revisa los campos.';
  }
}

/** ASCII slug from a name, matching what the model expects. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 140);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
        {label}
      </Label>
      {children}
    </div>
  );
}

/**
 * Preview with the creative's real shape.
 *
 * A 120-character headline fits in the form and does not fit in the card. The
 * alternative to seeing it here is discovering it in production, with the
 * advertiser watching.
 */
function Preview({
  headline,
  body,
  cta,
  name,
  isHouse,
  variant,
  imageUrl,
  imageAlt,
}: {
  headline: string;
  body: string;
  cta: string;
  name: string;
  isHouse: boolean;
  variant: 'card' | 'banner' | 'aside' | 'strip';
  imageUrl: string | null;
  imageAlt: string;
}) {
  return (
    <div className="rounded-card border border-line bg-muted p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">
        Vista previa
      </p>
      <div
        className={cn(
          'rounded-card bg-surface p-5',
          variant === 'banner' && 'sm:flex sm:items-center sm:gap-5',
          variant === 'strip' && 'sm:flex sm:items-center sm:gap-4',
          isHouse ? 'border border-dashed border-line' : 'border border-line'
        )}
      >
        {imageUrl && !isHouse && (
          <div className={cn('relative mb-3 overflow-hidden rounded-lg sm:mb-0', variant === 'strip' ? 'h-16 sm:w-28' : variant === 'banner' ? 'h-24 sm:w-40' : 'h-28 w-full')}>
            <Image src={imageUrl} alt={imageAlt || ''} fill className="object-cover" sizes="320px" unoptimized={imageUrl.startsWith('blob:')} />
          </div>
        )}
        <div className="min-w-0 flex-1">
        <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-textSecondary">
          {isHouse ? 'Espacio disponible' : 'Publicidad'}
        </p>
        {!isHouse && (
          <p className="text-xs font-semibold uppercase tracking-wide text-textSecondary">
            {name}
          </p>
        )}
        <p className="mt-1 text-base font-bold leading-snug text-textPrimary">
          {headline || '¿Quieres aparecer en este espacio?'}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-textSecondary">
          {body || 'Lo ven quienes están buscando propiedades ahora mismo.'}
        </p>
        <p className="mt-2 text-sm font-semibold text-primary">
          {cta || (isHouse ? 'Escribir por WhatsApp' : 'Saber más')}
        </p>
        </div>
      </div>
    </div>
  );
}

function placementVariant(placement: string): 'card' | 'banner' | 'aside' | 'strip' {
  if (placement === 'property_sidebar') return 'aside';
  if (placement === 'site_footer') return 'strip';
  if (placement === 'listing_feed' || placement === 'index_feed') return 'card';
  return 'banner';
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {options.map(([optionValue, optionLabel]) => <SelectItem key={optionValue} value={optionValue}>{optionLabel}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}
