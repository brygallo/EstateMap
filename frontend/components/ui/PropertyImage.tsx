'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type PropertyImageProps = Omit<ImageProps, 'onLoad'> & {
  /** Extra classes for the wrapping element. */
  wrapperClassName?: string;
};

/**
 * Imagen de propiedad con skeleton mientras carga y fade-in al terminar.
 * Usa next/image. Soporta `fill` (el contenedor debe ser relative/dimensionado)
 * o width/height. Nunca deja un hueco vacío: muestra Skeleton hasta el onLoad.
 */
export default function PropertyImage({
  className,
  wrapperClassName,
  fill,
  alt,
  ...props
}: PropertyImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        fill ? 'h-full w-full' : 'inline-block',
        wrapperClassName
      )}
    >
      {!loaded && (
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      )}
      <Image
        alt={alt}
        fill={fill}
        className={cn(
          'transition-opacity duration-300 ease-out',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={() => setLoaded(true)}
        {...props}
      />
    </div>
  );
}
