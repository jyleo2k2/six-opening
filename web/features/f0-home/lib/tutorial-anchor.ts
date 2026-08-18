import { PROTOTYPE_PHONE } from "../../f10-chatbot/lib/bottom-sheet";

/**
 * 튜토리얼 코치마크의 자리 계산.
 *
 * 좌표를 박아 두지 않는다 — 짚어 줄 요소의 위치는 실행 시점에 `getBoundingClientRect()`
 * 로 재서 여기로 넘긴다. 레이아웃이 조금만 움직여도 구멍이 엉뚱한 데 뚫리기 때문이다.
 * 재는 일은 컴포넌트가 하고, **어디에 뚫고 어디에 붙일지는 전부 여기서 정한다** —
 * 브라우저 없이 확인할 수 있어야 한다.
 *
 * 좌표계는 폰 화면 안쪽(402×874)이다. 창 좌표로 들어온 값은 `toScreenRect` 가
 * 배율을 나눠 안쪽 좌표로 고친다. 오버레이 자체에 `scale()` 이 걸리므로 안쪽 좌표로
 * 그려야 화면과 같은 자리에 선다 — 챗봇 시트가 쓰는 방식과 같다.
 */

const { screenWidth: SCREEN_W, screenHeight: SCREEN_H } = PROTOTYPE_PHONE;

export type AnchorRect = { x: number; y: number; w: number; h: number };

/** 구멍을 요소보다 이만큼 넉넉히 판다. 딱 맞게 뚫으면 테두리가 잘린 것처럼 보인다. */
export const ANCHOR_PAD = 8;

/** 말풍선과 구멍 사이 간격. */
export const BUBBLE_GAP = 14;

/** 말풍선이 화면 가장자리에서 떨어지는 거리. 좌우 여백도 같은 값을 쓴다. */
export const BUBBLE_MARGIN = 16;

/** 꼬리가 말풍선 둥근 모서리에 물리지 않게 두는 여백. */
export const TAIL_KEEPOUT = 20;

/** 꼬리 사각형의 한 변. 45도 돌려 쓰므로 보이는 너비는 이보다 조금 넓다. */
export const TAIL_SIZE = 20;

/**
 * 창 좌표로 잰 요소를 폰 화면 안쪽 좌표로 고친다.
 *
 * 화면이 아주 좁아도 실측 rect의 배율이 0보다 작거나 같으면 1을 사용해 좌표를
 * 나누지 않는다. `sheet-drag`도 같은 이유로 같은 처리를 한다.
 */
export function toScreenRect(
  node: { left: number; top: number; width: number; height: number },
  screen: { left: number; top: number; scale: number },
): AnchorRect {
  const scale = screen.scale > 0 ? screen.scale : 1;
  return {
    x: (node.left - screen.left) / scale,
    y: (node.top - screen.top) / scale,
    w: node.width / scale,
    h: node.height / scale,
  };
}

/**
 * 요소 하나를 감쌀 구멍.
 *
 * 원본(`public/ui/tutorial.js`)은 왼쪽 위를 0 으로 자른 뒤에도 너비에 `pad*2` 를
 * 그대로 더해서, 화면 밖으로 걸친 요소는 구멍이 잘린 만큼 오른쪽으로 새어 나갔다.
 * 여기서는 네 변을 각각 자르고 그 차이로 크기를 구한다.
 */
export function holeOf(rect: AnchorRect, pad = ANCHOR_PAD): AnchorRect {
  const left = Math.max(0, rect.x - pad);
  const top = Math.max(0, rect.y - pad);
  const right = Math.min(SCREEN_W, rect.x + rect.w + pad);
  const bottom = Math.min(SCREEN_H, rect.y + rect.h + pad);
  return {
    x: left,
    y: top,
    w: Math.max(0, right - left),
    h: Math.max(0, bottom - top),
  };
}

/** 한 단계가 여러 곳을 짚을 때 그 전체가 차지하는 위아래 범위. */
export function spanOf(rects: AnchorRect[]) {
  return {
    top: Math.min(...rects.map((rect) => rect.y)),
    bottom: Math.max(...rects.map((rect) => rect.y + rect.h)),
  };
}

export type BubblePlacement = {
  /** `floor` 는 위아래 어디에도 자리가 없어 바닥에 붙인 경우다. */
  side: "below" | "above" | "floor";
  top: number;
};

/**
 * 설명 말풍선을 짚은 곳을 가리지 않는 쪽에 놓는다. 아래를 먼저 보는 이유는
 * 짚는 대상이 대개 누를 것이고, 손가락은 아래에서 올라오기 때문이다.
 */
export function placeBubble({
  span,
  bubbleHeight,
  gap = BUBBLE_GAP,
  margin = BUBBLE_MARGIN,
}: {
  span: { top: number; bottom: number };
  bubbleHeight: number;
  gap?: number;
  margin?: number;
}): BubblePlacement {
  if (SCREEN_H - span.bottom - margin >= bubbleHeight + gap) {
    return { side: "below", top: span.bottom + gap };
  }
  if (span.top - margin >= bubbleHeight + gap) {
    return { side: "above", top: span.top - gap - bubbleHeight };
  }
  // 둘 다 좁으면 바닥에 붙인다. 말풍선이 화면보다 크면 위쪽을 살려 제목부터 읽게 한다.
  return { side: "floor", top: Math.max(margin, SCREEN_H - margin - bubbleHeight) };
}

/**
 * 말풍선 꼬리의 x. 말풍선 왼쪽 끝을 0 으로 하는 좌표다.
 *
 * 꼬리는 짚은 곳의 한가운데를 가리키되 말풍선 밖으로는 못 나간다. 화면 구석을 짚으면
 * 가운데가 말풍선 범위를 벗어나므로 모서리 여백만큼 남기고 붙잡아 둔다.
 */
export function tailLeft(
  anchor: AnchorRect,
  { margin = BUBBLE_MARGIN, keepout = TAIL_KEEPOUT, tailSize = TAIL_SIZE } = {},
) {
  const bubbleWidth = SCREEN_W - margin * 2;
  const center = anchor.x + anchor.w / 2 - margin - tailSize / 2;
  return Math.max(keepout, Math.min(bubbleWidth - keepout - tailSize, center));
}
