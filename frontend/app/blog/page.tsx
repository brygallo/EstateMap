import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, Clock3, Compass, Map, Rss, ShieldCheck } from 'lucide-react';

import { getBlogCategories, getBlogPosts } from '@/lib/blog';
import { jsonLd, SITE_URL, SITE_NAME } from '@/lib/properties';
import { generatePageMetadata } from '@/lib/metadata';
import { PostCard, PostMeta } from '@/components/blog/PostCard';
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
        {categories.length > 0 && <CategoryNav categories={categories} />}

        <SponsorSlotBlock placement="index_top" seed="blog-index" className="mt-8" />

      {posts.length === 0 ? (
        <p className="mt-12 rounded-card border border-line bg-surface p-6 text-textSecondary">
          Todavía no hay artículos publicados. Vuelve pronto.
        </p>
      ) : (
        <>
          {featured && (
            <article className="group mt-10 grid overflow-hidden rounded-card border border-line bg-white shadow-card lg:grid-cols-[1.05fr_.95fr]">
              <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Lectura destacada</p>
              <h2 className="mt-3 text-2xl font-bold leading-tight tracking-[-0.025em] text-textPrimary sm:text-3xl lg:text-4xl">
                <Link href={`/blog/${featured.slug}`} className="hover:text-primary">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-textSecondary">{featured.excerpt}</p>
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
              </div>
              <Link href={`/blog/${featured.slug}`} className="relative min-h-64 overflow-hidden bg-primary/10 lg:min-h-full" aria-label={`Leer ${featured.title}`}>
                {featured.cover_image ? <Image src={featured.cover_image} alt={featured.cover_image_alt || featured.title} fill priority sizes="(max-width: 1024px) 100vw, 45vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none" /> : <span className="absolute inset-0 flex items-center justify-center"><Map className="h-20 w-20 text-primary/30" strokeWidth={1} aria-hidden /></span>}
                <span className="absolute inset-0 bg-gradient-to-t from-textPrimary/25 to-transparent" aria-hidden />
              </Link>
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
                {rest.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
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
