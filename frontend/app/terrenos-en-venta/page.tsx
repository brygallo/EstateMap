import SeoLanding, { TYPE_LINKS, priceRangeText } from '@/components/SeoLanding';
import { getAllProperties } from '@/lib/properties';
import { topCityCombos } from '@/lib/seo-combos';
import { generatePageMetadata } from '@/lib/metadata';

export const revalidate = 3600;

const PATH = '/terrenos-en-venta';

export const metadata = generatePageMetadata(
  'Terrenos en venta en Ecuador',
  'Terrenos y lotes en venta en Ecuador con ubicación y área delimitada en el mapa, precio y detalles para evaluar accesos y oportunidades de inversión.',
  PATH
);

export default async function TerrenosEnVentaPage() {
  const all = await getAllProperties();
  const properties = all.filter(
    (p) => p.property_type === 'land' && p.status === 'for_sale'
  );
  const cityLinks = topCityCombos(all, 'terrenos', 'venta', 12).map((c) => ({
    label: c.label,
    href: `/${c.combo}`,
  }));

  return (
    <SeoLanding
      title="Terrenos en venta en Ecuador"
      intro={`Ubica terrenos y lotes en venta, revisa su posición y área en el mapa y evalúa accesos, sectores cercanos y oportunidades de inversión.${priceRangeText(
        properties
      )}`}
      properties={properties}
      pageHref={PATH}
      mapHref="/?type=land&status=for_sale"
      breadcrumbs={[{ label: 'Propiedades', href: '/propiedades' }]}
      relatedLinks={TYPE_LINKS.filter((l) => l.href !== PATH)}
      cityLinks={cityLinks}
      emptyMessage="Aún no hay terrenos en venta publicados. Explora otras propiedades en el mapa."
    />
  );
}
