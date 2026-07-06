import type { Metadata } from 'next';
import SeoLanding, { TYPE_LINKS, priceRangeText } from '@/components/SeoLanding';
import { getProperties } from '@/lib/properties';

export const revalidate = 3600;

const PATH = '/casas-en-venta';

export const metadata: Metadata = {
  title: 'Casas en venta en Ecuador',
  description:
    'Encuentra casas en venta en Ecuador con ubicación en mapa, fotos, precio, área, habitaciones y detalles completos de cada propiedad.',
  alternates: { canonical: PATH },
};

export default async function CasasEnVentaPage() {
  const all = await getProperties();
  const properties = all.filter(
    (p) => p.property_type === 'house' && p.status === 'for_sale'
  );

  return (
    <SeoLanding
      title="Casas en venta en Ecuador"
      intro={`Explora casas en venta y compara ubicación en el mapa, precio, área, habitaciones y baños antes de contactar o visitar.${priceRangeText(
        properties
      )}`}
      properties={properties}
      mapHref="/?type=house&status=for_sale"
      relatedLinks={TYPE_LINKS.filter((l) => l.href !== PATH)}
      emptyMessage="Aún no hay casas en venta publicadas. Explora otras propiedades en el mapa."
    />
  );
}
