import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, TrendingUp } from 'lucide-react';
import MarketStatsSections from '@/components/MarketStatsSections';
import { generatePageMetadata } from '@/lib/metadata';
import { jsonLd, slugify, SITE_URL } from '@/lib/properties';
import {
  getMarketStats,
  MIN_LISTINGS_FOR_PROMOTION,
  integer,
  money,
} from '@/lib/market-stats';
import { getBlogPosts } from '@/lib/blog';

export const revalidate = 1800;
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getMarketStats();
  const year = new Date().getFullYear();
  const description = stats
    ? `Precio promedio del metro cuadrado en Ecuador: ${money(stats.overall.avg_price_m2)}/m², calculado sobre ${integer(stats.overall.count)} propiedades en venta activas. Compara ciudades, sectores y tipos de propiedad con datos reales.`
    : 'Compara precios promedio por metro cuadrado, ciudades y tipos de propiedad con datos reales del inventario publicado.';
  return generatePageMetadata(
    `Precio del metro cuadrado en Ecuador (${year}) | Estadísticas inmobiliarias`,
    description,
    '/estadisticas-inmobiliarias'
  );
}

export default async function MarketStatsPage() {
  const [stats, blog] = await Promise.all([getMarketStats(), getBlogPosts({ limit: 4 })]);
  const blogPosts = blog.results;
  const year = new Date().getFullYear();
  const datasetUpdatedAt = stats?.overall.updated_at
    ? new Date(stats.overall.updated_at)
    : null;
  const updatedLabel = (datasetUpdatedAt || new Date()).toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const cityLinks = (stats?.by_city || [])
    .filter((row) => row.city && row.count >= MIN_LISTINGS_FOR_PROMOTION)
    .map((row) => ({
      name: row.city as string,
      slug: slugify(row.city as string),
      avg: row.avg_price_m2,
    }));
  const topCity = stats?.by_city.length
    ? stats.by_city.reduce((best, row) =>
        Number(row.avg_price_m2) > Number(best.avg_price_m2) ? row : best
      )
    : null;

  const faqs = stats
    ? [
        {
          question: `¿Cuánto cuesta el metro cuadrado en Ecuador en ${year}?`,
          answer: `El precio promedio del metro cuadrado en Ecuador es de ${money(stats.overall.avg_price_m2)}, calculado sobre ${integer(stats.overall.count)} propiedades en venta activas publicadas en Geo Propiedades Ecuador. El rango observado va de ${money(stats.overall.min_price_m2)} a ${money(stats.overall.max_price_m2)} por m² según ciudad, sector y tipo de propiedad.`,
        },
        ...(topCity?.city
          ? [
              {
                question: '¿En qué ciudad de Ecuador es más caro el metro cuadrado?',
                answer: `Entre las ciudades con inventario comparable, ${topCity.city} registra el precio promedio más alto: ${money(topCity.avg_price_m2)} por m² sobre ${integer(topCity.count)} propiedades en venta.`,
              },
            ]
          : []),
        {
          question: '¿Cómo se calculan estos precios?',
          answer: `${stats.methodology} Los valores son referenciales y no sustituyen un avalúo profesional.`,
        },
      ]
    : [];

  const structuredData = stats
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Dataset',
            name: `Precio del metro cuadrado en Ecuador (${year})`,
            description: `Precios promedio por metro cuadrado en Ecuador por ciudad, sector y tipo de propiedad, calculados sobre ${integer(stats.overall.count)} propiedades en venta activas. Son precios pedidos por quien vende, no precios de operaciones cerradas.`,
            url: `${SITE_URL}/estadisticas-inmobiliarias`,
            creator: {
              '@type': 'Organization',
              name: 'Geo Propiedades Ecuador',
              url: SITE_URL,
            },
            measurementTechnique: stats.methodology,
            spatialCoverage: 'Ecuador',
            temporalCoverage: String(year),
            ...(datasetUpdatedAt ? { dateModified: datasetUpdatedAt.toISOString() } : {}),
            isAccessibleForFree: true,
            variableMeasured: [
              {
                '@type': 'PropertyValue',
                name: 'Precio promedio por metro cuadrado',
                value: Math.round(Number(stats.overall.avg_price_m2)),
                unitText: 'USD/m²',
              },
              {
                '@type': 'PropertyValue',
                name: 'Propiedades analizadas',
                value: stats.overall.count,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'Estadísticas inmobiliarias' },
            ],
          },
        ],
      }
    : null;

  return (
    <main className="min-h-[calc(100dvh-var(--app-header-height))] bg-background">
      {structuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      )}
      <section className="border-b border-line bg-gradient-to-br from-primary via-primaryHover to-[var(--navy)] text-white">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-14 sm:pt-8 lg:px-8 lg:pb-14 lg:pt-10">
          {/* Visible counterpart of the BreadcrumbList JSON-LD; light text for the dark hero. */}
          <nav aria-label="Migas de pan" className="mb-3">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-white/70 sm:text-sm">
              <li>
                <Link href="/" className="transition-colors hover:text-white">
                  Inicio
                </Link>
              </li>
              <li className="flex items-center gap-1.5" aria-current="page">
                <span aria-hidden className="text-white/40">/</span>
                <span className="font-medium text-white">Estadísticas</span>
              </li>
            </ol>
          </nav>
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              <TrendingUp className="h-4 w-4" /> Datos del mercado ecuatoriano
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-3xl lg:text-4xl">
              ¿Cuánto cuesta el metro cuadrado en Ecuador?
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80 sm:mt-3 sm:text-base sm:leading-7">
              Explora precios, áreas y ciudades con información calculada sobre propiedades activas reales del
              portal. Actualizado el {updatedLabel}.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-cardHover sm:mt-5"
            >
              Explorar propiedades en el mapa <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <div className="relative z-10 mx-auto -mt-6 max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        {!stats ? (
          <div className="rounded-card border border-error/20 bg-error/5 p-6 text-center text-error">
            No fue posible cargar las estadísticas.
          </div>
        ) : (
          <>
            <MarketStatsSections data={stats} />
            {(cityLinks.length > 0 || faqs.length > 0) && (
              <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                {cityLinks.length > 0 && (
                  <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-7">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Explora el territorio</span>
                    <h2 className="mt-2 text-xl font-bold text-textPrimary">Precio del m² por ciudad</h2>
                    <p className="mt-1 text-sm leading-6 text-textSecondary">
                      Informes detallados con precios por sector, tipo de propiedad y evolución.
                    </p>
                    <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      {cityLinks.map((city) => (
                        <li key={city.slug}>
                          <Link
                            href={`/estadisticas-inmobiliarias/${city.slug}`}
                            className="group flex min-h-14 items-center justify-between gap-3 rounded-button border border-line px-4 py-3 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:bg-primaryLight hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            <span>Precio del m² en {city.name}</span>
                            <span className="shrink-0 font-geo text-primary">{money(city.avg)}/m²</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {faqs.length > 0 && (
                  <section className="rounded-card border border-line bg-white p-5 shadow-card sm:p-7">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Antes de comparar</span>
                    <h2 className="mt-2 text-xl font-bold text-textPrimary">Preguntas frecuentes</h2>
                    <div className="mt-3 divide-y divide-line">
                      {faqs.map((faq) => (
                        <div key={faq.question} className="py-4 first:pt-2 last:pb-0">
                          <h3 className="font-semibold leading-6 text-textPrimary">{faq.question}</h3>
                          <p className="mt-1.5 text-sm leading-6 text-textSecondary">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
            {blogPosts.length > 0 && (
              <section className="mt-10 overflow-hidden rounded-card border border-line bg-white shadow-card">
                <div className="flex flex-col gap-4 border-b border-line bg-primaryLight px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
                  <div>
                    <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                      <BookOpen className="h-4 w-4" aria-hidden="true" /> Guías y análisis
                    </span>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-textPrimary">
                      Del blog, para decidir mejor
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-textSecondary">
                      Contexto práctico para comparar ciudades, elegir un sector y tomar decisiones informadas.
                    </p>
                  </div>
                  <Link
                    href="/blog"
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-button px-1 text-sm font-bold text-primary transition-colors hover:text-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:self-auto"
                  >
                    Ver todos los artículos <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>

                <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                  <Link
                    href={`/blog/${blogPosts[0].slug}`}
                    className="group relative flex min-h-64 flex-col justify-between overflow-hidden border-b border-line bg-gradient-to-br from-primary via-primaryHover to-[var(--navy)] p-6 text-white focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:p-8 lg:border-b-0 lg:border-r"
                  >
                    <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/15" aria-hidden="true" />
                    <div className="absolute -right-6 -top-10 h-40 w-40 rounded-full border border-white/10" aria-hidden="true" />
                    <span className="relative w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-bold ring-1 ring-white/20">
                      Lectura recomendada
                    </span>
                    <div className="relative mt-12 max-w-xl">
                      <h3 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                        {blogPosts[0].title}
                      </h3>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/75">
                        {blogPosts[0].excerpt}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">
                        Leer artículo
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>

                  <ul className="divide-y divide-line">
                    {blogPosts.slice(1).map((post) => (
                      <li key={post.slug}>
                        <Link
                          href={`/blog/${post.slug}`}
                          className="group flex min-h-32 items-center justify-between gap-5 px-5 py-5 transition-colors hover:bg-primaryLight focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset sm:px-7"
                        >
                          <div className="min-w-0">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-textSecondary">
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              {post.reading_minutes} min de lectura
                            </span>
                            <h3 className="mt-2 text-base font-bold leading-6 text-textPrimary transition-colors group-hover:text-primary">
                              {post.title}
                            </h3>
                          </div>
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-primary transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
