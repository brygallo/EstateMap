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
import { Property, slugify } from '@/lib/properties';

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

/**
 * Genera todas las combinaciones que realmente tienen propiedades, a partir del
 * catálogo. Para cada propiedad produce variantes por ciudad y por provincia,
 * con y sin operación.
 */
export function generateCombos(properties: Property[]): ComboParam[] {
  const slugs = new Set<string>();

  for (const p of properties) {
    const typeDef = TYPE_DEFS.find((t) => t.type === p.property_type);
    if (!typeDef) continue;

    const opDef = OP_DEFS.find((o) => o.status === p.status) || null;

    const locations = [
      (p.city || '').trim() && slugify(p.city as string),
      (p.province || '').trim() && slugify(p.province as string),
    ].filter(Boolean) as string[];

    for (const loc of locations) {
      if (!loc) continue;
      // Sin operación (ej. terrenos-en-morona-santiago)
      slugs.add(buildComboSlug(typeDef.slug, null, loc));
      // Con operación (ej. casas-en-venta-en-macas)
      if (opDef) slugs.add(buildComboSlug(typeDef.slug, opDef.slug, loc));
    }
  }

  return Array.from(slugs).map((combo) => ({ combo }));
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
