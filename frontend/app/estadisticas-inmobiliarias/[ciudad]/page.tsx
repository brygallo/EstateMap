import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, TrendingUp } from 'lucide-react';
import MarketStatsSections from '@/components/MarketStatsSections';
import { generatePageMetadata } from '@/lib/metadata';
import {
  getProperties,
  getCities,
  getLocationCatalog,
  jsonLd,
  SITE_URL,
} from '@/lib/properties';
import {
  getMarketStats,
  MIN_LISTINGS_FOR_INDEX,
  MIN_LISTINGS_FOR_PROMOTION,
  integer,
  money,
} from '@/lib/market-stats';
import { GUIDES } from '@/lib/guias';

export const revalidate = 1800;
export const dynamicParams = true;

interface CityStatsPageProps {
  params: Promise<{ ciudad: string }>;
}

async function resolveCityName(slug: string): Promise<string | null> {
  const properties = await getProperties();
  const match = getCities(properties).find((c) => c.slug === slug);
  if (match) return match.name;
  // Same fallback as the city landing: a canton without listings answers 200
  // (noindex) instead of 404-ing a URL that may already be indexed.
  const { cities } = await getLocationCatalog();
  return cities.find((c) => c.slug === slug)?.name || null;
}

export async function generateStaticParams() {
  const properties = await getProperties();
  return getCities(properties)
    .filter((city) => city.count >= MIN_LISTINGS_FOR_PROMOTION)
    .map((city) => ({ ciudad: city.slug }));
}

export async function generateMetadata({ params }: CityStatsPageProps): Promise<Metadata> {
  const { ciudad } = await params;
  const cityName = await resolveCityName(ciudad);
  if (!cityName) {
    return { title: 'Ciudad no encontrada', robots: { index: false, follow: false } };
  }

  const stats = await getMarketStats(cityName);
  const year = new Date().getFullYear();
  const hasData = Boolean(stats && stats.overall.count >= MIN_LISTINGS_FOR_INDEX);
  const description = hasData
    ? `El metro cuadrado en ${cityName} cuesta en promedio ${money(stats!.overall.avg_price_m2)}, calculado sobre ${integer(stats!.overall.count)} propiedades en venta activas. Precios por sector, tipo de propiedad y evolución del mercado.`
    : `Precios por metro cuadrado en ${cityName} calculados con inventario real del portal.`;

  const metadata = generatePageMetadata(
    `Precio del metro cuadrado en ${cityName} (${year})`,
    description,
    `/estadisticas-inmobiliarias/${ciudad}`
  );
  // Crawlable but out of the index until the city has comparable inventory.
  if (!hasData) {
    return { ...metadata, robots: { index: false, follow: true } };
  }
  return metadata;
}

export default async function CityStatsPage({ params }: CityStatsPageProps) {
  const { ciudad } = await params;
  const cityName = await resolveCityName(ciudad);
  if (!cityName) notFound();

  const stats = await getMarketStats(cityName);
  const year = new Date().getFullYear();
  const updatedLabel = new Date().toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const hasData = Boolean(stats && stats.overall.count >= MIN_LISTINGS_FOR_INDEX);
  const topSector = stats?.by_sector.length
    ? stats.by_sector.reduce((best, row) =>
        Number(row.avg_price_m2) > Number(best.avg_price_m2) ? row : best
      )
    : null;
  const cityGuides = GUIDES.filter((guide) =>
    guide.title.toLowerCase().includes(cityName.toLowerCase())
  );

  const faqs = hasData
    ? [
        {
          question: `¿Cuánto cuesta el metro cuadrado en ${cityName} en ${year}?`,
          answer: `El precio promedio del metro cuadrado en ${cityName} es de ${money(stats!.overall.avg_price_m2)}, calculado sobre ${integer(stats!.overall.count)} propiedades en venta activas publicadas en Geo Propiedades Ecuador. El precio promedio de una propiedad en venta es de ${money(stats!.overall.avg_price)} con un área promedio de ${integer(stats!.overall.avg_area)} m².`,
        },
        ...(topSector
          ? [
              {
                question: `¿Cuál es el sector más caro de ${cityName}?`,
                answer: `Entre los sectores con inventario comparable, ${topSector.sector} registra el precio promedio más alto de ${cityName}: ${money(topSector.avg_price_m2)} por m² sobre ${integer(topSector.count)} propiedades.`,
              },
            ]
          : []),
        {
          question: '¿Cómo se calculan estos precios?',
          answer: `${stats!.methodology} Los valores son referenciales y no sustituyen un avalúo profesional.`,
        },
      ]
    : [];

  const structuredData = hasData
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Dataset',
            name: `Precio del metro cuadrado en ${cityName} (${year})`,
            description: `Precios promedio por metro cuadrado en ${cityName}, Ecuador, por sector y tipo de propiedad, calculados sobre ${integer(stats!.overall.count)} propiedades en venta activas.`,
            url: `${SITE_URL}/estadisticas-inmobiliarias/${ciudad}`,
            creator: {
              '@type': 'Organization',
              name: 'Geo Propiedades Ecuador',
              url: SITE_URL,
            },
            spatialCoverage: `${cityName}, Ecuador`,
            temporalCoverage: String(year),
            dateModified: new Date().toISOString(),
            isAccessibleForFree: true,
            variableMeasured: [
              {
                '@type': 'PropertyValue',
                name: 'Precio promedio por metro cuadrado',
                value: Math.round(Number(stats!.overall.avg_price_m2)),
                unitText: 'USD/m²',
              },
              {
                '@type': 'PropertyValue',
                name: 'Propiedades analizadas',
                value: stats!.overall.count,
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
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Estadísticas inmobiliarias',
                item: `${SITE_URL}/estadisticas-inmobiliarias`,
              },
              { '@type': 'ListItem', position: 3, name: cityName },
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
              <TrendingUp className="h-4 w-4" /> Datos del mercado de {cityName}
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
              ¿Cuánto cuesta el metro cuadrado en {cityName}?
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
              {hasData
                ? `Precio promedio de ${money(stats!.overall.avg_price_m2)}/m² sobre ${integer(stats!.overall.count)} propiedades en venta activas. Actualizado el ${updatedLabel}.`
                : `Aún no hay suficiente inventario comparable en ${cityName} para calcular precios confiables.`}
            </p>
            <Link
              href={`/propiedades/${ciudad}`}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-primary shadow-cardHover"
            >
              Ver propiedades en {cityName} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {!hasData ? (
          <div className="rounded-card border border-line bg-white p-8 text-center shadow-card">
            <p className="text-textPrimary">
              Cuando haya más propiedades publicadas en {cityName} podremos calcular precios por metro cuadrado
              confiables para esta ciudad.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm font-semibold">
              <Link href={`/propiedades/${ciudad}`} className="text-primary hover:underline">
                Propiedades en {cityName}
              </Link>
              <Link href="/estadisticas-inmobiliarias" className="text-primary hover:underline">
                Estadísticas de Ecuador
              </Link>
              <Link href="/publicar-propiedad" className="text-primary hover:underline">
                Publicar una propiedad
              </Link>
            </div>
          </div>
        ) : (
          <>
            <MarketStatsSections data={stats!} cityName={cityName} />
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
            <section className="mt-10 rounded-card bg-primaryLight p-5 sm:p-7">
              <h2 className="text-lg font-bold text-textPrimary">Sigue explorando</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href={`/propiedades/${ciudad}`} className="font-semibold text-primary hover:underline">
                    Propiedades en venta y alquiler en {cityName}
                  </Link>
                </li>
                <li>
                  <Link href="/estadisticas-inmobiliarias" className="font-semibold text-primary hover:underline">
                    Precio del metro cuadrado en Ecuador
                  </Link>
                </li>
                {cityGuides.map((guide) => (
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
