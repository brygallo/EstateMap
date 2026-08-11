import { MetadataRoute } from 'next';
import { getAllProperties, getCities, getProvinces, slugify, SITE_URL, Property } from '@/lib/properties';
import { generateCombos, MIN_LOCATION_PROPERTIES, parseComboSlug } from '@/lib/seo-combos';
import { authorSlug, getBlogCategories, getBlogPosts, MIN_POSTS_FOR_INDEXING } from '@/lib/blog';
import { MIN_LISTINGS_FOR_PROMOTION } from '@/lib/market-stats';

// Nota: las imágenes por propiedad se publican en un sitemap de imágenes aparte
// (app/image-sitemap.xml/route.ts), porque el campo `images` de
// MetadataRoute.Sitemap solo existe desde Next 15 y aquí usamos Next 14.

export const revalidate = 3600;

const TYPE_ROUTES = [
  '/casas-en-venta',
  '/departamentos-en-alquiler',
  '/terrenos-en-venta',
  '/locales-comerciales',
];

function propertyDate(p: Property): Date | null {
  const raw = p.updated_at || p.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function latestDate(dates: (Date | null)[], fallback: Date): Date {
  let latest: Date | null = null;
  for (const d of dates) {
    if (d && (!latest || d > latest)) latest = d;
  }
  return latest || fallback;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [properties, blog, blogCategories] = await Promise.all([
    getAllProperties(),
    getBlogPosts({ limit: 60 }),
    getBlogCategories(),
  ]);

  // `lastmod` honesto: la última vez que cambió el inventario, global y por
  // ubicación. Declarar "ahora" en cada request hace que Google ignore el
  // campo; con fechas reales prioriza recrawlear lo que sí cambió.
  const globalLatest = latestDate(properties.map(propertyDate), now);
  const locationLatest = new Map<string, Date>();
  for (const p of properties) {
    const d = propertyDate(p);
    if (!d) continue;
    for (const loc of [p.city, p.province]) {
      const slug = (loc || '').trim() ? slugify(loc as string) : '';
      if (!slug) continue;
      const current = locationLatest.get(slug);
      if (!current || d > current) locationLatest.set(slug, d);
    }
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: globalLatest, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/propiedades`, lastModified: globalLatest, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/ayuda`, lastModified: globalLatest, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/publicar-propiedad`, lastModified: globalLatest, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/publicar-asistido`, lastModified: globalLatest, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/inmobiliarias`, lastModified: globalLatest, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/estadisticas-inmobiliarias`, lastModified: globalLatest, changeFrequency: 'daily', priority: 0.8 },
    ...TYPE_ROUTES.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: globalLatest,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];

  // The blog moves on its own schedule — posts publish themselves — so its
  // `lastmod` comes from the articles' own dates, not from the inventory.
  // Categories below MIN_POSTS_FOR_INDEXING are left out for the same reason
  // sector landings are: a page holding one article competes with it.
  const blogLatest = latestDate(
    blog.results.map((post) => new Date(post.updated_at || post.published_at)),
    now
  );
  const blogRoutes: MetadataRoute.Sitemap = blog.results.length
    ? [
        { url: `${SITE_URL}/blog`, lastModified: blogLatest, changeFrequency: 'daily', priority: 0.75 },
        ...blog.results.map((post) => ({
          url: `${SITE_URL}/blog/${post.slug}`,
          lastModified: new Date(post.updated_at || post.published_at),
          changeFrequency: 'monthly' as const,
          priority: 0.65,
        })),
        ...blogCategories
          .filter((category) => (category.post_count ?? 0) >= MIN_POSTS_FOR_INDEXING)
          .map((category) => ({
            url: `${SITE_URL}/blog/categoria/${category.slug}`,
            lastModified: blogLatest,
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          })),
        // Author pages: every Article schema points at one, so leaving them out
        // of the sitemap would mean asserting an entity we never offer to be
        // crawled. Derived from the bylines because there is no author endpoint.
        ...Array.from(
          new Set(blog.results.map((post) => post.author_slug).filter(Boolean))
        ).map((slug) => ({
          url: `${SITE_URL}/blog/autor/${slug}`,
          lastModified: blogLatest,
          changeFrequency: 'weekly' as const,
          priority: 0.5,
        })),
      ]
    : [];

  const authorRoutes: MetadataRoute.Sitemap = Array.from(
    new Map(
      blog.results
        .filter((post) => post.author_name)
        .map((post) => [authorSlug(post.author_name), post] as const)
    ).values()
  ).map((post) => ({
    url: `${SITE_URL}/blog/autor/${authorSlug(post.author_name)}`,
    lastModified: new Date(post.updated_at || post.published_at),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const propertyRoutes: MetadataRoute.Sitemap = properties.map((property) => ({
    url: `${SITE_URL}/propiedad/${property.id}`,
    lastModified: property.updated_at || property.created_at || now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const cityRoutes: MetadataRoute.Sitemap = getCities(properties)
    .filter((city) => city.count >= MIN_LOCATION_PROPERTIES)
    .map((city) => ({
    url: `${SITE_URL}/propiedades/${city.slug}`,
    lastModified: locationLatest.get(city.slug) || globalLatest,
    changeFrequency: 'daily',
    priority: 0.7,
    }));

  // Per-city m² price pages. Counted over comparable sale inventory (the same
  // population the stats API uses) and gated stricter than the page's own
  // noindex threshold, so the sitemap never advertises a noindex URL.
  const statsCityRoutes: MetadataRoute.Sitemap = getCities(
    properties.filter(
      (p) => p.status === 'for_sale' && Number(p.price) > 0 && Number(p.area) > 0
    )
  )
    .filter((city) => city.count >= MIN_LISTINGS_FOR_PROMOTION)
    .map((city) => ({
      url: `${SITE_URL}/estadisticas-inmobiliarias/${city.slug}`,
      lastModified: locationLatest.get(city.slug) || globalLatest,
      changeFrequency: 'daily' as const,
      priority: 0.75,
    }));

  const provinceRoutes: MetadataRoute.Sitemap = getProvinces(properties)
    .filter((province) => province.count >= MIN_LOCATION_PROPERTIES)
    .map((province) => ({
    url: `${SITE_URL}/provincias/${province.slug}`,
    lastModified: locationLatest.get(province.slug) || globalLatest,
    changeFrequency: 'daily',
    priority: 0.72,
    }));

  // Landings por combinación tipo + operación + ubicación (SEO local).
  const comboRoutes: MetadataRoute.Sitemap = generateCombos(properties).map(({ combo }) => {
    const parsed = parseComboSlug(combo);
    const locSlug = parsed?.locationSlug || '';
    return {
      url: `${SITE_URL}/${combo}`,
      lastModified: locationLatest.get(locSlug) || globalLatest,
      changeFrequency: 'daily',
      priority: 0.7,
    };
  });

  return [...staticRoutes, ...blogRoutes, ...authorRoutes, ...propertyRoutes, ...cityRoutes, ...statsCityRoutes, ...provinceRoutes, ...comboRoutes];
}
