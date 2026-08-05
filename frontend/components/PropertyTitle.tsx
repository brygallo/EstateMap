import type { ElementType, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PropertyTitleProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  compact?: boolean;
}

/** Shared property heading with sizes that remain readable for long listings. */
export default function PropertyTitle({
  children,
  as: Component = 'h1',
  className,
  compact = false,
}: PropertyTitleProps) {
  return (
    <Component
      className={cn(
        'font-bold text-textPrimary',
        compact ? 'text-[14px] leading-snug' : 'text-[20px] leading-tight sm:text-[26px]',
        className
      )}
    >
      {children}
    </Component>
  );
}
