import { MetadataRoute } from 'next';
import { getProperties, getCities, SITE_URL } from '@/lib/properties';
import { generateCombos } from '@/lib/seo-combos';

export const revalidate = 3600;

const TYPE_ROUTES = [
  '/casas-en-venta',
  '/departamentos-en-alquiler',
  '/terrenos-en-venta',
  '/locales-comerciales',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/ayuda`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/publicar-asistido`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/inmobiliarias`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    ...TYPE_ROUTES.map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
  ];

  const properties = await getProperties();

  const propertyRoutes: MetadataRoute.Sitemap = properties.map((property) => ({
    url: `${SITE_URL}/propiedad/${property.id}`,
    lastModified: property.updated_at || property.created_at || now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const cityRoutes: MetadataRoute.Sitemap = getCities(properties).map((city) => ({
    url: `${SITE_URL}/propiedades/${city.slug}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  // Landings por combinación tipo + operación + ubicación (SEO local).
  const comboRoutes: MetadataRoute.Sitemap = generateCombos(properties).map(({ combo }) => ({
    url: `${SITE_URL}/${combo}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...staticRoutes, ...propertyRoutes, ...cityRoutes, ...comboRoutes];
}
