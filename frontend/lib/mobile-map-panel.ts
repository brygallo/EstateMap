export type MobilePanelSnap = 'closed' | 'half' | 'full';

const HALF_HIDDEN_RATIO = 0.56;

export const mobilePanelSnapOffsets = (height: number): Record<MobilePanelSnap, number> => ({
  full: 0,
  half: Math.round(height * HALF_HIDDEN_RATIO),
  closed: height,
});

export const resolveMobilePanelSnap = (
  offset: number,
  velocity: number,
  height: number,
  from: MobilePanelSnap
): MobilePanelSnap => {
  const order: MobilePanelSnap[] = ['full', 'half', 'closed'];
  if (Math.abs(velocity) > 550) {
    const index = order.indexOf(from);
    const next = velocity > 0 ? index + 1 : index - 1;
    return order[Math.min(Math.max(next, 0), order.length - 1)];
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
