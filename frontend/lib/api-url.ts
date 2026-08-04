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
