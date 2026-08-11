import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';

import { getPublicApiUrl } from '@/lib/api-url';
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

  // The redirect lives on the API host, so the href has to be absolute.
  const href = `${getPublicApiUrl().replace(/\/api\/?$/, '')}${slot.click_path}`;

  return (
    <aside
      className={`not-prose ${className ?? 'mt-10'}`}
      aria-label={`Publicidad de ${slot.advertiser.name}`}
    >
      <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-textSecondary">
        Publicidad
      </p>

      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        className="group flex flex-col gap-4 rounded-card border border-line bg-surface p-5 transition-colors hover:border-primary sm:flex-row sm:items-center sm:gap-5"
      >
        {slot.image ? (
          <div className="relative h-28 w-full flex-shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-40">
            <Image
              src={slot.image}
              alt={slot.image_alt || slot.advertiser.name}
              fill
              sizes="(max-width: 640px) 100vw, 160px"
              className="object-cover"
              loading="lazy"
            />
          </div>
        ) : slot.advertiser.logo ? (
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg">
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

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {slot.advertiser.name}
          </p>
          <p className="mt-1 text-base font-semibold leading-snug text-textPrimary">
            {slot.headline}
          </p>
          <p className="mt-1.5 text-sm leading-6 text-textSecondary">{slot.body}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:underline">
            {slot.cta_label}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </a>
    </aside>
  );
}

export default SponsorSlotBlock;
