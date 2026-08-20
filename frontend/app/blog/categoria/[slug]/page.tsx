import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

import {
  getBlogCategories,
  getBlogPosts,
  isLiveCategory,
  LIVE_CATEGORY,
  MIN_POSTS_FOR_INDEXING,
} from '@/lib/blog';
import { listLivePages } from '@/lib/live-resolve';
import { placeInPhrase } from '@/lib/live-pages';
import { jsonLd, SITE_URL } from '@/lib/properties';
import { generatePageMetadata } from '@/lib/metadata';
import { PostCard } from '@/components/blog/PostCard';
import SponsorSlotBlock from '@/components/blog/SponsorSlot';
import { CategoryNav } from '@/components/blog/CategoryNav';

export const revalidate = 3600;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const categories = await getBlogCategories();
  return [...categories.map((category) => ({ slug: category.slug })), { slug: LIVE_CATEGORY.slug }];
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (isLiveCategory(slug)) {
    const livePages = await listLivePages();
    return {
      ...generatePageMetadata(
        `${LIVE_CATEGORY.name} — Blog inmobiliario de Ecuador`,
        LIVE_CATEGORY.description,
        `/blog/categoria/${LIVE_CATEGORY.slug}`
      ),
      ...(livePages.length ? {} : { robots: { index: false, follow: true } }),
    };
  }
  const categories = await getBlogCategories();
  const category = categories.find((item) => item.slug === slug);
  if (!category) {
    return { title: 'Categoría no encontrada', robots: { index: false, follow: false } };
  }

  const base = generatePageMetadata(
    `${category.name} — Blog inmobiliario de Ecuador`,
    category.description,
    `/blog/categoria/${category.slug}`
  );
  if ((category.post_count ?? 0) < MIN_POSTS_FOR_INDEXING) {
    return { ...base, robots: { index: false, follow: true } };
  }
  return base;
}

export default async function BlogCategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const categories = await getBlogCategories();

  // The living pages have no rows to list, so their category renders its own
  // shape: grouped by place, because that is how someone reads a hundred
  // rankings without scrolling through all of them.
  if (isLiveCategory(slug)) {
    const livePages = await listLivePages();
    if (!livePages.length) notFound();
    return (
      <LiveCategoryPage
        pages={livePages}
        categories={[...categories, { ...LIVE_CATEGORY, post_count: livePages.length }]}
      />
    );
  }

  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();

  const { results: posts } = await getBlogPosts({ category: slug, limit: 40 });

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}/blog/categoria/${category.slug}#webpage`,
        url: `${SITE_URL}/blog/categoria/${category.slug}`,
        name: category.name,
        description: category.description,
        inLanguage: 'es-EC',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'ItemList',
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
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: category.name },
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

      <nav aria-label="Migas de pan" className="mb-7">
        <ol className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-line bg-surface/80 p-1 text-sm shadow-sm">
          <li>
            <Link
              href="/"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 font-medium text-textSecondary transition-colors hover:bg-background hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Home className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
              <span className="sr-only sm:not-sr-only">Inicio</span>
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-textSecondary/45" aria-hidden />
          <li>
            <Link
              href="/blog"
              className="inline-flex min-h-9 items-center rounded-full px-3 font-medium text-textSecondary transition-colors hover:bg-background hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Blog
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-textSecondary/45" aria-hidden />
          <li
            className="inline-flex min-h-9 items-center rounded-full bg-primary px-3.5 font-semibold text-white shadow-sm"
            aria-current="page"
          >
            {category.name}
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold leading-tight text-textPrimary sm:text-4xl">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-4 text-base leading-7 text-textSecondary">{category.description}</p>
        )}
      </header>

      <CategoryNav categories={categories} activeSlug={category.slug} label="Otras categorías" />

      <SponsorSlotBlock placement="category_top" seed={`categoria-${category.slug}`} />

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </main>
  );
}

/** The living-pages category: hundreds of rankings, grouped by where they are. */
function LiveCategoryPage({
  pages,
  categories,
}: {
  pages: Awaited<ReturnType<typeof listLivePages>>;
  categories: Awaited<ReturnType<typeof getBlogCategories>>;
}) {
  // One entry per place and property type, not per ranking. A place holds up
  // to twenty-four rankings, and listing them all here would be a thousand
  // links on one page; each living page already links to its siblings, so
  // every one of them stays a single hop away from this index.
  const groups = new Map<string, { label: string; entries: { slug: string; label: string }[] }>();
  for (const page of pages) {
    const place = placeInPhrase(page.recipe.scope).replace(/^en /, '');
    const key = `${page.recipe.scope.kind}:${place}`;
    const group = groups.get(key) ?? { label: place, entries: [] };
    const entryLabel = `${page.recipe.typeDef.plural}${
      page.recipe.opDef ? ` ${page.recipe.opDef.label}` : ''
    }`;
    if (!group.entries.some((entry) => entry.label === entryLabel)) {
      group.entries.push({ slug: page.slug, label: entryLabel });
    }
    groups.set(key, group);
  }
  // Most inventory first: the country, then the places with most rankings.
  const ordered = [...groups.entries()].sort((a, b) => {
    if (a[0].startsWith('country')) return -1;
    if (b[0].startsWith('country')) return 1;
    return b[1].entries.length - a[1].entries.length;
  });

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        url: `${SITE_URL}/blog/categoria/${LIVE_CATEGORY.slug}`,
        name: LIVE_CATEGORY.name,
        description: LIVE_CATEGORY.description,
        inLanguage: 'es-EC',
        isPartOf: { '@id': `${SITE_URL}/#website` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: LIVE_CATEGORY.name },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />

      <nav aria-label="Migas de pan" className="mb-7">
        <ol className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border border-line bg-surface/80 p-1 text-sm shadow-sm">
          <li>
            <Link
              href="/"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 font-medium text-textSecondary transition-colors hover:bg-background hover:text-textPrimary"
            >
              <Home className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
              <span className="sr-only sm:not-sr-only">Inicio</span>
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-textSecondary/45" aria-hidden />
          <li>
            <Link
              href="/blog"
              className="inline-flex min-h-9 items-center rounded-full px-3 font-medium text-textSecondary transition-colors hover:bg-background hover:text-textPrimary"
            >
              Blog
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-textSecondary/45" aria-hidden />
          <li
            className="inline-flex min-h-9 items-center rounded-full bg-primary px-3.5 font-semibold text-white shadow-sm"
            aria-current="page"
          >
            {LIVE_CATEGORY.name}
          </li>
        </ol>
      </nav>

      <header className="max-w-3xl">
        <h1 className="text-3xl font-bold leading-tight text-textPrimary sm:text-4xl">
          {LIVE_CATEGORY.name}
        </h1>
        <p className="mt-4 text-base leading-7 text-textSecondary">{LIVE_CATEGORY.description}</p>
        <p className="mt-2 text-sm text-textSecondary">
          {pages.length} listas activas. Cada una existe solo mientras haya inventario suficiente
          para sostenerla, y desaparece del índice si deja de haberlo.
        </p>
      </header>

      <CategoryNav categories={categories} activeSlug={LIVE_CATEGORY.slug} label="Otras categorías" />

      <div className="mt-8 space-y-8">
        {ordered.map(([key, group]) => (
          <section key={key}>
            <h2 className="text-lg font-bold capitalize text-textPrimary">{group.label}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.entries.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/blog/${entry.slug}`}
                    className="block rounded-card border border-line bg-white px-4 py-3 text-sm font-semibold text-textPrimary shadow-soft transition-shadow hover:border-primary/50 hover:text-primary hover:shadow-cardHover"
                  >
                    {entry.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
