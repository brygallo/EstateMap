import Link from 'next/link';
import { ArrowRight, Home, MapPin, Ruler, Trophy } from 'lucide-react';

import PropertyImage from '@/components/ui/PropertyImage';
import { integer, money } from '@/lib/market-stats';
import { jsonLd, SITE_URL, slugify } from '@/lib/properties';
import {
  liveTitle,
  placeInPhrase,
  placePhrase,
  subjectPhrase,
  typeGender,
  type LiveRecipe,
} from '@/lib/live-pages';
import type { Ranking, RankingItem } from '@/lib/rankings';
import { LIVE_CATEGORY } from '@/lib/blog';

/**
 * A living page: one ranking of real inventory, recalculated with the market.
 *
 * The layout follows the market stats pages on purpose — same hero, same card
 * surfaces, same breadcrumb — because for a reader this is the same kind of
 * page: a number, where it comes from, and what it is compared against.
 */

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function updatedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'long' }).format(date);
}

function measure(item: RankingItem, recipe: LiveRecipe): string {
  if (recipe.criterion.unit === 'area') return `${integer(item.area ?? 0)} m²`;
  if (recipe.criterion.unit === 'price_m2') return `${money(item.price_per_m2 ?? 0)}/m²`;
  if (recipe.criterion.unit === 'date' && item.created_at) {
    const days = Math.max(0, Math.round((Date.now() - new Date(item.created_at).getTime()) / DAY_IN_MS));
    return days === 0 ? 'publicado hoy' : days === 1 ? 'hace 1 día' : `hace ${days} días`;
  }
  return money(item.price ?? 0);
}

/**
 * «un 32 % por debajo del precio por m² de la ciudad» — the reason it ranks.
 *
 * Past a certain distance a percentage stops being readable: the largest lot
 * in the country is not «20.094 % por encima del área promedio», it is two
 * hundred times it. Areas are skewed enough that this is the normal case, not
 * the exception, so anything at triple the average or more is said as a
 * multiple.
 */
function reason(item: RankingItem, ranking: Ranking, place: string): string | null {
  if (item.delta_pct === null || ranking.comparison === 'none') return null;
  const axis = ranking.comparison === 'area' ? 'área promedio' : 'precio por m² promedio';
  const magnitude = Math.abs(item.delta_pct);
  if (magnitude < 1) return `En el promedio ${place}`;

  const ratio = 1 + item.delta_pct / 100;
  if (ratio >= 3) {
    const times = ratio >= 10 ? integer(ratio) : ratio.toFixed(1).replace('.', ',');
    return `${times} veces el ${axis} ${place}`;
  }
  const direction = item.delta_pct < 0 ? 'por debajo' : 'por encima';
  return `${integer(magnitude)} % ${direction} del ${axis} ${place}`;
}


/** Questions the page can answer with the numbers it already shows. */
function faqsFor(
  recipe: LiveRecipe,
  ranking: Ranking,
  place: string,
  subject: string,
  measured: string
): { question: string; answer: string }[] {
  const benchmark = ranking.context.benchmark;
  const leader = ranking.items[0];
  const questions: { question: string; answer: string }[] = [];

  questions.push({
    question: `¿Cuál es ${
      recipe.criterion.unit === 'area' ? 'el más grande' : 'el más barato'
    } de ${subject} ${place}?`,
    answer: `${leader.title}, en ${measured}${
      leader.address ? `, en ${leader.address}` : ''
    }. Es la primera posición de ${integer(ranking.sample_size)} anuncios activos analizados${
      leader.delta_pct !== null && Math.abs(leader.delta_pct) >= 1
        ? `, ${reason(leader, ranking, place)?.toLowerCase()}`
        : ''
    }.`,
  });

  if (benchmark && ranking.comparison !== 'none') {
    questions.push({
      question:
        ranking.comparison === 'area'
          ? `¿Cuánto mide en promedio ${subject} ${place}?`
          : `¿Cuánto cuesta el metro cuadrado de ${subject} ${place}?`,
      answer:
        ranking.comparison === 'area'
          ? `El área promedio es de ${integer(benchmark)} m², calculada sobre ${integer(
              ranking.sample_size
            )} anuncios activos publicados en Geo Propiedades Ecuador.`
          : `El precio por metro cuadrado promedio es de ${money(
              benchmark
            )}, calculado sobre ${integer(
              ranking.sample_size
            )} anuncios activos publicados en Geo Propiedades Ecuador.`,
    });
  }

  questions.push({
    question: '¿Cómo se calcula esta lista y cada cuánto cambia?',
    answer: `Se ordenan los anuncios activos del portal y se descartan los que tienen datos imposibles: un precio de venta por debajo de mil dólares, un área fuera de rango o un precio por metro que no se sostiene frente a su propio mercado.${
      ranking.implausible_excluded > 0
        ? ` En este caso quedaron fuera ${integer(ranking.implausible_excluded)} anuncios.`
        : ''
    } La lista se recalcula cuando cambia el inventario publicado, no en una fecha fija.`,
  });

  return questions;
}

export type LiveRankingPageProps = {
  recipe: LiveRecipe;
  ranking: Ranking;
  slug: string;
  /** Related recipes in the same place, already resolved to slugs. */
  siblings: { slug: string; label: string }[];
  catalogueHref: string;
  statsHref: string | null;
};

export default function LiveRankingPage({
  recipe,
  ranking,
  slug,
  siblings,
  catalogueHref,
  statsHref,
}: LiveRankingPageProps) {
  const place = placePhrase(recipe.scope);
  const placeIn = placeInPhrase(recipe.scope);
  const subject = subjectPhrase(recipe.typeDef);
  const gender = typeGender(recipe.typeDef);
  const count = ranking.items.length;
  const title = liveTitle(recipe, count);
  const updated = updatedLabel(ranking.context.updated_at);
  const benchmark = ranking.context.benchmark;
  // The map reads `type`, `status`, `city` and `province` from the querystring,
  // so the link arrives filtered to exactly what the ranking describes.
  const mapScope =
    recipe.scope.kind === 'city'
      ? `&city=${encodeURIComponent(recipe.scope.name)}`
      : recipe.scope.kind === 'province'
        ? `&province=${encodeURIComponent(recipe.scope.name)}`
        : '';
  const mapHref = `/?type=${recipe.typeDef.type}${
    recipe.opDef ? `&status=${recipe.opDef.status}` : ''
  }${mapScope}`;

  // The self-contained answer: figure, sample and method in one paragraph, so
  // it can be quoted whole and still be true.
  const answer =
    ranking.comparison === 'none'
      ? `Estos son ${subject} publicados más recientemente ${place}, sobre ${integer(
          ranking.sample_size
        )} anuncios activos.`
      : `${gender === 'f' ? 'La primera' : 'El primero'} de ${subject} ${
          recipe.criterion.label[gender]
        } ${place} está en ${measure(ranking.items[0], recipe)}, calculado sobre ${integer(
          ranking.sample_size
        )} anuncios activos${
          benchmark
            ? ` cuyo ${
                ranking.comparison === 'area' ? 'área promedio' : 'precio por m² promedio'
              } es de ${ranking.comparison === 'area' ? `${integer(benchmark)} m²` : `${money(benchmark)}`}`
            : ''
        }. ${
          ranking.implausible_excluded > 0
            ? `Se excluyeron ${integer(ranking.implausible_excluded)} anuncios con datos imposibles.`
            : ''
        }`;

  const faqs = faqsFor(recipe, ranking, place, subject, measure(ranking.items[0], recipe));

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      },
      {
        '@type': 'ItemList',
        name: title,
        description: answer,
        numberOfItems: count,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: ranking.items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${SITE_URL}/propiedad/${item.id}`,
          name: item.title,
        })),
      },
      {
        '@type': 'Dataset',
        name: title,
        description: answer,
        url: `${SITE_URL}/blog/${slug}`,
        creator: { '@type': 'Organization', name: 'Geo Propiedades Ecuador', url: SITE_URL },
        isAccessibleForFree: true,
        ...(ranking.context.updated_at ? { dateModified: ranking.context.updated_at } : {}),
        variableMeasured: [
          { '@type': 'PropertyValue', name: 'Anuncios analizados', value: ranking.sample_size },
          ...(benchmark
            ? [
                {
                  '@type': 'PropertyValue',
                  name: ranking.comparison === 'area' ? 'Área promedio' : 'Precio promedio por m²',
                  value: Math.round(benchmark),
                  unitText: ranking.comparison === 'area' ? 'm²' : 'USD/m²',
                },
              ]
            : []),
        ],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          {
            '@type': 'ListItem',
            position: 3,
            name: LIVE_CATEGORY.name,
            item: `${SITE_URL}/blog/categoria/${LIVE_CATEGORY.slug}`,
          },
          { '@type': 'ListItem', position: 4, name: title },
        ],
      },
    ],
  };

  return (
    <main className="min-h-[calc(100dvh-var(--app-header-height))] bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />

      <section className="border-b border-line bg-gradient-to-br from-primary via-primaryHover to-[var(--navy)] text-white">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pb-14 sm:pt-8 lg:px-8">
          <nav aria-label="Migas de pan" className="mb-3">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-white/70 sm:text-sm">
              <li>
                <Link href="/" className="inline-flex items-center gap-1 transition-colors hover:text-white">
                  <Home className="h-3.5 w-3.5" aria-hidden /> Inicio
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="text-white/40">/</span>
                <Link href="/blog" className="transition-colors hover:text-white">
                  Blog
                </Link>
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="text-white/40">/</span>
                <Link
                  href={`/blog/categoria/${LIVE_CATEGORY.slug}`}
                  className="transition-colors hover:text-white"
                >
                  {LIVE_CATEGORY.name}
                </Link>
              </li>
              <li className="flex items-center gap-1.5" aria-current="page">
                <span aria-hidden className="text-white/40">/</span>
                <span className="font-medium text-white">{recipe.criterion.label[gender]}</span>
              </li>
            </ol>
          </nav>

          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">
              <Trophy className="h-4 w-4" aria-hidden /> Ranking en vivo
            </span>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:mt-3 sm:text-3xl lg:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80 sm:mt-3 sm:text-base sm:leading-7">
              {answer}
            </p>
            {updated && (
              <p className="mt-2 text-xs text-white/70 sm:text-sm">
                Se recalcula con el inventario publicado. Actualizado el {updated}.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3 sm:mt-5">
              <Link
                href={mapHref}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-cardHover"
              >
                Ver {subject} en el mapa <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href={catalogueHref}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/20"
              >
                Ver todo el catálogo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-6 max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <ol className="space-y-3">
          {ranking.items.map((item, index) => {
            const why = reason(item, ranking, place);
            return (
              <li
                key={item.id}
                className="rounded-card border border-line bg-white p-4 shadow-card transition-shadow hover:shadow-cardHover sm:p-5"
              >
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex flex-none flex-col items-center gap-2">
                    <span
                      aria-hidden
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primaryLight text-sm font-black text-primary sm:h-11 sm:w-11 sm:text-base"
                    >
                      {index + 1}
                    </span>
                    {item.image && (
                      <Link
                        href={`/propiedad/${item.id}`}
                        tabIndex={-1}
                        aria-hidden
                        className="relative hidden h-[76px] w-[76px] overflow-hidden rounded-lg sm:block"
                      >
                        <PropertyImage
                          src={item.image}
                          alt=""
                          fill
                          sizes="76px"
                          className="object-cover"
                          wrapperClassName="absolute inset-0"
                        />
                      </Link>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <Link
                        href={`/propiedad/${item.id}`}
                        className="text-base font-bold text-textPrimary hover:text-primary sm:text-lg"
                      >
                        {item.title}
                      </Link>
                      <span className="text-lg font-black tabular-nums text-primary sm:text-xl">
                        {measure(item, recipe)}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-textSecondary">
                      {item.address && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 flex-none text-primary" strokeWidth={1.75} aria-hidden />
                          {item.address}
                        </span>
                      )}
                      {item.area ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Ruler className="h-4 w-4 flex-none text-primary" strokeWidth={1.75} aria-hidden />
                          {integer(item.area)} m²
                        </span>
                      ) : null}
                      {recipe.criterion.unit !== 'price' && item.price ? (
                        <span className="tabular-nums">{money(item.price)}</span>
                      ) : null}
                      {recipe.criterion.unit === 'price' && item.price_per_m2 ? (
                        <span className="tabular-nums">{money(item.price_per_m2)}/m²</span>
                      ) : null}
                    </div>

                    {why && (
                      <p className="mt-2 inline-flex rounded-full bg-primaryLight px-3 py-1 text-xs font-semibold text-primary sm:text-sm">
                        {why}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
                      <Link href={`/propiedad/${item.id}`} className="text-primary hover:underline">
                        Ver ficha completa
                      </Link>
                      <Link href={`/?property=${item.id}`} className="text-primary hover:underline">
                        Ver en el mapa
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <section className="mt-10 rounded-card border border-line bg-white p-5 shadow-card sm:p-7">
          <h2 className="text-xl font-bold text-textPrimary">Cómo se arma este ranking</h2>
          <p className="mt-2 text-sm leading-6 text-textSecondary">
            Se ordenan {subject} {recipe.opDef ? recipe.opDef.label : 'publicados'} y activos {placeIn} por{' '}
            {ranking.comparison === 'area' ? 'área' : 'precio'}, sobre {integer(ranking.sample_size)} anuncios.
            Se descartan los que tienen datos imposibles —un precio de venta por debajo de mil dólares, un área
            fuera de rango o un precio por metro que no se sostiene frente a su propio mercado— y las
            publicaciones repetidas ocupan una sola posición.
            {ranking.implausible_excluded > 0
              ? ` En este ámbito quedaron fuera ${integer(ranking.implausible_excluded)} anuncios por esos motivos.`
              : ''}
            {ranking.duplicates_collapsed
              ? ` Se colapsaron ${integer(ranking.duplicates_collapsed)} anuncios repetidos.`
              : ''}
          </p>
          <p className="mt-3 text-sm leading-6 text-textSecondary">
            Los precios son los que publica cada anunciante y pueden cambiar. Esta página no es una tasación:
            es una lectura del inventario disponible en el portal el día que la abres.
          </p>
        </section>

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
          <h2 className="text-lg font-bold text-textPrimary">Sigue explorando {placeIn}</h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {siblings.map((sibling) => (
              <li key={sibling.slug}>
                <Link href={`/blog/${sibling.slug}`} className="font-semibold text-primary hover:underline">
                  {sibling.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={catalogueHref} className="font-semibold text-primary hover:underline">
                Todo el catálogo {placeIn}
              </Link>
            </li>
            {statsHref && (
              <li>
                <Link href={statsHref} className="font-semibold text-primary hover:underline">
                  Precio del metro cuadrado {placeIn}
                </Link>
              </li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}

export { slugify };
