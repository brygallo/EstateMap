/**
 * Storage keys shared by the publishing form and the resume-link page.
 *
 * They live here rather than in the form module so that opening a resume link
 * does not drag the whole publishing page into that route's bundle just to read
 * two strings.
 */

/** The work in progress, restored whenever the form opens on this device. */
export const PROPERTY_DRAFT_STORAGE_KEY = 'propertyPublicationDraft';

/** Stable anonymous identifier used to update one server-side pending draft. */
export const PENDING_PUBLICATION_KEY_STORAGE_KEY = 'pendingPublicationKey';

/**
 * The resume token, in sessionStorage rather than localStorage: it is a bearer
 * credential, so it should die with the tab instead of sitting on the device.
 */
export const PUBLICATION_RESUME_TOKEN_KEY = 'publicationResumeToken';
