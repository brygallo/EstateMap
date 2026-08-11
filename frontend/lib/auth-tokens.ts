/**
 * Single source of truth for the JWT pair stored in the browser.
 *
 * The backend rotates refresh tokens and blacklists the previous one on every
 * use (SIMPLE_JWT.ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION). That makes
 * concurrent refreshes fatal: whichever request loses the race presents a token
 * that the server has just blacklisted, gets a 401 and — before this module —
 * dropped the user back on the login screen even though the session was fine.
 *
 * Everything that refreshes goes through `refreshAccessToken()` here, which
 * serialises refreshes inside a tab, coordinates across tabs through a
 * localStorage lock, and only clears the session when the server genuinely
 * rejects a token that nobody else has rotated in the meantime.
 */

import { fetchWithTimeout } from '@/lib/form-errors';
import { getPublicApiUrl } from '@/lib/api-url';

const API_URL = getPublicApiUrl();

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'refreshToken';
const LOCK_KEY = 'authRefreshLock';

/** How long another tab's refresh is trusted before we take over. */
const LOCK_TTL_MS = 15_000;
/** How long we wait for the tab holding the lock to publish a new token. */
const LOCK_WAIT_MS = 10_000;
const LOCK_POLL_MS = 200;

type TokenListener = (accessToken: string | null) => void;

const listeners = new Set<TokenListener>();
let inFlight: Promise<string | null> | null = null;

const isBrowser = () => typeof window !== 'undefined';

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
}

/** True when the session is persistent (survives closing the tab). */
function usesLocalStorage(): boolean {
  return isBrowser() && localStorage.getItem(REFRESH_KEY) !== null;
}

export function storeTokens(accessToken: string, refreshToken: string, remember: boolean): void {
  if (!isBrowser()) return;
  // Never leave a stale pair behind in the other storage.
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);

  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_KEY, refreshToken);
  notify(accessToken);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(LOCK_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  notify(null);
}

/** Subscribe to token changes made anywhere in this tab. Returns an unsubscribe. */
export function onTokenChange(listener: TokenListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(accessToken: string | null): void {
  listeners.forEach((listener) => listener(accessToken));
}

export function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/** Milliseconds left before the access token expires, or 0 when unreadable. */
export function millisUntilExpiry(token: string): number {
  const payload = decodeJWT(token);
  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp)) return 0;
  return Math.max(exp * 1000 - Date.now(), 0);
}

/** True when the token expires within five minutes (or cannot be read). */
export function isTokenExpiringSoon(token: string): boolean {
  return millisUntilExpiry(token) < 5 * 60 * 1000;
}

function persist(accessToken: string, refreshToken: string | null): void {
  const storage = usesLocalStorage() ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    storage.setItem(REFRESH_KEY, refreshToken);
  }
  notify(accessToken);
}

function lockHeldByAnotherTab(): boolean {
  if (!usesLocalStorage()) return false;
  const raw = localStorage.getItem(LOCK_KEY);
  if (!raw) return false;
  const acquiredAt = Number(raw);
  if (!Number.isFinite(acquiredAt)) return false;
  return Date.now() - acquiredAt < LOCK_TTL_MS;
}

function acquireLock(): void {
  if (usesLocalStorage()) localStorage.setItem(LOCK_KEY, String(Date.now()));
}

function releaseLock(): void {
  if (isBrowser()) localStorage.removeItem(LOCK_KEY);
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

/**
 * Wait for the tab that owns the lock to rotate the pair. Resolves with the new
 * access token, or null if that tab never published one in time.
 */
async function waitForOtherTab(previousRefresh: string): Promise<string | null> {
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(LOCK_POLL_MS);
    const currentRefresh = getRefreshToken();
    if (!currentRefresh) return null; // The other tab logged out.
    if (currentRefresh !== previousRefresh) {
      const access = getAccessToken();
      if (access) {
        notify(access);
        return access;
      }
    }
    if (!lockHeldByAnotherTab()) break;
  }
  return null;
}

async function postRefresh(refresh: string): Promise<Response | null> {
  try {
    return await fetchWithTimeout(`${API_URL}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
  } catch {
    // Network failure or timeout: transient, never a reason to log out.
    return null;
  }
}

async function doRefresh(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  if (lockHeldByAnotherTab()) {
    const fromOtherTab = await waitForOtherTab(refresh);
    if (fromOtherTab) return fromOtherTab;
  }

  acquireLock();
  try {
    let current = getRefreshToken() || refresh;
    let response = await postRefresh(current);

    // A rejection may just mean another tab rotated the pair while we waited.
    // Retry once with whatever is stored now before giving up on the session.
    if (response && !response.ok) {
      const stored = getRefreshToken();
      if (stored && stored !== current) {
        current = stored;
        response = await postRefresh(current);
      }
    }

    if (!response) return null; // Transient: keep the session and retry later.

    if (!response.ok) {
      clearTokens();
      return null;
    }

    const data = await response.json();
    const accessToken: string | undefined = data.access;
    if (!accessToken) return null;
    persist(accessToken, data.refresh && data.refresh !== current ? data.refresh : null);
    return accessToken;
  } finally {
    releaseLock();
  }
}

/**
 * Hand the stored refresh token back to the server for blacklisting.
 *
 * Fire-and-forget: logging out must always succeed locally, so a network
 * failure only means the token dies by expiry instead of immediately.
 */
export function revokeRefreshToken(): void {
  const refresh = getRefreshToken();
  if (!refresh) return;
  void fetchWithTimeout(`${API_URL}/logout/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  }).catch(() => undefined);
}

/**
 * Exchange the stored refresh token for a fresh access token.
 *
 * Concurrent callers share a single request. Returns null when the session is
 * gone (tokens already cleared) or when the network failed, in which case the
 * stored tokens are left untouched so the next attempt can succeed.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!isBrowser()) return Promise.resolve(null);
  if (inFlight) return inFlight;
  inFlight = doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
