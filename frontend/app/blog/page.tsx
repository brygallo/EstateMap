import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock3, Rss } from 'lucide-react';

import { getBlogCategories, getBlogPosts } from '@/lib/blog';
import { jsonLd, SITE_URL, SITE_NAME } from '@/lib/properties';
import { generatePageMetadata } from '@/lib/metadata';
import { PostCard, PostMeta } from '@/components/blog/PostCard';
import SponsorSlotBlock from '@/components/blog/SponsorSlot';

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
  const [{ results: posts }, categories] = await Promise.all([
    getBlogPosts({ limit: 30 }),
    getBlogCategories(),
  ]);

  const featured = posts.find((post) => post.is_featured) ?? posts[0] ?? null;
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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />

      <header className="max-w-3xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
          Aprende antes de firmar
        </p>
        <h1 className="text-3xl font-bold leading-tight text-textPrimary sm:text-4xl">
          {TITLE}
        </h1>
        <p className="mt-4 text-base leading-7 text-textSecondary">{DESCRIPTION}</p>
      </header>

      {categories.length > 0 && (
        <nav aria-label="Categorías del blog" className="mt-8 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/blog/categoria/${category.slug}`}
              className="rounded-full border border-line px-4 py-2 text-sm font-medium text-textPrimary transition-colors hover:border-primary hover:text-primary"
            >
              {category.name}
              <span className="ml-1.5 text-textSecondary">{category.post_count}</span>
            </Link>
          ))}
        </nav>
      )}

      <SponsorSlotBlock placement="index_top" seed="blog-index" />

      {posts.length === 0 ? (
        <p className="mt-12 rounded-card border border-line bg-surface p-6 text-textSecondary">
          Todavía no hay artículos publicados. Vuelve pronto.
        </p>
      ) : (
        <>
          {featured && (
            <article className="mt-10 rounded-card border border-line bg-white p-6 shadow-card sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Destacado
              </p>
              <h2 className="mt-3 text-2xl font-bold leading-snug text-textPrimary sm:text-3xl">
                <Link href={`/blog/${featured.slug}`} className="hover:text-primary">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-textSecondary">{featured.excerpt}</p>
              <div className="mt-4">
                <PostMeta post={featured} />
              </div>
              <Link
                href={`/blog/${featured.slug}`}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primaryHover"
              >
                Leer el artículo
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </article>
          )}

          {rest.length > 0 && (
            <section className="mt-10">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-textPrimary">
                <BookOpen className="h-5 w-5 text-primary" strokeWidth={1.75} aria-hidden />
                Últimos artículos
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="mt-12 rounded-card border border-line bg-surface p-6 sm:p-8">
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
    </main>
  );
}
