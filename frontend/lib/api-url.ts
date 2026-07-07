const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export function getServerApiUrl(): string {
  return process.env.NEXT_INTERNAL_API_URL || PUBLIC_API_URL;
}

export function getPublicApiUrl(): string {
  return PUBLIC_API_URL;
}
