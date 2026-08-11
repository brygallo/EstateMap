/**
 * RSS 2.0 feed of the blog.
 *
 * Worth the file for two reasons beyond readers: aggregators and press sites
 * discover new articles through it without waiting for a crawl, and it is the
 * cheapest way to let anyone syndicate the price-index posts with a link back
 * — which is the backlink strategy in SEO-STRATEGY.md.
 */

import { getBlogPosts } from '@/lib/blog';
import { SITE_URL, SITE_NAME } from '@/lib/properties';

export const revalidate = 3600;

const FEED_SIZE = 30;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const { results: posts } = await getBlogPosts({ limit: FEED_SIZE });

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/blog/${post.slug}`;
      const pubDate = new Date(post.published_at).toUTCString();
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
      ${post.category ? `<category>${escapeXml(post.category.name)}</category>` : ''}
      ${post.author_name ? `<dc:creator>${escapeXml(post.author_name)}</dc:creator>` : ''}
    </item>`;
    })
    .join('\n');

  const lastBuild = posts.length
    ? new Date(posts[0].published_at).toUTCString()
    : new Date(0).toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(`Blog inmobiliario de ${SITE_NAME}`)}</title>
    <link>${SITE_URL}/blog</link>
    <description>Artículos sobre comprar, vender, arrendar y financiar propiedades en Ecuador.</description>
    <language>es-EC</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
