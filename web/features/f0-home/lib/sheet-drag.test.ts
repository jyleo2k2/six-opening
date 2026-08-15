import assert from "node:assert/strict";
import { advanceSheetDrag, beginSheetDrag, shouldDismissSheet } from "./sheet-drag";

// 시트를 쓸어내려 닫는 제스처. 브라우저 없이 확인할 수 있어야 해서 계산만 떼어 둔다.

const SHEET_HEIGHT = 700;
const full = { scale: 1, sheetHeight: SHEET_HEIGHT };

// 아래로 끈 만큼 따라온다.
const down = advanceSheetDrag(beginSheetDrag(1, 100, 0), 160, 100, full);
assert.equal(down.offsetY, 60);

// 위로 끄는 건 무시한다 — 시트는 이미 올라와 있다.
const up = advanceSheetDrag(beginSheetDrag(1, 100, 0), 40, 100, full);
assert.equal(up.offsetY, 0);

// 시트 높이보다 더 내려가지 않는다.
const past = advanceSheetDrag(beginSheetDrag(1, 100, 0), 5_000, 100, full);
assert.equal(past.offsetY, SHEET_HEIGHT);

// 배율 보정 — 창을 반으로 줄여 그렸으면 창에서 60px 이 시트 안쪽 120px 이다.
// 그래야 화면에 그려질 때(120 × 0.5) 손가락과 같은 거리를 움직인다.
const scaled = advanceSheetDrag(beginSheetDrag(1, 100, 0), 160, 100, {
  scale: 0.5,
  sheetHeight: SHEET_HEIGHT,
});
assert.equal(scaled.offsetY, 120);

// 창이 아주 좁으면 배율이 0 까지 내려간다. 그대로 나누면 거리가 무한이 되어
// 손을 대기만 해도 닫히므로 1 로 본다.
const zero = advanceSheetDrag(beginSheetDrag(1, 100, 0), 160, 100, {
  scale: 0,
  sheetHeight: SHEET_HEIGHT,
});
assert.equal(zero.offsetY, 60);

// 같은 시각에 두 번 들어와도 0 으로 나누지 않는다.
const sameMoment = advanceSheetDrag(beginSheetDrag(1, 100, 0), 160, 0, full);
assert.equal(sameMoment.velocityY, 0);
assert.equal(sameMoment.offsetY, 60);

/** 일정한 속도로 끄는 손가락. `at` 은 ms, `speed` 는 px/s. */
function drag(speed: number, steps: number, stepMs = 10) {
  let state = beginSheetDrag(1, 0, 0);
  for (let step = 1; step <= steps; step++) {
    state = advanceSheetDrag(state, (speed * step * stepMs) / 1_000, step * stepMs, full);
  }
  return state;
}

// 속도는 px/s 다. 표본을 눌러 가며 쌓으므로 몇 번 움직이면 실제 속도에 붙는다.
const fling = drag(1_000, 8);
assert.ok(fling.velocityY > 900, `튕김 속도 ${fling.velocityY}`);
assert.ok(fling.velocityY < 1_000);

// 천천히 조금 끌면 제자리로 되돌아간다.
const nudge = drag(20, 6, 100);
assert.equal(Math.round(nudge.offsetY), 12);
assert.equal(shouldDismissSheet(nudge, SHEET_HEIGHT), false);

// 시트 높이의 20% 를 넘기면 느려도 닫힌다.
const farButSlow = advanceSheetDrag(beginSheetDrag(1, 0, 0), SHEET_HEIGHT * 0.2, 3_000, full);
assert.equal(shouldDismissSheet(farButSlow, SHEET_HEIGHT), true);

// 짧게 튕겨도 닫힌다 — 12px 이상 + 900px/s 이상.
assert.ok(fling.offsetY >= 12);
assert.equal(shouldDismissSheet(fling, SHEET_HEIGHT), true);

// 20% 바로 아래에서 멈춘 손가락은 닫지 않는다.
const almost = advanceSheetDrag(beginSheetDrag(1, 0, 0), SHEET_HEIGHT * 0.2 - 1, 3_000, full);
assert.equal(shouldDismissSheet(almost, SHEET_HEIGHT), false);
