import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, CalendarDays, ChevronRight, Clock3, Home, RefreshCw } from 'lucide-react';

import { authorSlug, formatPostDate, getBlogPost, getBlogPosts } from '@/lib/blog';
import {
  extractHeadings,
  extractImages,
  markdownToPlainText,
  midArticleIndex,
  renderMarkdown,
} from '@/lib/markdown';
import { jsonLd, SITE_URL, SITE_NAME } from '@/lib/properties';
import { generatePageMetadata } from '@/lib/metadata';
import { PostCard } from '@/components/blog/PostCard';
import CityPriceBlock, { getCityPriceFacts } from '@/components/blog/CityPriceBlock';
import SponsorSlotBlock from '@/components/blog/SponsorSlot';
import { money } from '@/lib/market-stats';
import { slugify } from '@/lib/properties';

export const revalidate = 3600;
// A post scheduled for next week has no page yet; it must render on first
// request the day it goes live rather than 404 until the next deploy.
export const dynamicParams = true;

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const { results } = await getBlogPosts({ limit: 60 });
  return results.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) {
    return { title: 'Artículo no encontrado', robots: { index: false, follow: false } };
  }

  const base = generatePageMetadata(
    post.meta_title || post.title,
    post.meta_description || post.excerpt,
    `/blog/${post.slug}`
  );
  return {
    ...base,
    authors: post.author_name ? [{ name: post.author_name }] : undefined,
    openGraph: {
      ...base.openGraph,
      type: 'article',
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: post.author_name ? [post.author_name] : undefined,
      tags: post.tags,
      ...(post.cover_image
        ? { images: [{ url: post.cover_image, alt: post.cover_image_alt || post.title }] }
        : {}),
    },
  };
}

export default async function BlogPostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  // Same category first, so the reader lands on something adjacent instead of
  // whatever happens to be newest.
  const { results: siblings } = await getBlogPosts({
    limit: 3,
    exclude: post.slug,
    category: post.category?.slug,
  });
  const related =
    siblings.length > 0
      ? siblings
      : (await getBlogPosts({ limit: 3, exclude: post.slug })).results;

  const postUrl = `${SITE_URL}/blog/${post.slug}`;
  const headings = extractHeadings(post.body);
  const bodyImages = extractImages(post.body);
  // The in-article slot goes at a section break near the middle; short posts
  // get none, and the split is computed here so the body renders in one pass.
  const bodyNodes = renderMarkdown(post.body);
  const slotIndex = midArticleIndex(post.body);
  const author = post.author_name || SITE_NAME;
  const authorPath = post.author_name
    ? `/blog/autor/${post.author_slug || authorSlug(post.author_name)}`
    : null;

  // Fetched once for both the visible block and the schema below, so the
  // structured data can never assert a figure the page does not show.
  const cityFacts = post.city ? await getCityPriceFacts(post.city) : null;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${postUrl}#articulo`,
        headline: post.title,
        description: post.meta_description || post.excerpt,
        url: postUrl,
        mainEntityOfPage: postUrl,
        inLanguage: 'es-EC',
        datePublished: post.published_at,
        dateModified: post.updated_at,
        wordCount: markdownToPlainText(post.body).split(/\s+/).length,
        keywords: post.tags.join(', '),
        articleSection: post.category?.name ?? 'Blog',
        // E-E-A-T: a named author with a stated role, not just the brand.
        author: post.author_name
          ? {
              '@type': 'Person',
              name: post.author_name,
              jobTitle: post.author_role || undefined,
              url: `${SITE_URL}${authorPath}`,
            }
          : { '@id': `${SITE_URL}/#organization` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        // Google picks the result thumbnail from here, so every illustration
        // the article carries is a candidate — not just the cover.
        ...(post.cover_image || bodyImages.length
          ? {
              image: [
                ...(post.cover_image ? [post.cover_image] : []),
                ...bodyImages.map((item) => item.src),
              ],
            }
          : {}),
        about: { '@type': 'Thing', name: 'Bienes raíces en Ecuador' },
        // A city article is about a place, and the figure it quotes comes from
        // a page of ours: both are stated so the article can be resolved as a
        // source rather than as an opinion.
        ...(post.city
          ? {
              spatialCoverage: {
                '@type': 'Place',
                name: post.city,
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: post.city,
                  addressCountry: 'EC',
                },
              },
              isBasedOn: `${SITE_URL}/estadisticas-inmobiliarias/${slugify(post.city)}`,
            }
          : {}),
      },
      ...(cityFacts
        ? [
            {
              '@type': 'Dataset',
              '@id': `${postUrl}#precio-m2`,
              name: `Precio medio del m² en ${cityFacts.city}`,
              description: `Precio medio por metro cuadrado en ${cityFacts.city} calculado sobre ${cityFacts.listings} anuncios comparables publicados en ${SITE_NAME}, excluyendo valores atípicos.`,
              url: `${SITE_URL}/estadisticas-inmobiliarias/${cityFacts.citySlug}`,
              inLanguage: 'es-EC',
              isAccessibleForFree: true,
              creator: { '@id': `${SITE_URL}/#organization` },
              spatialCoverage: { '@type': 'Place', name: cityFacts.city },
              variableMeasured: {
                '@type': 'PropertyValue',
                name: 'Precio medio por m²',
                value: Math.round(cityFacts.pricePerM2),
                unitText: 'USD/m²',
              },
            },
          ]
        : []),
      ...(post.faqs.length > 0
        ? [
            {
              '@type': 'FAQPage',
              '@id': `${postUrl}#faq`,
              inLanguage: 'es-EC',
              mainEntity: post.faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.q,
                acceptedAnswer: { '@type': 'Answer', text: faq.a },
              })),
            },
          ]
        : []),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          ...(post.category
            ? [
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: post.category.name,
                  item: `${SITE_URL}/blog/categoria/${post.category.slug}`,
                },
              ]
            : []),
          {
            '@type': 'ListItem',
            position: post.category ? 4 : 3,
            name: post.title,
          },
        ],
      },
    ],
  };

  const wasUpdated =
    new Date(post.updated_at).getTime() - new Date(post.published_at).getTime() >
    24 * 60 * 60 * 1000;

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
            <Link href="/blog" className="transition-colors hover:text-primary">
              Blog
            </Link>
          </li>
          {post.category && (
            <>
              <ChevronRight className="h-4 w-4 text-line" aria-hidden />
              <li>
                <Link
                  href={`/blog/categoria/${post.category.slug}`}
                  className="transition-colors hover:text-primary"
                >
                  {post.category.name}
                </Link>
              </li>
            </>
          )}
          <ChevronRight className="h-4 w-4 text-line" aria-hidden />
          <li
            className="max-w-[16rem] truncate font-medium text-textPrimary sm:max-w-md"
            aria-current="page"
          >
            {post.title}
          </li>
        </ol>
      </nav>

      <article>
        <header>
          <h1 className="text-3xl font-bold leading-tight text-textPrimary sm:text-4xl">
            {post.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-textSecondary">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              <time dateTime={post.published_at}>{formatPostDate(post.published_at)}</time>
            </span>
            {wasUpdated && (
              <span className="inline-flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Actualizado el{' '}
                <time dateTime={post.updated_at}>{formatPostDate(post.updated_at)}</time>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              {post.reading_minutes} min de lectura
            </span>
          </div>

          <p className="mt-5 text-base leading-7 text-textSecondary">{post.excerpt}</p>
        </header>

        {post.cover_image && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-card">
            <Image
              src={post.cover_image}
              alt={post.cover_image_alt || post.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        )}

        {headings.length >= 3 && (
          <nav
            aria-label="Contenido del artículo"
            className="mt-8 rounded-card border border-line bg-surface p-5"
          >
            <p className="text-sm font-semibold text-textPrimary">En este artículo</p>
            <ol className="mt-3 space-y-1.5 text-sm">
              {headings.map((heading) => (
                <li key={heading.id} className={heading.level === 3 ? 'pl-4' : ''}>
                  <a href={`#${heading.id}`} className="text-textSecondary hover:text-primary">
                    {heading.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="mt-6">
          {slotIndex > 0 ? (
            <>
              {bodyNodes.slice(0, slotIndex)}
              <SponsorSlotBlock placement="post_inline" seed={post.slug} className="my-12" />
              {bodyNodes.slice(slotIndex)}
            </>
          ) : (
            bodyNodes
          )}
        </div>

        {/* After the article, before the FAQ: the reader has the context to
            use the number, and it sits above the fold of the answer block that
            AI crawlers tend to lift. */}
        {post.city && <CityPriceBlock city={post.city} />}

        {post.faqs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-textPrimary">Preguntas frecuentes</h2>
            <dl className="mt-4 space-y-5">
              {post.faqs.map((faq) => (
                <div key={faq.q} className="rounded-card border border-line bg-surface p-5">
                  <dt className="font-semibold text-textPrimary">{faq.q}</dt>
                  <dd className="mt-2 leading-7 text-textSecondary">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <div className="mt-10 rounded-card border border-line bg-surface p-5">
          <p className="text-sm font-semibold text-textPrimary">
            Escrito por{' '}
            {authorPath ? (
              <Link href={authorPath} className="text-primary hover:underline">
                {author}
              </Link>
            ) : (
              author
            )}
          </p>
          {post.author_role && (
            <p className="mt-1 text-sm text-textSecondary">{post.author_role}</p>
          )}
          <p className="mt-3 text-sm leading-6 text-textSecondary">
            Este artículo es informativo y usa valores referenciales. Impuestos, tasas
            y requisitos cambian según el cantón y la entidad: confirma los valores
            vigentes en tu municipio, notaría, banco o el BIESS antes de firmar.
          </p>
        </div>

        {post.tags.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Etiquetas">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-line px-3 py-1 text-xs font-medium text-textSecondary"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </article>

      {post.related_links.length > 0 && (
        <nav aria-label="Contenido relacionado" className="mt-10">
          <h2 className="text-lg font-semibold text-textPrimary">Sigue explorando</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {post.related_links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-textPrimary transition-colors hover:border-primary hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <SponsorSlotBlock placement="post_footer" seed={`${post.slug}-footer`} />

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-textPrimary">Más del blog</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {related.map((item) => (
              <PostCard key={item.slug} post={item} />
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 rounded-card border border-line bg-white p-6 shadow-card">
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
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primaryHover"
          >
            Explorar el mapa
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/publicar-propiedad"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-semibold text-textPrimary transition-colors hover:border-primary hover:text-primary"
          >
            Publicar gratis
          </Link>
        </div>
      </div>
    </main>
  );
}
