import Link from 'next/link';
import Image from 'next/image';
import { CalendarDays, Clock3 } from 'lucide-react';

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
    <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-white shadow-card transition-colors hover:border-primary">
      {post.cover_image && (
        <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/9]">
          <Image
            src={post.cover_image}
            alt={post.cover_image_alt || post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        </Link>
      )}
      <div className="flex flex-1 flex-col p-5">
        {post.category && (
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {post.category.name}
          </p>
        )}
        <h3 className="mt-2 text-lg font-semibold leading-snug text-textPrimary">
          <Link href={`/blog/${post.slug}`} className="hover:text-primary">
            {post.title}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-textSecondary">{post.excerpt}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-textSecondary">
          <time dateTime={post.published_at}>{formatPostDate(post.published_at)}</time>
          <span aria-hidden>·</span>
          <span>{post.reading_minutes} min de lectura</span>
        </div>
      </div>
    </article>
  );
}
