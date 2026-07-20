import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays } from 'lucide-react';
import { GUIDES } from '@/lib/guias';
import { jsonLd, SITE_URL, SITE_NAME } from '@/lib/properties';
import { generatePageMetadata } from '@/lib/metadata';

export const metadata: Metadata = generatePageMetadata(
  'Guías inmobiliarias de Ecuador',
  'Guías prácticas para comprar, vender y financiar propiedades en Ecuador: trámites, impuestos, crédito hipotecario BIESS y consejos para vender más rápido.',
  '/guias'
);

const hubStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/guias#webpage`,
      url: `${SITE_URL}/guias`,
      name: 'Guías inmobiliarias de Ecuador',
      inLanguage: 'es-EC',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      publisher: { '@id': `${SITE_URL}/#organization` },
      mainEntity: { '@id': `${SITE_URL}/guias#lista` },
    },
    {
      '@type': 'ItemList',
      '@id': `${SITE_URL}/guias#lista`,
      name: 'Guías inmobiliarias',
      numberOfItems: GUIDES.length,
      itemListElement: GUIDES.map((guide, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: guide.title,
        url: `${SITE_URL}/guias/${guide.slug}`,
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Guías inmobiliarias' },
      ],
    },
  ],
};

export default function GuiasPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(hubStructuredData) }}
      />

      <header className="max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
          Aprende antes de firmar
        </p>
        <h1 className="text-3xl font-bold leading-tight text-textPrimary sm:text-4xl">
          Guías inmobiliarias de Ecuador
        </h1>
        <p className="mt-4 text-base leading-7 text-textSecondary">
          Trámites, impuestos, crédito hipotecario y consejos prácticos, explicados en
          claro. {SITE_NAME} reúne aquí lo que conviene saber antes de comprar, vender
          o publicar una propiedad.
        </p>
      </header>

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        {GUIDES.map((guide) => (
          <Link
            key={guide.slug}
            href={`/guias/${guide.slug}`}
            className="group flex flex-col rounded-card border border-line bg-white p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-button bg-primaryLight text-primary">
              <BookOpen className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold leading-snug text-textPrimary group-hover:text-primary">
              {guide.title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-textSecondary">
              {guide.description}
            </p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 text-textSecondary">
                <CalendarDays className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Actualizada{' '}
                {new Date(`${guide.updated}T12:00:00Z`).toLocaleDateString('es-EC', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                Leer guía
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-12 rounded-card border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold text-textPrimary">
          ¿Listo para buscar o publicar?
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-textSecondary">
          Aplica lo aprendido: explora propiedades con ubicación exacta en el mapa o
          publica la tuya gratis con fotos, precio y contacto directo.
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
            Publicar propiedad gratis
          </Link>
        </div>
      </section>
    </main>
  );
}
