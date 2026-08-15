import assert from "node:assert/strict";
import {
  advanceRailDrag,
  beginRailDrag,
  nearestCardByCenter,
  railFling,
  stepRailFling,
} from "./rail-drag";

// 마우스로 카드 레일을 끄는 제스처. 브라우저 없이 확인할 수 있어야 해서 계산만 떼어 둔다.

// 끈 만큼 스크롤이 반대로 간다 — 오른쪽으로 끌면 앞 카드가 나온다.
const right = advanceRailDrag(beginRailDrag(300, 500, 0), 380, 100);
assert.equal(right.scrollLeft, 420);

const left = advanceRailDrag(beginRailDrag(300, 500, 0), 220, 100);
assert.equal(left.scrollLeft, 580);

// 이동은 누적하지 않고 누른 자리에서 다시 잰다. 두 번 움직여도 시작점 기준이다.
const twice = advanceRailDrag(advanceRailDrag(beginRailDrag(300, 500, 0), 340, 50), 380, 100);
assert.equal(twice.scrollLeft, 420);

// 6px 이하는 제자리 클릭이다 — 여기서 드래그로 보면 카드 진입이 사라진다.
assert.equal(advanceRailDrag(beginRailDrag(300, 0, 0), 306, 10).dragged, false);
assert.equal(advanceRailDrag(beginRailDrag(300, 0, 0), 307, 10).dragged, true);

// 한 번 넘으면 되돌아와도 드래그다. 끌었다 제자리로 온 손을 클릭으로 되돌리면
// 손을 뗀 자리의 카드가 열려 버린다.
const returned = advanceRailDrag(advanceRailDrag(beginRailDrag(300, 0, 0), 400, 10), 300, 20);
assert.equal(returned.dragged, true);

// 같은 시각에 두 번 들어와도 0 으로 나누지 않는다.
const sameMoment = advanceRailDrag(beginRailDrag(300, 0, 0), 380, 0);
assert.equal(sameMoment.velocity, 0);
assert.equal(sameMoment.scrollLeft, -80);

// 속도는 마지막 표본의 px/ms 다.
const moved = advanceRailDrag(advanceRailDrag(beginRailDrag(0, 0, 0), 100, 10), 200, 20);
assert.equal(moved.velocity, 10);

// 튕김은 속도의 반대 방향이다 — 왼쪽으로 끌면(음수) 스크롤은 오른쪽으로 미끄러진다.
assert.ok(railFling({ ...moved, velocity: -1 }) > 0);
assert.ok(railFling({ ...moved, velocity: 1 }) < 0);

// 상한 48px. 세게 튕겨도 화면을 날려 보내지 않는다.
assert.equal(railFling({ ...moved, velocity: -100 }), 48);
assert.equal(railFling({ ...moved, velocity: 100 }), -48);
assert.equal(railFling({ ...moved, velocity: -1 }), 16);

// 손을 멈춘 채 떼면 튕기지 않는다. `-0 * 16` 이라 값은 -0 이지만 배선이 보는
// `!== 0` 판정은 0 과 같다 — 튕김 타이머를 아예 걸지 않는 쪽으로 간다.
assert.ok(railFling({ ...moved, velocity: 0 }) === 0);

// 감쇠는 줄어들고 0.6 아래에서 멈춘다(0 을 돌려준다).
assert.equal(stepRailFling(48), 48 * 0.93);
assert.ok(Math.abs(stepRailFling(10)) < 10);
assert.equal(stepRailFling(0.6), 0);
assert.equal(stepRailFling(-0.6), 0);
assert.equal(stepRailFling(0), 0);

// 상한에서 시작해도 멈춘다 — 무한 루프로 스냅이 영영 안 돌아오면 안 된다.
let fling = railFling({ ...moved, velocity: -100 });
let frames = 0;
while (fling !== 0 && frames < 1_000) {
  fling = stepRailFling(fling);
  frames++;
}
assert.equal(fling, 0);
assert.ok(frames < 100, `튕김이 ${frames}프레임이나 이어졌다`);

// 가운데에 가장 가까운 카드를 고른다.
const cards = [
  { left: 0, width: 100 },
  { left: 120, width: 100 },
  { left: 240, width: 100 },
];
assert.equal(nearestCardByCenter(cards, 50), 0);
assert.equal(nearestCardByCenter(cards, 170), 1);
assert.equal(nearestCardByCenter(cards, 9_999), 2);

// 폭이 제각각이어도 간격이 아니라 중심으로 잰다.
const uneven = [
  { left: 0, width: 300 },
  { left: 300, width: 60 },
];
assert.equal(nearestCardByCenter(uneven, 320), 1);

// 카드가 없으면 0 이다. 빈 레일에서 -1 이 나가면 `children[-1]` 을 잡는다.
assert.equal(nearestCardByCenter([], 0), 0);
