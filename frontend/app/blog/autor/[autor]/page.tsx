import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PostCard } from '@/components/blog/PostCard';
import { authorSlug, getBlogPosts } from '@/lib/blog';
import { generatePageMetadata } from '@/lib/metadata';
import { jsonLd, SITE_NAME, SITE_URL } from '@/lib/properties';

export const revalidate = 3600;
export const dynamicParams = true;

type AuthorPageProps = { params: Promise<{ autor: string }> };

async function resolveAuthor(slug: string) {
  // The API filters by the slug it derives on save, so this page keeps working
  // past the 60-post page size and never disagrees with the byline.
  const { results, count } = await getBlogPosts({ author: slug, limit: 60 });
  if (!results.length) return null;
  return {
    name: results[0].author_name,
    role: results.find((post) => post.author_role)?.author_role || '',
    posts: results,
    count,
  };
}

export async function generateStaticParams() {
  const { results } = await getBlogPosts({ limit: 60 });
  return Array.from(
    new Set(
      results
        .map((post) => post.author_slug || (post.author_name && authorSlug(post.author_name)))
        .filter(Boolean)
    )
  ).map((autor) => ({ autor: autor as string }));
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { autor } = await params;
  const author = await resolveAuthor(autor);
  if (!author) return { title: 'Autor no encontrado', robots: { index: false, follow: false } };
  return generatePageMetadata(
    `${author.name}, autor en ${SITE_NAME}`,
    `${author.name}${author.role ? `, ${author.role}` : ''}. Artículos sobre propiedades y mercado inmobiliario en Ecuador.`,
    `/blog/autor/${autor}`
  );
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { autor } = await params;
  const author = await resolveAuthor(autor);
  if (!author) notFound();

  const pageUrl = `${SITE_URL}/blog/autor/${autor}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': `${pageUrl}#profile`,
        url: pageUrl,
        mainEntity: {
          '@type': 'Person',
          '@id': `${pageUrl}#person`,
          name: author.name,
          jobTitle: author.role || undefined,
          worksFor: { '@id': `${SITE_URL}/#organization` },
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: author.name },
        ],
      },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
      <nav aria-label="Migas de pan" className="text-sm text-textSecondary">
        <Link href="/" className="hover:text-primary">Inicio</Link>
        <span aria-hidden className="mx-2">/</span>
        <Link href="/blog" className="hover:text-primary">Blog</Link>
        <span aria-hidden className="mx-2">/</span>
        <span aria-current="page">{author.name}</span>
      </nav>

      <header className="mt-8 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Autor</p>
        <h1 className="mt-2 text-3xl font-bold text-textPrimary sm:text-4xl">{author.name}</h1>
        {author.role && <p className="mt-3 text-lg text-textSecondary">{author.role}</p>}
        <p className="mt-4 leading-7 text-textSecondary">
          Contenido editorial sobre propiedades, financiamiento y mercado inmobiliario en Ecuador.
          Cada artículo indica sus fuentes y la fecha de su última revisión cuando corresponde.
        </p>
      </header>

      <section className="mt-10" aria-labelledby="author-posts-title">
        <h2 id="author-posts-title" className="text-2xl font-bold text-textPrimary">
          Artículos de {author.name}
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {author.posts.map((post) => <PostCard key={post.slug} post={post} />)}
        </div>
      </section>
    </main>
  );
}
