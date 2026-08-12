'use client';

import { MessageCircle } from 'lucide-react';

import { buildWhatsAppUrl } from '@/lib/constants';
import { trackEvent } from '@/lib/analytics';
import { PLACEMENT_LABELS, type Placement } from '@/lib/ads';

/**
 * A campaign created by staff to offer a placement for sale.
 *
 * Empty inventory stays invisible. This component is rendered only for an
 * active `promo` campaign, so the panel controls exactly where and when the
 * offer appears.
 *
 * It carries its own marker — "Espacio disponible" — and not the "Publicidad"
 * label. This is a for-rent sign, not a third party's ad, and calling it
 * advertising would be less honest, not more.
 *
 * The button goes straight to WhatsApp with the message already written,
 * naming the space and the city. That context is what lets the conversation
 * open with a price instead of three questions, and it is a fact the page has
 * at the moment of the click and loses forever if it is not written down.
 */

type HouseAdProps = {
  placement: Placement;
  city?: string | null;
  variant?: 'card' | 'banner' | 'aside' | 'strip';
  className?: string;
  headline?: string;
  body?: string;
  ctaLabel?: string;
};

const DEFAULT_HEADLINE = '¿Quieres aparecer en este espacio?';
const DEFAULT_BODY =
  'Lo ven quienes están buscando propiedades ahora mismo. Escríbenos y lo hablamos.';
const DEFAULT_CTA = 'Escribir por WhatsApp';

export function HouseAd({
  placement,
  city,
  variant = 'banner',
  className,
  headline,
  body,
  ctaLabel,
}: HouseAdProps) {
  const where = PLACEMENT_LABELS[placement] ?? placement;
  const message = [
    'Hola, quiero anunciarme en Geo Propiedades.',
    `Espacio: ${where} (${placement}).`,
    city ? `Ciudad: ${city}.` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const href = buildWhatsAppUrl(message);

  return (
    <aside className={`not-prose ${className ?? 'my-8'}`} aria-label="Espacio publicitario disponible">
      <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-textSecondary">
        Espacio disponible
      </p>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackEvent('ad_slot_inquiry_clicked', { placement, city: city || '' })
        }
        className={`group flex rounded-card border border-dashed border-line bg-surface transition-colors hover:border-primary ${
          variant === 'strip' ? 'flex-col gap-2 p-4 sm:flex-row sm:items-center sm:gap-4' : 'flex-col gap-2 p-5'
        }`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-base font-bold leading-snug text-textPrimary">
            {headline || DEFAULT_HEADLINE}
          </p>
          <p className="text-sm leading-relaxed text-textSecondary">{body || DEFAULT_BODY}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary">
          <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
          {ctaLabel || DEFAULT_CTA}
        </span>
      </a>
    </aside>
  );
}

export default HouseAd;
