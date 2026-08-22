'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, ExternalLink, ImageOff, Loader2, MessageCircle, Phone, X } from 'lucide-react';
import { toast } from 'sonner';

import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PropertyImage from '@/components/ui/PropertyImage';
import { formatPrice, getPropertyTypeLabel, getStatusLabel } from '@/lib/property-labels';
import { cn } from '@/lib/utils';
import type { Property } from '@/lib/types';

/**
 * «Estas propiedades ya son tuyas aquí. ¿Las quieres?»
 *
 * The portal carries thousands of listings imported from another site, each
 * one naming its advertiser's phone. When somebody writes from here, WhatsApp
 * opens saying where they saw it — so the advertiser learns this portal is
 * sending them buyers. This is what happens when they arrive: the listings
 * that match their number, and one button to take them over.
 *
 * Nothing is claimed automatically. The advertiser picks, because taking
 * somebody's listing without asking is the same mistake in the other
 * direction.
 */

type ClaimSummary = {
  phone: string;
  may_claim: boolean;
  phone_verified: boolean;
  claimable_count: number;
  contacts_received: number;
  results: Property[];
};

export default function ClaimableProperties({ onClaimed }: { onClaimed?: () => void }) {
  const [data, setData] = useState<ClaimSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [claiming, setClaiming] = useState(false);
  const [open, setOpen] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await apiGet('/properties/claimable/');
      setData(response.ok ? await response.json() : null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const savePhone = async () => {
    const value = phoneDraft.trim();
    if (!value) return;
    setSavingPhone(true);
    setPhoneError('');
    try {
      const response = await apiPatch('/me/', { phone: value });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setPhoneError(body.phone?.[0] || 'No se pudo guardar el número.');
        return;
      }
      await load();
    } catch {
      setPhoneError('No se pudo guardar el número. Inténtalo de nuevo.');
    } finally {
      setSavingPhone(false);
    }
  };

  const dismiss = async (id: number) => {
    // Optimistic: the row goes now. Waiting for a round trip to remove
    // something the person just said is not theirs feels like being argued
    // with, and the failure case is a reload away.
    setData((current) =>
      current
        ? {
            ...current,
            claimable_count: Math.max(0, current.claimable_count - 1),
            results: current.results.filter((property) => property.id !== id),
          }
        : current
    );
    setSelected((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    try {
      const response = await apiPost('/properties/dismiss-claim/', { property_ids: [id] });
      if (!response.ok) throw new Error();
    } catch {
      toast.error('No se pudo descartar. Recarga la página e inténtalo de nuevo.');
      await load();
    }
  };

  const claim = async () => {
    if (!selected.size) return;
    setClaiming(true);
    try {
      const response = await apiPost('/properties/claim/', {
        property_ids: Array.from(selected),
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      // The server answers with what it actually handed over, which can be
      // fewer than asked: somebody else may have claimed one in between.
      if (result.claimed === 0) {
        toast.error('No se pudo reclamar ninguna. Puede que ya no estén disponibles.');
      } else if (result.claimed < selected.size) {
        toast.success(`Reclamaste ${result.claimed} de ${selected.size}. Las demás ya no estaban disponibles.`);
      } else {
        toast.success(
          result.claimed === 1
            ? 'Propiedad reclamada. Ya puedes administrarla.'
            : `${result.claimed} propiedades reclamadas. Ya puedes administrarlas.`
        );
      }
      setSelected(new Set());
      await load();
      onClaimed?.();
    } catch {
      toast.error('No se pudo completar el reclamo. Inténtalo de nuevo.');
    } finally {
      setClaiming(false);
    }
  };

  if (loading || !data) return null;

  // No phone on the account. Asked for right here rather than behind a link to
  // the profile: whoever signed in with Google never gave one, and this is the
  // only screen where having it changes anything they can see.
  if (!data.phone) {
    return (
      <Card className="mb-5 border-line p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-textPrimary">
          <Phone className="h-4 w-4 text-primary" aria-hidden />
          Agrega tu celular
        </p>
        {/* Says what the number does for them and stops there. Where the
            listings came from is our business, not a line of copy: telling
            somebody we already hold their inventory invites a question the
            screen cannot answer well, and the screen only needs to show what
            is there. */}
        <p className="mt-1 text-sm leading-6 text-textSecondary">
          Con tu número te mostramos las propiedades asociadas a él, para que las
          administres desde aquí. Solo lo usamos para eso.
        </p>
        <form
          className="mt-3 flex flex-wrap items-start gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void savePhone();
          }}
        >
          <div className="min-w-0">
            <input
              type="tel"
              inputMode="tel"
              value={phoneDraft}
              onChange={(event) => {
                setPhoneDraft(event.target.value);
                setPhoneError('');
              }}
              placeholder="0987654321"
              aria-label="Tu celular"
              aria-invalid={Boolean(phoneError)}
              className="h-10 w-48 rounded-button border border-line bg-white px-3 text-sm text-textPrimary"
            />
            {phoneError && <p className="mt-1 text-xs font-medium text-error">{phoneError}</p>}
          </div>
          <Button type="submit" disabled={savingPhone || !phoneDraft.trim()}>
            {savingPhone && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Buscar mis propiedades
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/cuenta">Editarlo en mi cuenta</Link>
          </Button>
        </form>
      </Card>
    );
  }

  if (!data.claimable_count) return null;

  const many = data.claimable_count === 1 ? '' : 'es';

  return (
    <Card className="mb-5 border-primary/40 bg-primaryLight p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-textPrimary">
            <BadgeCheck className="h-5 w-5 text-primary" aria-hidden />
            Tienes {data.claimable_count} propiedad{many} por reclamar
          </h2>
          <p className="mt-1 text-sm leading-6 text-textSecondary">
            Están asociadas a tu número {data.phone}. Al reclamarlas pasas a
            administrarlas: editas precio y fotos, y ves cuánta gente las abre.
          </p>
          {data.contacts_received > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <MessageCircle className="h-4 w-4" aria-hidden />
              Ya te escribieron {data.contacts_received}{' '}
              {data.contacts_received === 1 ? 'vez' : 'veces'} desde este portal.
            </p>
          )}
        </div>
        <Button onClick={() => setOpen((value) => !value)} variant={open ? 'outline' : 'default'}>
          {open ? 'Ocultar' : 'Ver cuáles son'}
        </Button>
      </div>

      {open && (
        <>
          {/* The action sits above the list, not below it. An advertiser with a
              hundred listings would otherwise have to scroll past all of them
              to reach the button that does the thing they came for. */}
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-card border border-line bg-white p-3">
            <Button onClick={claim} disabled={!selected.size || claiming}>
              {claiming && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {selected.size
                ? `Reclamar ${selected.size} propiedad${selected.size === 1 ? '' : 'es'}`
                : 'Elige cuáles reclamar'}
            </Button>
            <button
              type="button"
              onClick={() =>
                setSelected(
                  selected.size === data.results.length
                    ? new Set()
                    : new Set(data.results.map((property) => property.id))
                )
              }
              className="text-sm font-semibold text-primary hover:underline"
            >
              {selected.size === data.results.length ? 'Quitar la selección' : 'Seleccionar todas'}
            </button>
            {data.claimable_count > data.results.length && (
              <span className="text-xs text-textSecondary">
                Mostrando {data.results.length} de {data.claimable_count}; al reclamar estas
                aparecerán las siguientes.
              </span>
            )}
          </div>

          {/* Its own scroll: a hundred rows inline turn the page into a
              kilometre and push everything else out of reach. */}
          <div className="mt-3 max-h-[26rem] space-y-2 overflow-y-auto pr-1">
            {data.results.map((property) => (
              <ClaimRow
                key={property.id}
                property={property}
                checked={selected.has(property.id)}
                onToggle={() => toggle(property.id)}
                onDismiss={() => void dismiss(property.id)}
              />
            ))}
          </div>

        </>
      )}
    </Card>
  );
}


/**
 * One listing, shown well enough to decide on.
 *
 * A row of two text lines is not a decision: an advertiser with a hundred
 * listings recognises their own by the photo and the price, not by a title a
 * scraper wrote. So this carries the same thumbnail, price and features the
 * rest of the portal uses, and a way out to the full page for the ones they
 * are not sure about — which opens in its own tab, because losing the
 * selection to a navigation would be the worst possible moment for it.
 */
function ClaimRow({
  property,
  checked,
  onToggle,
  onDismiss,
}: {
  property: Property;
  checked: boolean;
  onToggle: () => void;
  onDismiss: () => void;
}) {
  const mainImage = property.images?.find((image) => image.is_main) || property.images?.[0];
  const thumb = mainImage?.thumbnail || mainImage?.image || null;
  const area = Number(property.area);
  const features = [
    getPropertyTypeLabel(String(property.property_type)),
    Number.isFinite(area) && area > 0 ? `${Math.round(area).toLocaleString('es-EC')} m²` : '',
    property.rooms ? `${property.rooms} dorm.` : '',
    property.bathrooms ? `${property.bathrooms} baños` : '',
  ].filter(Boolean);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-card border bg-white p-3 transition-colors',
        checked ? 'border-primary ring-1 ring-primary/30' : 'border-line hover:border-primary/40'
      )}
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 accent-[var(--primary)]"
        />
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          {thumb ? (
            <PropertyImage src={thumb} alt="" fill sizes="64px" className="object-cover" wrapperClassName="absolute inset-0" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-background">
              <ImageOff className="h-5 w-5 text-textSecondary" aria-hidden />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-geo text-sm font-bold text-primary">
              {formatPrice(property.price)}
            </span>
            <span className="text-xs text-textSecondary">{getStatusLabel(String(property.status))}</span>
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-textPrimary">
            {property.title}
          </span>
          <span className="mt-0.5 block truncate text-xs text-textSecondary">
            {[property.city, ...features].filter(Boolean).join(' · ') || 'Sin datos'}
          </span>
        </span>
      </label>
      <div className="flex shrink-0 items-center gap-1.5">
        <a
          href={`/propiedad/${property.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-button border border-line px-2.5 py-1.5 text-xs font-semibold text-textSecondary transition-colors hover:border-primary/40 hover:text-primary"
        >
          Ver
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
        {/* A phone can end up on listings that were never this person's, and
            without a way to say so they clutter the list forever. */}
        <button
          type="button"
          onClick={onDismiss}
          title="Quitarla de esta lista"
          className="inline-flex items-center gap-1 rounded-button border border-line px-2.5 py-1.5 text-xs font-semibold text-textSecondary transition-colors hover:border-error/40 hover:text-error"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          No es mía
        </button>
      </div>
    </div>
  );
}
