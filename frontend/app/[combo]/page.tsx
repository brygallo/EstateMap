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
  resolveLocationName,
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

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolvedParams = await params;
  const parsed = parseComboSlug(resolvedParams.combo);
  if (!parsed) return {};

  const properties = await getProperties();
  const { matched, locationName: matchedLocation } = filterByCombo(properties, parsed);
  if (matched.length < MIN_COMBO_PROPERTIES) {
    // Out of stock, not gone: kept crawlable so it recovers its ranking when
    // listings come back, but hidden from the index while it has nothing.
    const fallbackName = resolveLocationName(properties, parsed.locationSlug);
    return {
      title: fallbackName ? `${titleFor(parsed, fallbackName)} — sin disponibilidad` : 'Búsqueda no disponible',
      robots: { index: false, follow: true },
    };
  }
  const title = titleFor(parsed, matchedLocation);
  // Dedup de landings casi idénticas: un combo sin operación cuyo inventario es
  // todo una misma operación canoniza hacia la variante con operación.
  const canonicalPath = `/${canonicalComboSlug(parsed, matched)}`;

  return generatePageMetadata(
    title,
    `${title}: explora ubicación en el mapa, precio, área y detalles completos de cada propiedad. Contacta directamente al anunciante.`,
    canonicalPath
  );
}

export default async function ComboPage({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  const parsed = parseComboSlug(resolvedParams.combo);
  if (!parsed) notFound();

  const properties = await getProperties();
  const { matched, locationName: matchedLocation } = filterByCombo(properties, parsed);

  // Inventory churns daily, so a landing that runs out of listings is normal —
  // and answering 404 drops a URL Google already had indexed. The page stays at
  // 200 with its alternatives (and `noindex, follow` from `generateMetadata`)
  // while empty, so it re-enters the index by itself once stock returns. Only a
  // location that does not exist in the catalogue is a real 404.
  const locationName = matchedLocation ?? resolveLocationName(properties, parsed.locationSlug);
  if (!locationName) notFound();

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
    if (href === `/${resolvedParams.combo}` || relatedLabels.has(href)) return;
    relatedLabels.add(href);
    related.push({ label, href });
  };

  for (const op of OP_DEFS) {
    if (opDef && op.status === opDef.status) continue;
    const slug = buildComboSlug(typeDef.slug, op.slug, locationSlug);
    if (validSlugs.has(slug) && slug !== resolvedParams.combo) {
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
      pageHref={`/${resolvedParams.combo}`}
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
      emptyMessage={`Ahora mismo no hay ${title.toLowerCase()}. Revisa las búsquedas relacionadas de abajo o explora el mapa interactivo: el inventario se actualiza cada día.`}
    />
  );
}
