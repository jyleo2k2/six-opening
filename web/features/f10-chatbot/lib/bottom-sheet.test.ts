import assert from "node:assert/strict";
import {
  getPrototypeScreenRect,
  PROTOTYPE_PHONE,
  PROTOTYPE_SHEET_HEIGHT,
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
