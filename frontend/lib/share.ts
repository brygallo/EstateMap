/**
 * Native share sheet.
 *
 * On a phone the OS sheet is strictly better than an in-page share dialog: it
 * lists WhatsApp — which is *the* channel for property enquiries in Ecuador —
 * plus the contacts the person actually messages, with no extra tap and no
 * account to be logged into. The in-page ShareModal stays as the desktop path
 * and the fallback, since it also carries the QR code.
 */

export interface NativeShareInput {
  title?: string;
  text?: string;
  url: string;
}

export type ShareOutcome = 'shared' | 'dismissed' | 'unsupported';

/** Whether `attemptNativeShare` has any chance of doing something. */
export const canShareNatively = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * Opens the OS share sheet.
 *
 * Returns `'dismissed'` when the person opened the sheet and backed out — that
 * is a completed interaction, so the caller must NOT fall back to the modal.
 * Popping a second dialog over a share the user just cancelled is the single
 * worst thing this function could do. Only `'unsupported'` means "you handle
 * it".
 *
 * `navigator.share` requires a user gesture, so call this directly from the
 * click handler — not after an await.
 */
export async function attemptNativeShare(input: NativeShareInput): Promise<ShareOutcome> {
  if (!canShareNatively()) return 'unsupported';

  const payload: ShareData = { url: input.url };
  if (input.title) payload.title = input.title;
  if (input.text) payload.text = input.text;

  // Some Android WebViews advertise `share` but reject specific payloads.
  // Checking first turns that into the fallback rather than an exception.
  if (typeof navigator.canShare === 'function' && !navigator.canShare(payload)) {
    return 'unsupported';
  }

  try {
    await navigator.share(payload);
    return 'shared';
  } catch (error) {
    // AbortError is the user closing the sheet. Anything else — a WebView with
    // no target apps, a permissions policy block — should reach the fallback.
    if (error instanceof DOMException && error.name === 'AbortError') return 'dismissed';
    return 'unsupported';
  }
}
