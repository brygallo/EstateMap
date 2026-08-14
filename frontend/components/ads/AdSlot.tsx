import Image from 'next/image';
import { ArrowUpRight, Megaphone } from 'lucide-react';

import { getPublicApiUrl } from '@/lib/api-url';
import { getAdSlots, pickAd, PLACEMENT_LABELS, type AdSlotData, type Placement } from '@/lib/ads';
import { HouseAd } from './HouseAd';

/**
 * One advertising slot, anywhere in the portal.
 *
 * Three things are non-negotiable here, and they are why this is a component
 * and not markup pasted into each page:
 *
 * - The link carries `rel="sponsored nofollow noopener"`. A paid link that
 *   passes authority is the fastest route to a manual penalty, and this portal
 *   exists to build the authority such a penalty would erase.
 * - A visible "Publicidad" label sits above the card. Disclosure is required,
 *   and it is also what keeps the surrounding page readable as editorial.
 * - The href points at the API redirect, never at the advertiser. That is what
 *   makes the click countable and keeps the referrer policy on the server.
 *
 * When the API has no active campaign, the slot does not render. House signs
 * are campaigns too: staff creates one explicitly when a placement should be
 * offered for sale.
 */

type Variant = 'card' | 'banner' | 'aside' | 'strip';

type AdSlotProps = {
  placement: Placement;
  /** Identifies the page, so the rotation spreads across listings. */
  seed: string;
  /** Narrows the campaigns to those sold for this city. */
  city?: string | null;
  province?: string | null;
  variant?: Variant;
  className?: string;
};

const layout: Record<Variant, string> = {
  card: 'flex flex-col gap-4 p-5',
  banner: 'flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6',
  aside: 'flex flex-col gap-4 p-5',
  strip: 'flex flex-col gap-4 p-4 sm:flex-row sm:items-center',
};

const imageBox: Record<Variant, string> = {
  card: 'relative h-32 w-full overflow-hidden rounded-lg',
  banner: 'relative h-28 w-full flex-shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-40',
  aside: 'relative h-28 w-full overflow-hidden rounded-lg',
  strip: 'relative h-16 w-full flex-shrink-0 overflow-hidden rounded-lg sm:w-28',
};

export async function AdSlot({
  placement,
  seed,
  city,
  province,
  variant = 'banner',
  className,
}: AdSlotProps) {
  const slots = await getAdSlots(placement, city, province);
  const slot = pickAd(slots, `${placement}:${seed}`);

  if (!slot) return null;

  if (slot.kind === 'promo') {
    return (
      <HouseAd
        placement={placement}
        city={city}
        variant={variant}
        className={className}
        headline={slot?.headline}
        body={slot?.body}
        ctaLabel={slot?.cta_label}
      />
    );
  }

  return <PaidAd slot={slot} placement={placement} variant={variant} className={className} />;
}

function PaidAd({
  slot,
  placement,
  variant,
  className,
}: {
  slot: AdSlotData;
  placement: Placement;
  variant: Variant;
  className?: string;
}) {
  // The redirect lives on the API host, so the href has to be absolute.
  const href = `${getPublicApiUrl().replace(/\/api\/?$/, '')}${slot.click_path}`;
  const name = slot.advertiser?.name ?? PLACEMENT_LABELS[placement];

  return (
    <aside className={`not-prose ${className ?? 'my-8'}`} aria-label={`Publicidad de ${name}`}>
      <p className="mb-2.5 inline-flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-textSecondary">
        <Megaphone className="h-3.5 w-3.5" aria-hidden="true" /> Publicidad
      </p>

      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        className={`group relative overflow-hidden rounded-card border border-line bg-white shadow-card transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-cardHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${layout[variant]}`}
      >
        {slot.image ? (
          <div className={imageBox[variant]}>
            <Image
              src={slot.image}
              alt={slot.image_alt || name}
              fill
              sizes="(max-width: 640px) 100vw, 320px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            {name}
          </p>
          <p className="text-lg font-black leading-snug tracking-tight text-textPrimary">{slot.headline}</p>
          <p className="text-sm leading-relaxed text-textSecondary">{slot.body}</p>
          <span className="mt-1 inline-flex min-h-10 w-fit items-center gap-1.5 rounded-full bg-primaryLight px-4 text-sm font-bold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            {slot.cta_label}
            <ArrowUpRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={2}
              aria-hidden
            />
          </span>
        </div>
      </a>
    </aside>
  );
}

export default AdSlot;
