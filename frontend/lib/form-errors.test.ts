import { describe, expect, it } from 'vitest';

import { requestErrorMessage, responseErrorMessage } from '@/lib/form-errors';

describe('responseErrorMessage', () => {
  it('keeps server details private for server errors', async () => {
    const response = new Response(JSON.stringify({ detail: 'database password leaked' }), {
      status: 500,
      headers: { 'content-type': 'application/json', 'x-request-id': 'req-123' },
    });

    const message = await responseErrorMessage(response, 'No se pudo completar.');
    expect(message).not.toContain('database password leaked');
    expect(message).toContain('req-123');
  });

  it('returns a useful network error', () => {
    expect(requestErrorMessage(new TypeError('offline'), 'publicar')).toContain('internet');
  });
});

describe('field labels in API errors', () => {
  it('names the field the way the interface names it', async () => {
    const response = new Response(
      JSON.stringify({ title: ['Asegúrese de que este campo no tenga más de 150 caracteres.'] }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );

    const message = await responseErrorMessage(response, 'No se pudo guardar.');
    expect(message).toContain('Título:');
    expect(message).not.toContain('title:');
  });

  it('falls back to the raw name when a field has no label', async () => {
    const response = new Response(JSON.stringify({ some_new_field: ['Valor inválido.'] }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });

    expect(await responseErrorMessage(response, 'fallback')).toContain('some new field:');
  });

  it('does not prefix errors that belong to no field', async () => {
    const response = new Response(JSON.stringify({ detail: 'Petición inválida.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });

    expect(await responseErrorMessage(response, 'fallback')).toBe('Petición inválida.');
  });
});
