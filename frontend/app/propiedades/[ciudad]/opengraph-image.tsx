import { ImageResponse } from 'next/og';
import { getProperties, getCities, slugify, formatPrice } from '@/lib/properties';
import { OgCard, OG_SIZE } from '@/lib/og-card';

// Imagen OG dinámica por ciudad: al compartir la landing en WhatsApp/Facebook
// se ve una tarjeta con la ciudad, el inventario y el rango de precios en vez
// del og-image.png genérico. Next prioriza este archivo sobre el metadata.

export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 3600;

export default async function Image({ params }: { params: { ciudad: string } }) {
  const { ciudad } = await params;
  const properties = await getProperties();
  const city = getCities(properties).find((c) => c.slug === ciudad);
  const cityProperties = properties.filter((p) => slugify(p.city || '') === ciudad);
  const prices = cityProperties
    .map((p) => Number.parseFloat(String(p.price)))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  const title = city ? `Propiedades en ${city.name}` : 'Propiedades en Ecuador';
  const countText = `${cityProperties.length} ${cityProperties.length === 1 ? 'propiedad disponible' : 'propiedades disponibles'}`;
  const priceText = prices.length
    ? ` · desde ${formatPrice(prices[0])} hasta ${formatPrice(prices[prices.length - 1])}`
    : '';
  const subtitle = cityProperties.length
    ? `${countText}${priceText}`
    : 'Casas, terrenos, departamentos y locales con mapa y contacto directo';

  return new ImageResponse(<OgCard title={title} subtitle={subtitle} />, size);
}
