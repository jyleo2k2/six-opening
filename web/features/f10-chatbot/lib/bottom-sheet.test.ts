import assert from "node:assert/strict";
import {
  FRAME_OPENING_BOTTOM_RADIUS,
  getPrototypeScreenRect,
  PROTOTYPE_PHONE,
  PROTOTYPE_SHEET_HEIGHT,
  SHEET_BOTTOM_SAFE_PX,
  SHEET_SIDE_PADDING,
  shouldDismissBottomSheet,
} from "./bottom-sheet";

assert.deepEqual(getPrototypeScreenRect(1440, 1000), {
  left: 519,
  top: 63,
  width: 402,
  height: 874,
  scale: 1,
});

const narrowViewport = getPrototypeScreenRect(375, 812);
assert.equal(narrowViewport.scale, (375 - PROTOTYPE_PHONE.frameMargin) / 450);
assert.equal(narrowViewport.left, (375 - narrowViewport.width) / 2);
assert.equal(narrowViewport.top, (812 - narrowViewport.height) / 2);

const shortViewport = getPrototypeScreenRect(1000, 500);
assert.equal(shortViewport.scale, (500 - PROTOTYPE_PHONE.frameMargin) / 920);
assert.equal(
  PROTOTYPE_SHEET_HEIGHT,
  PROTOTYPE_PHONE.screenHeight * 0.8,
);

// 시트 맨 아래 행의 바깥선(좌우 `SHEET_SIDE_PADDING` 안쪽)이 프레임 개구부 하단 코너 곡선
// 밖으로 나가지 않아야 한다. 코너 원에서 가로로 그만큼 들어온 지점의 높이가 필요한 최소 여백이다.
const requiredBottomSafePx =
  FRAME_OPENING_BOTTOM_RADIUS -
  Math.sqrt(
    FRAME_OPENING_BOTTOM_RADIUS ** 2 -
      (FRAME_OPENING_BOTTOM_RADIUS - SHEET_SIDE_PADDING) ** 2,
  );
assert.ok(
  SHEET_BOTTOM_SAFE_PX >= requiredBottomSafePx,
  `입력 행 하단 여백 ${SHEET_BOTTOM_SAFE_PX}px 은 프레임 개구부 곡선이 요구하는 ${requiredBottomSafePx.toFixed(1)}px 보다 작다`,
);
// 시트 높이의 80% 계약을 깰 만큼 크지도 않아야 한다.
assert.ok(SHEET_BOTTOM_SAFE_PX < PROTOTYPE_SHEET_HEIGHT * 0.1);

assert.equal(
  shouldDismissBottomSheet({
    distance: PROTOTYPE_SHEET_HEIGHT * 0.2,
    velocity: 0,
  }),
  true,
);
assert.equal(
  shouldDismissBottomSheet({
    distance: PROTOTYPE_SHEET_HEIGHT * 0.19,
    velocity: 0,
  }),
  false,
);
assert.equal(
  shouldDismissBottomSheet({ distance: 12, velocity: 900 }),
  true,
);
assert.equal(
  shouldDismissBottomSheet({ distance: 11, velocity: 1200 }),
  false,
);
assert.equal(
  shouldDismissBottomSheet({ distance: 40, velocity: -1200 }),
  false,
);
