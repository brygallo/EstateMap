import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchWithTimeout = vi.fn();

vi.mock('@/lib/form-errors', () => ({
  fetchWithTimeout: (...args: unknown[]) => fetchWithTimeout(...args),
}));

vi.mock('@/lib/api-url', () => ({
  getPublicApiUrl: () => 'https://api.test/api',
}));

const jsonResponse = (body: unknown) => ({
  ok: true,
  json: async () => body,
});

const errorResponse = (status = 401) => ({
  ok: false,
  status,
  json: async () => ({ detail: 'Token is invalid or expired' }),
});

async function loadModule() {
  vi.resetModules();
  return import('@/lib/auth-tokens');
}

describe('auth token refresh', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchWithTimeout.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shares a single request between concurrent callers', async () => {
    const { refreshAccessToken, storeTokens } = await loadModule();
    storeTokens('access-old', 'refresh-old', true);
    fetchWithTimeout.mockResolvedValue(
      jsonResponse({ access: 'access-new', refresh: 'refresh-new' })
    );

    const results = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    // A second request would present a refresh token the server just
    // blacklisted, and the loser of that race used to be logged out.
    expect(fetchWithTimeout).toHaveBeenCalledTimes(1);
    expect(results).toEqual(['access-new', 'access-new', 'access-new']);
    expect(localStorage.getItem('token')).toBe('access-new');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-new');
  });

  it('keeps the session when the network fails', async () => {
    const { refreshAccessToken, storeTokens } = await loadModule();
    storeTokens('access-old', 'refresh-old', true);
    fetchWithTimeout.mockRejectedValue(new Error('network down'));

    expect(await refreshAccessToken()).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBe('refresh-old');
  });

  it('clears the session when the server rejects the refresh token', async () => {
    const { refreshAccessToken, storeTokens } = await loadModule();
    storeTokens('access-old', 'refresh-old', true);
    fetchWithTimeout.mockResolvedValue(errorResponse());

    expect(await refreshAccessToken()).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  it('retries with the token another tab rotated instead of logging out', async () => {
    const { refreshAccessToken, storeTokens } = await loadModule();
    storeTokens('access-old', 'refresh-old', true);

    fetchWithTimeout
      .mockImplementationOnce(async () => {
        // Another tab rotated the pair while this request was in flight.
        localStorage.setItem('refreshToken', 'refresh-from-other-tab');
        return errorResponse();
      })
      .mockResolvedValueOnce(jsonResponse({ access: 'access-new', refresh: 'refresh-new' }));

    expect(await refreshAccessToken()).toBe('access-new');
    expect(JSON.parse(fetchWithTimeout.mock.calls[1][1].body)).toEqual({
      refresh: 'refresh-from-other-tab',
    });
    expect(localStorage.getItem('token')).toBe('access-new');
  });

  it('does not persist a session-only login in localStorage', async () => {
    const { storeTokens, getRefreshToken } = await loadModule();
    storeTokens('access', 'refresh', false);

    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(sessionStorage.getItem('refreshToken')).toBe('refresh');
    expect(getRefreshToken()).toBe('refresh');
  });

  it('notifies subscribers when the token changes', async () => {
    const { onTokenChange, storeTokens, clearTokens } = await loadModule();
    const seen: (string | null)[] = [];
    const unsubscribe = onTokenChange((t) => seen.push(t));

    storeTokens('access', 'refresh', true);
    clearTokens();
    unsubscribe();
    storeTokens('ignored', 'ignored', true);

    expect(seen).toEqual(['access', null]);
  });
});
