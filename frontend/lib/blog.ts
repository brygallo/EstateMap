/**
 * Server-side reader for the blog API.
 *
 * Every blog page is a Server Component fetching through here, for the same
 * reason the stats pages are: GPTBot, ClaudeBot and PerplexityBot do not
 * execute JavaScript, and an article they cannot read is an article they cannot
 * cite. The text has to be in the initial HTML.
 *
 * Caching is by tag, not by TTL alone: publishing a post makes Django POST to
 * /api/revalidate with `blog` and `blog-<slug>`, so a scheduled article appears
 * within seconds instead of waiting out the hour.
 */

import { getServerApiUrl } from './api-url';
import { slugify } from './properties';

export type BlogCategory = {
  name: string;
  slug: string;
  description: string;
  post_count?: number;
};

export type BlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory | null;
  tags: string[];
  /** City the article is about; empty for national scope. */
  city: string;
  cover_image: string | null;
  cover_image_alt: string;
  author_name: string;
  author_role: string;
  author_slug: string;
  published_at: string;
  updated_at: string;
  reading_minutes: number;
  is_featured: boolean;
};

export type BlogPost = BlogPostSummary & {
  body: string;
  faqs: { q: string; a: string }[];
  related_links: { label: string; href: string }[];
  meta_title: string;
  meta_description: string;
};

// One hour is the floor, not the ceiling: the on-demand revalidation above is
// what actually keeps these fresh. The TTL only covers the case where the ping
// never arrives (frontend redeployed, secret unset, broker down).
const REVALIDATE_SECONDS = 3600;

/**
 * Thin-content threshold for category pages. Below it the category still
 * resolves — a post links to it — but it stays out of the sitemap and out of
 * the index: a page holding one article only competes with that article.
 */
export const MIN_POSTS_FOR_INDEXING = 3;

/**
 * The date an article claims it was last modified.
 *
 * The editorial calendar schedules posts: `published_at` is a date in the
 * future while `updated_at` is the day the text was written. Handing both
 * straight to the schema made eight of the fifteen live articles declare they
 * had been modified before they existed — a contradiction on the one signal AI
 * search weighs most, since recent content is far likelier to be cited. An
 * article is never modified before it is published, so the later of the two is
 * the only honest answer.
 */
export function articleModifiedAt(post: { published_at: string; updated_at?: string | null }): string {
  const published = post.published_at;
  const updated = post.updated_at;
  if (!updated) return published;
  if (!published) return updated;
  const updatedTime = Date.parse(updated);
  const publishedTime = Date.parse(published);
  if (Number.isNaN(updatedTime)) return published;
  if (Number.isNaN(publishedTime)) return updated;
  return updatedTime >= publishedTime ? updated : published;
}

/**
 * The living pages appear in the blog like any other article, and this is the
 * only thing that tells them apart. It is not a database category: no row
 * backs it, because no row backs the pages either — they are recalculated from
 * inventory on every revalidation.
 */
export const LIVE_CATEGORY: BlogCategory = {
  slug: 'rankings-en-vivo',
  name: 'Rankings en vivo',
  description:
    'Listas que se recalculan solas con las propiedades publicadas: los más baratos, los más grandes, el mejor precio por metro cuadrado, ciudad por ciudad.',
  post_count: 0,
};

export function isLiveCategory(slug: string): boolean {
  return slug === LIVE_CATEGORY.slug;
}

export function authorSlug(name: string): string {
  return slugify(name);
}

export type BlogListParams = {
  category?: string;
  tag?: string;
  /** Author slug, as served by the API and used by /blog/autor/<slug>. */
  author?: string;
  exclude?: string;
  limit?: number;
  offset?: number;
};

export async function getBlogPosts(
  params: BlogListParams = {}
): Promise<{ count: number; results: BlogPostSummary[] }> {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.tag) query.set('tag', params.tag);
  if (params.author) query.set('author', params.author);
  if (params.exclude) query.set('exclude', params.exclude);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  const suffix = query.toString() ? `?${query}` : '';

  try {
    const res = await fetch(`${getServerApiUrl()}/blog/posts/${suffix}`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ['blog'] },
    });
    if (!res.ok) return { count: 0, results: [] };
    return await res.json();
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return { count: 0, results: [] };
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(
      `${getServerApiUrl()}/blog/posts/${encodeURIComponent(slug)}/`,
      { next: { revalidate: REVALIDATE_SECONDS, tags: ['blog', `blog-${slug}`] } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`Error fetching blog post ${slug}:`, error);
    return null;
  }
}

export async function getBlogCategories(): Promise<BlogCategory[]> {
  try {
    const res = await fetch(`${getServerApiUrl()}/blog/categories/`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ['blog'] },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    return [];
  }
}

export function formatPostDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Guayaquil',
  });
}
