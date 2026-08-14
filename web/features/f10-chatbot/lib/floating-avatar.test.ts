import assert from "node:assert/strict";
import test from "node:test";
import {
  FLOATING_AVATAR_DRAG_THRESHOLD_PX,
  FLOATING_AVATAR_IDLE_ROTATION_MS,
  hasFloatingAvatarDragStarted,
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
