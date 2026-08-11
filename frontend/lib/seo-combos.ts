/**
 * Generación y parseo de slugs para las landings SEO por combinación
 * tipo + operación + ubicación, p. ej.:
 *   - casas-en-venta-en-macas
 *   - departamentos-en-alquiler-en-cuenca
 *   - terrenos-en-morona-santiago        (sin operación, a nivel provincia)
 *
 * El slug se genera de forma determinista para poder volver a derivar los
 * filtros a partir del slug en la página, sin depender de una tabla externa.
 */
import { Property, PropertyGroup, slugify } from '@/lib/properties';

export type TypeDef = {
  slug: string;
  type: string;
  singular: string;
  plural: string;
};

export type OpDef = {
  slug: string;
  status: string;
  label: string; // "en venta" / "en alquiler"
};

// Orden por longitud de slug descendente: al parsear, el prefijo más largo
// gana (evita que "casas" capture parte de otro tipo).
export const TYPE_DEFS: TypeDef[] = [
  { slug: 'locales-comerciales', type: 'commercial', singular: 'Local comercial', plural: 'Locales comerciales' },
  { slug: 'departamentos', type: 'apartment', singular: 'Departamento', plural: 'Departamentos' },
  { slug: 'terrenos', type: 'land', singular: 'Terreno', plural: 'Terrenos' },
  { slug: 'casas', type: 'house', singular: 'Casa', plural: 'Casas' },
];

export const OP_DEFS: OpDef[] = [
  { slug: 'venta', status: 'for_sale', label: 'en venta' },
  { slug: 'alquiler', status: 'for_rent', label: 'en alquiler' },
];

export function buildComboSlug(typeSlug: string, opSlug: string | null, locationSlug: string): string {
  const op = opSlug ? `-en-${opSlug}` : '';
  return `${typeSlug}${op}-en-${locationSlug}`;
}

export type ParsedCombo = {
  typeDef: TypeDef;
  opDef: OpDef | null;
  locationSlug: string;
};

/** Parsea un slug de combinación a sus filtros, o null si no es válido. */
export function parseComboSlug(slug: string): ParsedCombo | null {
  for (const typeDef of TYPE_DEFS) {
    const prefix = `${typeDef.slug}-en-`;
    if (!slug.startsWith(prefix)) continue;

    let rest = slug.slice(prefix.length);
    let opDef: OpDef | null = null;

    for (const op of OP_DEFS) {
      const opPrefix = `${op.slug}-en-`;
      if (rest.startsWith(opPrefix)) {
        opDef = op;
        rest = rest.slice(opPrefix.length);
        break;
      }
    }

    if (!rest) return null;
    return { typeDef, opDef, locationSlug: rest };
  }
  return null;
}

export type ComboParam = { combo: string };
export type ComboWithCount = ComboParam & { count: number };

// A landing with only one or two listings adds little beyond the listing pages
// themselves and risks index bloat. Keep low-stock URLs crawlable, but only
// promote/index combinations once they have a useful comparison set.
export const MIN_COMBO_PROPERTIES = 5;
export const MIN_LOCATION_PROPERTIES = 5;
export const MAX_COMBO_PAGES = 2000;

/**
 * Genera todas las combinaciones que realmente tienen propiedades, a partir del
 * catálogo. Para cada propiedad produce variantes por ciudad y por provincia,
 * con y sin operación.
 */
export function generateCombosWithCounts(properties: Property[]): ComboWithCount[] {
  return combosFromRows(
    properties.map((p) => ({
      city: (p.city || '') as string,
      province: (p.province || '') as string,
      property_type: p.property_type || '',
      status: p.status || '',
      count: 1,
    }))
  );
}

/**
 * Same combinations, counted from the API's aggregated cross-tab.
 *
 * The property list is capped at 2000 rows, so counting a fetched page stopped
 * reflecting reality once the catalogue grew past that cap. Each grouped row
 * already carries its own `count`, covering the whole inventory.
 */
export function generateCombosFromGroups(groups: PropertyGroup[]): ComboWithCount[] {
  return combosFromRows(groups);
}

function combosFromRows(rows: PropertyGroup[]): ComboWithCount[] {
  const counts = new Map<string, number>();

  const add = (slug: string, count: number) => {
    counts.set(slug, (counts.get(slug) || 0) + count);
  };

  for (const row of rows) {
    const typeDef = TYPE_DEFS.find((t) => t.type === row.property_type);
    if (!typeDef) continue;

    const opDef = OP_DEFS.find((o) => o.status === row.status) || null;

    const locations = [
      (row.city || '').trim() && slugify(row.city),
      (row.province || '').trim() && slugify(row.province),
    ].filter(Boolean) as string[];

    for (const loc of locations) {
      if (!loc) continue;
      // Sin operación (ej. terrenos-en-morona-santiago)
      add(buildComboSlug(typeDef.slug, null, loc), row.count);
      // Con operación (ej. casas-en-venta-en-macas)
      if (opDef) add(buildComboSlug(typeDef.slug, opDef.slug, loc), row.count);
    }
  }

  return Array.from(counts.entries())
    .map(([combo, count]) => ({ combo, count }))
    .filter((item) => item.count >= MIN_COMBO_PROPERTIES)
    .sort((a, b) => b.count - a.count || a.combo.localeCompare(b.combo))
    .slice(0, MAX_COMBO_PAGES);
}

export function generateCombos(properties: Property[]): ComboParam[] {
  return generateCombosWithCounts(properties).map(({ combo }) => ({ combo }));
}

/**
 * Readable name of a location (city or province) looked up across the whole
 * catalogue, without filtering by type or operation.
 *
 * Tells apart two cases that used to collapse into the same 404: a landing
 * whose inventory ran out temporarily (the location exists and the URL was
 * already indexed) versus an invented slug (the location does not exist). Only
 * the second one deserves a 404.
 */
export function resolveLocationName(
  properties: Property[],
  locationSlug: string
): string | null {
  for (const p of properties) {
    const city = (p.city || '').trim();
    if (city && slugify(city) === locationSlug) return city;
    const province = (p.province || '').trim();
    if (province && slugify(province) === locationSlug) return province;
  }
  return null;
}

export type CityComboLink = { combo: string; label: string; count: number };

/**
 * Combos de nivel CIUDAD con más inventario para un tipo (y opción) dado, con el
 * nombre legible de la ciudad. Se usa para enlazar desde las landings nacionales
 * (`/casas-en-venta`) hacia la intención por ciudad (`/casas-en-venta-en-quito`),
 * que es la que Google premia para búsquedas tipo "casas en venta en Quito".
 */
export function topCityCombos(
  properties: Property[],
  typeSlug: string,
  opSlug: string | null,
  limit = 8
): CityComboLink[] {
  const typeDef = TYPE_DEFS.find((t) => t.slug === typeSlug);
  if (!typeDef) return [];
  const opDef = opSlug ? OP_DEFS.find((o) => o.slug === opSlug) || null : null;

  const agg = new Map<string, { name: string; count: number }>();
  for (const p of properties) {
    if (p.property_type !== typeDef.type) continue;
    if (opDef && p.status !== opDef.status) continue;
    const cityName = (p.city || '').trim();
    if (!cityName) continue;
    const citySlug = slugify(cityName);
    const entry = agg.get(citySlug);
    if (entry) entry.count += 1;
    else agg.set(citySlug, { name: cityName, count: 1 });
  }

  const opLabel = opDef ? ` ${opDef.label}` : '';
  return Array.from(agg.entries())
    .map(([citySlug, { name, count }]) => ({
      combo: buildComboSlug(typeDef.slug, opDef?.slug ?? null, citySlug),
      label: `${typeDef.plural}${opLabel} en ${name}`,
      count,
    }))
    .filter((c) => c.count >= MIN_COMBO_PROPERTIES)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/**
 * Slug canónico para una combinación, para deduplicar landings casi idénticas.
 * Un combo SIN operación cuyo inventario es todo una misma operación (p. ej.
 * `terrenos-en-quito` cuando todos los terrenos de Quito están en venta) es un
 * duplicado de la variante con operación (`terrenos-en-venta-en-quito`): se
 * canoniza hacia esa, que es más específica y captura mejor la intención. Los
 * combos con operación explícita, o los de inventario mixto, son auto-canónicos.
 */
export function canonicalComboSlug(parsed: ParsedCombo, matched: Property[]): string {
  const { typeDef, opDef, locationSlug } = parsed;
  if (opDef) return buildComboSlug(typeDef.slug, opDef.slug, locationSlug);

  const statuses = new Set(matched.map((p) => p.status));
  if (statuses.size === 1) {
    const onlyOp = OP_DEFS.find((o) => o.status === matched[0]?.status);
    if (onlyOp) return buildComboSlug(typeDef.slug, onlyOp.slug, locationSlug);
  }
  return buildComboSlug(typeDef.slug, null, locationSlug);
}

/**
 * Filtra el catálogo según una combinación parseada y devuelve las propiedades
 * y el nombre legible de la ubicación (ciudad o provincia).
 */
export function filterByCombo(
  properties: Property[],
  parsed: ParsedCombo
): { matched: Property[]; locationName: string | null } {
  const { typeDef, opDef, locationSlug } = parsed;
  let locationName: string | null = null;

  const matched = properties.filter((p) => {
    if (p.property_type !== typeDef.type) return false;
    if (opDef && p.status !== opDef.status) return false;

    const citySlug = (p.city || '').trim() ? slugify(p.city as string) : '';
    const provSlug = (p.province || '').trim() ? slugify(p.province as string) : '';

    if (citySlug === locationSlug) {
      if (!locationName) locationName = (p.city as string).trim();
      return true;
    }
    if (provSlug === locationSlug) {
      if (!locationName) locationName = (p.province as string).trim();
      return true;
    }
    return false;
  });

  return { matched, locationName };
}
