import Link from 'next/link';
import { Megaphone } from 'lucide-react';

import type { BlogPost } from '@/lib/blog';

/**
 * Says out loud that an article is advertising.
 *
 * Not a footnote and not a colour: a line the reader meets before the text,
 * naming who paid for it and whether they paid at all. Google's own rule is
 * that paid placement must be disclosed and its links marked, but the reason
 * that matters here is narrower — this portal publishes market figures, and the
 * day a reader cannot tell what it measured from what somebody bought, the
 * figures stop being worth quoting.
 *
 * «Del grupo» is said plainly rather than dressed up: Aents and Geo Propiedades
 * share owners, no money changes hands, and pretending otherwise would be the
 * same failure in a smaller size.
 */
export default function SponsoredNotice({ sponsor }: { sponsor: NonNullable<BlogPost['sponsor']> }) {
  return (
    <aside
      className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-card border border-line bg-surface px-4 py-3 text-sm text-textSecondary"
      aria-label="Aviso de contenido publicitario"
    >
      <span className="inline-flex items-center gap-1.5 font-semibold text-textPrimary">
        <Megaphone className="h-4 w-4 text-primary" aria-hidden />
        Contenido publicitario
      </span>
      <span>
        {sponsor.paid ? 'Pagado por' : 'Publicado sin coste por acuerdo con'}{' '}
        <Link
          href={sponsor.website}
          target="_blank"
          rel="sponsored nofollow noopener"
          className="font-semibold text-primary hover:underline"
        >
          {sponsor.name}
        </Link>
        . No lo escribió la redacción y no afecta a las cifras del portal.
      </span>
    </aside>
  );
}
