'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone, MessageCircle, RefreshCw, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

import AdminRoute from '@/components/AdminRoute';
import AdminSidebar from '@/components/AdminSidebar';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { buildWhatsAppUrl } from '@/lib/constants';
import { cn } from '@/lib/utils';

/**
 * Quién ya recibió gente desde este portal.
 *
 * The imported catalogue is an invitation nobody on this side could read until
 * now: every listing carries its advertiser's phone, and when a visitor writes
 * from here WhatsApp opens naming Geo Propiedades. This page turns that into a
 * call list — ordered by contacts received, not by inventory size, because
 * proof beats volume when the first sentence has to be true.
 */

type Advertiser = {
  phone: string;
  contacts: number;
  listings_contacted: number;
  listings_total: number;
  has_account: boolean;
};

const WINDOWS = [7, 14, 30, 90];

export default function AdminAdvertisersPage() {
  const [rows, setRows] = useState<Advertiser[]>([]);
  const [reached, setReached] = useState(0);
  const [withAccount, setWithAccount] = useState(0);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiGet(`/admin/advertiser-reach/?days=${days}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRows(data.advertisers || []);
      setReached(data.reached ?? 0);
      setWithAccount(data.with_account ?? 0);
    } catch {
      toast.error('No se pudo cargar la lista de anunciantes');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminRoute>
      <div className="flex min-h-[calc(100dvh-var(--app-header-height))] bg-background">
        <AdminSidebar />
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-textPrimary">Anunciantes alcanzados</h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-textSecondary">
                  Números a los que este portal ya les mandó interesados. Cada contacto abrió
                  WhatsApp diciendo «vi este anuncio en Geo Propiedades», así que ya saben que
                  existimos. Estos son los que hay que invitar primero.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-button border border-line bg-white p-0.5" role="group">
                  {WINDOWS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setDays(option)}
                      aria-pressed={days === option}
                      className={cn(
                        'rounded-button px-3 py-1.5 text-sm font-medium transition-colors',
                        days === option ? 'bg-primary text-white' : 'text-textSecondary hover:bg-muted'
                      )}
                    >
                      {option} días
                    </button>
                  ))}
                </div>
                <Button variant="outline" onClick={() => void load()}>
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </Button>
              </div>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <Card className="p-4">
                <Megaphone className="h-5 w-5 text-primary" />
                <p className="mt-2 text-2xl font-black text-textPrimary">{reached}</p>
                <p className="text-sm text-textSecondary">Anunciantes que recibieron interesados</p>
              </Card>
              <Card className="p-4">
                <UserCheck className="h-5 w-5 text-success" />
                <p className="mt-2 text-2xl font-black text-textPrimary">{withAccount}</p>
                <p className="text-sm text-textSecondary">De ellos, ya con cuenta aquí</p>
              </Card>
            </div>

            <Card className="overflow-hidden">
              <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-line bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-textSecondary sm:grid-cols-[1.2fr_0.6fr_0.6fr_auto]">
                <span>Anunciante</span>
                <span className="hidden sm:block">Contactos</span>
                <span className="hidden sm:block">Anuncios aquí</span>
                <span />
              </div>

              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <p className="p-6 text-sm text-textSecondary">
                  Todavía nadie escribió a un anuncio importado en este rango.
                </p>
              ) : (
                rows.map((row) => (
                  <div
                    key={row.phone}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[1.2fr_0.6fr_0.6fr_auto]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-geo text-sm font-semibold text-textPrimary">
                        +{row.phone}
                      </p>
                      <p className="text-xs text-textSecondary">
                        {row.has_account ? 'Ya tiene cuenta' : 'Sin cuenta todavía'}
                        {' · '}
                        {row.listings_contacted} anuncio
                        {row.listings_contacted === 1 ? '' : 's'} con interesados
                      </p>
                    </div>
                    <p className="hidden items-center gap-1 text-sm font-bold text-primary sm:flex">
                      <MessageCircle className="h-4 w-4" aria-hidden />
                      {row.contacts}
                    </p>
                    <p className="hidden text-sm text-textSecondary sm:block">{row.listings_total}</p>
                    {/* The message says only what is true and checkable by the
                        person reading it: how many people wrote to them, and
                        how much of their inventory is already here. */}
                    <Button asChild size="sm" variant={row.has_account ? 'outline' : 'default'}>
                      <a
                        href={buildWhatsAppUrl(
                          `Hola, le escribo de Geo Propiedades Ecuador. Sus propiedades están publicadas en nuestro portal y en los últimos ${days} días ${row.contacts} ${row.contacts === 1 ? 'persona interesada le escribió' : 'personas interesadas le escribieron'} desde ahí. Tiene ${row.listings_total} ${row.listings_total === 1 ? 'anuncio' : 'anuncios'} que puede reclamar para administrarlos usted mismo: editar precio, fotos y ver cuánta gente los abre. Es gratis. ¿Le comparto cómo?`
                        ).replace(/wa\.me\/\d+/, `wa.me/${row.phone}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Invitar
                      </a>
                    </Button>
                  </div>
                ))
              )}
            </Card>
          </div>
        </main>
      </div>
    </AdminRoute>
  );
}
