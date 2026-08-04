import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getPropertyIdByCode } from '@/lib/properties';

interface ShortLinkPageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Redirects only — nothing here is worth a place in the index, and indexing
// it would just compete with the canonical `/propiedad/<id>` ficha.
export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: true } };
}

export default async function ShortLinkPage({ params, searchParams }: ShortLinkPageProps) {
  const { code } = await params;
  const id = await getPropertyIdByCode(code);
  if (!id) notFound();

  // Forward the query string (UTM params from share links) so campaign
  // attribution survives the redirect to the ficha.
  const query = await searchParams;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const v of value) search.append(key, v);
    } else if (value !== undefined) {
      search.append(key, value);
    }
  }
  const suffix = search.toString();

  // redirect() throws internally to unwind the render — must never be
  // wrapped in a try/catch that could swallow it.
  redirect(`/propiedad/${id}${suffix ? `?${suffix}` : ''}`);
}
