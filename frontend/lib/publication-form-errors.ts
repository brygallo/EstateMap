const FIELD_STEPS: Record<string, number> = {
  title: 0,
  description: 0,
  propertyType: 0,
  property_type: 0,
  status: 0,
  address: 1,
  city: 1,
  province: 1,
  latitude: 1,
  longitude: 1,
  polygon: 1,
  area: 2,
  builtArea: 2,
  built_area: 2,
  rooms: 2,
  bathrooms: 2,
  parkingSpaces: 2,
  parking_spaces: 2,
  floors: 2,
  furnished: 2,
  yearBuilt: 2,
  year_built: 2,
  price: 3,
  isNegotiable: 3,
  is_negotiable: 3,
  contactPhone: 3,
  contact_phone: 3,
  uploaded_images: 4,
  images: 4,
};

export type PublicationFormError = { message: string; step: number };

function messageFrom(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = messageFrom(item);
      if (message) return message;
    }
  }
  if (value && typeof value === 'object' && 'message' in value) {
    return messageFrom((value as { message?: unknown }).message);
  }
  return null;
}

export function publicationFormError(errors: unknown): PublicationFormError | null {
  if (!errors || typeof errors !== 'object') return null;

  for (const [field, detail] of Object.entries(errors)) {
    const step = FIELD_STEPS[field];
    const message = messageFrom(detail);
    if (step !== undefined && message) return { message, step };
  }
  return null;
}

export function publicationApiErrorStep(body: unknown): number | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  for (const field of Object.keys(body)) {
    const step = FIELD_STEPS[field];
    if (step !== undefined) return step;
  }
  return null;
}

// Generic keys the API uses for errors that belong to no single field.
const UNFIELDED_KEYS = ['detail', 'non_field_errors', 'error'];

const MAX_FIELDS = 8;
const MAX_MESSAGE_LENGTH = 300;
const MAX_DETAIL_LENGTH = 600;

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

/**
 * What the failure was, flattened into scalars an ActivityEvent payload can
 * carry. The admin activity log is the only place a failed publication leaves a
 * trace, so a bare status code there means nobody can tell a rejected price
 * from an expired session.
 */
export type PublicationErrorReport = {
  error_message: string;
  error_fields: string;
  error_detail: string;
  error_code: string;
};

export function publicationErrorReport(body: unknown, message: string): PublicationErrorReport {
  const pairs: Array<[string, string]> = [];
  let code = '';

  if (body && typeof body === 'object' && !Array.isArray(body)) {
    for (const [field, detail] of Object.entries(body)) {
      if (field === 'code' && typeof detail === 'string') {
        code = detail;
        continue;
      }
      const fieldMessage = messageFrom(detail);
      if (fieldMessage) pairs.push([field, fieldMessage]);
    }
  }

  const shown = pairs.slice(0, MAX_FIELDS);
  return {
    error_message: truncate(message.trim(), MAX_MESSAGE_LENGTH),
    error_fields: shown
      .filter(([field]) => !UNFIELDED_KEYS.includes(field))
      .map(([field]) => field)
      .join(', '),
    error_detail: truncate(
      shown
        .map(([field, fieldMessage]) =>
          UNFIELDED_KEYS.includes(field) ? fieldMessage : `${field}: ${fieldMessage}`
        )
        .join(' · '),
      MAX_DETAIL_LENGTH
    ),
    error_code: truncate(code, 60),
  };
}

/** Field names the client-side validation rejected, for the same payload. */
export function publicationFormErrorFields(errors: unknown): string {
  if (!errors || typeof errors !== 'object') return '';
  return Object.keys(errors).slice(0, MAX_FIELDS).join(', ');
}
