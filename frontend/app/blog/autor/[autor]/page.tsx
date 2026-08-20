import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PostCard } from '@/components/blog/PostCard';
import { authorSlug, getBlogPosts } from '@/lib/blog';
import { generatePageMetadata } from '@/lib/metadata';
import { jsonLd, SITE_NAME, SITE_URL } from '@/lib/properties';

/**
 * What this blog can claim, in one paragraph.
 *
 * Shared between the visible bio and the Person schema so the two cannot drift:
 * a description in the structured data that the page does not show is exactly
 * the kind of claim that gets a site distrusted.
 */
const METHOD_SUMMARY =
  'Redacción del portal inmobiliario Geo Propiedades Ecuador. Los artículos se apoyan en el ' +
  'inventario publicado en el propio portal —precios pedidos de anuncios activos, no ventas ' +
  'cerradas— y cada cifra indica sobre cuántos anuncios se calculó y qué se excluyó. Las ' +
  'cifras se recalculan con el inventario, no se congelan el día de publicación.';

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
          description: METHOD_SUMMARY,
          knowsAbout: [
            'mercado inmobiliario de Ecuador',
            'precio del metro cuadrado',
            'compra y venta de vivienda',
            'arriendo en Ecuador',
            'financiamiento hipotecario',
          ],
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
        <p className="mt-4 leading-7 text-textSecondary">{METHOD_SUMMARY}</p>
      </header>

      {/* The credential this blog actually has is its own inventory, and until
          now it was nowhere on the page. Saying what is measured, over how many
          listings and what gets excluded is what separates a portal's blog from
          a content farm — and it is the passage an AI answer can quote when it
          needs to say where a figure comes from. */}
      <section className="mt-10 max-w-3xl rounded-card border border-line bg-surface p-5 sm:p-6" aria-labelledby="metodo-title">
        <h2 id="metodo-title" className="text-lg font-semibold text-textPrimary">
          De dónde salen las cifras
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-textSecondary">
          <li>
            <strong className="font-semibold text-textPrimary">La fuente es el inventario del
            portal</strong>: los anuncios activos publicados en Geo Propiedades Ecuador, no
            encuestas ni estimaciones de terceros.
          </li>
          <li>
            <strong className="font-semibold text-textPrimary">Son precios pedidos</strong>, no
            precios de cierre. Un cierre suele quedar por debajo de lo publicado, y ningún artículo
            afirma lo contrario.
          </li>
          <li>
            <strong className="font-semibold text-textPrimary">Se excluye lo imposible</strong>: una
            venta por debajo de mil dólares, un área fuera de rango o un precio por metro que no se
            sostiene frente a su propio mercado. Cada página dice cuántos anuncios quedaron fuera.
          </li>
          <li>
            <strong className="font-semibold text-textPrimary">Hay un mínimo para publicar una
            cifra</strong>: sin muestra suficiente no se publica promedio. Un promedio sobre dos
            anuncios no es una lectura de mercado.
          </li>
          <li>
            <strong className="font-semibold text-textPrimary">Las cifras se recalculan</strong> con
            el inventario, así que un artículo publicado en julio muestra el dato de hoy, y la fecha
            de actualización refleja cuándo cambió de verdad.
          </li>
        </ul>
        <p className="mt-4 text-sm leading-6 text-textSecondary">
          El método completo de los precios por metro cuadrado está en el{' '}
          <Link href="/estadisticas-inmobiliarias" className="text-primary hover:underline">
            índice de precios
          </Link>
          .
        </p>
      </section>

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
