'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Car,
  Eye,
  ExternalLink,
  Mail,
  MapPin,
  Megaphone,
  Pencil,
  Phone,
  Ruler,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import PrivateRoute from '@/components/PrivateRoute';
import PropertyGallery from '@/components/PropertyGallery';
import ShareModal from '@/components/ShareModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { requestErrorMessage, responseErrorMessage } from '@/lib/form-errors';
import { sameIdentifier } from '@/lib/identifiers';
import {
  formatArea,
  formatDate,
  formatPrice,
  getPropertyTypeLabel,
  getListingStatusBadgeClass,
  getListingStatusLabel,
} from '@/lib/property-labels';
import type { Property } from '@/lib/types';

interface Lead {
  id: number;
  property: number;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  created_at: string;
}

function DetailItem({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Ruler }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden />
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-textSecondary">{label}</p>
      <p className="mt-1 break-words font-geo font-semibold text-textPrimary">{value}</p>
    </div>
  );
}

export default function OwnerPropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, logout, user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    if (!token || !params.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { apiGet } = await import('@/lib/api');
        const [propertyResponse, leadsResponse] = await Promise.all([
          apiGet(`/properties/${params.id}/`),
          apiGet('/leads/'),
        ]);
        if (!propertyResponse.ok) {
          if (propertyResponse.status === 401) logout();
          throw new Error('Property request failed');
        }
        const nextProperty = await propertyResponse.json();
        if (!user?.is_staff && !sameIdentifier(nextProperty.owner, user?.id)) {
          throw new Error('Property is outside the current owner scope');
        }
        const leadData = leadsResponse.ok ? await leadsResponse.json() : [];
        const leadList: Lead[] = Array.isArray(leadData) ? leadData : leadData.results ?? [];
        if (!cancelled) {
          setProperty(nextProperty);
          setLeads(leadList.filter((lead) => String(lead.property) === String(params.id)));
        }
      } catch (error) {
        console.error('Error loading owner property detail:', error);
        if (!cancelled) toast.error('No se pudo cargar la propiedad.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [logout, params.id, token, user?.id, user?.is_staff]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !property) return '';
    return `${window.location.origin}/property/${property.id}`;
  }, [property]);

  const handleDelete = async () => {
    if (!property || !window.confirm('¿Estás seguro de que deseas eliminar esta propiedad?')) return;
    try {
      const { apiDelete } = await import('@/lib/api');
      const response = await apiDelete(`/properties/${property.id}/`);
      if (!response.ok) {
        toast.error(await responseErrorMessage(response, 'No se pudo eliminar la propiedad.'));
        return;
      }
      toast.success('Propiedad eliminada exitosamente');
      router.push('/mis-propiedades');
    } catch (error) {
      toast.error(requestErrorMessage(error, 'eliminar la propiedad'));
    }
  };

  return (
    <PrivateRoute>
      <main className="min-h-screen bg-background pb-16">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" className="mb-4 -ml-3">
            <Link href="/mis-propiedades"><ArrowLeft className="h-4 w-4" />Mis propiedades</Link>
          </Button>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="aspect-[16/7] w-full rounded-hero" />
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !property ? (
            <div className="rounded-card border border-line bg-surface p-10 text-center shadow-card">
              <h1 className="text-xl font-bold text-textPrimary">No se encontró la propiedad</h1>
              <Button asChild className="mt-5"><Link href="/mis-propiedades">Volver al listado</Link></Button>
            </div>
          ) : (
            <div className="space-y-6">
              <PropertyGallery
                images={property.images || []}
                title={property.title || `Propiedad #${property.id}`}
                statusLabel={getListingStatusLabel(property)}
                propertyTypeLabel={getPropertyTypeLabel(property.property_type)}
                statusClassName={getListingStatusBadgeClass(property)}
              />

              <section className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getListingStatusBadgeClass(property)}>{getListingStatusLabel(property)}</Badge>
                      {property.is_imported && <Badge variant="secondary">Importada</Badge>}
                    </div>
                    <h1 className="mt-3 text-2xl font-bold text-textPrimary sm:text-3xl">{property.title || `Propiedad #${property.id}`}</h1>
                    <p className="mt-2 flex items-start gap-1.5 text-sm text-textSecondary">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {[property.address, property.city, property.province].filter(Boolean).join(', ') || 'Sin ubicación especificada'}
                    </p>
                    <p className="mt-3 font-geo text-3xl font-bold text-primary">{formatPrice(property.price)}</p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/property/${property.id}`} target="_blank"><ExternalLink className="h-4 w-4" />Ver publicación</Link>
                  </Button>
                </div>
              </section>

              <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <DetailItem label="Tipo" value={getPropertyTypeLabel(property.property_type)} icon={Building2} />
                <DetailItem label="Área" value={formatArea(property.area) || '—'} icon={Ruler} />
                <DetailItem label="Habitaciones" value={property.rooms || '—'} icon={BedDouble} />
                <DetailItem label="Baños" value={property.bathrooms || '—'} icon={Bath} />
                <DetailItem label="Parqueos" value={property.parking_spaces || '—'} icon={Car} />
                <DetailItem label="Vistas" value={property.views_count || 0} icon={Eye} />
              </section>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-6">
                  <section className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
                    <h2 className="text-lg font-bold text-textPrimary">Descripción</h2>
                    <p className="mt-3 whitespace-pre-line leading-7 text-textSecondary">{property.description || 'Sin descripción.'}</p>
                  </section>

                  <section className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
                    <h2 className="text-lg font-bold text-textPrimary">Contactos recibidos</h2>
                    {leads.length === 0 ? (
                      <p className="mt-3 text-sm text-textSecondary">Esta propiedad todavía no tiene contactos registrados.</p>
                    ) : (
                      <div className="mt-4 divide-y divide-line">
                        {leads.map((lead) => (
                          <div key={lead.id} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-textPrimary">{lead.name}</p>
                                <p className="text-xs text-textSecondary">{formatDate(lead.created_at, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                {lead.message && <p className="mt-2 text-sm text-textSecondary">{lead.message}</p>}
                              </div>
                              <a href={`tel:${lead.phone}`} className="shrink-0 text-sm font-semibold text-primary hover:underline">Llamar</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <aside className="space-y-4">
                  <section className="rounded-card border border-line bg-surface p-5 shadow-card">
                    <h2 className="text-lg font-bold text-textPrimary">Datos de publicación</h2>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div><dt className="text-textSecondary">Teléfono</dt><dd className="font-medium text-textPrimary">{property.contact_phone || 'Sin teléfono'}</dd></div>
                      <div><dt className="text-textSecondary">Correo</dt><dd className="break-all font-medium text-textPrimary">{property.contact_email || 'Sin correo'}</dd></div>
                      <div><dt className="text-textSecondary">Publicada</dt><dd className="font-medium text-textPrimary">{formatDate(property.created_at, { day: '2-digit', month: 'long', year: 'numeric' }) || 'Sin fecha'}</dd></div>
                    </dl>
                  </section>

                  <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary via-primary to-[var(--accent-alt-strong)] p-5 text-white shadow-cardHover">
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10" aria-hidden />
                    <div className="absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-white/10" aria-hidden />
                    <div className="relative">
                      <span className="flex h-10 w-10 items-center justify-center rounded-button bg-white/15">
                        <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                      </span>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/75">Genera artes para tus redes</p>
                      <h2 className="mt-1 text-xl font-bold">Crea imágenes para compartir tu propiedad</h2>
                      <p className="mt-2 text-sm leading-5 text-white/80">
                        Generamos diseños con la foto, el precio, la ubicación y el enlace del anuncio, listos para Instagram, Facebook, TikTok y WhatsApp.
                      </p>
                      <Button
                        className="mt-4 w-full bg-white text-primary shadow-card hover:bg-white/90"
                        data-testid="promote-property-action"
                        onClick={() => router.push(`/propiedad/${property.id}/promocionar`)}
                      >
                        <Megaphone className="h-4 w-4" />
                        Generar imágenes
                      </Button>
                    </div>
                  </section>

                  <section className="rounded-card border border-line bg-surface p-5 shadow-card lg:sticky lg:top-24">
                    <h2 className="text-lg font-bold text-textPrimary">Gestionar propiedad</h2>
                    <div className="mt-4 grid gap-2">
                      <Button onClick={() => router.push(`/editar-propiedad/${property.id}`)}><Pencil className="h-4 w-4" />Editar publicación</Button>
                      <Button variant="outline" onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4" />Compartir</Button>
                      {property.contact_phone && <Button asChild variant="outline"><a href={`tel:${property.contact_phone}`}><Phone className="h-4 w-4" />Llamar al contacto</a></Button>}
                      {property.contact_email && <Button asChild variant="outline"><a href={`mailto:${property.contact_email}`}><Mail className="h-4 w-4" />Escribir correo</a></Button>}
                      <Button variant="outline" className="text-error hover:bg-error/10 hover:text-error" onClick={handleDelete}><Trash2 className="h-4 w-4" />Eliminar propiedad</Button>
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          )}
        </div>
      </main>

      {property && <ShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} shareUrl={shareUrl} title="Compartir Propiedad" />}
    </PrivateRoute>
  );
}
