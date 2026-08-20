import { describe, expect, it } from 'vitest';

import { articleModifiedAt } from '@/lib/blog';

/**
 * SPEC:BLOG-012 — a scheduled post never claims it changed before it existed.
 *
 * The editorial calendar writes a batch days before it publishes, so
 * `updated_at` sits in the past while `published_at` sits in the future. Both
 * fields travel verbatim from the API; only the schema has to reconcile them.
 */
const post = (published: string, updated?: string | null) =>
  ({ published_at: published, updated_at: updated }) as {
    published_at: string;
    updated_at?: string | null;
  };

describe('articleModifiedAt', () => {
  it('reports a real edit made after publication', () => {
    expect(articleModifiedAt(post('2026-07-20T13:00:00Z', '2026-08-11T20:33:18Z'))).toBe(
      '2026-08-11T20:33:18Z'
    );
  });

  it('falls back to the publication date for a scheduled post written earlier', () => {
    expect(articleModifiedAt(post('2026-08-19T13:00:00Z', '2026-08-11T20:33:18Z'))).toBe(
      '2026-08-19T13:00:00Z'
    );
  });

  it('keeps the publication date when the two coincide', () => {
    expect(articleModifiedAt(post('2026-08-19T13:00:00Z', '2026-08-19T13:00:00Z'))).toBe(
      '2026-08-19T13:00:00Z'
    );
  });

  it('survives a missing or unparseable modification date', () => {
    expect(articleModifiedAt(post('2026-08-19T13:00:00Z', null))).toBe('2026-08-19T13:00:00Z');
    expect(articleModifiedAt(post('2026-08-19T13:00:00Z', 'ayer'))).toBe('2026-08-19T13:00:00Z');
  });

  it('uses whatever date exists when the publication date is missing', () => {
    expect(articleModifiedAt(post('', '2026-08-11T20:33:18Z'))).toBe('2026-08-11T20:33:18Z');
  });
});
