export const PROTOTYPE_PHONE = Object.freeze({
  frameWidth: 450,
  frameHeight: 920,
  screenWidth: 402,
  screenHeight: 874,
  frameMargin: 8,
  sheetRatio: 0.8,
});

export const PROTOTYPE_SHEET_HEIGHT =
  PROTOTYPE_PHONE.screenHeight * PROTOTYPE_PHONE.sheetRatio;

export type PrototypeScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
};

export function getPrototypeScreenRect(
  viewportWidth: number,
  viewportHeight: number,
): PrototypeScreenRect {
  const scale = Math.max(
    0,
    Math.min(
      1,
      (viewportWidth - PROTOTYPE_PHONE.frameMargin) /
        PROTOTYPE_PHONE.frameWidth,
      (viewportHeight - PROTOTYPE_PHONE.frameMargin) /
        PROTOTYPE_PHONE.frameHeight,
    ),
  );
  const width = PROTOTYPE_PHONE.screenWidth * scale;
  const height = PROTOTYPE_PHONE.screenHeight * scale;

  return {
    left: (viewportWidth - width) / 2,
    top: (viewportHeight - height) / 2,
    width,
    height,
    scale,
  };
}

export function shouldDismissBottomSheet({
  distance,
  velocity,
  sheetHeight = PROTOTYPE_SHEET_HEIGHT,
}: {
  distance: number;
  velocity: number;
  sheetHeight?: number;
}) {
  const downwardDistance = Math.max(0, distance);
  return (
    downwardDistance >= sheetHeight * 0.2 ||
    (downwardDistance >= 12 && velocity >= 900)
  );
}
