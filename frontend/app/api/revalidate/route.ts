import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

// On-demand cache invalidation, called by a Django Celery task right after a
// property (or market stats) changes, so pages don't have to wait out their
// time-based `revalidate` TTL (up to 1h) to pick up the change.
//
// Contract: POST http://frontend:3000/api/revalidate
//   Header: x-revalidate-secret: <REVALIDATE_SECRET>
//   Body:   { "tags": ["properties", "property-123"] }

const MAX_TAGS = 50;

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    // Feature disabled: no secret configured on this deployment.
    return NextResponse.json({ error: 'Revalidation is not configured' }, { status: 503 });
  }

  const providedSecret = request.headers.get('x-revalidate-secret');
  if (providedSecret !== secret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const tags = (body as { tags?: unknown })?.tags;
  const isValid =
    Array.isArray(tags) &&
    tags.length > 0 &&
    tags.length <= MAX_TAGS &&
    tags.every((tag) => typeof tag === 'string' && tag.length > 0);
  if (!isValid) {
    return NextResponse.json(
      { error: `\`tags\` must be a non-empty array of strings (max ${MAX_TAGS})` },
      { status: 400 }
    );
  }

  for (const tag of tags as string[]) {
    revalidateTag(tag, 'max');
  }

  return NextResponse.json({ revalidated: true, tags });
}
