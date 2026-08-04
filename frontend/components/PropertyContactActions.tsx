'use client';

import { type ReactNode, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { haptic } from '@/lib/haptics';

type ContactMethod = 'whatsapp' | 'call' | 'source_url' | 'phone_reveal';

export interface ContactContext {
  propertyId: number | string;
  city?: string;
  province?: string;
  propertyType?: string;
  status?: string;
  imported?: boolean;
}

interface TrackedContactLinkProps extends ContactContext {
  href: string;
  method: ContactMethod;
  source: string;
  className?: string;
  target?: string;
  rel?: string;
  children: ReactNode;
}

export function trackContact(
  context: ContactContext,
  method: ContactMethod,
  source: string
) {
  trackEvent('property_contact_clicked', {
    method,
    source,
    property_id: context.propertyId,
    city: context.city,
    province: context.province,
    property_type: context.propertyType,
    status: context.status,
    imported: Boolean(context.imported),
  });
}

export function TrackedContactLink({
  href,
  method,
  source,
  propertyId,
  city,
  province,
  propertyType,
  status,
  imported,
  children,
  ...anchorProps
}: TrackedContactLinkProps) {
  return (
    <a
      href={href}
      onClick={() => trackContact(
        { propertyId, city, province, propertyType, status, imported },
        method,
        source
      )}
      {...anchorProps}
    >
      {children}
    </a>
  );
}

interface PhoneRevealProps extends ContactContext {
  phone: string;
  source: string;
  className?: string;
}

export function PhoneReveal({
  phone,
  source,
  propertyId,
  city,
  province,
  propertyType,
  status,
  imported,
  className = '',
}: PhoneRevealProps) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <a href={`tel:${phone}`} className={className || 'font-semibold text-primary hover:underline'}>
        {phone}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className || 'font-semibold text-primary underline-offset-2 hover:underline'}
      onClick={() => {
        setRevealed(true);
        // The label swaps in place, so on a phone the finger is often still
        // covering the thing that changed. The tick confirms it landed.
        haptic('success');
        trackContact(
          { propertyId, city, province, propertyType, status, imported },
          'phone_reveal',
          source
        );
      }}
      aria-label="Mostrar número de teléfono"
    >
      Ver teléfono
    </button>
  );
}
