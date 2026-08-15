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

/**
 * 프레임 이미지(`/ui/assets/iphone-frame.png`) **개구부 하단 코너의 반경**. 알파 채널을 재서
 * 얻었다 — 화면 사각형의 라운드(40)보다 훨씬 깊다.
 *
 * 좌·우·상단은 화면 사각형(`24,23,402×874`)과 정확히 맞물리지만 아래 두 코너만 이만큼
 * 파여 있고, 그 프레임은 챗봇 오버레이 **위에** 한 겹 더 깔린다(`f0-home/lib/phone-frame.ts`).
 * 그래서 시트 바닥에 붙인 것은 잘린 것처럼 보인다.
 */
export const FRAME_OPENING_BOTTOM_RADIUS = 62;

/** 시트 좌우 안쪽 여백(`px-4`). 입력창과 보내기 버튼의 바깥선이 여기서 시작한다. */
export const SHEET_SIDE_PADDING = 16;

/**
 * 시트 맨 아래 행이 프레임 개구부 곡선에 물리지 않도록 두는 여백.
 *
 * 코너 원에서 가로로 `SHEET_SIDE_PADDING` 만큼 들어온 지점의 높이가 최소값(≈20.4px)이고
 * 여기에 여유를 더했다 — 계산은 `bottom-sheet.test.ts` 가 지킨다. 시트 전체에 배율이 걸리므로
 * 화면 픽셀이 아니라 **프레임 단위** 상수여야 창 크기가 바뀌어도 같은 자리에 선다.
 */
export const SHEET_BOTTOM_SAFE_PX = 24;

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
