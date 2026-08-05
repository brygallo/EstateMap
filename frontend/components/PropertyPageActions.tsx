'use client';

import { MessageCircle, Phone, Share2, ExternalLink } from 'lucide-react';
import { useShareAction } from '@/hooks/useShareAction';
import { haptic } from '@/lib/haptics';
import { trackEvent } from '@/lib/analytics';
import { trackContact, type ContactContext } from '@/components/PropertyContactActions';
import ShareModal from '@/components/ShareModal';

interface PropertyPageActionsProps extends ContactContext {
  /** wa.me link with the prefilled enquiry, or empty when there is no phone. */
  whatsappUrl: string;
  /** E.164 digits, for the `tel:` link. Empty when there is no phone. */
  phone: string;
  /** Original listing URL, used when an imported property has no phone. */
  sourceUrl?: string;
  sourceAgency?: string;
  shareTitle: string;
  shareDescription: string;
  shareUrl: string;
  /**
   * Replaces the "sin contacto" pill when the listing takes no enquiries on
   * purpose — a closed one. Given a href it becomes a link, so the bar still
   * offers a way forward instead of a dead end.
   */
  unavailableLabel?: string;
  unavailableHref?: string;
}

/**
 * Sticky contact bar for the listing page on mobile.
 *
 * The contact card is `lg:sticky`, which on a phone put every CTA at the very
 * bottom of a long page — the visitor had to scroll past the description, the
 * features and the map to find the WhatsApp button. This keeps the two actions
 * that matter within reach the whole way down, which is how every native
 * marketplace app lays a detail screen out.
 *
 * It is `lg:hidden`; on desktop the sticky card already does this job.
 */
export default function PropertyPageActions({
  whatsappUrl,
  phone,
  sourceUrl,
  sourceAgency,
  shareTitle,
  shareDescription,
  shareUrl,
  unavailableLabel,
  unavailableHref,
  ...context
}: PropertyPageActionsProps) {
  const shareAction = useShareAction();
  const hasPhone = Boolean(phone);

  const handleShare = () => {
    haptic('selection');
    trackEvent('property_share_clicked', { property_id: context.propertyId, source: 'property_page_bar' });
    shareAction.share({ title: shareTitle, text: shareDescription, url: shareUrl });
  };

  return (
    <>
      {/* Spacer so the bar never covers the end of the page content. */}
      <div className="h-20 lg:hidden" aria-hidden />

      {/* Stacked directly on top of MobileTabBar rather than over it: the tab
          bar already owns the gesture-bar inset, so this only has to clear its
          height. */}
      <div className="fixed inset-x-0 bottom-[calc(var(--mobile-tabbar-height)+env(safe-area-inset-bottom))] z-nav border-t border-line bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex h-12 w-12 flex-none touch-manipulation items-center justify-center rounded-button border border-line bg-white text-textPrimary transition-colors active:bg-background"
            aria-label="Compartir esta propiedad"
          >
            <Share2 className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>

          {hasPhone && (
            <a
              href={`tel:+${phone}`}
              onClick={() => {
                haptic('selection');
                trackContact(context, 'call', 'property_page_bar');
              }}
              className="flex h-12 w-12 flex-none touch-manipulation items-center justify-center rounded-button border border-line bg-white text-textPrimary transition-colors active:bg-background"
              aria-label="Llamar al anunciante"
            >
              <Phone className="h-5 w-5" strokeWidth={2} aria-hidden />
            </a>
          )}

          {hasPhone ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                haptic('success');
                trackContact(context, 'whatsapp', 'property_page_bar');
              }}
              className="flex h-12 flex-1 touch-manipulation items-center justify-center gap-2 rounded-button bg-secondary text-base font-semibold text-white shadow-card transition-colors active:bg-secondaryHover"
            >
              <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
              WhatsApp
            </a>
          ) : sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                haptic('selection');
                trackContact(context, 'source_url', 'property_page_bar');
              }}
              className="flex h-12 flex-1 touch-manipulation items-center justify-center gap-2 rounded-button bg-primary text-base font-semibold text-white shadow-card transition-colors active:bg-primaryHover"
            >
              <ExternalLink className="h-5 w-5" strokeWidth={2} aria-hidden />
              Ver en {sourceAgency || 'la fuente'}
            </a>
          ) : unavailableHref ? (
            <a
              href={unavailableHref}
              className="flex h-12 flex-1 touch-manipulation items-center justify-center gap-2 rounded-button bg-primary px-3 text-center text-sm font-semibold text-white shadow-card transition-colors active:bg-primaryHover"
            >
              {unavailableLabel || 'Ver más propiedades'}
            </a>
          ) : (
            <span className="flex h-12 flex-1 items-center justify-center rounded-button border border-line bg-background px-3 text-center text-xs font-medium text-textSecondary">
              {unavailableLabel || 'Sin contacto disponible'}
            </span>
          )}
        </div>
      </div>

      <ShareModal
        isOpen={shareAction.modalOpen}
        onClose={shareAction.closeModal}
        shareUrl={shareUrl}
        title="Compartir propiedad"
        description="Comparte esta propiedad"
        shareTitle={shareTitle}
        shareDescription={shareDescription}
      />
    </>
  );
}
