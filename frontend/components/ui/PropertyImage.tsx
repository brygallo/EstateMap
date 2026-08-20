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
 * A photo that is still in staging is served by the API, not by the object
 * store, and that host is deliberately absent from `images.remotePatterns`:
 * the URL dies the moment the worker publishes the WebP, so there is nothing
 * worth optimizing or caching. Routing it through `/_next/image` only earns a
 * 400 and a broken image for the seconds the pending window lasts.
 */
function isStagedUpload(src: ImageProps['src']): boolean {
  return typeof src === 'string' && src.includes('/pending-image/');
}

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
  unoptimized,
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
        <Skeleton className="absolute inset-0 h-full w-full rounded-none motion-reduce:animate-none" />
      )}
      <Image
        alt={alt}
        fill={fill}
        className={cn(
          'transition-opacity duration-300 ease-out motion-reduce:transition-none',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={() => setLoaded(true)}
        unoptimized={unoptimized ?? isStagedUpload(props.src)}
        {...props}
      />
    </div>
  );
}
