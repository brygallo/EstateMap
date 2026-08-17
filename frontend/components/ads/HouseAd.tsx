'use client';

import { Megaphone, MessageCircle } from 'lucide-react';

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

const DEFAULT_HEADLINE = 'Anuncia tu negocio en esta zona';
const DEFAULT_BODY =
  'Presenta tu negocio a personas que exploran propiedades cercanas.';
const DEFAULT_CTA = 'Consultar este espacio';

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
      <p className="mb-2.5 inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-textSecondary">
        <Megaphone className="h-3.5 w-3.5" aria-hidden="true" /> Espacio disponible
      </p>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          trackEvent('ad_slot_inquiry_clicked', { placement, city: city || '' })
        }
        className={`group relative flex overflow-hidden rounded-card border border-dashed border-primary/40 bg-gradient-to-br from-primaryLight via-white to-white shadow-card transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-cardHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          variant === 'aside'
            ? 'flex-col gap-4 p-5'
            : variant === 'strip'
              ? 'flex-col gap-4 p-4 sm:flex-row sm:items-center'
              : 'flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6'
        }`}
      >
        <span className="absolute -right-10 -top-14 h-32 w-32 rounded-full border border-primary/10" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-lg font-bold leading-snug tracking-tight text-textPrimary">
            {headline || DEFAULT_HEADLINE}
          </p>
          <p className="text-sm leading-6 text-textSecondary">{body || DEFAULT_BODY}</p>
        </div>
        <span
          className={`relative inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-card transition-colors group-hover:bg-primaryHover ${
            variant === 'aside' ? 'w-full' : ''
          }`}
        >
          <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden />
          {ctaLabel || DEFAULT_CTA}
        </span>
      </a>
    </aside>
  );
}

export default HouseAd;
