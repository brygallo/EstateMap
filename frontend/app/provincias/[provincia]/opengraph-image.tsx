import { ImageResponse } from 'next/og';
import { getProperties, getProvinces, slugify, formatPrice } from '@/lib/properties';
import { OgCard, OG_SIZE } from '@/lib/og-card';

// Imagen OG dinámica por provincia (misma tarjeta que las landings de ciudad).

export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 3600;

export default async function Image({ params }: { params: { provincia: string } }) {
  const { provincia } = await params;
  const properties = await getProperties();
  const province = getProvinces(properties).find((p) => p.slug === provincia);
  const provinceProperties = properties.filter(
    (p) => slugify(p.province || '') === provincia
  );
  const prices = provinceProperties
    .map((p) => Number.parseFloat(String(p.price)))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  const title = province ? `Propiedades en ${province.name}` : 'Propiedades en Ecuador';
  const countText = `${provinceProperties.length} ${provinceProperties.length === 1 ? 'propiedad disponible' : 'propiedades disponibles'}`;
  const priceText = prices.length
    ? ` · desde ${formatPrice(prices[0])} hasta ${formatPrice(prices[prices.length - 1])}`
    : '';
  const subtitle = provinceProperties.length
    ? `${countText}${priceText}`
    : 'Casas, terrenos, departamentos y locales con mapa y contacto directo';

  return new ImageResponse(
    <OgCard title={title} subtitle={subtitle} badge="Provincia" />,
    size
  );
}
