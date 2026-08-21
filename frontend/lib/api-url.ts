// Canonical fallback for local dev: the backend is published on host port 8010
// (docker-compose maps 8010:8000) and Next has no same-origin `/api` rewrite,
// so a bare `/api` would hit the Next server itself and 404.
const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';

export function getServerApiUrl(): string {
  return process.env.NEXT_INTERNAL_API_URL || PUBLIC_API_URL;
}

export function getPublicApiUrl(): string {
  return PUBLIC_API_URL;
}

// Headers every server-side call to the API must carry.
//
// In production Django enforces `SECURE_SSL_REDIRECT`, and it decides whether a
// request is already secure from `X-Forwarded-Proto` (`SECURE_PROXY_SSL_HEADER`).
// nginx sets that header for public traffic, but the server renderer talking to
// `NEXT_INTERNAL_API_URL` reaches the backend directly over the container
// network, with no proxy in between: without this the backend answers 301 to
// `https://backend:8000`, where nothing is listening.
//
// The header is not a fiction — the page being rendered is served over HTTPS —
// and it is only sent when an internal address is configured, so the public
// fallback keeps whatever the proxy in front of it decides.
export function getServerApiHeaders(): Record<string, string> {
  return process.env.NEXT_INTERNAL_API_URL ? { 'X-Forwarded-Proto': 'https' } : {};
}
