import assert from "node:assert/strict";
import {
  AXIS_LOCK_PX,
  chipScrollLeft,
  isHorizontalWheel,
  lockSwipeAxis,
  nextSectorFilter,
  PREVIEW_CARDS,
  sectorDragOffset,
  sectorNeighbors,
  sectorPreviewList,
  sectorStepBetween,
  sectorSwipeOrder,
  sectorSwipeStep,
  sectorTrackStyle,
  shouldCommitSectorSwipe,
  shouldCommitWheelSwipe,
  wheelDragDelta,
  SECTOR_SLIDE_MS,
  WHEEL_IDLE_MS,
} from "./sector-swipe";
import { sectorChips } from "./explore-cards";
import type { Universe } from "./use-universe";

const universe: Universe = {
  sectors: [
    { id: "game", name: "게임", emoji: "🎮", accent: "#8B5CF6" },
    { id: "semi", name: "반도체", emoji: "🔬", accent: "#5B7CFA" },
  ],
  stocks: [],
  logos: {},
};

// 쓸어 가는 차례와 칩 줄의 차례는 **같은 목록**이어야 한다 — 따로 적으면 조용히 갈린다.
const order = sectorSwipeOrder(universe);
assert.deepEqual(order, ["all", "rank", "watch", "game", "semi"]);
assert.deepEqual(order, sectorChips(universe, "game").map((chip) => chip.id));

// 왼쪽으로 쓸면 다음 섹터, 오른쪽으로 쓸면 이전 섹터다.
assert.equal(sectorSwipeStep(-40), 1);
assert.equal(sectorSwipeStep(40), -1);

// 트랙패드 두 손가락 스와이프는 포인터가 아니라 휠로 온다. 세로가 더 크면 카드를 넘기는
// 손짓이므로 건드리지 않는다 — 같으면 세로로 본다(세로 레일이 기본이다).
assert.equal(isHorizontalWheel(30, 4), true);
assert.equal(isHorizontalWheel(-30, 4), true);
assert.equal(isHorizontalWheel(4, 30), false);
assert.equal(isHorizontalWheel(12, 12), false);
// 미는 방향과 목록이 끌리는 방향은 반대다. 줄 단위로 오는 장치는 한 줄을 16px 로 편다.
assert.equal(wheelDragDelta(30, 0), -30);
assert.equal(wheelDragDelta(-30, 0), 30);
assert.equal(wheelDragDelta(-2, 1), 32);
// 그래서 두 손가락을 왼쪽으로 밀면(deltaX 양수) 손가락으로 왼쪽으로 쓴 것과 같은 쪽으로 간다.
assert.equal(sectorSwipeStep(wheelDragDelta(30, 0)), 1);
assert.equal(sectorSwipeStep(wheelDragDelta(-30, 0)), -1);
// 멎었다고 보는 시간은 트랙패드가 이벤트를 끊어 보내는 사이보다 길어야 한 손짓이 둘로
// 갈리지 않는다. 짧게 잡았더니 "트랙패드로는 잘 안 넘어간다" 가 됐다.
assert.ok(WHEEL_IDLE_MS >= 150);

// 트랙패드 문턱은 폭의 12% 다. 휠 델타는 화면 거리와 1:1 이 아니라서 손가락과 같은 자를
// 들이대면 천천히 쓸 때마다 못 넘는다 — 아래 두 줄이 그 차이다.
assert.equal(shouldCommitWheelSwipe({ dx: -40, width: 402, scale: 1 }), false);
assert.equal(shouldCommitWheelSwipe({ dx: -50, width: 402, scale: 1 }), true);
assert.equal(shouldCommitSectorSwipe({ dx: -50, velocity: 0, width: 402, scale: 1 }), false);
// 방향은 문턱과 무관하고, 배율은 손가락과 같은 자로 고친다.
assert.equal(shouldCommitWheelSwipe({ dx: 50, width: 402, scale: 1 }), true);
assert.equal(shouldCommitWheelSwipe({ dx: -25, width: 402, scale: 0.5 }), true);
assert.equal(shouldCommitWheelSwipe({ dx: -1, width: 402, scale: 0 }), false);

// 켜진 칩을 줄 왼쪽에 세우는 자리. 창 좌표로 잰 거리를 배율로 고쳐 레이아웃 px 로 돌려준다.
assert.equal(chipScrollLeft({ scrollLeft: 0, chipLeft: 216, rowLeft: 100, inset: 16, scale: 1 }), 100);
assert.equal(chipScrollLeft({ scrollLeft: 40, chipLeft: 200, rowLeft: 100, inset: 16, scale: 0.5 }), 224);
// 이미 왼쪽에 서 있으면 움직이지 않는다. 배율 0 은 1 로 본다.
assert.equal(chipScrollLeft({ scrollLeft: 80, chipLeft: 116, rowLeft: 100, inset: 16, scale: 1 }), 80);
assert.equal(chipScrollLeft({ scrollLeft: 0, chipLeft: 116, rowLeft: 100, inset: 16, scale: 0 }), 0);

assert.equal(nextSectorFilter(order, "all", 1), "rank");
assert.equal(nextSectorFilter(order, "game", -1), "watch");
// 양 끝에서는 순환하지 않는다. 모르는 섹터도 넘길 곳이 없다.
assert.equal(nextSectorFilter(order, "all", -1), null);
assert.equal(nextSectorFilter(order, "semi", 1), null);
assert.equal(nextSectorFilter(order, "없는섹터", 1), null);

// 칩 탭·챗봇 점프는 이동량이 없다. 어디서 어디로 갔는지로 들어오는 쪽을 정한다.
assert.equal(sectorStepBetween(order, "all", "semi"), 1);
assert.equal(sectorStepBetween(order, "semi", "all"), -1);
assert.equal(sectorStepBetween(order, "game", "game"), null);
assert.equal(sectorStepBetween(order, "game", "없는섹터"), null);

// 축은 문턱을 넘은 뒤에 정한다. 서둘러 정하면 세로로 넘기려던 손이 가로로 잠긴다.
assert.equal(lockSwipeAxis(3, 4), null);
assert.equal(lockSwipeAxis(AXIS_LOCK_PX + 1, 2), "main");
assert.equal(lockSwipeAxis(2, -(AXIS_LOCK_PX + 1)), "cross");
// 같은 거리면 주축이 이긴다 — 세로 레일 위의 손짓이므로 세로가 기본이다.
assert.equal(lockSwipeAxis(20, 20), "main");

// 넘기는 문턱은 시트와 같은 규칙(폭의 20%, 또는 12px 이상을 빠르게)이다.
const rail = { width: 402, scale: 1 };
assert.equal(shouldCommitSectorSwipe({ dx: -60, velocity: 0.1, ...rail }), false);
assert.equal(shouldCommitSectorSwipe({ dx: -90, velocity: 0, ...rail }), true);
// 짧게 튕겨도 넘어간다 — 1.2px/ms = 1200px/s.
assert.equal(shouldCommitSectorSwipe({ dx: -20, velocity: -1.2, ...rail }), true);
// 방향은 문턱과 무관하다. 오른쪽으로 같은 만큼 쓸어도 같은 판정이다.
assert.equal(shouldCommitSectorSwipe({ dx: 90, velocity: 0, ...rail }), true);

// 배율은 창 좌표를 화면 안쪽 좌표로 고친다. 폰이 반으로 줄어 그려져 있으면 창에서 절반만
// 움직여도 화면 안에서는 같은 거리다 — 보이는 폰 폭을 기준으로 판정해야 손짓이 같게 느껴진다.
assert.equal(shouldCommitSectorSwipe({ dx: -30, velocity: 0, width: 402, scale: 0.5 }), false);
assert.equal(shouldCommitSectorSwipe({ dx: -45, velocity: 0, width: 402, scale: 0.5 }), true);
// 배율이 0 이면(창이 아주 좁다) 나눗셈이 무한이 되므로 1 로 본다 — 손을 대기만 해도 넘어가면 안 된다.
assert.equal(shouldCommitSectorSwipe({ dx: -1, velocity: 0, width: 402, scale: 0 }), false);

// 끄는 동안의 이동량. 배율로 고치고 한 폭에서 멈춘다.
assert.equal(sectorDragOffset({ dx: -100, width: 402, scale: 0.5 }, false), -200);
assert.equal(sectorDragOffset({ dx: -900, width: 402, scale: 1 }, false), -402);
// 끝 섹터에서는 눌러서 벽이 있다고 알린다.
assert.equal(sectorDragOffset({ dx: -100, width: 402, scale: 1 }, true), -30);

// 옆 칸은 지금 섹터의 양옆이다. 끝이면 그쪽은 없다 — 밀어도 벽이 있어야 한다.
assert.deepEqual(sectorNeighbors(order, "watch"), { prev: "rank", next: "game" });
assert.deepEqual(sectorNeighbors(order, "all"), { prev: null, next: "rank" });
assert.deepEqual(sectorNeighbors(order, "semi"), { prev: "game", next: null });

// 옆 칸은 보이는 앞쪽 몇 장만 그린다. 세 칸을 통째로 그리면 스와이프 한 번에 150장이 돈다.
assert.equal(sectorPreviewList([1, 2, 3, 4, 5, 6, 7]).length, PREVIEW_CARDS);
assert.deepEqual(sectorPreviewList([1, 2]), [1, 2]);
assert.deepEqual(sectorPreviewList([]), []);

// 손가락을 따라가는 동안에는 전환이 없어야 한다. 있으면 손보다 트랙이 늦게 온다.
const dragging = sectorTrackStyle({ offsetPx: -100, animated: false });
assert.equal(dragging.transform, "translate3d(-100.0px,0,0)");
assert.equal(dragging.transition, "none");
// 손을 뗀 뒤 미끄러질 때만 전환이 붙는다. 옅어지지는 않는다 — 옆 목록이 실제로 들어온다.
const settling = sectorTrackStyle({ offsetPx: 402, animated: true });
assert.equal(settling.transform, "translate3d(402.0px,0,0)");
assert.match(settling.transition, new RegExp(`^transform ${SECTOR_SLIDE_MS}ms `, "u"));
assert.doesNotMatch(settling.transition, /opacity/u);
