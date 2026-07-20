import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SeoLanding, { priceRangeText, RelatedLink } from '@/components/SeoLanding';
import { getCities, getProperties, getProvinces } from '@/lib/properties';
import {
  TYPE_DEFS,
  OP_DEFS,
  MIN_COMBO_PROPERTIES,
  parseComboSlug,
  buildComboSlug,
  generateCombos,
  filterByCombo,
  canonicalComboSlug,
} from '@/lib/seo-combos';
import { generatePageMetadata } from '@/lib/metadata';

export const revalidate = 3600;
// `sitemap.ts` calcula los combos con datos en vivo cada hora, mientras que
// `generateStaticParams` solo corre en build; con `dynamicParams = false` los
// combos nuevos quedaban en 404 pese a estar en el sitemap. Con `true` se
// renderizan bajo demanda (igual que `propiedades/[ciudad]`), y el propio
// componente sigue devolviendo `notFound()` si el combo no supera
// `MIN_COMBO_PROPERTIES`.
export const dynamicParams = true;

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
  const { matched, locationName } = filterByCombo(properties, parsed);
  if (matched.length < MIN_COMBO_PROPERTIES) {
    return { title: 'Búsqueda no disponible', robots: { index: false, follow: true } };
  }
  const title = titleFor(parsed, locationName);
  // Dedup de landings casi idénticas: un combo sin operación cuyo inventario es
  // todo una misma operación canoniza hacia la variante con operación.
  const canonicalPath = `/${canonicalComboSlug(parsed, matched)}`;

  return generatePageMetadata(
    title,
    `${title}: explora ubicación en el mapa, precio, área y detalles completos de cada propiedad. Contacta directamente al anunciante.`,
    canonicalPath
  );
}

export default async function ComboPage({ params }: { params: Params }) {
  const parsed = parseComboSlug(params.combo);
  if (!parsed) notFound();

  const properties = await getProperties();
  const { matched, locationName } = filterByCombo(properties, parsed);
  if (matched.length < MIN_COMBO_PROPERTIES) notFound();

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
  const relatedLabels = new Set<string>();

  const addRelated = (label: string, href: string) => {
    if (href === `/${params.combo}` || relatedLabels.has(href)) return;
    relatedLabels.add(href);
    related.push({ label, href });
  };

  for (const op of OP_DEFS) {
    if (opDef && op.status === opDef.status) continue;
    const slug = buildComboSlug(typeDef.slug, op.slug, locationSlug);
    if (validSlugs.has(slug) && slug !== params.combo) {
      addRelated(`${typeDef.plural} ${op.label} en ${locationName}`, `/${slug}`);
    }
  }
  for (const td of TYPE_DEFS) {
    if (td.type === typeDef.type) continue;
    const slug = buildComboSlug(td.slug, null, locationSlug);
    if (validSlugs.has(slug)) {
      addRelated(`${td.plural} en ${locationName}`, `/${slug}`);
    }
  }

  // Miga hacia el hub de la ubicación (ciudad o provincia), para que Google
  // entienda la jerarquía Inicio > Propiedades en X > Casas en venta en X.
  // También sirve para decidir si `locationName` es ciudad o provincia al
  // pedir las fotos destacadas, porque `mapHref` codifica la ubicación como
  // `search=`, no como `city=`/`province=` (ver `featuredQuery` abajo).
  const isCityLocation =
    !!locationName && !!locationSlug && getCities(properties).some((c) => c.slug === locationSlug);
  const isProvinceLocation =
    !!locationName &&
    !!locationSlug &&
    !isCityLocation &&
    getProvinces(properties).some((p) => p.slug === locationSlug);

  const breadcrumbs: RelatedLink[] = [];
  if (locationName && locationSlug) {
    if (isCityLocation) {
      breadcrumbs.push({
        label: `Propiedades en ${locationName}`,
        href: `/propiedades/${locationSlug}`,
      });
    } else if (isProvinceLocation) {
      breadcrumbs.push({
        label: `Propiedades en ${locationName}`,
        href: `/provincias/${locationSlug}`,
      });
    }
  }

  return (
    <SeoLanding
      title={title}
      intro={`Explora ${title.toLowerCase()} y compara ubicación en el mapa, precio, área y características antes de contactar.${priceRangeText(
        matched
      )}`}
      properties={matched}
      pageHref={`/${params.combo}`}
      mapHref={mapHref}
      featuredQuery={{
        type: typeDef.type,
        status: opDef?.status,
        city: isCityLocation ? locationName ?? undefined : undefined,
        province: isProvinceLocation ? locationName ?? undefined : undefined,
      }}
      relatedLinks={related.slice(0, 8)}
      locationName={locationName ?? undefined}
      breadcrumbs={breadcrumbs}
      emptyMessage="No hay propiedades en esta combinación por ahora. Explora el mapa interactivo."
    />
  );
}
