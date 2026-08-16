import { shouldDismissBottomSheet } from "../../f10-chatbot/lib/bottom-sheet";

/**
 * 바텀 시트를 손가락으로 쓸어내려 닫는 제스처의 계산.
 *
 * 판정 규칙(얼마나 내려야 닫히는가)은 챗봇 시트가 이미 쓰고 있는
 * `f10-chatbot/lib/bottom-sheet` 의 `shouldDismissBottomSheet` 를 그대로 쓴다 —
 * 같은 폰 안에서 시트마다 닫히는 느낌이 다르면 안 된다. 여기서 더하는 것은
 * **배율 보정과 속도 측정**뿐이다.
 *
 * 배율을 나누는 이유: 화면은 `PhoneFrame` 이 `transform:scale()` 로 줄여 놓은 안쪽에
 * 그려진다. 포인터 좌표는 줄이기 **전** 창 좌표로 오고, 시트를 미는 `translateY` 는
 * 줄인 **안쪽** 좌표라 그대로 쓰면 손가락보다 시트가 더 많이 움직인다.
 */
export type SheetDrag = {
  pointerId: number;
  /** 창 좌표. 배율 보정 전이다. */
  startY: number;
  lastY: number;
  lastAt: number;
  /** 시트 안쪽 좌표로 고친 이동 거리. 아래로만 쌓이고 시트 높이에서 멈춘다. */
  offsetY: number;
  /** 시트 안쪽 좌표 기준 px/s. 손을 뗄 때 튕김을 판정한다. */
  velocityY: number;
};

export type SheetGeometry = {
  scale: number;
  sheetHeight: number;
};

/** 손을 뗄 때 시트가 미끄러지는 시간. 스타일 transition 과 언마운트 지연이 같은 값을 쓴다. */
export const SHEET_CLOSE_MS = 240;

/**
 * 속도는 한 번의 표본으로 정하지 않는다. 손을 뗄 때 마지막 표본만 보면 손가락이 멈칫한
 * 순간에 튕김이 통째로 사라진다. 이전 값을 더 크게 남겨 흔들림을 눌러 준다.
 */
const VELOCITY_KEEP = 0.65;
const VELOCITY_SAMPLE = 0.35;

export function beginSheetDrag(pointerId: number, clientY: number, at: number): SheetDrag {
  return { pointerId, startY: clientY, lastY: clientY, lastAt: at, offsetY: 0, velocityY: 0 };
}

/**
 * 포인터가 움직였을 때(그리고 손을 뗄 때 마지막으로 한 번 더) 다음 상태를 만든다.
 *
 * 창이 아주 좁으면 배율이 0 까지 내려간다. 그대로 나누면 거리·속도가 무한이 되어
 * 손을 대기만 해도 닫히므로 0 이하는 1 로 본다.
 */
export function advanceSheetDrag(
  drag: SheetDrag,
  clientY: number,
  at: number,
  { scale, sheetHeight }: SheetGeometry,
): SheetDrag {
  const safeScale = scale > 0 ? scale : 1;
  const elapsed = at - drag.lastAt;
  const velocityY =
    elapsed > 0
      ? drag.velocityY * VELOCITY_KEEP +
        ((clientY - drag.lastY) / elapsed / safeScale) * 1_000 * VELOCITY_SAMPLE
      : drag.velocityY;

  return {
    ...drag,
    lastY: clientY,
    lastAt: at,
    // 위로 끄는 건 무시한다 — 시트는 이미 올라와 있고 더 올라갈 자리가 없다.
    offsetY: Math.min(sheetHeight, Math.max(0, (clientY - drag.startY) / safeScale)),
    velocityY,
  };
}

/** 손을 뗀 자리에서 닫을지 제자리로 되돌릴지. */
export function shouldDismissSheet(drag: SheetDrag, sheetHeight: number) {
  return shouldDismissBottomSheet({
    distance: drag.offsetY,
    velocity: drag.velocityY,
    sheetHeight,
  });
}

/**
 * 위로 쓸어올려 여는 손짓의 기준 높이. 닫을 때처럼 시트 높이를 쓰면 문턱(20%)이
 * 시트의 5분의 1이라 손가락이 끌던 카드를 한참 벗어난 뒤에야 열린다 — 여는 손은
 * 카드 위에 있으므로 카드 크기의 기준을 따로 둔다. 20% = 32px 이 문턱이다.
 */
export const SHEET_PULL_REFERENCE = 160;

/**
 * 카드를 위로 밀어 시트를 열지. 거리·속도 규칙은 닫을 때와 같은
 * `shouldDismissBottomSheet` 를 방향만 뒤집어 쓴다 — 같은 시트를 여닫는 문턱이
 * 손짓마다 다르면 안 된다.
 *
 * 좌표는 배율이 걸리기 **전** 창 좌표로 들어오므로 `advanceSheetDrag` 와 같은 이유로
 * 배율로 나눠 화면 안쪽 거리로 고친다.
 */
export function shouldOpenSheetByPull(
  { startY, endY, elapsedMs }: { startY: number; endY: number; elapsedMs: number },
  { scale, reference = SHEET_PULL_REFERENCE }: { scale: number; reference?: number },
) {
  const safeScale = scale > 0 ? scale : 1;
  const distance = (startY - endY) / safeScale;
  const velocity = elapsedMs > 0 ? (distance / elapsedMs) * 1_000 : 0;
  return shouldDismissBottomSheet({ distance, velocity, sheetHeight: reference });
}
