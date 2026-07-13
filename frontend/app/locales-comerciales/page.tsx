import SeoLanding, { TYPE_LINKS, priceRangeText } from '@/components/SeoLanding';
import { getProperties } from '@/lib/properties';
import { generatePageMetadata } from '@/lib/metadata';

export const revalidate = 3600;

const PATH = '/locales-comerciales';

export const metadata = generatePageMetadata(
  'Locales comerciales en venta y alquiler en Ecuador',
  'Locales y propiedades comerciales en venta y alquiler en Ecuador con ubicación en mapa, precio, área y detalles para tu negocio o inversión.',
  PATH
);

export default async function LocalesComercialesPage() {
  const all = await getProperties();
  const properties = all.filter((p) => p.property_type === 'commercial');

  return (
    <SeoLanding
      title="Locales comerciales en Ecuador"
      intro={`Encuentra locales y propiedades comerciales en venta y alquiler. Compara ubicación en el mapa, precio, área y características para tu negocio.${priceRangeText(
        properties
      )}`}
      properties={properties}
      pageHref={PATH}
      mapHref="/?type=commercial"
      relatedLinks={TYPE_LINKS.filter((l) => l.href !== PATH)}
      emptyMessage="Aún no hay locales comerciales publicados. Explora otras propiedades en el mapa."
    />
  );
}
