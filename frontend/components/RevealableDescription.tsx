'use client';

import { useEffect, useRef, useState } from 'react';
import { detectPhoneSegments } from '@/lib/phone-detect';
import { ecuadorPhoneHref } from '@/lib/phone';
import { trackContact, type ContactContext } from '@/components/PropertyContactActions';

interface RevealableDescriptionProps extends ContactContext {
  text: string;
  /** Distinct from PhoneReveal's sources so the funnel can tell them apart. */
  source?: string;
  className?: string;
}

// Shows only the first 3 digits, then bullets for the rest, e.g. "099•••••••".
function maskPhoneDigits(digits: string): string {
  const visible = digits.slice(0, 3);
  const hidden = '•'.repeat(Math.max(digits.length - 3, 0));
  return `${visible}${hidden}`;
}

interface InlinePhoneRevealProps {
  value: string;
  normalized?: string;
  context: ContactContext;
  source: string;
}

function InlinePhoneReveal({ value, normalized, context, source }: InlinePhoneRevealProps) {
  const [revealed, setRevealed] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);
  // Use the original (unnormalized) digits for the mask so it reads like the
  // number as written (e.g. "099•••••••"), not the normalized "593•••" form.
  const digits = value.replace(/\D/g, '');
  const href = ecuadorPhoneHref(normalized || value);

  useEffect(() => {
    // Reveal swaps a <button> for a <a>: move focus onto the link so keyboard
    // users don't lose their place when the element under focus is replaced.
    if (revealed) {
      linkRef.current?.focus();
    }
  }, [revealed]);

  if (revealed) {
    return (
      <a
        ref={linkRef}
        href={`tel:${href}`}
        className="font-semibold text-primary underline-offset-2 hover:underline"
      >
        {value}
      </a>
    );
  }

  return (
    <button
      type="button"
      className="font-semibold text-primary underline-offset-2 hover:underline"
      onClick={() => {
        setRevealed(true);
        trackContact(context, 'phone_reveal', source);
      }}
      aria-label="Mostrar número de teléfono"
    >
      {maskPhoneDigits(digits)} Ver número
    </button>
  );
}

/**
 * Renders free text (listing descriptions) with any embedded Ecuadorian
 * phone numbers masked behind a click-to-reveal control, preserving the
 * original whitespace/newlines exactly like a plain `whitespace-pre-line` <p>.
 */
export default function RevealableDescription({
  text,
  source = 'description_text',
  className = '',
  propertyId,
  city,
  province,
  propertyType,
  status,
  imported,
}: RevealableDescriptionProps) {
  const segments = detectPhoneSegments(text);
  const context: ContactContext = { propertyId, city, province, propertyType, status, imported };

  return (
    <p className={className}>
      {segments.map((segment, index) => {
        // Key includes propertyId and the segment value (not just the array
        // index) so switching properties without remounting this component
        // (e.g. PropertyModal navigating to another listing) doesn't carry
        // over a revealed phone's local state onto a different property.
        const key = `${propertyId}:${index}:${segment.value}`;
        return segment.type === 'phone' ? (
          <InlinePhoneReveal
            key={key}
            value={segment.value}
            normalized={segment.normalized}
            context={context}
            source={source}
          />
        ) : (
          <span key={key}>{segment.value}</span>
        );
      })}
    </p>
  );
}
