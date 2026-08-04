import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import PromotionKit from '@/components/promote/PromotionKit';
import { getProperty } from '@/lib/properties';

interface PromotePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Kept out of the index.
 *
 * It is a working surface for one person, not a page that answers a search, and
 * every fact on it already has a canonical home on the listing itself. Letting
 * it be indexed would put a second URL in front of Google for the same listing.
 */
export const metadata: Metadata = {
  // No site suffix: the root layout already appends one, and spelling it out
  // here produced "… | Geo Propiedades Ecuador | Geo Propiedades Ecuador".
  title: 'Promociona tu anuncio',
  description: 'Imágenes y textos listos para publicar tu anuncio en redes sociales.',
  robots: { index: false, follow: false },
};

export default async function PromotePage({ params }: PromotePageProps) {
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    notFound();
  }

  return <PromotionKit property={property} />;
}
