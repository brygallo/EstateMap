/**
 * A multipart POST that reports how much of the body has left the device.
 *
 * `fetch` cannot do this: it exposes no upload progress and, worse for us, the
 * publishing form used to run its uploads through a blanket 30 s abort. Fifty
 * megabytes is the documented ceiling for a listing's photos, and on the mobile
 * uplink most owners publish from, that transfer is measured in minutes. Every
 * one of those publications was aborted mid-body, told "tardó demasiado", and
 * failed again identically on retry — the idempotency key cannot replay a
 * request the server never finished reading.
 *
 * XHR gives back both things that fixes: a progress event to show, and a
 * timeout that only fires when the connection really stalls. The result is
 * shaped as a `Response` so callers keep reading `res.ok`, `res.status` and
 * `res.json()` exactly as before.
 */

export type UploadProgress = {
  /** Bytes already handed to the network. */
  loaded: number;
  /** Total bytes, or 0 when the browser cannot tell. */
  total: number;
  /** 0-100, or null while the total is unknown. */
  percent: number | null;
};

export type UploadOptions = {
  method?: string;
  headers?: Record<string, string>;
  onProgress?: (progress: UploadProgress) => void;
  /**
   * Milliseconds without ANY network activity before giving up. This is an
   * inactivity timeout, not a deadline: a slow upload that keeps moving is
   * working, and cutting it off is exactly the bug this module exists to fix.
   */
  idleTimeoutMs?: number;
  signal?: AbortSignal;
};

const DEFAULT_IDLE_TIMEOUT_MS = 120_000;

export function uploadWithProgress(
  url: string,
  body: FormData,
  options: UploadOptions = {}
): Promise<Response> {
  const {
    method = 'POST',
    headers = {},
    onProgress,
    idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
    signal,
  } = options;

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    let idleTimer: number | undefined;

    const failWith = (error: Error) => {
      window.clearTimeout(idleTimer);
      reject(error);
    };

    // Rearmed on every byte that moves, so the clock only runs while nothing
    // is happening.
    const armIdleTimer = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        request.abort();
        failWith(new DOMException('Upload stalled', 'AbortError'));
      }, idleTimeoutMs);
    };

    const abortFromCaller = () => {
      request.abort();
      failWith(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', abortFromCaller, { once: true });

    request.open(method, url, true);
    for (const [name, value] of Object.entries(headers)) {
      // Content-Type is deliberately never set: the browser has to add the
      // multipart boundary itself.
      if (value != null && name.toLowerCase() !== 'content-type') {
        request.setRequestHeader(name, value);
      }
    }
    request.responseType = 'blob';

    request.upload.addEventListener('progress', (event) => {
      armIdleTimer();
      onProgress?.({
        loaded: event.loaded,
        total: event.lengthComputable ? event.total : 0,
        percent: event.lengthComputable && event.total > 0
          ? Math.min(100, Math.round((event.loaded / event.total) * 100))
          : null,
      });
    });

    // The body is out; what remains is the server thinking. Report 100 so the
    // interface can switch from "subiendo" to "guardando".
    request.upload.addEventListener('load', () => {
      armIdleTimer();
      onProgress?.({ loaded: 1, total: 1, percent: 100 });
    });

    request.addEventListener('progress', armIdleTimer);

    request.addEventListener('load', () => {
      window.clearTimeout(idleTimer);
      signal?.removeEventListener('abort', abortFromCaller);
      resolve(
        new Response(request.response, {
          status: request.status,
          statusText: request.statusText,
          headers: parseHeaders(request.getAllResponseHeaders()),
        })
      );
    });

    // A dropped connection surfaces as the same TypeError `fetch` throws, so
    // `requestErrorMessage` keeps classifying it as a network problem.
    request.addEventListener('error', () => failWith(new TypeError('Network request failed')));
    request.addEventListener('abort', () => {
      window.clearTimeout(idleTimer);
    });

    armIdleTimer();
    request.send(body);
  });
}

/** `getAllResponseHeaders` returns one CRLF-separated string; Response wants pairs. */
function parseHeaders(raw: string): Headers {
  const headers = new Headers();
  for (const line of raw.trim().split(/[\r\n]+/)) {
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (name) {
      try {
        headers.append(name, value);
      } catch {
        // Forbidden header names are not worth failing a successful upload over.
      }
    }
  }
  return headers;
}
