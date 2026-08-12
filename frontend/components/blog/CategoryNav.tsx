import type { ComponentType } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  HandCoins,
  Home,
  KeyRound,
  Landmark,
  MapPin,
  type LucideProps,
} from 'lucide-react';

import type { BlogCategory } from '@/lib/blog';
import { cn } from '@/lib/utils';

type CategoryNavProps = {
  categories: BlogCategory[];
  activeSlug?: string;
  label?: string;
};

const categoryIcons: Record<string, ComponentType<LucideProps>> = {
  comprar: KeyRound,
  vender: HandCoins,
  arrendar: Home,
  financiamiento: Landmark,
  'impuestos-y-tramites': FileCheck2,
  'donde-vivir': MapPin,
};

export function CategoryNav({
  categories,
  activeSlug,
  label = 'Categorías del blog',
}: CategoryNavProps) {
  return (
    <nav aria-label={label} className="mt-8">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((category) => {
          const Icon = categoryIcons[category.slug] ?? Home;
          const isActive = category.slug === activeSlug;

          return (
            <li key={category.slug}>
              <Link
                href={`/blog/categoria/${category.slug}`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex min-h-16 items-center gap-3 rounded-card border px-3 py-3 transition-[border-color,background-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-4',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary shadow-soft'
                    : 'border-line bg-white text-textPrimary shadow-soft hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-cardHover'
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-tight">{category.name}</span>
                  <span className="mt-1 block text-xs font-medium text-textSecondary">
                    {category.post_count ?? 0}{' '}
                    {(category.post_count ?? 0) === 1 ? 'artículo' : 'artículos'}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
