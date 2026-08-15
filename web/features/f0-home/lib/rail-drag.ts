/**
 * 가로 카드 레일을 마우스로 끌어 넘기는 제스처의 계산.
 *
 * 마우스는 `overflow` 컨테이너를 끌어서 스크롤하지 못한다. 폰 목업을 PC 로 보는 동안
 * 카드가 안 넘어가는 건 이 때문이라 포인터 드래그를 직접 붙인다. 손가락에는 브라우저의
 * 기본 스크롤이 이미 붙어 있으므로 이 계산은 마우스·펜 경로에만 쓴다.
 *
 * 여기에는 DOM 이 없다. 배선(포인터 이벤트·관성 타이머)은 `use-rail-drag.ts` 가 갖고,
 * 이 파일은 **얼마나 움직였고 얼마나 미끄러질지**만 정한다.
 *
 * 값의 근거는 `ui-src` 시절 `cardsDown` 주석을 그대로 옮긴 것이다.
 */
export type RailDrag = {
  /** 창 좌표. 누른 자리다. */
  startX: number;
  /** 누른 순간의 `scrollLeft`. 이동은 항상 이 값에서 다시 잰다 — 누적하면 어긋난다. */
  startLeft: number;
  lastX: number;
  lastAt: number;
  /** px/ms. 손을 뗄 때 튕길 거리를 정한다. */
  velocity: number;
  /** 문턱을 넘게 끌었나. 넘었으면 손을 뗀 직후의 click 을 삼킨다. */
  dragged: boolean;
  /** 이번 프레임에 넣을 `scrollLeft`. */
  scrollLeft: number;
};

/**
 * 이 아래로 움직인 것은 제자리 클릭으로 본다. 0 으로 두면 손이 미세하게 떨린 클릭까지
 * 드래그가 되어 카드 진입이 사라진다.
 */
const DRAG_THRESHOLD = 6;

/** 손을 뗄 때 속도를 거리로 바꾸는 배수와 그 상한. */
const FLING_SCALE = 16;
const FLING_MAX = 48;
/** 감쇠 0.93 기준 손을 뗀 뒤 최대 2.5장에서 멈춘다. */
const FLING_DECAY = 0.93;
const FLING_STOP = 0.6;

export function beginRailDrag(clientX: number, scrollLeft: number, at: number): RailDrag {
  return {
    startX: clientX,
    startLeft: scrollLeft,
    lastX: clientX,
    lastAt: at,
    velocity: 0,
    dragged: false,
    scrollLeft,
  };
}

/**
 * 포인터가 움직였을 때 다음 상태를 만든다.
 *
 * 속도는 마지막 표본만 본다. 시트(`sheet-drag`)처럼 눌러 주지 않는 이유는 레일에는
 * 튕김에 상한(`FLING_MAX`)이 있어 한 번 튄 값이 화면을 날려 보내지 못하기 때문이다.
 * 같은 프레임에 두 번 들어오면(`elapsed === 0`) 나눗셈이 무한이 되므로 속도를 유지한다.
 */
export function advanceRailDrag(drag: RailDrag, clientX: number, at: number): RailDrag {
  const elapsed = at - drag.lastAt;
  return {
    ...drag,
    lastX: clientX,
    lastAt: at,
    velocity: elapsed > 0 ? (clientX - drag.lastX) / elapsed : drag.velocity,
    // 한 번 넘으면 그 드래그 동안 계속 드래그다. 되돌아와도 클릭으로 바뀌지 않는다.
    dragged: drag.dragged || Math.abs(clientX - drag.startX) > DRAG_THRESHOLD,
    scrollLeft: drag.startLeft - (clientX - drag.startX),
  };
}

/** 손을 뗀 자리에서 시작할 튕김 거리(px/프레임). 부호는 스크롤 방향이다. */
export function railFling(drag: RailDrag): number {
  const fling = -drag.velocity * FLING_SCALE;
  if (fling > FLING_MAX) return FLING_MAX;
  if (fling < -FLING_MAX) return -FLING_MAX;
  return fling;
}

/** 다음 프레임의 튕김 거리. `0` 이면 멈추고 스냅을 되돌릴 차례다. */
export function stepRailFling(fling: number): number {
  const next = fling * FLING_DECAY;
  return Math.abs(next) < FLING_STOP ? 0 : next;
}

/**
 * 가운데에 가장 가까운 카드. 스크롤이 멎은 자리에서 어느 카드가 켜졌는지 정한다.
 *
 * 카드 폭이 제각각이어도 맞도록 간격을 곱하지 않고 **각 카드의 중심까지의 거리**를 잰다.
 */
export function nearestCardByCenter(
  cards: readonly { left: number; width: number }[],
  mid: number,
): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < cards.length; i++) {
    const distance = Math.abs(cards[i].left + cards[i].width / 2 - mid);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}
