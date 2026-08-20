/**
 * Recipes for the living pages of the blog.
 *
 * A recipe is a criterion plus a type, an operation and a geographic scope.
 * From it comes a slug, and from a slug comes back the recipe — deterministic
 * both ways, with no table in the middle, exactly like the SEO landings in
 * `seo-combos.ts`. That is what lets one declaration («los más pequeños»)
 * become a page in every city that holds enough inventory, without anyone
 * writing or maintaining a list.
 *
 * What these pages are NOT is a reordered catalogue. `/terrenos-en-venta-en-quito`
 * already lists every lot in Quito; this answers a different question — which
 * ten, in what order, and how far each sits from the average of its own market.
 * Every decision here defends that difference.
 */
import { slugify } from '@/lib/properties';
import { OP_DEFS, TYPE_DEFS, type OpDef, type TypeDef } from '@/lib/seo-combos';
import type { RankingScopes, ScopeRow } from '@/lib/rankings';

/** Grammatical gender of each property type, so the copy agrees in Spanish. */
const TYPE_GENDER: Record<string, 'm' | 'f'> = {
  casas: 'f',
  departamentos: 'm',
  terrenos: 'm',
  'locales-comerciales': 'm',
};

export type CriterionSlug =
  | 'cheapest'
  | 'most_expensive'
  | 'largest'
  | 'smallest'
  | 'best_value'
  | 'newest';

export type CriterionDef = {
  criterion: CriterionSlug;
  /** Word that joins type and criterion: «terrenos **más** baratos». */
  connector: 'mas' | 'con';
  /** Slug fragment per gender; the same string when the adjective is invariable. */
  fragment: { m: string; f: string };
  /** Human label per gender, for titles and headings. */
  label: { m: string; f: string };
  /** What the page promises in one line, before any figure. */
  question: (subject: string, place: string) => string;
  /** Unit the ranking is read in. */
  unit: 'price' | 'area' | 'price_m2' | 'date';
};

export const CRITERION_DEFS: CriterionDef[] = [
  {
    criterion: 'cheapest',
    connector: 'mas',
    fragment: { m: 'baratos', f: 'baratas' },
    label: { m: 'más baratos', f: 'más baratas' },
    question: (subject, place) => `¿Cuáles son ${subject} más baratos ${place}?`,
    unit: 'price',
  },
  {
    criterion: 'most_expensive',
    connector: 'mas',
    fragment: { m: 'caros', f: 'caras' },
    label: { m: 'más caros', f: 'más caras' },
    question: (subject, place) => `¿Cuáles son ${subject} más caros ${place}?`,
    unit: 'price',
  },
  {
    criterion: 'largest',
    connector: 'mas',
    fragment: { m: 'grandes', f: 'grandes' },
    label: { m: 'más grandes', f: 'más grandes' },
    question: (subject, place) => `¿Cuáles son ${subject} más grandes ${place}?`,
    unit: 'area',
  },
  {
    criterion: 'smallest',
    connector: 'mas',
    fragment: { m: 'pequenos', f: 'pequenas' },
    label: { m: 'más pequeños', f: 'más pequeñas' },
    question: (subject, place) => `¿Cuáles son ${subject} más pequeños ${place}?`,
    unit: 'area',
  },
  {
    criterion: 'best_value',
    connector: 'con',
    fragment: { m: 'mejor-precio-por-metro', f: 'mejor-precio-por-metro' },
    label: { m: 'con mejor precio por metro', f: 'con mejor precio por metro' },
    question: (subject, place) => `¿Dónde está el metro cuadrado más barato ${place}?`,
    unit: 'price_m2',
  },
  {
    criterion: 'newest',
    connector: 'mas',
    fragment: { m: 'recientes', f: 'recientes' },
    label: { m: 'más recientes', f: 'más recientes' },
    question: (subject, place) => `¿Qué se acaba de publicar ${place}?`,
    unit: 'date',
  },
];

export type LiveScope =
  | { kind: 'country' }
  | { kind: 'city'; slug: string; name: string }
  | { kind: 'province'; slug: string; name: string };

export type LiveRecipe = {
  criterion: CriterionDef;
  typeDef: TypeDef;
  opDef: OpDef | null;
  scope: LiveScope;
};

const COUNTRY_FRAGMENT = 'del-pais';
const PROVINCE_PREFIX = 'en-la-provincia-de-';

export function typeGender(typeDef: TypeDef): 'm' | 'f' {
  return TYPE_GENDER[typeDef.slug] ?? 'm';
}

function scopeFragment(scope: LiveScope): string {
  if (scope.kind === 'country') return COUNTRY_FRAGMENT;
  if (scope.kind === 'province') return `${PROVINCE_PREFIX}${scope.slug}`;
  return `en-${scope.slug}`;
}

/**
 * `terrenos-mas-baratos-en-quito`, `casas-en-venta-mas-caras-del-pais`,
 * `departamentos-con-mejor-precio-por-metro-en-la-provincia-de-pichincha`.
 */
export function buildLiveSlug(recipe: LiveRecipe): string {
  const gender = typeGender(recipe.typeDef);
  const operation = recipe.opDef ? `-en-${recipe.opDef.slug}` : '';
  const criterion = `-${recipe.criterion.connector}-${recipe.criterion.fragment[gender]}`;
  return `${recipe.typeDef.slug}${operation}${criterion}-${scopeFragment(recipe.scope)}`;
}

export type ScopeResolver = {
  city: (slug: string) => string | null;
  province: (slug: string) => string | null;
};

/**
 * Reads a slug back into its recipe, or null when it is not one.
 *
 * The place is resolved through `resolver` rather than assumed: a slug naming
 * a city nobody publishes in is not a page, and inventing it would be the
 * fastest way to fill the index with empty rankings.
 */
export function parseLiveSlug(slug: string, resolver: ScopeResolver): LiveRecipe | null {
  const typeDef = TYPE_DEFS.find((definition) => slug.startsWith(`${definition.slug}-`));
  if (!typeDef) return null;

  let rest = slug.slice(typeDef.slug.length + 1);
  const gender = typeGender(typeDef);

  let opDef: OpDef | null = null;
  for (const operation of OP_DEFS) {
    const prefix = `en-${operation.slug}-`;
    if (rest.startsWith(prefix)) {
      opDef = operation;
      rest = rest.slice(prefix.length);
      break;
    }
  }

  const criterion = CRITERION_DEFS.find((definition) =>
    rest.startsWith(`${definition.connector}-${definition.fragment[gender]}-`)
  );
  if (!criterion) return null;
  rest = rest.slice(`${criterion.connector}-${criterion.fragment[gender]}-`.length);

  const scope = parseScope(rest, resolver);
  if (!scope) return null;

  return { criterion, typeDef, opDef, scope };
}

function parseScope(fragment: string, resolver: ScopeResolver): LiveScope | null {
  if (fragment === COUNTRY_FRAGMENT) return { kind: 'country' };

  if (fragment.startsWith(PROVINCE_PREFIX)) {
    const slug = fragment.slice(PROVINCE_PREFIX.length);
    const name = resolver.province(slug);
    return name ? { kind: 'province', slug, name } : null;
  }

  if (fragment.startsWith('en-')) {
    const slug = fragment.slice(3);
    const name = resolver.city(slug);
    return name ? { kind: 'city', slug, name } : null;
  }

  return null;
}

/** «los terrenos», «las casas» — the subject the copy talks about. */
export function subjectPhrase(typeDef: TypeDef): string {
  return `${typeGender(typeDef) === 'f' ? 'las' : 'los'} ${typeDef.plural.toLowerCase()}`;
}

/** «en Quito», «en la provincia de Pichincha», «en el Ecuador». */
export function placeInPhrase(scope: LiveScope): string {
  if (scope.kind === 'country') return 'en el Ecuador';
  if (scope.kind === 'province') return `en la provincia de ${scope.name}`;
  return `en ${scope.name}`;
}

/** «de Quito», «de la provincia de Pichincha», «del Ecuador». */
export function placePhrase(scope: LiveScope): string {
  if (scope.kind === 'country') return 'del Ecuador';
  if (scope.kind === 'province') return `de la provincia de ${scope.name}`;
  return `de ${scope.name}`;
}

/** Title that states the real count, never a round number it cannot fill. */
export function liveTitle(recipe: LiveRecipe, count: number): string {
  const gender = typeGender(recipe.typeDef);
  const article = gender === 'f' ? 'Las' : 'Los';
  const operation = recipe.opDef ? ` ${recipe.opDef.label}` : '';
  return `${article} ${count} ${recipe.typeDef.plural.toLowerCase()}${operation} ${
    recipe.criterion.label[gender]
  } ${placePhrase(recipe.scope)}`;
}

/** The querystring the ranking endpoint expects for this recipe. */
export function rankingQuery(recipe: LiveRecipe, limit = 10): Record<string, string> {
  const query: Record<string, string> = {
    criterion: recipe.criterion.criterion,
    type: recipe.typeDef.type,
    limit: String(limit),
  };
  if (recipe.opDef) query.status = recipe.opDef.status;
  if (recipe.scope.kind === 'city') query.city = recipe.scope.name;
  if (recipe.scope.kind === 'province') query.province = recipe.scope.name;
  return query;
}

/**
 * Every recipe that could exist for a set of places.
 *
 * «Could», not «does»: whether each one becomes a page is decided by the
 * threshold, against live inventory, at build and revalidation time.
 */
export function enumerateRecipes(places: {
  cities: { slug: string; name: string }[];
  provinces: { slug: string; name: string }[];
}): LiveRecipe[] {
  const scopes: LiveScope[] = [
    { kind: 'country' },
    ...places.cities.map((city) => ({ kind: 'city' as const, slug: city.slug, name: city.name })),
    ...places.provinces.map((province) => ({
      kind: 'province' as const,
      slug: province.slug,
      name: province.name,
    })),
  ];

  const recipes: LiveRecipe[] = [];
  for (const criterion of CRITERION_DEFS) {
    for (const typeDef of TYPE_DEFS) {
      for (const opDef of [null, ...OP_DEFS]) {
        for (const scope of scopes) {
          recipes.push({ criterion, typeDef, opDef, scope });
        }
      }
    }
  }
  return recipes;
}

export function citySlug(name: string): string {
  return slugify(name);
}

/** The category every living page belongs to inside the blog. */
export const LIVE_CATEGORY = {
  slug: 'rankings-en-vivo',
  name: 'Rankings en vivo',
  description:
    'Listas que se recalculan solas con las propiedades publicadas: los más baratos, los más grandes, el mejor precio por metro, ciudad por ciudad.',
};

/** How many listings of a scope can take part in one criterion's ranking. */
export function sampleFor(
  row: { total: number; with_price: number; with_area: number },
  criterion: CriterionDef
): number {
  if (criterion.unit === 'date') return row.total;
  if (criterion.unit === 'area') return row.with_area;
  if (criterion.unit === 'price_m2') return Math.min(row.with_price, row.with_area);
  return row.with_price;
}

/**
 * Whether a ranking earns a place in the index, the sitemap and the listings.
 *
 * The policy comes from the API — the same one the ranking itself applies — so
 * a page can never be indexable here and not there. Below the bar the page
 * still answers; it just does not ask to be found.
 */
export function isIndexable(
  sample: number,
  criterion: CriterionDef,
  scopes: RankingScopes
): boolean {
  // An API that has not shipped the policy yet — a frontend deployed ahead of
  // its backend — falls back to the plain threshold instead of crashing the
  // whole blog. Publishing a few extra rankings for one deploy is a smaller
  // problem than a 500 on every one of them.
  const minimumIndexable = scopes.minimum_indexable ?? scopes.minimum;
  const minimumNarrow = scopes.minimum_narrow_criteria ?? scopes.minimum;
  const broad = scopes.broad_criteria ?? [];

  if (sample < minimumIndexable) return false;
  return broad.includes(criterion.criterion) || sample >= minimumNarrow;
}

type Totals = { total: number; with_price: number; with_area: number };

function addTotals(into: Map<string, Totals & { meta: any }>, key: string, meta: any, row: ScopeRow) {
  const current = into.get(key) ?? { total: 0, with_price: 0, with_area: 0, meta };
  current.total += row.total;
  current.with_price += row.with_price;
  current.with_area += row.with_area;
  into.set(key, current);
}

/**
 * Every living page worth publishing right now.
 *
 * Combines the declared recipes with live counts: a recipe becomes a page only
 * where the market can fill it *and* selecting ten from it means something.
 * The operation-less variants are summed here rather than asked for
 * separately, so one aggregation answers for all of them.
 */
export function existingRecipes(scopes: RankingScopes): LiveRecipe[] {
  const cityKeyed = new Map<string, Totals & { meta: any }>();
  const provinceKeyed = new Map<string, Totals & { meta: any }>();
  const typeKeyed = new Map<string, Totals & { meta: any }>();

  for (const row of scopes.by_city) {
    if (!row.city || !row.property_type) continue;
    addTotals(cityKeyed, `${row.city}|${row.property_type}|${row.status ?? ''}`,
      { city: row.city, type: row.property_type, status: row.status }, row);
    addTotals(cityKeyed, `${row.city}|${row.property_type}|`,
      { city: row.city, type: row.property_type, status: null }, row);
  }
  for (const row of scopes.by_province) {
    if (!row.province || !row.property_type) continue;
    addTotals(provinceKeyed, `${row.province}|${row.property_type}|${row.status ?? ''}`,
      { province: row.province, type: row.property_type, status: row.status }, row);
    addTotals(provinceKeyed, `${row.province}|${row.property_type}|`,
      { province: row.province, type: row.property_type, status: null }, row);
  }
  for (const row of scopes.by_type_status) {
    if (!row.property_type) continue;
    addTotals(typeKeyed, `${row.property_type}|${row.status ?? ''}`,
      { type: row.property_type, status: row.status }, row);
    addTotals(typeKeyed, `${row.property_type}|`, { type: row.property_type, status: null }, row);
  }

  const recipes: LiveRecipe[] = [];
  const push = (typeSlug: string, statusSlug: string | null, scope: LiveScope, totals: Totals) => {
    const typeDef = TYPE_DEFS.find((definition) => definition.type === typeSlug);
    if (!typeDef) return;
    const opDef = statusSlug ? OP_DEFS.find((definition) => definition.status === statusSlug) ?? null : null;
    if (statusSlug && !opDef) return;
    for (const criterion of CRITERION_DEFS) {
      if (!isIndexable(sampleFor(totals, criterion), criterion, scopes)) continue;
      recipes.push({ criterion, typeDef, opDef, scope });
    }
  };

  for (const entry of cityKeyed.values()) {
    push(entry.meta.type, entry.meta.status, {
      kind: 'city', slug: slugify(entry.meta.city), name: entry.meta.city,
    }, entry);
  }
  for (const entry of provinceKeyed.values()) {
    push(entry.meta.type, entry.meta.status, {
      kind: 'province', slug: slugify(entry.meta.province), name: entry.meta.province,
    }, entry);
  }
  for (const entry of typeKeyed.values()) {
    push(entry.meta.type, entry.meta.status, { kind: 'country' }, entry);
  }

  return recipes;
}

/** Resolvers built from live scopes, so a slug can only name a real place. */
/** Recipes that can be rendered at all, indexable or not. */
export function renderableRecipes(scopes: RankingScopes): LiveRecipe[] {
  const relaxed: RankingScopes = {
    ...scopes,
    minimum_indexable: scopes.minimum,
    minimum_narrow_criteria: scopes.minimum,
  };
  return existingRecipes(relaxed);
}

export function scopeResolver(scopes: RankingScopes): ScopeResolver {
  const cities = new Map<string, string>();
  const provinces = new Map<string, string>();
  for (const row of scopes.by_city) {
    if (row.city) cities.set(slugify(row.city), row.city);
    if (row.province) provinces.set(slugify(row.province), row.province);
  }
  for (const row of scopes.by_province) {
    if (row.province) provinces.set(slugify(row.province), row.province);
  }
  return {
    city: (slug) => cities.get(slug) ?? null,
    province: (slug) => provinces.get(slug) ?? null,
  };
}
