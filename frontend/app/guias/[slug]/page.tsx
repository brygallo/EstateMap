import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CalendarDays, CheckCircle2, ChevronRight, Home } from 'lucide-react';
import { GUIDES, getGuide } from '@/lib/guias';
import { jsonLd, SITE_URL, SITE_NAME } from '@/lib/properties';
import { generatePageMetadata } from '@/lib/metadata';

interface GuidePageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export function generateMetadata({ params }: GuidePageProps): Metadata {
  const guide = getGuide(params.slug);
  if (!guide) {
    return { title: 'Guía no encontrada', robots: { index: false, follow: false } };
  }
  return generatePageMetadata(guide.title, guide.description, `/guias/${guide.slug}`);
}

export default function GuiaPage({ params }: GuidePageProps) {
  const guide = getGuide(params.slug);
  if (!guide) notFound();

  const guideUrl = `${SITE_URL}/guias/${guide.slug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${guideUrl}#articulo`,
        headline: guide.title,
        description: guide.description,
        url: guideUrl,
        mainEntityOfPage: guideUrl,
        inLanguage: 'es-EC',
        datePublished: guide.updated,
        dateModified: guide.updated,
        author: { '@id': `${SITE_URL}/#organization` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        articleSection: 'Guías inmobiliarias',
        about: { '@type': 'Thing', name: 'Bienes raíces en Ecuador' },
      },
      {
        '@type': 'FAQPage',
        '@id': `${guideUrl}#faq`,
        inLanguage: 'es-EC',
        mainEntity: guide.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Guías inmobiliarias',
            item: `${SITE_URL}/guias`,
          },
          { '@type': 'ListItem', position: 3, name: guide.title },
        ],
      },
    ],
  };

  const updatedLabel = new Date(`${guide.updated}T12:00:00Z`).toLocaleDateString(
    'es-EC',
    { day: 'numeric', month: 'long', year: 'numeric' }
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />

      <nav aria-label="Migas de pan" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-textSecondary">
          <li>
            <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-primary">
              <Home className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Inicio
            </Link>
          </li>
          <ChevronRight className="h-4 w-4 text-line" aria-hidden />
          <li>
            <Link href="/guias" className="transition-colors hover:text-primary">
              Guías
            </Link>
          </li>
          <ChevronRight className="h-4 w-4 text-line" aria-hidden />
          <li className="max-w-[16rem] truncate font-medium text-textPrimary sm:max-w-md" aria-current="page">
            {guide.title}
          </li>
        </ol>
      </nav>

      <article>
        <header>
          <h1 className="text-3xl font-bold leading-tight text-textPrimary sm:text-4xl">
            {guide.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-textSecondary">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Actualizada el {updatedLabel}
            </span>
            <span>Por {SITE_NAME}</span>
          </div>
          <p className="mt-5 text-base leading-7 text-textSecondary">{guide.intro}</p>
        </header>

        {guide.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-xl font-semibold text-textPrimary">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="mt-3 leading-7 text-textSecondary">
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="mt-3 space-y-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet.slice(0, 40)} className="flex gap-2 leading-7 text-textSecondary">
                    <CheckCircle2
                      className="mt-1.5 h-4 w-4 flex-shrink-0 text-primary"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-textPrimary">Preguntas frecuentes</h2>
          <dl className="mt-4 space-y-5">
            {guide.faqs.map((faq) => (
              <div key={faq.q} className="rounded-card border border-line bg-surface p-5">
                <dt className="font-semibold text-textPrimary">{faq.q}</dt>
                <dd className="mt-2 leading-7 text-textSecondary">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="mt-8 rounded-card border border-line bg-surface p-4 text-sm leading-6 text-textSecondary">
          Esta guía es informativa y usa valores referenciales. Impuestos, tasas y
          requisitos cambian según el cantón y la entidad: confirma los valores
          vigentes en tu municipio, notaría, banco o el BIESS antes de firmar.
        </p>
      </article>

      <nav aria-label="Contenido relacionado" className="mt-10">
        <h2 className="text-lg font-semibold text-textPrimary">Sigue explorando</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {guide.related.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-textPrimary hover:border-primary hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="mt-10 rounded-card border border-line bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-textPrimary">
          Busca propiedades con ubicación exacta
        </h2>
        <p className="mt-2 text-sm leading-6 text-textSecondary">
          Todas las propiedades de {SITE_NAME} se ven en un mapa, con precio, fotos y
          contacto directo por WhatsApp.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
          >
            Explorar el mapa
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/publicar-propiedad"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-semibold text-textPrimary hover:border-primary hover:text-primary"
          >
            Publicar gratis
          </Link>
        </div>
      </div>
    </main>
  );
}
