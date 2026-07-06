import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SeoLanding, { priceRangeText, RelatedLink } from '@/components/SeoLanding';
import { getProperties } from '@/lib/properties';
import {
  TYPE_DEFS,
  OP_DEFS,
  parseComboSlug,
  buildComboSlug,
  generateCombos,
  filterByCombo,
} from '@/lib/seo-combos';

export const revalidate = 3600;
// Solo existen las combinaciones generadas en build; cualquier otra da 404.
export const dynamicParams = false;

type Params = { combo: string };

export async function generateStaticParams(): Promise<Params[]> {
  const properties = await getProperties();
  return generateCombos(properties);
}

function titleFor(parsed: ReturnType<typeof parseComboSlug>, locationName: string | null): string {
  if (!parsed) return 'Propiedades en Ecuador';
  const op = parsed.opDef ? ` ${parsed.opDef.label}` : '';
  const loc = locationName ? ` en ${locationName}` : '';
  return `${parsed.typeDef.plural}${op}${loc}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const parsed = parseComboSlug(params.combo);
  if (!parsed) return {};

  const properties = await getProperties();
  const { locationName } = filterByCombo(properties, parsed);
  const title = titleFor(parsed, locationName);

  return {
    title,
    description: `${title}: explora ubicación en el mapa, precio, área y detalles completos de cada propiedad. Contacta directamente al anunciante.`,
    alternates: { canonical: `/${params.combo}` },
  };
}

export default async function ComboPage({ params }: { params: Params }) {
  const parsed = parseComboSlug(params.combo);
  if (!parsed) notFound();

  const properties = await getProperties();
  const { matched, locationName } = filterByCombo(properties, parsed);
  if (matched.length === 0) notFound();

  const { typeDef, opDef, locationSlug } = parsed;
  const title = titleFor(parsed, locationName);

  const mapHref =
    `/?type=${typeDef.type}` +
    (opDef ? `&status=${opDef.status}` : '') +
    (locationName ? `&search=${encodeURIComponent(locationName)}` : '');

  // Enlaces internos relacionados: otras operaciones y otros tipos en la misma
  // ubicación (solo los que existen en el catálogo).
  const validSlugs = new Set(generateCombos(properties).map((c) => c.combo));
  const related: RelatedLink[] = [];

  for (const op of OP_DEFS) {
    if (opDef && op.status === opDef.status) continue;
    const slug = buildComboSlug(typeDef.slug, op.slug, locationSlug);
    if (validSlugs.has(slug) && slug !== params.combo) {
      related.push({ label: `${typeDef.plural} ${op.label} en ${locationName}`, href: `/${slug}` });
    }
  }
  for (const td of TYPE_DEFS) {
    if (td.type === typeDef.type) continue;
    const slug = buildComboSlug(td.slug, null, locationSlug);
    if (validSlugs.has(slug)) {
      related.push({ label: `${td.plural} en ${locationName}`, href: `/${slug}` });
    }
  }

  return (
    <SeoLanding
      title={title}
      intro={`Explora ${title.toLowerCase()} y compara ubicación en el mapa, precio, área y características antes de contactar.${priceRangeText(
        matched
      )}`}
      properties={matched}
      mapHref={mapHref}
      relatedLinks={related.slice(0, 8)}
      emptyMessage="No hay propiedades en esta combinación por ahora. Explora el mapa interactivo."
    />
  );
}
