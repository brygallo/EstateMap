import { ImageResponse } from 'next/og';
import { getProperties, formatPrice } from '@/lib/properties';
import { parseComboSlug, filterByCombo } from '@/lib/seo-combos';
import { OgCard, OG_SIZE } from '@/lib/og-card';

// Imagen OG dinámica para las landings por intención (casas-en-venta-en-quito):
// título de la búsqueda + inventario + rango de precios reales.

export const size = OG_SIZE;
export const contentType = 'image/png';
export const revalidate = 3600;

export default async function Image({ params }: { params: { combo: string } }) {
  const { combo } = await params;
  const parsed = parseComboSlug(combo);
  let title = 'Propiedades en Ecuador';
  let subtitle = 'Casas, terrenos, departamentos y locales con mapa y contacto directo';

  if (parsed) {
    const properties = await getProperties();
    const { matched, locationName } = filterByCombo(properties, parsed);
    const op = parsed.opDef ? ` ${parsed.opDef.label}` : '';
    const loc = locationName ? ` en ${locationName}` : '';
    title = `${parsed.typeDef.plural}${op}${loc}`;
    if (matched.length) {
      const prices = matched
        .map((p) => Number.parseFloat(String(p.price)))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b);
      const priceText = prices.length
        ? ` · desde ${formatPrice(prices[0])} hasta ${formatPrice(prices[prices.length - 1])}`
        : '';
      subtitle = `${matched.length} ${matched.length === 1 ? 'propiedad disponible' : 'propiedades disponibles'}${priceText}`;
    }
  }

  return new ImageResponse(<OgCard title={title} subtitle={subtitle} />, size);
}
