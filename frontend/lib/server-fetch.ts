/**
 * One way for the server to ask the API, with the retry every caller needs.
 *
 * Building this site prerenders more than a thousand pages against three
 * gunicorn workers, and three Next workers asking at once is enough to make the
 * backend drop connections — `UND_ERR_SOCKET`, nothing read. Each caller used
 * to swallow that on its own and return an empty list, which is how a zone page
 * decides its zone has no inventory and answers 404, and how a statistics page
 * decides a city has no market. The page then gets cached in that state.
 *
 * So: retry with room between attempts, and only on the failures that are worth
 * retrying. A 404 is an answer and comes straight back; a dropped socket, a 5xx
 * or a throttle is the backend being busy, and asking again usually works.
 *
 * Returns `null` only when every attempt failed, so the caller can tell "the
 * API said no" from "the API never answered" and decide which one deserves an
 * empty page.
 */
import { getServerApiHeaders } from '@/lib/api-url';

const RETRY_DELAYS_MS = [300, 1_200, 3_000];

function worthRetrying(status: number): boolean {
  return status >= 500 || status === 429;
}

export async function serverFetch(
  url: string,
  init?: RequestInit
): Promise<Response | null> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]));
    }
    try {
      const response = await fetch(url, {
        ...init,
        headers: { ...getServerApiHeaders(), ...(init?.headers ?? {}) },
      });
      if (response.ok || !worthRetrying(response.status)) return response;
    } catch {
      // Network-level failure: no response to inspect, so fall through and
      // try again rather than deciding the resource is empty.
    }
  }
  return null;
}
