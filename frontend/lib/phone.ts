/** Normaliza teléfonos ecuatorianos para enlaces tel: y wa.me. */
export function normalizeEcuadorPhone(value: unknown): string {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits) return '';
  if (digits.startsWith('593')) return digits;
  if (digits.startsWith('0')) return `593${digits.slice(1)}`;
  if (digits.length === 9) return `593${digits}`;
  return digits;
}

export function ecuadorPhoneHref(value: unknown): string {
  const normalized = normalizeEcuadorPhone(value);
  return normalized ? `+${normalized}` : '';
}
