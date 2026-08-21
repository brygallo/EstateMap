import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import SeoLanding, { priceRangeText } from '@/components/SeoLanding';
import { generatePageMetadata } from '@/lib/metadata';
import { money } from '@/lib/market-stats';
import { slugify } from '@/lib/properties';
import {
  findSector,
  getSectorProperties,
  getSectors,
  MIN_SECTOR_LISTINGS,
  sectorSlug,
} from '@/lib/sectors';

/**
 * A named zone inside a city: «Propiedades en Cumbayá, Quito».
 *
 * One level below the city landing, and the level people actually search.
 * Search Console recorded 450 impressions in three months for queries naming a
 * building or an urbanization, at position 9, with no page pointing at any of
 * them.
 */

export const revalidate = 3600;
export const dynamicParams = true;

interface SectorPageProps {
  params: Promise<{ ciudad: string; sector: string }>;
}

export async function generateStaticParams() {
  const sectors = await getSectors();
  return sectors.map((sector) => ({
    ciudad: slugify(sector.city),
    sector: sectorSlug(sector),
  }));
}

function describe(sector: Awaited<ReturnType<typeof findSector>>): string {
  if (!sector) return '';
  const price = sector.avg_price_m2
    ? ` El metro cuadrado promedia ${money(sector.avg_price_m2)} en la zona.`
    : '';
  return `${sector.count} ${
    sector.count === 1 ? 'propiedad publicada' : 'propiedades publicadas'
  } en ${sector.name}, ${sector.city}.${price}`;
}

export async function generateMetadata({ params }: SectorPageProps): Promise<Metadata> {
  const { ciudad, sector: sectorParam } = await params;
  const sector = await findSector(ciudad, sectorParam);
  if (!sector) {
    return { title: 'Zona no encontrada', robots: { index: false, follow: false } };
  }

  const metadata = generatePageMetadata(
    `Propiedades en ${sector.name}, ${sector.city}`,
    `Casas, departamentos, terrenos y locales en ${sector.name}, ${sector.city}. ${describe(
      sector
    )} Compara ubicación en el mapa, precio y área.`,
    `/propiedades/${ciudad}/${sectorParam}`
  );

  // Same shape as a local landing that is still filling up: crawlable, out of
  // the index until it has enough to compare (SEO-001).
  if (sector.count < MIN_SECTOR_LISTINGS) {
    return { ...metadata, robots: { index: false, follow: true } };
  }
  return metadata;
}

export default async function SectorPage({ params }: SectorPageProps) {
  const { ciudad, sector: sectorParam } = await params;
  const sector = await findSector(ciudad, sectorParam);
  if (!sector) notFound();

  // The URL of a zone that has since been absorbed into a larger one: send it
  // where the content now lives instead of serving the same page twice
  // (SEC-005). Permanent, not temporary: a 307 tells a crawler to keep the old
  // URL indexed and come back, which is the opposite of consolidating them.
  if (sectorSlug(sector) !== sectorParam) {
    permanentRedirect(`/propiedades/${ciudad}/${sectorSlug(sector)}`);
  }

  const [properties, siblings] = await Promise.all([
    getSectorProperties(sector),
    getSectors(sector.city),
  ]);

  const related = [
    { label: `Todas las propiedades en ${sector.city}`, href: `/propiedades/${ciudad}` },
    ...(sector.avg_price_m2
      ? [
          {
            label: `Precio del metro cuadrado en ${sector.city}`,
            href: `/estadisticas-inmobiliarias/${ciudad}`,
          },
        ]
      : []),
    // The other zones of the same city: what someone comparing neighbourhoods
    // wants next, and what keeps every zone page one hop from the others.
    ...siblings
      .filter((candidate) => candidate.sector_key !== sector.sector_key)
      .slice(0, 8)
      .map((candidate) => ({
        label: `${candidate.name} (${candidate.count})`,
        href: `/propiedades/${ciudad}/${sectorSlug(candidate)}`,
      })),
  ];

  return (
    <SeoLanding
      title={`Propiedades en ${sector.name}, ${sector.city}`}
      intro={`${describe(sector)} Es el nivel más fino que publica el portal: la zona tal como aparece en la dirección de cada anuncio, no una división administrativa.${priceRangeText(
        properties
      )}`}
      properties={properties}
      pageHref={`/propiedades/${ciudad}/${sectorParam}`}
      mapHref={`/?search=${encodeURIComponent(`${sector.name} ${sector.city}`)}`}
      featuredQuery={{ city: sector.city, sector: sector.sector_key }}
      relatedLinks={related}
      locationName={`${sector.name}, ${sector.city}`}
      breadcrumbs={[
        { label: 'Propiedades', href: '/propiedades' },
        { label: sector.city, href: `/propiedades/${ciudad}` },
      ]}
      emptyMessage={`Aún no hay propiedades publicadas en ${sector.name}.`}
    />
  );
}
