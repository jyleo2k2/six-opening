import assert from "node:assert/strict";
import test from "node:test";
import {
  DISMISS_TARGET_ARMED_DIAMETER_PX,
  DISMISS_TARGET_BOTTOM_OFFSET_PX,
  DISMISS_TARGET_SNAP_RADIUS_PX,
  dismissTargetPosition,
  FLOATING_AVATAR_DRAG_THRESHOLD_PX,
  FLOATING_AVATAR_IDLE_ROTATION_MS,
  hasFloatingAvatarDragStarted,
  isOverDismissTarget,
  pickNextAvatarIndex,
} from "./floating-avatar";

test("idle avatars rotate every three minutes", () => {
  assert.equal(FLOATING_AVATAR_IDLE_ROTATION_MS, 180_000);
});

test("dragging starts only after the four-pixel movement threshold", () => {
  assert.equal(FLOATING_AVATAR_DRAG_THRESHOLD_PX, 4);
  assert.equal(hasFloatingAvatarDragStarted(10, 10, 14, 10), false);
  assert.equal(hasFloatingAvatarDragStarted(10, 10, 12, 13), true);
});

test("the first avatar selection can use the full set", () => {
  assert.equal(pickNextAvatarIndex(5, null, () => 0), 0);
  assert.equal(pickNextAvatarIndex(5, null, () => 0.999), 4);
});

test("the next avatar never repeats the current index", () => {
  for (let currentIndex = 0; currentIndex < 5; currentIndex += 1) {
    for (const randomValue of [0, 0.25, 0.5, 0.75, 0.999]) {
      const nextIndex = pickNextAvatarIndex(
        5,
        currentIndex,
        () => randomValue,
      );
      assert.ok(nextIndex >= 0 && nextIndex < 5);
      assert.notEqual(nextIndex, currentIndex);
    }
  }
});

test("a one-image set remains stable", () => {
  assert.equal(pickNextAvatarIndex(1, 0, () => 0.5), 0);
});

test("an empty avatar set is rejected", () => {
  assert.throws(() => pickNextAvatarIndex(0, null), RangeError);
});

const screen = { left: 100, top: 40, width: 402, height: 874, scale: 1 };

test("삭제 타깃은 MTS 화면의 아래 가운데에 놓인다", () => {
  assert.deepEqual(dismissTargetPosition(screen), {
    x: 100 + 402 / 2,
    y: 40 + 874 - DISMISS_TARGET_BOTTOM_OFFSET_PX,
  });
});

test("타깃이 하단 탭바를 덮지 않는다", () => {
  const TAB_BAR_HEIGHT = 52;
  const armedRadius = DISMISS_TARGET_ARMED_DIAMETER_PX / 2;
  const target = dismissTargetPosition(screen);
  const bottomEdge = target.y + armedRadius;
  assert.ok(bottomEdge < screen.top + screen.height - TAB_BAR_HEIGHT);
});

test("화면 배율이 줄면 타깃도 화면 안쪽으로 따라 들어온다", () => {
  const half = dismissTargetPosition({ ...screen, scale: 0.5 });
  assert.equal(half.y, 40 + 874 - DISMISS_TARGET_BOTTOM_OFFSET_PX * 0.5);
});

test("화면을 아직 못 재면 폰 기본 크기로 좌표를 낸다", () => {
  const fallback = dismissTargetPosition(null);
  assert.equal(fallback.x, 402 / 2);
  assert.equal(fallback.y, 874 - DISMISS_TARGET_BOTTOM_OFFSET_PX);
});

test("흡입 반경 안이면 놓았을 때 사라진다", () => {
  const target = dismissTargetPosition(screen);
  assert.equal(isOverDismissTarget(target, target), true);
  assert.equal(
    isOverDismissTarget({ x: target.x, y: target.y - DISMISS_TARGET_SNAP_RADIUS_PX }, target),
    true,
  );
  assert.equal(
    isOverDismissTarget({ x: target.x, y: target.y - DISMISS_TARGET_SNAP_RADIUS_PX - 1 }, target),
    false,
  );
});

test("반경은 대각선에서도 같다 — 사각형이 아니라 원이다", () => {
  const target = { x: 0, y: 0 };
  // 가로·세로로는 각각 반경 안이지만 대각선 거리는 반경을 넘는다
  const diagonal = DISMISS_TARGET_SNAP_RADIUS_PX * 0.8;
  assert.equal(isOverDismissTarget({ x: diagonal, y: 0 }, target), true);
  assert.equal(isOverDismissTarget({ x: diagonal, y: diagonal }, target), false);
});

test("반경도 화면 배율을 따라간다", () => {
  const target = { x: 0, y: 0 };
  const point = { x: DISMISS_TARGET_SNAP_RADIUS_PX * 0.6, y: 0 };
  assert.equal(isOverDismissTarget(point, target, 1), true);
  assert.equal(isOverDismissTarget(point, target, 0.5), false);
});
