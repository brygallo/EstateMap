import SeoLanding, { TYPE_LINKS, priceRangeText } from '@/components/SeoLanding';
import { getProperties } from '@/lib/properties';
import { topCityCombos } from '@/lib/seo-combos';
import { generatePageMetadata } from '@/lib/metadata';

export const revalidate = 3600;

const PATH = '/departamentos-en-alquiler';

export const metadata = generatePageMetadata(
  'Departamentos en alquiler en Ecuador',
  'Departamentos en alquiler en Ecuador con mapa interactivo, precios, área, habitaciones y ubicación exacta para elegir mejor tu próximo hogar.',
  PATH
);

export default async function DepartamentosEnAlquilerPage() {
  const all = await getProperties();
  const properties = all.filter(
    (p) => p.property_type === 'apartment' && p.status === 'for_rent'
  );
  const cityLinks = topCityCombos(all, 'departamentos', 'alquiler', 12).map((c) => ({
    label: c.label,
    href: `/${c.combo}`,
  }));

  return (
    <SeoLanding
      title="Departamentos en alquiler en Ecuador"
      intro={`Encuentra departamentos en alquiler y compara ubicación, precio mensual, área y características principales en el mapa.${priceRangeText(
        properties
      )}`}
      properties={properties}
      pageHref={PATH}
      mapHref="/?type=apartment&status=for_rent"
      relatedLinks={TYPE_LINKS.filter((l) => l.href !== PATH)}
      cityLinks={cityLinks}
      emptyMessage="Aún no hay departamentos en alquiler publicados. Explora otras propiedades en el mapa."
    />
  );
}
