import { MetadataRoute } from 'next';
import { getProperties, getCities, getProvinces, slugify, SITE_URL, Property } from '@/lib/properties';
import { generateCombos, parseComboSlug } from '@/lib/seo-combos';

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
  const properties = await getProperties();

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
    ...TYPE_ROUTES.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: globalLatest,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];

  const propertyRoutes: MetadataRoute.Sitemap = properties.map((property) => ({
    url: `${SITE_URL}/propiedad/${property.id}`,
    lastModified: property.updated_at || property.created_at || now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const cityRoutes: MetadataRoute.Sitemap = getCities(properties).map((city) => ({
    url: `${SITE_URL}/propiedades/${city.slug}`,
    lastModified: locationLatest.get(city.slug) || globalLatest,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  const provinceRoutes: MetadataRoute.Sitemap = getProvinces(properties).map((province) => ({
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

  return [...staticRoutes, ...propertyRoutes, ...cityRoutes, ...provinceRoutes, ...comboRoutes];
}
