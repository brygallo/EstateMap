import { getProperties, SITE_URL } from '@/lib/properties';

// Sitemap de imágenes (protocolo Google image-sitemap). Next 14 no soporta el
// campo `images` en MetadataRoute.Sitemap, así que lo generamos a mano aquí y
// lo declaramos en robots.ts. Cuando una foto se declara en el sitemap, Google
// Imágenes la indexa mejor (tráfico extra hacia las fichas de propiedad).

export const revalidate = 3600;

const MAX_IMAGES_PER_URL = 5;

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function propertyImageUrls(property: { images?: { image?: string }[] }): string[] {
  return (property.images ?? [])
    .map((img) => img.image)
    .filter((u): u is string => Boolean(u))
    .map((u) => (u.startsWith('http') ? u : `${SITE_URL}${u}`))
    .slice(0, MAX_IMAGES_PER_URL);
}

export async function GET() {
  const properties = await getProperties();

  const urlBlocks = properties
    .map((property) => {
      const images = propertyImageUrls(property);
      if (!images.length) return '';
      const loc = xmlEscape(`${SITE_URL}/propiedad/${property.id}`);
      const imageTags = images
        .map((src) => `    <image:image><image:loc>${xmlEscape(src)}</image:loc></image:image>`)
        .join('\n');
      return `  <url>\n    <loc>${loc}</loc>\n${imageTags}\n  </url>`;
    })
    .filter(Boolean)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlBlocks}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
