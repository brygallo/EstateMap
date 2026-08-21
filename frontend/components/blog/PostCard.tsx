import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Clock3 } from 'lucide-react';

import { formatPostDate, type BlogPostSummary } from '@/lib/blog';

export function PostMeta({ post }: { post: BlogPostSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-textSecondary">
      {post.category && (
        <Link
          href={`/blog/categoria/${post.category.slug}`}
          className="font-medium text-primary hover:underline"
        >
          {post.category.name}
        </Link>
      )}
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        <time dateTime={post.published_at}>{formatPostDate(post.published_at)}</time>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock3 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        {post.reading_minutes} min de lectura
      </span>
    </div>
  );
}

export function PostCard({ post }: { post: BlogPostSummary }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-white shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-cardHover">
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {post.category && (
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
              {post.category.name}
            </p>
          )}
          {/* The disclosure travels with the card: a reader deciding what to
              open is entitled to know it is advertising before they open it. */}
          {post.sponsor && (
            <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-textSecondary">
              Publicidad
            </span>
          )}
        </div>
        <h3 className="mt-2 text-lg font-bold leading-snug text-textPrimary">
          <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-textSecondary">{post.excerpt}</p>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-xs text-textSecondary">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <time dateTime={post.published_at}>{formatPostDate(post.published_at)}</time>
          <span aria-hidden>·</span>
          <span>{post.reading_minutes} min de lectura</span>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
        </div>
      </div>
    </article>
  );
}
