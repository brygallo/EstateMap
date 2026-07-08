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
