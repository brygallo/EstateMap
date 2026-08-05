'use client';

/**
 * What the shared links brought back, per network (SOC-101).
 *
 * This is the half of SOC-008 that makes the kit worth opening a second time:
 * "tus publicaciones trajeron 3 visitantes" is the only sentence that convinces
 * anyone to share again.
 *
 * Two rules govern everything below.
 *
 * A number is never printed without looking at `state` first. "0 visitas" reads
 * as a failure of the portal, while "todavía no lo has compartido" and "se
 * compartió y aún no llega nadie" are two different, actionable things — and
 * only one of them is the owner's problem.
 *
 * And a failure here must not take the kit down. The laminas and the copy work
 * with or without metrics, so every error path in this component ends in a
 * small apology inside its own card and nothing else.
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Share2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/property-labels';
import { fetchPromotionStats, type PromotionStats } from '@/lib/promotion-stats';
import { NETWORK_LABELS, type SocialNetwork } from '@/lib/social-kit';

/**
 * How long to wait before re-reading after the owner shares something.
 *
 * `trackEvent` posts its beacon without being awaited, so an immediate refetch
 * would race it and answer `not_shared` for a listing that was just shared.
 */
const REFRESH_DELAY_MS = 1500;

type Status =
  | { kind: 'loading' }
  | { kind: 'error' }
  /** Denied: the panel removes itself rather than apologising for private data. */
  | { kind: 'hidden' }
  | { kind: 'ready'; stats: PromotionStats };

function networkLabel(source: string): string {
  return NETWORK_LABELS[source as SocialNetwork] ?? source;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-labelledby="promotion-results-title"
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-card"
    >
      <h2
        id="promotion-results-title"
        className="text-sm font-bold text-textPrimary"
      >
        Lo que trajeron tus publicaciones
      </h2>
      {children}
    </section>
  );
}

/**
 * The bars.
 *
 * Visitors and not events: the browser replays one session id with every
 * beacon, so counting events would turn one person clicking around into a
 * dozen visits. A network that brought nobody still gets its row — "TikTok:
 * aún nadie" is information, and hiding it would quietly flatter the total.
 */
function NetworkBreakdown({ stats }: { stats: PromotionStats }) {
  const best = Math.max(...stats.networks.map((row) => row.visitors), 1);

  return (
    <ul className="flex flex-col gap-2.5">
      {stats.networks.map((row) => (
        <li key={row.source} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs font-semibold text-textPrimary sm:w-24">
            {networkLabel(row.source)}
          </span>
          <span
            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
            aria-hidden
          >
            {row.visitors > 0 ? (
              <span
                className="block h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.max((row.visitors / best) * 100, 8)}%` }}
              />
            ) : null}
          </span>
          {row.visitors > 0 ? (
            <span className="w-24 shrink-0 text-right font-geo text-sm font-semibold text-textPrimary">
              {row.visitors}
              <span className="ml-1 font-sans text-xs font-normal text-textSecondary">
                {row.visitors === 1 ? 'visitante' : 'visitantes'}
              </span>
            </span>
          ) : (
            <span className="w-24 shrink-0 text-right text-xs text-textSecondary">
              Aún nadie
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The one line that says how honest the numbers above are. */
function Methodology({ stats }: { stats: PromotionStats }) {
  // The date arrives in UTC and names the day bot flagging started; rendered in
  // local time it would slide back to the 2nd for anyone in Ecuador.
  const measured = formatDate(stats.measured_since, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return (
    <p className="text-xs text-textSecondary">
      Personas distintas de los últimos {stats.window_days} días, sin contar bots
      {measured ? `. Empezamos a medir el ${measured}` : ''}.
    </p>
  );
}

export default function PromotionResults({
  propertyId,
  refreshKey = 0,
}: {
  propertyId: number | string;
  /** Bumped by the kit after a share, download or copy, to re-read the state. */
  refreshKey?: number;
}) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setStatus({ kind: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchPromotionStats(propertyId).then((result) => {
        if (cancelled) return;
        if (result.ok) setStatus({ kind: 'ready', stats: result.stats });
        else setStatus({ kind: result.reason === 'forbidden' ? 'hidden' : 'error' });
      });
    };

    // Only the refreshes that follow an action need to wait for its beacon; the
    // first read happens as soon as the screen opens.
    if (refreshKey === 0) {
      load();
      return () => {
        cancelled = true;
      };
    }
    const timer = setTimeout(load, REFRESH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [propertyId, refreshKey, attempt]);

  if (status.kind === 'hidden') return null;

  if (status.kind === 'loading') {
    return (
      <Frame>
        <div className="flex items-center gap-2 text-sm text-textSecondary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Cargando las visitas…
        </div>
      </Frame>
    );
  }

  if (status.kind === 'error') {
    return (
      <Frame>
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex items-center gap-2 text-sm text-textSecondary">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            No pudimos cargar las visitas ahora mismo. El resto del kit funciona
            igual.
          </p>
          <Button size="sm" variant="outline" onClick={retry}>
            <RefreshCw aria-hidden />
            Reintentar
          </Button>
        </div>
      </Frame>
    );
  }

  const { stats } = status;

  if (stats.state === 'not_shared') {
    return (
      <Frame>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Share2 className="h-4 w-4" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-textPrimary">
              Todavía no has compartido este anuncio
            </p>
            <p className="text-sm text-textSecondary">
              En cuanto lo compartas desde aquí, en este mismo lugar te decimos
              cuántas personas llegaron desde cada red.
            </p>
          </div>
        </div>
      </Frame>
    );
  }

  if (stats.state === 'shared_without_visitors') {
    return (
      <Frame>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Share2 className="h-4 w-4" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-textPrimary">
              Ya compartiste tu anuncio. Todavía no llega nadie desde ahí
            </p>
            <p className="text-sm text-textSecondary">
              Las primeras visitas suelen tardar unas horas. Publícalo también en
              los grupos de compra y venta de tu ciudad: ahí es donde más se
              mueve.
            </p>
          </div>
        </div>
        <Methodology stats={stats} />
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-sm text-textSecondary">
          <span className="font-geo text-2xl font-bold text-textPrimary">
            {stats.total_visitors}
          </span>{' '}
          {stats.total_visitors === 1
            ? 'persona llegó a tu anuncio desde lo que compartiste'
            : 'personas llegaron a tu anuncio desde lo que compartiste'}
        </p>
      </div>
      <NetworkBreakdown stats={stats} />
      <Methodology stats={stats} />
    </Frame>
  );
}
