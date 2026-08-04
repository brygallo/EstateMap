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
