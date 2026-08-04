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

/**
 * Whether this device can hand an actual image file to another app.
 *
 * This is the difference between the promotion kit being useful on a phone and
 * being a download folder. With file sharing, a lamina reaches Instagram or
 * TikTok in one tap and no account has to be connected to anything; without it,
 * the person downloads the file and uploads it themselves.
 *
 * Support is real on iOS Safari and Android Chrome and absent on most desktops,
 * which is exactly the split that matters: phones are where people post.
 */
export const canShareFiles = (files: File[]): boolean =>
  typeof navigator !== 'undefined' &&
  typeof navigator.share === 'function' &&
  typeof navigator.canShare === 'function' &&
  navigator.canShare({ files });

/**
 * Opens the OS share sheet with an image attached.
 *
 * The file must already be in hand. Fetching it inside the click handler would
 * put an await between the tap and `navigator.share`, and iOS drops the user
 * gesture across that boundary — the sheet then never opens, with no error to
 * catch. Callers prepare the file ahead of time and call this synchronously.
 */
export async function attemptNativeShareFiles(input: {
  files: File[];
  title?: string;
  text?: string;
}): Promise<ShareOutcome> {
  if (!canShareFiles(input.files)) return 'unsupported';

  const payload: ShareData = { files: input.files };
  if (input.title) payload.title = input.title;
  if (input.text) payload.text = input.text;

  // Some targets accept files but reject a file+text payload. Dropping the text
  // is better than dropping the share: the caption is on the clipboard anyway.
  const sharable = navigator.canShare?.(payload) ? payload : { files: input.files };

  try {
    await navigator.share(sharable);
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'dismissed';
    return 'unsupported';
  }
}
