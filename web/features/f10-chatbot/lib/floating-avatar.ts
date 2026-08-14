export const FLOATING_AVATAR_IDLE_ROTATION_MS = 3 * 60 * 1_000;
export const FLOATING_AVATAR_DRAG_THRESHOLD_PX = 4;

export function hasFloatingAvatarDragStarted(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
): boolean {
  return (
    Math.abs(currentX - startX) + Math.abs(currentY - startY) >
    FLOATING_AVATAR_DRAG_THRESHOLD_PX
  );
}

export function pickNextAvatarIndex(
  count: number,
  currentIndex: number | null,
  random: () => number = Math.random,
): number {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError("count must be a positive integer");
  }

  const sampledValue = random();
  const randomValue = Math.min(
    Math.max(Number.isFinite(sampledValue) ? sampledValue : 0, 0),
    1 - Number.EPSILON,
  );

  if (count === 1) return 0;
  if (currentIndex === null || currentIndex < 0 || currentIndex >= count) {
    return Math.floor(randomValue * count);
  }

  const candidate = Math.floor(randomValue * (count - 1));
  return candidate >= currentIndex ? candidate + 1 : candidate;
}
