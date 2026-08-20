import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, TrendingUp } from 'lucide-react';
import MarketStatsSections from '@/components/MarketStatsSections';
import { generatePageMetadata } from '@/lib/metadata';
import {
  getAllProperties,
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
import { getBlogPosts } from '@/lib/blog';
import { listLivePages } from '@/lib/live-resolve';

export const revalidate = 1800;
export const dynamicParams = true;

interface CityStatsPageProps {
  params: Promise<{ ciudad: string }>;
}

async function resolveCityName(slug: string): Promise<string | null> {
  const properties = await getAllProperties();
  const match = getCities(properties).find((c) => c.slug === slug);
  if (match) return match.name;
  // Same fallback as the city landing: a canton without listings answers 200
  // (noindex) instead of 404-ing a URL that may already be indexed.
  const { cities } = await getLocationCatalog();
  return cities.find((c) => c.slug === slug)?.name || null;
}

export async function generateStaticParams() {
  const properties = await getAllProperties();
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
  const datasetUpdatedAt = stats?.overall.updated_at
    ? new Date(stats.overall.updated_at)
    : null;
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
  // `dateModified` on the Dataset is what makes the figures citable: without a
  // real timestamp the schema claims freshness it cannot back.
  const datasetUpdatedAt = stats?.overall.updated_at
    ? new Date(stats.overall.updated_at)
    : null;
  const topSector = stats?.by_sector.length
    ? stats.by_sector.reduce((best, row) =>
        Number(row.avg_price_m2) > Number(best.avg_price_m2) ? row : best
      )
    : null;
  // Articles about this city. The server filters by tag and we keep only the
  // ones that also name the city, so a national post never gets linked from a
  // city page as if it were local.
  const { results: cityPosts } = await getBlogPosts({ tag: cityName, limit: 4 });
  // Live rankings of this same city. Without this link the thousand pages of
  // the blog depend on their own index alone; with it, the page that already
  // ranks for «precio del m² en <ciudad>» feeds them.
  const cityRankings = (await listLivePages())
    .filter((page) => page.recipe.scope.kind === 'city' && page.recipe.scope.slug === ciudad)
    .filter((page) => !page.recipe.opDef)
    .slice(0, 6);
  const cityGuides = cityPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(cityName.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase() === cityName.toLowerCase())
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
            ...(datasetUpdatedAt ? { dateModified: datasetUpdatedAt.toISOString() } : {}),
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
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="text-white/40">/</span>
                <Link href="/estadisticas-inmobiliarias" className="transition-colors hover:text-white">
                  Estadísticas
                </Link>
              </li>
              <li className="flex items-center gap-1.5" aria-current="page">
                <span aria-hidden className="text-white/40">/</span>
                <span className="font-medium text-white">{cityName}</span>
              </li>
            </ol>
          </nav>
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              <TrendingUp className="h-4 w-4" /> Datos del mercado de {cityName}
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-3xl lg:text-4xl">
              ¿Cuánto cuesta el metro cuadrado en {cityName}?
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80 sm:mt-3 sm:text-base sm:leading-7">
              {hasData
                ? `Precio promedio de ${money(stats!.overall.avg_price_m2)}/m² sobre ${integer(stats!.overall.count)} propiedades en venta activas. Actualizado el ${updatedLabel}.`
                : `Aún no hay suficiente inventario comparable en ${cityName} para calcular precios confiables.`}
            </p>
            <Link
              href={`/propiedades/${ciudad}`}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-cardHover sm:mt-5"
            >
              Ver propiedades en {cityName} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <div className="relative z-10 mx-auto -mt-6 max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
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
                {cityRankings.map((page) => (
                  <li key={page.slug}>
                    <Link href={`/blog/${page.slug}`} className="font-semibold text-primary hover:underline">
                      {page.title}
                    </Link>
                  </li>
                ))}
                {cityGuides.map((post) => (
                  <li key={post.slug}>
                    <Link href={`/blog/${post.slug}`} className="font-semibold text-primary hover:underline">
                      {post.title}
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
