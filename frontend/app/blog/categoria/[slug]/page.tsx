import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

import { getBlogCategories, getBlogPosts, MIN_POSTS_FOR_INDEXING } from '@/lib/blog';
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
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
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

      <nav aria-label="Migas de pan" className="mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-textSecondary">
          <li>
            <Link href="/" className="inline-flex items-center gap-1 hover:text-primary">
              <Home className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Inicio
            </Link>
          </li>
          <ChevronRight className="h-4 w-4 text-line" aria-hidden />
          <li>
            <Link href="/blog" className="hover:text-primary">
              Blog
            </Link>
          </li>
          <ChevronRight className="h-4 w-4 text-line" aria-hidden />
          <li className="font-medium text-textPrimary" aria-current="page">
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
