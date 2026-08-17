import { shouldDismissBottomSheet } from "../../f10-chatbot/lib/bottom-sheet";
import { sectorChips } from "./explore-cards";
import type { Universe } from "./use-universe";

/**
 * 탐색 화면을 **가로로 쓸어 섹터를 넘기는** 손짓의 계산.
 *
 * 카드가 위아래로 한 장씩 넘어가는 세로 레일 위에 가로 손짓을 겹치는 것이라, 어느 축의
 * 손짓인지·넘길지 되돌릴지·얼마나 밀려 있는지를 여기서만 정한다. DOM 은 없다 — 배선은
 * `use-rail-drag.ts` 가, 붙이는 일은 `ExploreScreen` 이 한다.
 *
 * 넘기는 문턱(거리·속도)은 새로 정하지 않고 시트가 쓰는
 * `f10-chatbot/lib/bottom-sheet` 의 `shouldDismissBottomSheet` 를 기준 길이만 화면 폭으로
 * 바꿔 재사용한다 — 한 폰 안에서 손짓마다 넘어가는 느낌이 다르면 안 된다(`sheet-drag.ts`
 * 가 여는 손짓에 같은 규칙을 쓰는 것과 같은 이유다).
 */

/**
 * 섹터가 밀려 나가고 들어오는 시간. 카드 스택이 굴러가는 460ms(`explore-cards`)보다 짧다 —
 * 한 장이 도는 것이 아니라 목록 전체가 갈리는 전환이라 같은 시간을 쓰면 굼떠 보인다.
 */
export const SECTOR_SLIDE_MS = 300;

/** 카드가 눕는 연출과 같은 감속 곡선. 한 화면 안에서 두 연출이 다른 곡선을 쓰면 따로 논다. */
const SLIDE_EASE = "cubic-bezier(.22,.61,.36,1)";

/** 축을 정하기 전에 필요한 최소 이동. `rail-drag` 의 클릭·드래그 문턱과 같은 값이다. */
export const AXIS_LOCK_PX = 6;

/** 끝 섹터에서 더 밀 때 남기는 저항. 0 이면 벽이 없는 것처럼 보이고, 1 이면 끝인 줄 모른다. */
const EDGE_RESIST = 0.3;

/**
 * 옆 칸에 미리 그려 두는 카드 수. 레일은 한 화면에 카드 한 장 반을 보이고 옆 칸은 언제나
 * 맨 위에서 시작하므로, 51장을 다 그려도 보이는 것은 앞의 몇 장뿐이다. 세 칸을 통째로
 * 그리면 스와이프 한 번에 카드 150장이 다시 그려진다.
 */
export const PREVIEW_CARDS = 4;

/** 옆 칸이 그릴 목록. 보이는 만큼만 자른다. */
export function sectorPreviewList<T>(list: readonly T[]): T[] {
  return list.slice(0, PREVIEW_CARDS);
}

/**
 * 트랙패드 두 손가락 가로 스와이프가 멎었다고 보는 시간.
 *
 * 휠에는 **손을 뗀 순간이 없다** — 이벤트가 잠깐 멎으면 그것이 끝이다. 트랙패드는 한 번
 * 쓸어도 이벤트를 몇 덩이로 끊어 보내고 그 사이가 100ms 를 넘기도 한다. 짧게 잡으면 한
 * 손짓이 둘로 갈려 어느 쪽도 문턱을 못 넘는다 — 90ms 로 두었더니 "잘 안 넘어간다"가 됐다.
 */
export const WHEEL_IDLE_MS = 200;

/** 줄 단위(`deltaMode:1`)로 오는 장치의 한 줄. 픽셀로 펴야 다른 손짓과 같은 자로 잰다. */
const WHEEL_LINE_PX = 16;

/**
 * 가로로 쓸려는 휠인가. **세로가 더 크면 손대지 않는다** — 그것은 카드를 넘기는 손짓이고,
 * 세로는 브라우저의 기본 스크롤이 그대로 받아야 한다. 같으면 세로로 본다(세로가 기본이다).
 */
export function isHorizontalWheel(deltaX: number, deltaY: number): boolean {
  return Math.abs(deltaX) > Math.abs(deltaY);
}

/**
 * 휠 한 번을 손짓 이동량으로 바꾼다. 부호가 뒤집히는 이유는 **미는 방향과 목록이 끌리는
 * 방향이 반대**여서다 — 두 손가락을 왼쪽으로 밀면 `deltaX` 는 양수이고, 그것은 목록을
 * 왼쪽으로 끈 것(`dx < 0`)과 같아서 다음 섹터로 간다. 손가락으로 왼쪽으로 쓰는 것과 같다.
 */
export function wheelDragDelta(deltaX: number, deltaMode: number): number {
  return -deltaX * (deltaMode === 1 ? WHEEL_LINE_PX : 1);
}

/** 목록을 넘기는 방향. `1` 은 다음 섹터(왼쪽으로 쓸었다), `-1` 은 이전 섹터다. */
export type SectorStep = 1 | -1;

/**
 * 스와이프가 지나가는 섹터 차례. **칩 줄과 같은 순서**를 쓴다(`sectorChips`) — 순서를 여기
 * 다시 적으면 칩을 눌러 가는 길과 쓸어 가는 길이 조용히 갈린다. 칩의 점등 판정과 무관한
 * id 목록만 쓰므로 켜진 칩은 넘기지 않는다.
 */
export function sectorSwipeOrder(universe: Universe): string[] {
  return sectorChips(universe, "").map((chip) => chip.id);
}

/** 손이 움직인 방향 → 목록 방향. 왼쪽으로 쓸면 다음 섹터가 오른쪽에서 들어온다. */
export function sectorSwipeStep(dx: number): SectorStep {
  return dx < 0 ? 1 : -1;
}

/**
 * 다음(또는 이전) 섹터. **양 끝에서는 순환하지 않고 `null`** 이다 — 51종목을 훑다가 한
 * 칸 더 밀었을 때 `전체` 로 되돌아오면 어디까지 봤는지 잃는다.
 */
export function nextSectorFilter(
  order: readonly string[],
  current: string,
  step: SectorStep,
): string | null {
  const at = order.indexOf(current);
  if (at < 0) return null;
  const next = at + step;
  return next >= 0 && next < order.length ? order[next] : null;
}

/**
 * 지금 섹터의 양옆. **옆 칸에 미리 그려 둘 목록**을 정한다 — 이것이 있어야 손가락을 따라
 * 옆 목록이 들어온다. 끝이면 그쪽은 `null` 이고 밀어도 벽이 있다.
 */
export function sectorNeighbors(order: readonly string[], current: string) {
  return {
    prev: nextSectorFilter(order, current, -1),
    next: nextSectorFilter(order, current, 1),
  };
}

/**
 * 두 섹터 사이의 방향. 칩을 누르거나 챗봇이 섹터로 뛰어들었을 때 **어느 쪽에서 들어와야
 * 하는지**를 정한다. 모르는 값이거나 제자리면 `null` 이라 연출을 걸지 않는다.
 */
export function sectorStepBetween(
  order: readonly string[],
  from: string,
  to: string,
): SectorStep | null {
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a < 0 || b < 0 || a === b) return null;
  return b > a ? 1 : -1;
}

/**
 * 어느 축의 손짓인지. 두 축 모두 문턱 아래면 아직 정하지 않는다(`null`) — 첫 몇 px 에서
 * 서둘러 정하면 세로로 넘기려던 손이 가로로 잠겨 섹터가 바뀐다.
 */
export function lockSwipeAxis(mainDelta: number, crossDelta: number): "main" | "cross" | null {
  const main = Math.abs(mainDelta);
  const cross = Math.abs(crossDelta);
  if (Math.max(main, cross) < AXIS_LOCK_PX) return null;
  return cross > main ? "cross" : "main";
}

export type SectorSwipeGesture = {
  /** 창 좌표 이동량. 배율이 걸리기 전 값이다. */
  dx: number;
  /** 창 좌표 px/ms. 손을 뗄 때의 속도다. */
  velocity: number;
  /** 레일의 실제 폭(화면 안쪽 px). 넘기는 문턱의 기준이다. */
  width: number;
  /** `PhoneFrame` 이 화면에 건 배율. 창 좌표를 화면 안쪽 좌표로 고친다. */
  scale: number;
};

/**
 * 손을 뗀 자리에서 섹터를 넘길지 제자리로 되돌릴지.
 *
 * 창이 아주 좁으면 배율이 0 까지 내려간다(`sheet-drag` 와 같은 이유로 0 이하는 1 로 본다).
 */
export function shouldCommitSectorSwipe({ dx, velocity, width, scale }: SectorSwipeGesture) {
  const safeScale = scale > 0 ? scale : 1;
  return shouldDismissBottomSheet({
    distance: Math.abs(dx) / safeScale,
    velocity: (Math.abs(velocity) / safeScale) * 1_000,
    sheetHeight: Math.max(1, width),
  });
}

/**
 * 끄는 동안 레일이 밀려 있는 거리(화면 안쪽 px). 창 좌표를 배율로 고치고 한 폭을 넘지
 * 않게 자른다. 넘어갈 섹터가 없으면(`atEdge`) 눌러서 벽이 있다고 알린다.
 */
/**
 * 트랙패드 손짓이 넘어가는 거리(한 폭에 대한 비율).
 *
 * 손가락 문턱(폭의 20%, `shouldCommitSectorSwipe`)보다 낮다. 휠 델타는 화면 거리와 1:1 이
 * 아니라 장치와 사용자 설정이 정하는 값이고, 손을 뗀 순간이 없어 한 손짓이 몇 덩이로 끊겨
 * 들어온다. 손가락과 같은 자를 들이대면 천천히 쓸 때마다 반씩 나뉘어 아무것도 안 넘어간다.
 */
const WHEEL_COMMIT_RATIO = 0.12;

/**
 * 트랙패드로 이만큼 밀었으면 넘긴다. **손을 떼기를 기다리지 않고 넘는 순간 넘긴다** —
 * 기다리면 그 사이에 손짓이 끊겨 판정을 놓친다(`WHEEL_IDLE_MS` 주석).
 *
 * 속도를 보지 않는 이유는 휠 한 번의 델타가 손가락 한 프레임보다 훨씬 커서, 속도로 재면
 * 살짝 튕긴 것도 문턱을 넘기 때문이다.
 */
export function shouldCommitWheelSwipe({ dx, width, scale }: Omit<SectorSwipeGesture, "velocity">) {
  const safeScale = scale > 0 ? scale : 1;
  return Math.abs(dx) / safeScale >= Math.max(1, width) * WHEEL_COMMIT_RATIO;
}

export function sectorDragOffset(
  { dx, width, scale }: Omit<SectorSwipeGesture, "velocity">,
  atEdge: boolean,
) {
  const safeScale = scale > 0 ? scale : 1;
  const moved = dx / safeScale;
  if (atEdge) return moved * EDGE_RESIST;
  return Math.max(-width, Math.min(width, moved));
}

/**
 * 켜진 칩을 칩 줄 **왼쪽에 세우기 위한** 새 `scrollLeft`.
 *
 * 칩의 차례는 건드리지 않는다 — 줄이 움직여 켜진 칩이 왼쪽에 오는 것이다. 한때 켜진 칩을
 * 목록 앞으로 끌어올린 적이 있는데, 그러면 누르는 순간 그 칩이 손가락 밑에서 튀고 옆 칩들이
 * 밀려 다음에 누르려던 칩이 딴 자리에 가 있었다(`explore-cards` 의 `sectorChips` 주석).
 *
 * 창 좌표로 잰 거리를 배율로 고쳐 레이아웃 px 로 돌려준다 — `PhoneFrame` 이 화면을 줄여
 * 그리므로 잰 값을 그대로 밀면 덜 움직인다. **오른쪽 끝이라 더 못 미는 경우는 여기서 따로
 * 자르지 않는다**: 브라우저가 끝에서 멈추고, 그 자리는 그대로 두는 것이 이 줄의 규칙이다.
 */
export function chipScrollLeft({
  scrollLeft,
  chipLeft,
  rowLeft,
  inset,
  scale,
}: {
  /** 지금 줄이 밀려 있는 자리. */
  scrollLeft: number;
  /** 켜진 칩의 창 좌표 왼쪽 변. */
  chipLeft: number;
  /** 줄의 창 좌표 왼쪽 변. */
  rowLeft: number;
  /** 왼쪽에 남길 여백(레이아웃 px). 줄 첫 칩이 평소 갖는 여백과 같아야 한다. */
  inset: number;
  /** `PhoneFrame` 이 화면에 건 배율. */
  scale: number;
}) {
  const safeScale = scale > 0 ? scale : 1;
  return scrollLeft + (chipLeft - rowLeft) / safeScale - inset;
}

export type SectorTrack = {
  /** 트랙이 밀려 있는 거리(화면 안쪽 px). 음수면 왼쪽이다. 제자리는 0 이다. */
  offsetPx: number;
  /** 손가락을 따라가는 동안에는 거짓이어야 한다. 참이면 미끄러지는 연출이 붙는다. */
  animated: boolean;
};

/**
 * 세 칸 트랙(이전·현재·다음)에 얹는 가로 이동.
 *
 * **옅어지게 하지 않는다.** 한 칸만 밀어낼 때는 빈 화면을 덮으려고 페이드를 넣었지만,
 * 옆 목록이 실제로 들어오는 지금은 두 목록이 같이 흐려져 어색하다. 세로 넘김도 카드가
 * 눕기만 하고 목록이 흐려지지는 않는다.
 *
 * 값을 객체로 돌려주는 이유는 이 스타일의 **주인이 DOM 이기 때문**이다 — 끄는 동안에는
 * React 를 거치지 않고 트랙 노드에 직접 쓴다(카드 51장을 매 프레임 다시 그리지 않는다).
 */
export function sectorTrackStyle({ offsetPx, animated }: SectorTrack) {
  return {
    transform: `translate3d(${offsetPx.toFixed(1)}px,0,0)`,
    transition: animated ? `transform ${SECTOR_SLIDE_MS}ms ${SLIDE_EASE}` : "none",
  };
}
