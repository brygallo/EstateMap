import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, Clock3, Compass, Map, Rss, ShieldCheck } from 'lucide-react';

import { formatPostDate, getBlogCategories, getBlogPosts, LIVE_CATEGORY } from '@/lib/blog';
import { listLivePages } from '@/lib/live-resolve';
import { jsonLd, SITE_URL, SITE_NAME } from '@/lib/properties';
import { generatePageMetadata } from '@/lib/metadata';
import { PostCard } from '@/components/blog/PostCard';
import SponsorSlotBlock from '@/components/blog/SponsorSlot';
import { CategoryNav } from '@/components/blog/CategoryNav';

// The list is server-rendered and revalidated by tag: publishing a post makes
// Django ping /api/revalidate, so a scheduled article shows up here within
// seconds instead of waiting out this window.
export const revalidate = 3600;

const TITLE = 'Blog inmobiliario de Ecuador';
const DESCRIPTION =
  'Artículos sobre comprar, vender, arrendar y financiar propiedades en Ecuador: trámites, impuestos, crédito hipotecario, precios por zona y análisis del mercado.';

export const metadata: Metadata = {
  ...generatePageMetadata(TITLE, DESCRIPTION, '/blog'),
  alternates: {
    canonical: `${SITE_URL}/blog`,
    types: { 'application/rss+xml': `${SITE_URL}/blog/rss.xml` },
  },
};

export default async function BlogPage() {
  const [{ results: posts }, categories, livePages] = await Promise.all([
    getBlogPosts({ limit: 30 }),
    getBlogCategories(),
    listLivePages(),
  ]);

  // The living pages are part of the blog, not a section beside it. They enter
  // through their own category so a reader can tell a recalculated ranking
  // from something a person wrote, which is the only distinction that matters.
  const allCategories = livePages.length
    ? [...categories, { ...LIVE_CATEGORY, post_count: livePages.length }]
    : categories;

  // «Lectura destacada» is the portal recommending something, so advertising
  // cannot hold that slot — not even by accident, from an `is_featured` ticked
  // in the admin. The block carries no disclosure of its own precisely because
  // nothing that needs one can reach it.
  const editorial = posts.filter((post) => !post.sponsor);
  const featured = editorial.find((post) => post.is_featured) ?? editorial[0] ?? null;
  const rest = posts.filter((post) => post.slug !== featured?.slug);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${SITE_URL}/blog#blog`,
        url: `${SITE_URL}/blog`,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: 'es-EC',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'ItemList',
        '@id': `${SITE_URL}/blog#lista`,
        numberOfItems: posts.length,
        itemListElement: posts.map((post, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: post.title,
          url: `${SITE_URL}/blog/${post.slug}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog' },
        ],
      },
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />

      <section className="relative isolate overflow-hidden border-b border-line bg-textPrimary text-white">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:linear-gradient(rgb(255_255_255/.07)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/.07)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_90%)]" aria-hidden />
        <div className="pointer-events-none absolute -right-24 -top-32 -z-10 h-96 w-96 rounded-full bg-primary/25 blur-3xl" aria-hidden />
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8 lg:py-20">
          <header className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <Compass className="h-4 w-4" aria-hidden />
              Guías para decidir mejor
            </p>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
              Entiende el mercado.<br />Encuentra tu lugar.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              Información clara para comprar, vender o arrendar propiedades en Ecuador sin perderte entre trámites, precios y promesas.
            </p>
          </header>
          <div className="flex gap-5 border-l border-white/15 pl-5 text-sm text-white/65 lg:w-56 lg:flex-col lg:gap-3">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Guías prácticas</span>
            <span className="inline-flex items-center gap-2"><Map className="h-4 w-4 text-primary" aria-hidden /> Datos de Ecuador</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {categories.length > 0 && <CategoryNav categories={allCategories} />}

        <SponsorSlotBlock placement="index_top" seed="blog-index" className="mt-8" />

      {posts.length === 0 ? (
        <p className="mt-12 rounded-card border border-line bg-surface p-6 text-textSecondary">
          Todavía no hay artículos publicados. Vuelve pronto.
        </p>
      ) : (
        <>
          {featured && (
            <article className="group relative mt-10 overflow-hidden rounded-card border border-line bg-white shadow-card transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-cardHover">
              <span className="absolute inset-y-0 left-0 w-1.5 bg-primary" aria-hidden />
              <div className="p-5 pl-7 sm:p-7 sm:pl-9">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                    Lectura destacada
                  </p>
                  {featured.category && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-line" aria-hidden />
                      <Link
                        href={`/blog/categoria/${featured.category.slug}`}
                        className="text-xs font-semibold text-textSecondary hover:text-primary"
                      >
                        {featured.category.name}
                      </Link>
                    </>
                  )}
                </div>

                <h2 className="mt-3 max-w-4xl text-2xl font-bold leading-tight tracking-[-0.025em] text-textPrimary sm:text-3xl">
                  <Link href={`/blog/${featured.slug}`} className="transition-colors hover:text-primary">
                    {featured.title}
                  </Link>
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-textSecondary sm:text-base sm:leading-7">
                  {featured.excerpt}
                </p>

                <div className="mt-5 flex flex-col gap-4 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-textSecondary">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden />
                      <time dateTime={featured.published_at}>{formatPostDate(featured.published_at)}</time>
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden />
                      {featured.reading_minutes} min de lectura
                    </span>
                  </div>
                  <Link
                    href={`/blog/${featured.slug}`}
                    className="inline-flex w-fit items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4"
                  >
                    Leer el artículo
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden />
                  </Link>
                </div>
              </div>
            </article>
          )}

          {rest.length > 0 && (
            <section className="mt-14">
              <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-textPrimary">
                <BookOpen className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
                Últimos artículos
              </h2>
              <p className="hidden text-sm text-textSecondary sm:block">Ideas útiles para tu próxima decisión inmobiliaria</p>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.slice(0, 3).map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>

              {/* `index_feed` was in the placement catalogue with nothing
                  painting it, so a campaign sold there would never have been
                  seen. After the first row: past the fold, before the reader
                  runs out of articles. */}
              <SponsorSlotBlock placement="index_feed" seed="blog-index-feed" className="mt-5" />

              {rest.length > 3 && (
                <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.slice(3).map((post) => (
                    <PostCard key={post.slug} post={post} />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <section className="mt-14 overflow-hidden rounded-card border border-primary/20 bg-primary/10 p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-textPrimary">
          Del artículo al mapa
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-textSecondary">
          Todo lo que se explica aquí se puede comprobar en el inventario real de{' '}
          {SITE_NAME}: cada propiedad con su ubicación exacta, su precio y su
          contacto directo.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primaryHover"
          >
            Explorar el mapa
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/estadisticas-inmobiliarias"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary"
          >
            <Clock3 className="h-4 w-4" aria-hidden />
            Precios por m² actualizados
          </Link>
          <a
            href="/blog/rss.xml"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary"
          >
            <Rss className="h-4 w-4" aria-hidden />
            Suscribirse por RSS
          </a>
        </div>
      </section>
      </div>
    </main>
  );
}
