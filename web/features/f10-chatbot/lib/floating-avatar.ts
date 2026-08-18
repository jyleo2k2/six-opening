import { PROTOTYPE_PHONE, type PrototypeScreenRect } from "./bottom-sheet";

export const FLOATING_AVATAR_IDLE_ROTATION_MS = 3 * 60 * 1_000;
export const FLOATING_AVATAR_DRAG_THRESHOLD_PX = 4;
export const FLOATING_AVATAR_RADIUS_PX = 28;
/** 주문 1단계의 `예약` 탭 오른쪽에 접힌 퍽을 맞추는 화면 기준 세로 좌표 */
export const COLLAPSED_AVATAR_RESERVATION_TAB_CENTER_Y_PX = 226;

// ── 삭제 타깃 ───────────────────────────────────────────────────────────────
// 드래그 중에만 화면 하단 가운데에 나타나는 동그라미 X. 버튼을 그 위에 놓으면 가장자리에 접힌다.

/** 타깃 지름. 버튼(56px)보다 커야 겨냥이 쉽다 */
export const DISMISS_TARGET_DIAMETER_PX = 64;
/** 흡입 반경 안에 들어왔을 때 커지는 지름 */
export const DISMISS_TARGET_ARMED_DIAMETER_PX = 78;
/**
 * 타깃 중심이 화면 아래에서 떨어진 거리.
 * 하단 탭바(52px) + 활성 타깃 반지름(39px) + 여유를 더한 값이라 탭바를 덮지 않는다.
 */
export const DISMISS_TARGET_BOTTOM_OFFSET_PX = 120;
/** 버튼 중심이 이 거리 안에 들어오면 놓았을 때 사라진다 */
export const DISMISS_TARGET_SNAP_RADIUS_PX = 45;

export type FloatingPoint = { x: number; y: number };

/**
 * 삭제 타깃의 중심 좌표.
 * 버튼 위치를 자르는 `clampFloatingChatPosition` 과 **같은 MTS 화면 사각형**을 기준으로 삼는다.
 * 기준이 갈리면 버튼이 닿을 수 없는 곳에 타깃이 놓인다.
 */
export function dismissTargetPosition(screen: PrototypeScreenRect | null): FloatingPoint {
  if (!screen) {
    return {
      x: PROTOTYPE_PHONE.screenWidth / 2,
      y: PROTOTYPE_PHONE.screenHeight - DISMISS_TARGET_BOTTOM_OFFSET_PX,
    };
  }
  return {
    x: screen.left + screen.width / 2,
    y: screen.top + screen.height - DISMISS_TARGET_BOTTOM_OFFSET_PX * screen.scale,
  };
}

/** X 타깃에 놓은 뒤 버튼 중심을 화면 오른쪽 경계에 붙인다. 반쪽은 화면 clip에 가려진다. */
export function collapsedFloatingAvatarPosition(
  screen: PrototypeScreenRect | null,
): FloatingPoint {
  const left = screen?.left ?? 0;
  const top = screen?.top ?? 0;
  const width = screen?.width ?? PROTOTYPE_PHONE.screenWidth;
  const height = screen?.height ?? PROTOTYPE_PHONE.screenHeight;
  const scale = screen?.scale ?? 1;
  const radius = FLOATING_AVATAR_RADIUS_PX * scale;
  const reservationTabCenterY =
    top + COLLAPSED_AVATAR_RESERVATION_TAB_CENTER_Y_PX * scale;

  return {
    x: left + width,
    y: Math.min(
      top + height - radius,
      Math.max(top + radius, reservationTabCenterY),
    ),
  };
}

/** 버튼 중심이 타깃 흡입 반경 안에 있는지. 반경도 화면 배율을 따라간다 */
export function isOverDismissTarget(
  button: FloatingPoint,
  target: FloatingPoint,
  scale = 1,
): boolean {
  const radius = DISMISS_TARGET_SNAP_RADIUS_PX * (scale > 0 ? scale : 1);
  return Math.hypot(button.x - target.x, button.y - target.y) <= radius;
}

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
