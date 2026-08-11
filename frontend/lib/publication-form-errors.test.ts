import { describe, expect, it } from 'vitest';

import {
  publicationApiErrorStep,
  publicationErrorReport,
  publicationFormError,
  publicationFormErrorFields,
} from '@/lib/publication-form-errors';

describe('publication form errors', () => {
  it('returns the message and step for a hidden client-side field', () => {
    expect(publicationFormError({ title: { message: 'El título es obligatorio' } })).toEqual({
      message: 'El título es obligatorio',
      step: 0,
    });
  });

  it('maps API field names to their wizard step', () => {
    expect(publicationApiErrorStep({ built_area: ['Debe ser un número.'] })).toBe(2);
    expect(publicationApiErrorStep({ price: ['Este campo es obligatorio.'] })).toBe(3);
  });
});

describe('publication error report', () => {
  it('names every rejected field and keeps its message', () => {
    const report = publicationErrorReport(
      { price: ['Este campo es obligatorio.'], area: ['Debe ser mayor a 0.'] },
      'price: Este campo es obligatorio.'
    );

    expect(report.error_message).toBe('price: Este campo es obligatorio.');
    expect(report.error_fields).toBe('price, area');
    expect(report.error_detail).toBe('price: Este campo es obligatorio. · area: Debe ser mayor a 0.');
  });

  it('reports a global error without inventing a field name', () => {
    const report = publicationErrorReport(
      { detail: 'Verifica tu correo antes de publicar.', code: 'email_not_verified' },
      'Verifica tu correo antes de publicar.'
    );

    expect(report.error_fields).toBe('');
    expect(report.error_detail).toBe('Verifica tu correo antes de publicar.');
    expect(report.error_code).toBe('email_not_verified');
  });

  it('keeps the shown message when the body carries nothing usable', () => {
    const report = publicationErrorReport(null, 'El servidor no pudo completar la solicitud.');

    expect(report).toEqual({
      error_message: 'El servidor no pudo completar la solicitud.',
      error_fields: '',
      error_detail: '',
      error_code: '',
    });
  });

  it('truncates a message long enough to bloat the event payload', () => {
    const report = publicationErrorReport({}, 'x'.repeat(400));

    expect(report.error_message).toHaveLength(300);
    expect(report.error_message.endsWith('…')).toBe(true);
  });

  it('lists the fields the client-side validation rejected', () => {
    expect(publicationFormErrorFields({ title: {}, price: {} })).toBe('title, price');
    expect(publicationFormErrorFields(undefined)).toBe('');
  });
});
