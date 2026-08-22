'use client';

import { useEffect, useState } from 'react';
import PropertyIntelligence, { PropertyIntelligenceSkeleton } from '@/components/PropertyIntelligence';
import type { Intelligence } from '@/lib/intelligence';
import { getPublicApiUrl } from '@/lib/api-url';

const API_URL = getPublicApiUrl();

/**
 * The analysis fetched from the browser, for surfaces that open a listing
 * without a server render of their own — the map modal opens over the map, and
 * nothing about that view is crawlable anyway.
 *
 * The property page does NOT use this: there the block is server-rendered, so
 * the content that makes the ficha unique reaches a crawler in the HTML.
 */
export default function PropertyIntelligenceLive({
  propertyId,
  compact = false,
}: {
  propertyId: number;
  compact?: boolean;
}) {
  const [data, setData] = useState<Intelligence | null>(null);
  // Starts loading and is only ever turned off: the modal mounts one of these
  // per listing, so a new property arrives as a new component rather than as a
  // prop change, and resetting the flag inside the effect would be a
  // synchronous setState that React warns about for good reason.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/properties/${propertyId}/intelligence/`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) setData(payload as Intelligence);
      })
      .catch((error) => {
        console.error('Error cargando inteligencia del anuncio:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  if (loading) return <PropertyIntelligenceSkeleton compact={compact} />;
  if (!data) return null;
  return <PropertyIntelligence data={data} compact={compact} />;
}
