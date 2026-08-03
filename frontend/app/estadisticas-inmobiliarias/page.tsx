import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, TrendingUp } from 'lucide-react';
import MarketStatsSections from '@/components/MarketStatsSections';
import { generatePageMetadata } from '@/lib/metadata';
import { jsonLd, slugify, SITE_URL } from '@/lib/properties';
import {
  getMarketStats,
  MIN_LISTINGS_FOR_PROMOTION,
  integer,
  money,
} from '@/lib/market-stats';
import { GUIDES } from '@/lib/guias';

export const revalidate = 1800;

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
  const stats = await getMarketStats();
  const year = new Date().getFullYear();
  const updatedLabel = new Date().toLocaleDateString('es-EC', {
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
            description: `Precios promedio por metro cuadrado en Ecuador por ciudad, sector y tipo de propiedad, calculados sobre ${integer(stats.overall.count)} propiedades en venta activas.`,
            url: `${SITE_URL}/estadisticas-inmobiliarias`,
            creator: {
              '@type': 'Organization',
              name: 'Geo Propiedades Ecuador',
              url: SITE_URL,
            },
            spatialCoverage: 'Ecuador',
            temporalCoverage: String(year),
            dateModified: new Date().toISOString(),
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
    <main className="min-h-screen bg-background">
      {structuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      )}
      <section className="border-b border-line bg-gradient-to-br from-primary via-primaryHover to-[var(--navy)] text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold ring-1 ring-white/20">
              <TrendingUp className="h-4 w-4" /> Datos del mercado ecuatoriano
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
              ¿Cuánto cuesta el metro cuadrado en Ecuador?
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
              Explora precios, áreas y ciudades con información calculada sobre propiedades activas reales del
              portal. Actualizado el {updatedLabel}.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-primary shadow-cardHover"
            >
              Explorar propiedades en el mapa <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {!stats ? (
          <div className="rounded-card border border-error/20 bg-error/5 p-6 text-center text-error">
            No fue posible cargar las estadísticas.
          </div>
        ) : (
          <>
            <MarketStatsSections data={stats} />
            {cityLinks.length > 0 && (
              <section className="mt-10 rounded-card border border-line bg-white p-5 shadow-card sm:p-7">
                <h2 className="text-xl font-bold text-textPrimary">Precio del m² por ciudad</h2>
                <p className="mt-1 text-sm text-textSecondary">
                  Informes detallados por ciudad con precios por sector, tipo de propiedad y evolución.
                </p>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cityLinks.map((city) => (
                    <li key={city.slug}>
                      <Link
                        href={`/estadisticas-inmobiliarias/${city.slug}`}
                        className="flex items-center justify-between gap-3 rounded-button border border-line px-4 py-3 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary"
                      >
                        <span>Precio del m² en {city.name}</span>
                        <span className="font-geo text-primary">{money(city.avg)}/m²</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {faqs.length > 0 && (
              <section className="mt-10 rounded-card border border-line bg-white p-5 shadow-card sm:p-7">
                <h2 className="text-xl font-bold text-textPrimary">Preguntas frecuentes</h2>
                <div className="mt-4 divide-y divide-line">
                  {faqs.map((faq) => (
                    <div key={faq.question} className="py-4">
                      <h3 className="font-semibold text-textPrimary">{faq.question}</h3>
                      <p className="mt-1.5 text-sm leading-6 text-textSecondary">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section className="mt-10 rounded-card bg-primaryLight p-5 sm:p-7">
              <h2 className="text-lg font-bold text-textPrimary">Guías para decidir mejor</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {GUIDES.slice(0, 4).map((guide) => (
                  <li key={guide.slug}>
                    <Link href={`/guias/${guide.slug}`} className="font-semibold text-primary hover:underline">
                      {guide.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
