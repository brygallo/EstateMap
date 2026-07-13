import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SeoLanding, { TYPE_LINKS, priceRangeText } from '@/components/SeoLanding';
import { generatePageMetadata } from '@/lib/metadata';
import { getCities, getProperties, getProvinces, slugify } from '@/lib/properties';
import { generateCombosWithCounts, parseComboSlug } from '@/lib/seo-combos';

export const revalidate = 3600;
export const dynamicParams = true;

interface ProvincePageProps {
  params: Promise<{ provincia: string }>;
}

async function resolveProvince(slug: string) {
  const properties = await getProperties();
  const match = getProvinces(properties).find((province) => province.slug === slug);
  if (!match) return null;

  const provinceProperties = properties.filter((property) => slugify(property.province || '') === slug);
  const cityLinks = getCities(provinceProperties).slice(0, 24).map((city) => ({
    label: `Propiedades en ${city.name} (${city.count})`,
    href: `/propiedades/${city.slug}`,
  }));

  return { name: match.name, properties: provinceProperties, cityLinks };
}

export async function generateStaticParams() {
  const properties = await getProperties();
  return getProvinces(properties).map((province) => ({ provincia: province.slug }));
}

export async function generateMetadata({
  params,
}: ProvincePageProps): Promise<Metadata> {
  const { provincia } = await params;
  const province = await resolveProvince(provincia);

  if (!province) {
    return { title: 'Provincia no encontrada', robots: { index: false, follow: false } };
  }

  return generatePageMetadata(
    `Propiedades en ${province.name}`,
    `Casas, departamentos, terrenos y locales en venta y alquiler en ${province.name}, Ecuador. Explora ciudades, cantones y búsquedas locales con mapa, precios y contacto directo.`,
    `/provincias/${provincia}`
  );
}

export default async function ProvinciaPage({ params }: ProvincePageProps) {
  const { provincia } = await params;
  const province = await resolveProvince(provincia);

  if (!province) {
    notFound();
  }

  const relatedProvinceLinks = generateCombosWithCounts(province.properties)
    .map(({ combo, count }) => {
      const parsed = parseComboSlug(combo);
      if (!parsed || parsed.locationSlug !== provincia) return null;
      const op = parsed.opDef ? ` ${parsed.opDef.label}` : '';
      return {
        label: `${parsed.typeDef.plural}${op} en ${province.name} (${count})`,
        href: `/${combo}`,
      };
    })
    .filter(Boolean)
    .slice(0, 12) as { label: string; href: string }[];

  return (
    <SeoLanding
      title={`Propiedades en ${province.name}`}
      intro={`Encuentra casas, departamentos, terrenos y locales comerciales en venta y alquiler en ${province.name}. Esta página conecta ciudades principales, cantones y búsquedas locales de la provincia para comparar ubicación, precio, área y características.${priceRangeText(
        province.properties
      )}`}
      properties={province.properties}
      pageHref={`/provincias/${provincia}`}
      mapHref={`/?province=${encodeURIComponent(province.name)}`}
      relatedLinks={[
        ...province.cityLinks,
        ...(relatedProvinceLinks.length ? relatedProvinceLinks : TYPE_LINKS),
      ].slice(0, 30)}
      emptyMessage={`Aún no hay propiedades publicadas en ${province.name}.`}
    />
  );
}
