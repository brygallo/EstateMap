import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SeoLanding, { TYPE_LINKS, priceRangeText } from '@/components/SeoLanding';
import { getProperties, getCities, slugify } from '@/lib/properties';

export const revalidate = 3600;
// Cities discovered at build time are pre-rendered; new ones render on demand.
export const dynamicParams = true;

interface CityPageProps {
  params: Promise<{ ciudad: string }>;
}

async function resolveCity(slug: string) {
  const properties = await getProperties();
  const match = getCities(properties).find((c) => c.slug === slug);
  if (!match) return null;
  const cityProperties = properties.filter((p) => slugify(p.city || '') === slug);
  return { name: match.name, properties: cityProperties };
}

export async function generateStaticParams() {
  const properties = await getProperties();
  return getCities(properties).map((city) => ({ ciudad: city.slug }));
}

export async function generateMetadata({
  params,
}: CityPageProps): Promise<Metadata> {
  const { ciudad } = await params;
  const city = await resolveCity(ciudad);

  if (!city) {
    return { title: 'Ciudad no encontrada', robots: { index: false, follow: false } };
  }

  return {
    title: `Propiedades en ${city.name}`,
    description: `Casas, departamentos, terrenos y locales en venta y alquiler en ${city.name}, Ecuador, con mapa interactivo, precios, fotos y detalles.`,
    alternates: { canonical: `/propiedades/${ciudad}` },
  };
}

export default async function CiudadPage({ params }: CityPageProps) {
  const { ciudad } = await params;
  const city = await resolveCity(ciudad);

  if (!city) {
    notFound();
  }

  return (
    <SeoLanding
      title={`Propiedades en ${city.name}`}
      intro={`Encuentra casas, departamentos, terrenos y locales comerciales en venta y alquiler en ${city.name}. Compara ubicación en el mapa, precio, área y características.${priceRangeText(
        city.properties
      )}`}
      properties={city.properties}
      pageHref={`/propiedades/${ciudad}`}
      mapHref={`/?search=${encodeURIComponent(city.name)}`}
      relatedLinks={TYPE_LINKS}
      emptyMessage={`Aún no hay propiedades publicadas en ${city.name}.`}
    />
  );
}
