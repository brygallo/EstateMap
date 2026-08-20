import { describe, expect, it } from 'vitest';

import {
  buildLiveSlug,
  CRITERION_DEFS,
  existingRecipes,
  liveTitle,
  parseLiveSlug,
  scopeResolver,
  type LiveRecipe,
} from '@/lib/live-pages';
import { OP_DEFS, TYPE_DEFS } from '@/lib/seo-combos';
import type { RankingScopes } from '@/lib/rankings';

/**
 * SPEC:LIVE-002 — a slug is a recipe, and a recipe is a slug.
 *
 * The whole system rests on this being reversible: one declaration becomes a
 * page in every city that can fill it, and no table has to be kept in sync.
 */
const criterion = (slug: string) => CRITERION_DEFS.find((definition) => definition.criterion === slug)!;
const type = (slug: string) => TYPE_DEFS.find((definition) => definition.slug === slug)!;
const operation = (slug: string) => OP_DEFS.find((definition) => definition.slug === slug)!;

const resolver = scopeResolver({
  minimum: 10,
  minimum_indexable: 20,
  minimum_narrow_criteria: 50,
  broad_criteria: ['cheapest', 'largest'],
  country: { total: 100, with_price: 100, with_area: 100 },
  by_type: [],
  by_type_status: [],
  by_city: [
    { city: 'Quito', province: 'Pichincha', property_type: 'land', status: 'for_sale', total: 40, with_price: 40, with_area: 40 },
    { city: 'Cuenca', province: 'Azuay', property_type: 'house', status: 'for_sale', total: 20, with_price: 20, with_area: 20 },
  ],
  by_province: [],
} as RankingScopes);

describe('buildLiveSlug', () => {
  it('names a city ranking', () => {
    const recipe: LiveRecipe = {
      criterion: criterion('cheapest'),
      typeDef: type('terrenos'),
      opDef: null,
      scope: { kind: 'city', slug: 'quito', name: 'Quito' },
    };
    expect(buildLiveSlug(recipe)).toBe('terrenos-mas-baratos-en-quito');
  });

  it('agrees in gender with the property type', () => {
    const recipe: LiveRecipe = {
      criterion: criterion('cheapest'),
      typeDef: type('casas'),
      opDef: operation('venta'),
      scope: { kind: 'city', slug: 'cuenca', name: 'Cuenca' },
    };
    expect(buildLiveSlug(recipe)).toBe('casas-en-venta-mas-baratas-en-cuenca');
  });

  it('names the country and the provinces without colliding with a city', () => {
    const country: LiveRecipe = {
      criterion: criterion('largest'),
      typeDef: type('terrenos'),
      opDef: null,
      scope: { kind: 'country' },
    };
    const province: LiveRecipe = {
      criterion: criterion('best_value'),
      typeDef: type('departamentos'),
      opDef: null,
      scope: { kind: 'province', slug: 'pichincha', name: 'Pichincha' },
    };
    expect(buildLiveSlug(country)).toBe('terrenos-mas-grandes-del-pais');
    expect(buildLiveSlug(province)).toBe(
      'departamentos-con-mejor-precio-por-metro-en-la-provincia-de-pichincha'
    );
  });
});

describe('parseLiveSlug', () => {
  it('reads back every slug it writes', () => {
    const recipes: LiveRecipe[] = [
      { criterion: criterion('cheapest'), typeDef: type('terrenos'), opDef: null, scope: { kind: 'city', slug: 'quito', name: 'Quito' } },
      { criterion: criterion('smallest'), typeDef: type('casas'), opDef: operation('alquiler'), scope: { kind: 'city', slug: 'cuenca', name: 'Cuenca' } },
      { criterion: criterion('newest'), typeDef: type('locales-comerciales'), opDef: null, scope: { kind: 'country' } },
    ];

    for (const recipe of recipes) {
      const parsed = parseLiveSlug(buildLiveSlug(recipe), resolver);
      expect(parsed).not.toBeNull();
      expect(parsed!.criterion.criterion).toBe(recipe.criterion.criterion);
      expect(parsed!.typeDef.slug).toBe(recipe.typeDef.slug);
      expect(parsed!.opDef?.slug ?? null).toBe(recipe.opDef?.slug ?? null);
      expect(parsed!.scope.kind).toBe(recipe.scope.kind);
    }
  });

  it('refuses a place nobody publishes in', () => {
    expect(parseLiveSlug('terrenos-mas-baratos-en-narnia', resolver)).toBeNull();
  });

  it('refuses a criterion nobody declared', () => {
    // SPEC:LIVE-009 — «los más vistos» is not a page, by design.
    expect(parseLiveSlug('terrenos-mas-vistos-en-quito', resolver)).toBeNull();
  });

  it('refuses a slug that is an ordinary article', () => {
    expect(parseLiveSlug('como-comprar-una-propiedad-en-ecuador', resolver)).toBeNull();
  });

  it('refuses the wrong gender, so one page has exactly one address', () => {
    expect(parseLiveSlug('casas-mas-baratos-en-cuenca', resolver)).toBeNull();
    expect(parseLiveSlug('terrenos-mas-baratas-en-quito', resolver)).toBeNull();
  });
});

describe('existingRecipes', () => {
  const scopes = (row: Partial<RankingScopes['by_city'][number]>): RankingScopes =>
    ({
      minimum: 10,
      minimum_indexable: 20,
      minimum_narrow_criteria: 50,
      broad_criteria: ['cheapest', 'largest'],
      country: { total: 0, with_price: 0, with_area: 0 },
      by_type: [],
      by_type_status: [],
      by_city: [
        {
          city: 'Quito',
          province: 'Pichincha',
          property_type: 'land',
          status: 'for_sale',
          total: 30,
          with_price: 30,
          with_area: 30,
          ...row,
        },
      ],
      by_province: [],
    }) as RankingScopes;

  it('publishes every criterion in a deep market', () => {
    // SPEC:LIVE-004 — fifty listings is a market: every cut describes a segment.
    const recipes = existingRecipes(scopes({ total: 60, with_price: 60, with_area: 60 }));
    const cityRecipes = recipes.filter((recipe) => recipe.scope.kind === 'city');
    // Six criteria, twice: with the operation and without it.
    expect(cityRecipes).toHaveLength(CRITERION_DEFS.length * 2);
  });

  it('publishes only the broad criteria in a shallow one', () => {
    // SPEC:LIVE-017 — «los más pequeños» over twenty listings is a curiosity.
    const recipes = existingRecipes(scopes({ total: 25, with_price: 25, with_area: 25 }));
    const criteria = new Set(recipes.map((recipe) => recipe.criterion.criterion));
    expect([...criteria].sort()).toEqual(['cheapest', 'largest']);
  });

  it('publishes nothing where a ranking would be the catalogue reordered', () => {
    // SPEC:LIVE-017 — ten out of ten is not a selection.
    expect(existingRecipes(scopes({ total: 12, with_price: 12, with_area: 12 }))).toHaveLength(0);
    expect(existingRecipes(scopes({ total: 9, with_price: 9, with_area: 9 }))).toHaveLength(0);
  });

  it('does not rank by area where the listings have none', () => {
    const recipes = existingRecipes(scopes({ total: 60, with_price: 60, with_area: 2 }));
    const criteria = new Set(recipes.map((recipe) => recipe.criterion.criterion));
    expect(criteria.has('cheapest')).toBe(true);
    expect(criteria.has('largest')).toBe(false);
    expect(criteria.has('best_value')).toBe(false);
  });
});

describe('liveTitle', () => {
  it('states the count it really has', () => {
    // SPEC:LIVE-005 — seven results are never announced as a top ten.
    const recipe: LiveRecipe = {
      criterion: criterion('cheapest'),
      typeDef: type('terrenos'),
      opDef: operation('venta'),
      scope: { kind: 'city', slug: 'quito', name: 'Quito' },
    };
    expect(liveTitle(recipe, 7)).toBe('Los 7 terrenos en venta más baratos de Quito');
    expect(liveTitle(recipe, 10)).toBe('Los 10 terrenos en venta más baratos de Quito');
  });
});
