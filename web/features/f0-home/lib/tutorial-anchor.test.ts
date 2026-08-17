import assert from "node:assert/strict";
import {
  ANCHOR_PAD,
  BUBBLE_GAP,
  BUBBLE_MARGIN,
  TAIL_KEEPOUT,
  TAIL_SIZE,
  holeOf,
  placeBubble,
  spanOf,
  tailLeft,
  toScreenRect,
} from "./tutorial-anchor";

// 코치마크 자리 계산. 브라우저 없이 확인할 수 있어야 해서 계산만 떼어 둔다.
// 좌표계는 폰 화면 안쪽 402×874 다.

const SCREEN_W = 402;
const SCREEN_H = 874;

// ── 창 좌표 → 화면 안쪽 좌표 ────────────────────────────────────────────────

// 배율 1 이면 화면 왼쪽 위를 뺀 값 그대로다.
assert.deepEqual(
  toScreenRect(
    { left: 124, top: 73, width: 100, height: 40 },
    { left: 24, top: 23, scale: 1 },
  ),
  { x: 100, y: 50, w: 100, h: 40 },
);

// 반으로 줄여 그렸으면 창에서 잰 50px 이 화면 안쪽 100px 이다.
assert.deepEqual(
  toScreenRect(
    { left: 74, top: 48, width: 50, height: 20 },
    { left: 24, top: 23, scale: 0.5 },
  ),
  { x: 100, y: 50, w: 100, h: 40 },
);

// 창이 아주 좁아 배율이 0 이어도 좌표가 무한이 되지 않는다.
const noScale = toScreenRect(
  { left: 24, top: 23, width: 10, height: 10 },
  { left: 24, top: 23, scale: 0 },
);
assert.equal(Number.isFinite(noScale.w), true);
assert.equal(noScale.w, 10);

// ── 구멍 ────────────────────────────────────────────────────────────────────

// 요소보다 사방으로 PAD 만큼 넉넉히 뚫는다.
assert.deepEqual(holeOf({ x: 100, y: 200, w: 60, h: 40 }), {
  x: 100 - ANCHOR_PAD,
  y: 200 - ANCHOR_PAD,
  w: 60 + ANCHOR_PAD * 2,
  h: 40 + ANCHOR_PAD * 2,
});

// 화면 왼쪽 위에 붙은 요소는 잘리되, 잘린 만큼 반대쪽으로 새지 않는다.
// (원본 tutorial.js 는 여기서 오른쪽으로 PAD 만큼 더 뚫렸다.)
const corner = holeOf({ x: 0, y: 0, w: 40, h: 30 });
assert.deepEqual(corner, { x: 0, y: 0, w: 40 + ANCHOR_PAD, h: 30 + ANCHOR_PAD });

// 화면 오른쪽 아래도 같다 — 밖으로 넘치지 않는다.
const tail = holeOf({ x: SCREEN_W - 40, y: SCREEN_H - 30, w: 40, h: 30 });
assert.equal(tail.x + tail.w, SCREEN_W);
assert.equal(tail.y + tail.h, SCREEN_H);

// 화면 밖으로 완전히 나간 요소는 크기가 음수가 되지 않는다.
const gone = holeOf({ x: SCREEN_W + 100, y: 0, w: 40, h: 30 });
assert.equal(gone.w, 0);

// ── 여러 곳을 한꺼번에 짚을 때 ───────────────────────────────────────────────

assert.deepEqual(
  spanOf([
    { x: 0, y: 300, w: 10, h: 50 },
    { x: 0, y: 100, w: 10, h: 20 },
    { x: 0, y: 200, w: 10, h: 10 },
  ]),
  { top: 100, bottom: 350 },
);

// ── 말풍선 자리 ─────────────────────────────────────────────────────────────

// 아래에 자리가 있으면 아래에 붙인다 — 짚는 건 대개 누를 것이고 손은 아래에서 온다.
assert.deepEqual(placeBubble({ span: { top: 100, bottom: 160 }, bubbleHeight: 240 }), {
  side: "below",
  top: 160 + BUBBLE_GAP,
});

// 아래가 좁으면 위로 올린다.
const above = placeBubble({ span: { top: 600, bottom: 700 }, bubbleHeight: 240 });
assert.equal(above.side, "above");
assert.equal(above.top, 600 - BUBBLE_GAP - 240);

// 위아래 모두 좁으면 바닥에 붙인다.
const floor = placeBubble({ span: { top: 200, bottom: 700 }, bubbleHeight: 240 });
assert.equal(floor.side, "floor");
assert.equal(floor.top, SCREEN_H - BUBBLE_MARGIN - 240);

// 아래 경계 — 딱 들어가면 아래로 간다.
assert.equal(
  placeBubble({
    span: { top: 0, bottom: SCREEN_H - BUBBLE_MARGIN - BUBBLE_GAP - 240 },
    bubbleHeight: 240,
  }).side,
  "below",
);

// 1px 만 모자라도 아래는 포기한다.
assert.notEqual(
  placeBubble({
    span: { top: 0, bottom: SCREEN_H - BUBBLE_MARGIN - BUBBLE_GAP - 239 },
    bubbleHeight: 240,
  }).side,
  "below",
);

// 말풍선이 화면보다 크면 위쪽을 살려 제목부터 읽게 한다.
assert.equal(
  placeBubble({ span: { top: 300, bottom: 400 }, bubbleHeight: SCREEN_H + 200 }).top,
  BUBBLE_MARGIN,
);

// ── 꼬리 ────────────────────────────────────────────────────────────────────

const BUBBLE_W = SCREEN_W - BUBBLE_MARGIN * 2;

// 한가운데를 짚으면 꼬리도 한가운데다.
assert.equal(
  tailLeft({ x: SCREEN_W / 2 - 20, y: 0, w: 40, h: 10 }),
  BUBBLE_W / 2 - TAIL_SIZE / 2,
);

// 왼쪽 구석을 짚어도 둥근 모서리에 물리지 않는다.
assert.equal(tailLeft({ x: 0, y: 0, w: 20, h: 10 }), TAIL_KEEPOUT);

// 오른쪽 구석도 같다.
assert.equal(
  tailLeft({ x: SCREEN_W - 20, y: 0, w: 20, h: 10 }),
  BUBBLE_W - TAIL_KEEPOUT - TAIL_SIZE,
);

// 꼬리는 언제나 말풍선 안에 있다.
for (let x = -50; x <= SCREEN_W + 50; x += 7) {
  const left = tailLeft({ x, y: 0, w: 30, h: 10 });
  assert.equal(left >= 0, true);
  assert.equal(left + TAIL_SIZE <= BUBBLE_W, true);
}
