/**
 * The reading half of SOC-008: what the shared links brought back.
 *
 * Every link and QR the kit hands out already carries `utm_campaign=owner_kit`
 * and the network it was made for, and the browser replays that first touch
 * inside every `ActivityEvent`. The backend groups it per network, drops the
 * crawlers, and answers here.
 *
 * This is private data and the server says so: the endpoint requires a JWT and
 * answers 403 to anyone who is not the owner or staff. The kit screen's own
 * ownership check is interface courtesy (SOC-009); this one is the boundary.
 */

import { apiGet } from '@/lib/api';
import type { SocialNetwork } from '@/lib/social-kit';

/**
 * Why a listing has no visitors, which is never the same as "zero".
 *
 * `not_shared` means nobody has used the kit yet, and `shared_without_visitors`
 * means it was shared and nobody has arrived. Printing a bare 0 for either one
 * reads as a failure of the portal rather than as a state of the campaign, so
 * the interface must branch on this before it prints any number at all.
 */
export type PromotionState = 'not_shared' | 'shared_without_visitors' | 'has_visitors';

export interface PromotionNetworkStat {
  /** One of the kit networks, or any other source found on a hand-edited link. */
  source: SocialNetwork | string;
  /** Distinct sessions: the honest count, and the one shown. */
  visitors: number;
  /** Raw interactions. Kept for engagement, never displayed as "visitas". */
  events: number;
}

export interface PromotionStats {
  property_id: number;
  state: PromotionState;
  window_days: number;
  /** Start of the reported window, already clamped to `measured_since`. */
  since: string;
  /** When bots started being flagged; nothing older can be called real. */
  measured_since: string;
  total_visitors: number;
  total_events: number;
  shares: number;
  /** Always the four kit networks, best first, zeros included. */
  networks: PromotionNetworkStat[];
}

/**
 * Result of asking for the breakdown.
 *
 * `forbidden` is kept apart from `error` because they deserve different
 * screens: a failed request is worth retrying and worth apologising for, while
 * being denied the data means the panel should not be there at all.
 */
export type PromotionStatsResult =
  | { ok: true; stats: PromotionStats }
  | { ok: false; reason: 'forbidden' | 'error' };

/**
 * Fetch the per-network breakdown for one listing.
 *
 * Never throws. The kit exists to be shared from, and it has to keep working
 * when the metrics do not: a rejected promise here would take the laminas and
 * the copy down with it.
 */
export async function fetchPromotionStats(
  propertyId: number | string
): Promise<PromotionStatsResult> {
  try {
    const response = await apiGet(`/properties/${propertyId}/promotion-stats/`);
    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'forbidden' };
    }
    if (!response.ok) return { ok: false, reason: 'error' };
    return { ok: true, stats: (await response.json()) as PromotionStats };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
