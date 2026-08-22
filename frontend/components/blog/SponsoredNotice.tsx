import Link from 'next/link';
import { Megaphone } from 'lucide-react';

import type { BlogPost } from '@/lib/blog';

/**
 * Says out loud that an article is advertising.
 *
 * Not a footnote and not a colour borrowed from the page: a block in the same
 * amber the panel uses for warnings, met before the text, naming who paid for
 * it and whether they paid at all. The first version was grey on grey and
 * read like a breadcrumb — technically a disclosure, practically invisible. Google's own rule is
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
      className="mb-6 flex gap-3 rounded-card border border-amber-300 bg-amber-50 px-4 py-4"
      aria-label="Aviso de contenido publicitario"
    >
      <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0 text-sm leading-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800">
          {sponsor.paid ? 'Contenido publicitario pagado' : 'Contenido publicitario'}
        </p>
        <p className="mt-1 text-amber-900">
          {sponsor.paid
            ? 'Este artículo lo pagó'
            : 'Este artículo lo publica, sin coste y por acuerdo,'}{' '}
          <Link
            href={sponsor.website}
            target="_blank"
            rel="sponsored nofollow noopener"
            className="font-semibold underline underline-offset-2"
          >
            {sponsor.name}
          </Link>
          . No lo escribió la redacción del portal y no influye en las cifras de
          mercado que publicamos.{' '}
          <Link href="/publicidad" className="font-semibold underline underline-offset-2">
            Cómo funciona la publicidad aquí
          </Link>
          .
        </p>
      </div>
    </aside>
  );
}
