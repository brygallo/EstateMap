import { describe, expect, it } from 'vitest';

import { detectPhoneSegments } from '@/lib/phone-detect';

describe('detectPhoneSegments', () => {
  it('detects and normalizes an Ecuadorian mobile number', () => {
    const segments = detectPhoneSegments('Contacto: 099 123 4567 hoy');

    expect(segments).toEqual([
      { type: 'text', value: 'Contacto: ' },
      { type: 'phone', value: '099 123 4567', normalized: '593991234567' },
      { type: 'text', value: ' hoy' },
    ]);
  });

  it('does not classify prices or areas as phones', () => {
    const text = 'Precio 150.000 y terreno de 2024 m2';
    expect(detectPhoneSegments(text)).toEqual([{ type: 'text', value: text }]);
  });

  it('preserves the original text when several numbers are present', () => {
    const text = '0991234567 0987654321';
    const segments = detectPhoneSegments(text);
    expect(segments.map((segment) => segment.value).join('')).toBe(text);
    expect(segments.filter((segment) => segment.type === 'phone')).toHaveLength(2);
  });
});
