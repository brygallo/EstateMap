import { ImageResponse } from 'next/og';
import { getBlogPost } from '@/lib/blog';
import { OgCard, OG_SIZE } from '@/lib/og-card';

// Imagen OG por artículo. Sin esto, un post sin portada se comparte con la
// tarjeta genérica del sitio: el canal que más se reenvía por WhatsApp era el
// único que no decía de qué trata lo que estás mandando. Next prioriza este
// archivo sobre el `openGraph.images` del metadata.

export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 3600;

// Satori no recorta texto: un título largo desborda la tarjeta.
const MAX_TITLE = 90;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  const title = post
    ? post.title.length > MAX_TITLE
      ? `${post.title.slice(0, MAX_TITLE - 1).trimEnd()}…`
      : post.title
    : 'Blog inmobiliario de Ecuador';

  const parts = post
    ? [
        post.category?.name,
        post.city || null,
        `${post.reading_minutes} min de lectura`,
      ].filter(Boolean)
    : ['Guías de compra, venta y arriendo'];

  return new ImageResponse(
    <OgCard title={title} subtitle={parts.join(' · ')} badge="Blog" />,
    size
  );
}
