import assert from "node:assert/strict";
import {
  AXIS_LOCK_PX,
  lockSwipeAxis,
  nextSectorFilter,
  sectorDragOffset,
  sectorRailStyle,
  sectorStepBetween,
  sectorSwipeOrder,
  sectorSwipeStep,
  shouldCommitSectorSwipe,
  SECTOR_SLIDE_MS,
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

// 손가락을 따라가는 동안에는 전환이 없어야 한다. 있으면 손보다 레일이 늦게 온다.
const dragging = sectorRailStyle({ offsetPx: -100, width: 402, animated: false });
assert.match(dragging, /transform:translate3d\(-100\.0px,0,0\)/u);
assert.match(dragging, /transition:none/u);
// 밀려 나가고 들어올 때만 전환이 붙고, 멀어질수록 옅어진다.
const leaving = sectorRailStyle({ offsetPx: 402, width: 402, animated: true });
assert.match(leaving, new RegExp(`transform ${SECTOR_SLIDE_MS}ms`, "u"));
assert.match(leaving, /opacity:0\.650/u);
assert.match(sectorRailStyle({ offsetPx: 0, width: 402, animated: true }), /opacity:1\.000/u);
// 폭을 모르면(첫 렌더) 0 으로 나누지 않는다.
assert.match(sectorRailStyle({ offsetPx: 0, width: 0, animated: false }), /opacity:1\.000/u);
