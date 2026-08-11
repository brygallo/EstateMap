/**
 * Constantes de contacto de la marca. Centralizadas para evitar números de
 * WhatsApp divergentes repartidos por el código (antes había un fallback falso
 * `593999999999` en Inmobiliarias distinto del número real del resto del sitio).
 */

// Número comercial de WhatsApp (solo dígitos, con código de país). Configurable
// por entorno; el fallback es el número real de Geo Propiedades Ecuador.
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '593983738151';

/** Construye un enlace wa.me con el mensaje indicado ya codificado. */
export function buildWhatsAppUrl(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/**
 * Perfiles oficiales de la marca. Son la única fuente de `sameAs` en el
 * Organization de schema.org y de los iconos del footer, para que no vuelvan a
 * divergir: el footer enlazaba a `facebook.com` e `instagram.com` a secas
 * (portadas genéricas, no perfiles) y el grafo no declaraba ninguno.
 *
 * Solo entran perfiles que existen y publican. Un `sameAs` a una cuenta vacía o
 * inexistente no consolida la entidad, la contradice.
 */
export const SOCIAL_PROFILES = [
  {
    network: 'facebook',
    label: 'Facebook',
    url: 'https://www.facebook.com/people/GEO-Propiedades-Ecuador/61584860667586/',
  },
  {
    network: 'tiktok',
    label: 'TikTok',
    url: 'https://www.tiktok.com/@geopropiedadesecuador',
  },
] as const;

/** URLs de los perfiles oficiales, en el formato que espera `sameAs`. */
export const SOCIAL_PROFILE_URLS = SOCIAL_PROFILES.map((profile) => profile.url);
