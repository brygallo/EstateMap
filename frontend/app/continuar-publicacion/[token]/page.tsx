'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PROPERTY_DRAFT_STORAGE_KEY,
  PUBLICATION_RESUME_TOKEN_KEY,
} from '@/lib/publication-draft';

/**
 * Hands an abandoned draft back to the person who wrote it.
 *
 * This page holds no form of its own: it resolves the token, drops the draft
 * where the publishing form already looks for one, and steps aside. Duplicating
 * that form would mean maintaining two of everything — polygon drawing,
 * validation, uploads — and letting them drift apart.
 */
export default function ResumePublicationPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params?.token || '');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const load = async () => {
      try {
        const { apiGet } = await import('@/lib/api');
        const res = await apiGet(`/publication-drafts/${token}/`, { skipAuth: true });
        if (!res.ok) throw new Error('invalid');

        const payload = await res.json();
        if (cancelled) return;

        sessionStorage.setItem(PUBLICATION_RESUME_TOKEN_KEY, token);
        localStorage.setItem(
          PROPERTY_DRAFT_STORAGE_KEY,
          JSON.stringify({
            ...(payload.draft || {}),
            temporary_images: payload.temporary_images || [],
            draft_status: 'resumed',
          })
        );
        router.replace('/publicar-propiedad');
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  // A missing token is the same dead end as a rejected one, and needs no state.
  if (failed || !token) {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="h-10 w-10 text-error" aria-hidden />
        <h1 className="text-xl font-bold text-textPrimary">Este enlace ya no es válido</h1>
        <p className="text-sm text-textSecondary">
          Los enlaces para continuar caducan a las dos semanas y se gastan al publicar. Escríbenos por
          WhatsApp y te enviamos uno nuevo con todo lo que ya habías escrito.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild className="rounded-button">
            <Link href="/publicar-propiedad">Publicar desde cero</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-button">
            <Link href="/ayuda">Pedir ayuda</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-lg flex-col items-center justify-center gap-3 px-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-textSecondary">Recuperando tu publicación…</p>
    </div>
  );
}
