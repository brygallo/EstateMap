import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://estatemap.com';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

type PropertySitemapItem = {
  id: number | string;
  updated_at?: string;
  created_at?: string;
};

async function fetchProperties(): Promise<PropertySitemapItem[]> {
  try {
    const response = await fetch(`${apiUrl}/properties/`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching properties for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/help`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  const properties = await fetchProperties();
  const propertyRoutes: MetadataRoute.Sitemap = properties.map((property) => ({
    url: `${siteUrl}/property/${property.id}`,
    lastModified: property.updated_at || property.created_at || now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...propertyRoutes];
}
