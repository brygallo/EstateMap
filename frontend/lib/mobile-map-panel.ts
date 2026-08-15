export type MobilePanelSnap = 'closed' | 'half' | 'full';

const HALF_HIDDEN_RATIO = 0.56;

export const mobilePanelSnapOffsets = (height: number): Record<MobilePanelSnap, number> => ({
  full: 0,
  half: Math.round(height * HALF_HIDDEN_RATIO),
  closed: height,
});

export const shouldExpandMobilePanel = (
  snap: MobilePanelSnap,
  startY: number,
  currentY: number,
  scrollTop: number
): boolean => snap === 'half' && scrollTop <= 2 && startY - currentY >= 10;

export const shouldCloseMobilePanel = (
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  scrollTop: number
): boolean => {
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;
  return scrollTop <= 2 && deltaY >= 36 && Math.abs(deltaY) > Math.abs(deltaX) * 1.15;
};

export const resolveMobilePanelSnap = (
  offset: number,
  velocity: number,
  height: number,
  from: MobilePanelSnap
): MobilePanelSnap => {
  const order: MobilePanelSnap[] = ['full', 'half', 'closed'];
  if (Math.abs(velocity) > 550) {
    if (velocity > 0) return 'closed';
    const index = order.indexOf(from);
    return order[Math.max(index - 1, 0)];
  }

  const offsets = mobilePanelSnapOffsets(height);
  return order.reduce(
    (best, candidate) =>
      Math.abs(offsets[candidate] - offset) < Math.abs(offsets[best] - offset)
        ? candidate
        : best,
    from
  );
};
