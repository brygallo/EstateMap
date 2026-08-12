import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, CalendarDays, Clock3, MapPin } from 'lucide-react';

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
      <Link
        href={`/blog/${post.slug}`}
        className="relative block aspect-[16/10] overflow-hidden bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        aria-label={`Leer ${post.title}`}
      >
        {post.cover_image ? (
          <Image
            src={post.cover_image}
            alt={post.cover_image_alt || post.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden>
            <span className="absolute -right-8 -top-12 h-40 w-40 rounded-full border border-primary/20" />
            <span className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full border border-primary/20" />
            <MapPin className="h-10 w-10 text-primary/55" strokeWidth={1.35} />
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-textPrimary/30 to-transparent" aria-hidden />
      </Link>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {post.category && (
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            {post.category.name}
          </p>
        )}
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
