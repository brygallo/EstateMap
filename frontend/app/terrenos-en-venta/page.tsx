import type { Metadata } from 'next';
import SeoLanding, { TYPE_LINKS, priceRangeText } from '@/components/SeoLanding';
import { getProperties } from '@/lib/properties';

export const revalidate = 3600;

const PATH = '/terrenos-en-venta';

export const metadata: Metadata = {
  title: 'Terrenos en venta en Ecuador',
  description:
    'Terrenos y lotes en venta en Ecuador con ubicación y área delimitada en el mapa, precio y detalles para evaluar accesos y oportunidades de inversión.',
  alternates: { canonical: PATH },
};

export default async function TerrenosEnVentaPage() {
  const all = await getProperties();
  const properties = all.filter(
    (p) => p.property_type === 'land' && p.status === 'for_sale'
  );

  return (
    <SeoLanding
      title="Terrenos en venta en Ecuador"
      intro={`Ubica terrenos y lotes en venta, revisa su posición y área en el mapa y evalúa accesos, sectores cercanos y oportunidades de inversión.${priceRangeText(
        properties
      )}`}
      properties={properties}
      mapHref="/?type=land&status=for_sale"
      relatedLinks={TYPE_LINKS.filter((l) => l.href !== PATH)}
      emptyMessage="Aún no hay terrenos en venta publicados. Explora otras propiedades en el mapa."
    />
  );
}
