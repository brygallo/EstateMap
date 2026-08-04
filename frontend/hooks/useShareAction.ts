'use client';

import { useCallback, useState } from 'react';
import { attemptNativeShare, type NativeShareInput } from '@/lib/share';

/**
 * "Share" that prefers the OS sheet and falls back to the in-app dialog.
 *
 * Wire the returned `share` straight into an onClick — `navigator.share`
 * requires a user gesture and will reject if it is called after an await, so
 * this must not be wrapped in anything asynchronous upstream.
 */
export function useShareAction() {
  const [modalOpen, setModalOpen] = useState(false);

  const share = useCallback((input: NativeShareInput) => {
    if (!input.url) return;
    attemptNativeShare(input).then((outcome) => {
      // 'dismissed' means the sheet opened and the person backed out. Opening
      // the fallback dialog on top of that would be arguing with them.
      if (outcome === 'unsupported') setModalOpen(true);
    });
  }, []);

  const closeModal = useCallback(() => setModalOpen(false), []);

  return { share, modalOpen, openModal: () => setModalOpen(true), closeModal };
}
