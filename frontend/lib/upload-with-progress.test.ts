import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { uploadWithProgress } from '@/lib/upload-with-progress';

/**
 * A hand-driven XMLHttpRequest.
 *
 * The point of this module is what happens over time — bytes trickling out, a
 * connection going quiet — so the test needs to decide when each event fires.
 */
class FakeXHR {
  static last: FakeXHR;

  upload = new EventTarget();
  status = 0;
  statusText = '';
  response: unknown = null;
  responseType = '';
  aborted = false;
  sentBody: unknown = null;
  openedWith: { method: string; url: string } | null = null;
  headers: Record<string, string> = {};

  private listeners = new EventTarget();

  constructor() {
    FakeXHR.last = this;
  }

  open(method: string, url: string) {
    this.openedWith = { method, url };
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body: unknown) {
    this.sentBody = body;
  }

  abort() {
    this.aborted = true;
    this.listeners.dispatchEvent(new Event('abort'));
  }

  addEventListener(type: string, handler: EventListener) {
    this.listeners.addEventListener(type, handler);
  }

  getAllResponseHeaders() {
    return 'content-type: application/json\r\nx-request-id: req-9';
  }

  /* --- helpers the test drives --- */

  emitUploadProgress(loaded: number, total: number) {
    const event = new Event('progress') as Event & {
      loaded: number;
      total: number;
      lengthComputable: boolean;
    };
    event.loaded = loaded;
    event.total = total;
    event.lengthComputable = true;
    this.upload.dispatchEvent(event);
  }

  // The browser hands back a Blob here; this fake uses the string it wraps,
  // because jsdom's Blob and the Response implementation under test come from
  // different worlds and do not interoperate.
  finish(status: number, body: string) {
    this.status = status;
    this.statusText = '';
    this.response = body;
    this.listeners.dispatchEvent(new Event('load'));
  }

  failWithNetworkError() {
    this.listeners.dispatchEvent(new Event('error'));
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('XMLHttpRequest', FakeXHR);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('uploadWithProgress', () => {
  it('reports how much of the body has left the device', async () => {
    const seen: (number | null)[] = [];
    const pending = uploadWithProgress('/api/properties/', new FormData(), {
      onProgress: ({ percent }) => seen.push(percent),
    });

    FakeXHR.last.emitUploadProgress(250, 1000);
    FakeXHR.last.emitUploadProgress(1000, 1000);
    FakeXHR.last.finish(201, '{"id":7}');

    const response = await pending;
    expect(seen).toEqual([25, 100]);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 7 });
  });

  it('keeps a slow upload alive as long as bytes keep moving', async () => {
    const pending = uploadWithProgress('/api/properties/', new FormData(), {
      idleTimeoutMs: 1_000,
    });

    // Five minutes of steady progress: far past any fixed deadline, and exactly
    // the case that used to be cancelled on every mobile publication.
    for (let elapsed = 0; elapsed < 300_000; elapsed += 900) {
      vi.advanceTimersByTime(900);
      FakeXHR.last.emitUploadProgress(elapsed, 300_000);
    }

    expect(FakeXHR.last.aborted).toBe(false);
    FakeXHR.last.finish(201, '{}');
    await expect(pending).resolves.toMatchObject({ status: 201 });
  });

  it('gives up when the connection goes quiet', async () => {
    const pending = uploadWithProgress('/api/properties/', new FormData(), {
      idleTimeoutMs: 1_000,
    });
    const settled = expect(pending).rejects.toMatchObject({ name: 'AbortError' });

    vi.advanceTimersByTime(1_100);

    expect(FakeXHR.last.aborted).toBe(true);
    await settled;
  });

  it('surfaces a dropped connection the way fetch does', async () => {
    const pending = uploadWithProgress('/api/properties/', new FormData());
    const settled = expect(pending).rejects.toBeInstanceOf(TypeError);

    FakeXHR.last.failWithNetworkError();
    await settled;
  });

  it('passes headers through but never sets the multipart content type', async () => {
    const pending = uploadWithProgress('/api/properties/', new FormData(), {
      headers: { 'Idempotency-Key': 'abc', 'Content-Type': 'application/json' },
    });

    expect(FakeXHR.last.headers).toEqual({ 'Idempotency-Key': 'abc' });

    FakeXHR.last.finish(200, '{}');
    await pending;
  });

  it('carries the response headers back to the caller', async () => {
    const pending = uploadWithProgress('/api/properties/', new FormData());
    FakeXHR.last.finish(400, '{}');

    const response = await pending;
    expect(response.headers.get('x-request-id')).toBe('req-9');
  });
});
