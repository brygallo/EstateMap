import Image from 'next/image';
import { ArrowUpRight, BadgeCheck } from 'lucide-react';

import { getPublicApiUrl } from '@/lib/api-url';
import { HouseAd } from '@/components/ads/HouseAd';
import { type Placement as AdPlacement } from '@/lib/ads';
import { getSponsors, pickSponsor, type Placement } from '@/lib/sponsors';

/**
 * One sponsorship slot.
 *
 * Three things are non-negotiable here, and they are why this is a component
 * and not markup pasted into each page:
 *
 * - The link carries `rel="sponsored nofollow noopener"`. A paid link that
 *   passes authority is the fastest route to a manual penalty, and this blog
 *   exists to build the authority such a penalty would erase.
 * - A visible "Publicidad" label sits above the card. Disclosure is required,
 *   and it is also what keeps the surrounding article readable as editorial.
 * - The href points at the API redirect, never at the advertiser. That is what
 *   makes the click countable and keeps the referrer policy on the server.
 *
 * The blog keeps its own dark card instead of reusing `AdSlot`: it sits between
 * paragraphs of an article, not in a sidebar. What it does share is the house
 * sign — a `promo` campaign has no advertiser and no redirect, so rendering it
 * here as if it did would crash the page the day staff offers a blog placement
 * for sale from the panel.
 */

type SponsorSlotProps = {
  placement: Placement;
  /** Identifies the page, so the same article always shows the same sponsor. */
  seed: string;
  className?: string;
};

export async function SponsorSlotBlock({ placement, seed, className }: SponsorSlotProps) {
  const slots = await getSponsors(placement);
  const slot = pickSponsor(slots, seed);
  if (!slot) return null;

  if (slot.kind === 'promo' || !slot.advertiser || !slot.click_path) {
    return (
      <HouseAd
        placement={placement as AdPlacement}
        variant="banner"
        className={className ?? 'mt-10'}
        headline={slot.headline}
        body={slot.body}
        ctaLabel={slot.cta_label}
      />
    );
  }

  // The redirect lives on the API host, so the href has to be absolute.
  const href = `${getPublicApiUrl().replace(/\/api\/?$/, '')}${slot.click_path}`;

  return (
    <aside
      className={`not-prose ${className ?? 'mt-10'}`}
      aria-label={`Publicidad de ${slot.advertiser.name}`}
    >
      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        className="group relative isolate flex min-h-40 flex-col overflow-hidden rounded-card border border-primary/20 bg-textPrimary text-white shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-cardHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:flex-row sm:items-stretch"
      >
        <span className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(circle_at_12%_20%,rgb(var(--primary-rgb)/.32),transparent_30%),radial-gradient(circle_at_88%_90%,rgb(var(--accent-alt-rgb)/.22),transparent_34%)]" aria-hidden />
        {slot.image ? (
          <div className="relative min-h-44 w-full flex-shrink-0 overflow-hidden sm:min-h-full sm:w-[38%] lg:w-[34%]">
            <Image
              src={slot.image}
              alt={slot.image_alt || slot.advertiser.name}
              fill
              sizes="(max-width: 640px) 100vw, 380px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none"
              loading="lazy"
            />
          </div>
        ) : slot.advertiser.logo ? (
          <div className="relative m-5 h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-white p-2 sm:m-6 sm:self-center">
            <Image
              src={slot.advertiser.logo}
              alt={slot.advertiser.logo_alt || slot.advertiser.name}
              fill
              sizes="56px"
              className="object-contain"
              loading="lazy"
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col justify-center p-5 sm:p-6 lg:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/75">Publicidad</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/80">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
              {slot.advertiser.name}
            </span>
          </div>
          <p className="mt-3 text-xl font-bold leading-snug text-white sm:text-2xl">
            {slot.headline}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">{slot.body}</p>
          <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-textPrimary transition-colors group-hover:bg-primary group-hover:text-white">
            {slot.cta_label}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </a>
    </aside>
  );
}

export default SponsorSlotBlock;
