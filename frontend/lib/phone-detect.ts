import { normalizeEcuadorPhone } from '@/lib/phone';

/**
 * Splits free text (e.g. listing descriptions scraped from Plusvalía) into
 * plain-text segments and Ecuadorian-phone-like segments, so callers can
 * render the phone segments behind a click-to-reveal control instead of
 * leaking a contact channel outside the tracked flows.
 */
export interface DetectedSegment {
  type: 'text' | 'phone';
  /** The exact original substring (whitespace/separators included). */
  value: string;
  /** Present only for `type: 'phone'`: digits normalized to `593XXXXXXXXX`. */
  normalized?: string;
}

// Candidate windows: a run of digits allowed to contain the separators people
// actually use when writing phone numbers by hand (spaces, tabs, dashes,
// dots, parentheses) — but never a newline/carriage return. Excluding
// newlines from the class means a candidate can never cross a line break, so
// it can't glue a phone number to the following sentence, nor silently eat
// the boundary between a number and unrelated text on the next line.
// This intentionally matches loosely — plausibility is decided afterwards by
// `isPlausibleEcuadorPhoneDigits`, which is what actually rejects prices,
// areas, years and most ID numbers.
const CANDIDATE_RE = /\(?\+?\d[\d \t.\-()]{5,}\d\)?/g;

// A digit immediately before a candidate's start means the match actually
// begins mid-number (e.g. inside "150.000 - 200.000", a naive retry could
// otherwise start at the "0" right after "15"). Treat that as an invalid
// start rather than accepting a truncated fragment. `.`/`,` are deliberately
// excluded: they're also used as phone-number separators (e.g. right after
// "Telf." or between two comma-separated numbers), so treating them as
// boundary chars would wrongly reject a number that legitimately starts
// right after one.
const BOUNDARY_CHAR_RE = /\d/;

// Recovers each digit run (and its offset) inside a candidate window, so a
// window that fails plausibility as a whole can still be tested token by
// token.
const DIGIT_TOKEN_RE = /\d+/g;

/**
 * Ecuadorian phone shapes, expressed on the digit-only string (no `+`, no
 * separators):
 * - Mobile with the trunk "0": 10 digits, must start "09" (09XXXXXXXX).
 * - Landline with the trunk "0": 9 digits, must start "0" + area code 2-7
 *   (0XXXXXXXX, areas 02-07).
 * - Mobile without the trunk "0": 9 digits starting with 9 (9XXXXXXXX).
 * - With the "593" country code: 11 digits (landline) or 12 digits (mobile).
 */
function isPlausibleEcuadorPhoneDigits(digits: string): boolean {
  if (digits.startsWith('593')) {
    return digits.length === 11 || digits.length === 12;
  }
  if (digits.startsWith('0')) {
    if (digits.length === 10) return digits.startsWith('09');
    if (digits.length === 9) return /^0[2-7]/.test(digits);
    return false;
  }
  if (digits.startsWith('9')) {
    return digits.length === 9;
  }
  return false;
}

interface WindowSpan {
  /** Offset within the candidate window's raw string (not the full text). */
  start: number;
  end: number;
}

/**
 * A candidate window that fails plausibility as a whole might still contain
 * one or more real phone numbers sitting right next to unrelated digits with
 * only a bare separator between them — e.g. "0991234567 0987654321" is one
 * greedy window but two real numbers. Splits the window into its digit
 * tokens and accepts each token, or each adjacent pair of tokens, that is
 * independently plausible (a pair covers numbers whose separators split them
 * into more than one token, e.g. "099" + "1234567").
 */
function resolvePhoneSpansInWindow(raw: string): WindowSpan[] {
  const tokens: WindowSpan[] = [];
  DIGIT_TOKEN_RE.lastIndex = 0;
  let tokenMatch: RegExpExecArray | null;
  while ((tokenMatch = DIGIT_TOKEN_RE.exec(raw)) !== null) {
    tokens.push({ start: tokenMatch.index, end: tokenMatch.index + tokenMatch[0].length });
  }

  const spans: WindowSpan[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    const tokenDigits = raw.slice(token.start, token.end);
    if (isPlausibleEcuadorPhoneDigits(tokenDigits)) {
      spans.push(token);
      i += 1;
      continue;
    }
    if (i + 1 < tokens.length) {
      const next = tokens[i + 1];
      const pairDigits = tokenDigits + raw.slice(next.start, next.end);
      if (isPlausibleEcuadorPhoneDigits(pairDigits)) {
        spans.push({ start: token.start, end: next.end });
        i += 2;
        continue;
      }
    }
    i += 1;
  }
  return spans;
}

/**
 * Scans `text` for Ecuadorian-phone-like sequences and returns it split into
 * ordered segments. Concatenating every segment's `value` in order always
 * reconstructs `text` exactly, so callers can render segments in place
 * without losing whitespace/newlines.
 */
export function detectPhoneSegments(text: string): DetectedSegment[] {
  if (!text) return [];

  const segments: DetectedSegment[] = [];
  let lastIndex = 0;

  CANDIDATE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CANDIDATE_RE.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;

    if (start > 0 && BOUNDARY_CHAR_RE.test(text[start - 1])) {
      // This match starts mid-number/mid-decimal; don't accept a truncated
      // fragment. Retry right after this invalid start.
      CANDIDATE_RE.lastIndex = start + 1;
      continue;
    }

    const digits = raw.replace(/\D/g, '');
    const phoneSpans = isPlausibleEcuadorPhoneDigits(digits)
      ? [{ start: 0, end: raw.length }]
      : resolvePhoneSpansInWindow(raw);

    if (phoneSpans.length === 0) {
      // Not a plausible phone anywhere in this window (price, area, year,
      // most IDs, ...). Leave it as plain text and resume right after it.
      CANDIDATE_RE.lastIndex = start + raw.length;
      continue;
    }

    for (const span of phoneSpans) {
      const absStart = start + span.start;
      const absEnd = start + span.end;
      if (absStart > lastIndex) {
        segments.push({ type: 'text', value: text.slice(lastIndex, absStart) });
      }
      const phoneValue = text.slice(absStart, absEnd);
      segments.push({
        type: 'phone',
        value: phoneValue,
        normalized: normalizeEcuadorPhone(phoneValue.replace(/\D/g, '')),
      });
      lastIndex = absEnd;
    }

    CANDIDATE_RE.lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}
