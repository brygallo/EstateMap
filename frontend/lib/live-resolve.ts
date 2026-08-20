/**
 * Turns a blog slug into a living page, or says it is not one.
 *
 * Kept apart from `live-pages.ts` — which is pure and unit-tested — because
 * everything here talks to the API. The order matters: a slug is only a living
 * page after the database has been asked for an article with that name, so a
 * hand-written post always wins over a generated one.
 */
import {
  buildLiveSlug,
  existingRecipes,
  renderableRecipes,
  liveTitle,
  parseLiveSlug,
  placePhrase,
  scopeResolver,
  subjectPhrase,
  typeGender,
  type LiveRecipe,
} from '@/lib/live-pages';
import { getRanking, getRankingScopes, type Ranking } from '@/lib/rankings';
import { rankingQuery } from '@/lib/live-pages';
import { slugify } from '@/lib/properties';

export const LIVE_PAGE_LIMIT = 10;

export type LivePage = {
  recipe: LiveRecipe;
  ranking: Ranking;
  slug: string;
  /**
   * Whether the page asks to be found. False in the band where the ranking can
   * be filled but barely selects: it answers whoever lands on it and stays out
   * of the index until its market grows, the same shape SEO-001 uses.
   */
  indexable: boolean;
  siblings: { slug: string; label: string }[];
  catalogueHref: string;
  statsHref: string | null;
};

/** Same scope, other criteria: the links that turn thousands of pages into a section. */
function siblingsOf(recipe: LiveRecipe, all: LiveRecipe[]): { slug: string; label: string }[] {
  const gender = typeGender(recipe.typeDef);
  return all
    .filter(
      (candidate) =>
        candidate.typeDef.slug === recipe.typeDef.slug &&
        candidate.opDef?.slug === recipe.opDef?.slug &&
        candidate.scope.kind === recipe.scope.kind &&
        (candidate.scope.kind === 'country' ||
          (candidate.scope as any).slug === (recipe.scope as any).slug) &&
        candidate.criterion.criterion !== recipe.criterion.criterion
    )
    .map((candidate) => ({
      slug: buildLiveSlug(candidate),
      label: `${subjectPhrase(candidate.typeDef)} ${candidate.criterion.label[gender]} ${placePhrase(
        candidate.scope
      )}`.replace(/^./, (letter) => letter.toUpperCase()),
    }));
}

function catalogueHrefFor(recipe: LiveRecipe): string {
  const operation = recipe.opDef ? `-en-${recipe.opDef.slug}` : '';
  if (recipe.scope.kind === 'city') return `/${recipe.typeDef.slug}${operation}-en-${recipe.scope.slug}`;
  if (recipe.scope.kind === 'province') return `/provincias/${recipe.scope.slug}`;
  return '/propiedades';
}

/**
 * Resolves the living page behind a slug.
 *
 * Returns null when the slug is not a recipe, when the place does not exist,
 * or when the market behind it cannot fill the page. That last case is not an
 * error: it is the threshold doing its job.
 */
export async function resolveLivePage(slug: string): Promise<LivePage | null> {
  const scopes = await getRankingScopes();
  if (!scopes) return null;

  const recipe = parseLiveSlug(slug, scopeResolver(scopes));
  if (!recipe) return null;

  // Renderable and publishable are different questions: the first decides
  // whether there is a page, the second whether it belongs in the index.
  const renderable = renderableRecipes(scopes);
  if (!renderable.some((candidate) => buildLiveSlug(candidate) === slug)) return null;

  const ranking = await getRanking(rankingQuery(recipe, LIVE_PAGE_LIMIT));
  if (!ranking || !ranking.eligible || ranking.items.length === 0) return null;

  // Siblings link only to pages that ask to be found, so crawl never gets
  // pushed into the band that declared itself noindex.
  const published = existingRecipes(scopes);

  return {
    recipe,
    ranking,
    slug,
    indexable: ranking.indexable,
    siblings: siblingsOf(recipe, published),
    catalogueHref: catalogueHrefFor(recipe),
    statsHref:
      recipe.scope.kind === 'city' ? `/estadisticas-inmobiliarias/${recipe.scope.slug}` : null,
  };
}

/** Every living page that exists, newest inventory first. */
export async function listLivePages(): Promise<{ slug: string; title: string; recipe: LiveRecipe }[]> {
  const scopes = await getRankingScopes();
  if (!scopes) return [];
  return existingRecipes(scopes).map((recipe) => ({
    slug: buildLiveSlug(recipe),
    // The count is unknown until the ranking is fetched, so listings speak of
    // the criterion rather than promising a number they have not checked.
    title: liveTitle(recipe, LIVE_PAGE_LIMIT).replace(/^(Los|Las) \d+ /, (match) =>
      match.replace(/\d+ /, '')
    ),
    recipe,
  }));
}

export { slugify };
