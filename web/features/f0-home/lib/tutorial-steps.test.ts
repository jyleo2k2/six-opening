import assert from "node:assert/strict";
import {
  TUTORIAL_LENGTH,
  TUTORIAL_LENGTHS,
  TUTORIAL_STEPS,
  isSamePlace,
  nextStepIndex,
  stepIndexAt,
  tutorialSteps,
} from "./tutorial-steps";

// 튜토리얼 단계 데이터와 "지금 어느 장인가" 판정.
// 화면에서 읽으므로 카운터가 없다 — 아이가 뒤로 가도 설명이 어긋나지 않는지를 여기서 지킨다.

// ── 길이 ────────────────────────────────────────────────────────────────────

assert.deepEqual(
  TUTORIAL_LENGTHS.map((length) => tutorialSteps(length).length),
  [5, 8, 13],
);

// 5 ⊂ 8 ⊂ 13. 길이를 바꿔도 이미 읽은 장이 사라지거나 뒤바뀌지 않는다.
for (let i = 0; i + 1 < TUTORIAL_LENGTHS.length; i += 1) {
  const shorter = tutorialSteps(TUTORIAL_LENGTHS[i]).map((step) => step.id);
  const longer = tutorialSteps(TUTORIAL_LENGTHS[i + 1]).map((step) => step.id);
  for (const id of shorter) assert.equal(longer.includes(id), true, id);
  // 부분집합이면서 순서도 같다.
  assert.deepEqual(longer.filter((id) => shorter.includes(id)), shorter);
}

// 기본 길이는 8 이고 그 8 장은 **화면마다 정확히 한 장**이다 — 화면당 한 장을 저절로
// 띄우는 방식으로 갈아타도 문안을 다시 쓸 일이 없어야 한다.
assert.equal(TUTORIAL_LENGTH, 8);
const places = tutorialSteps(8).map((step) => `${step.screen}:${step.stage ?? ""}`);
assert.equal(new Set(places).size, places.length);
assert.deepEqual(places, [
  "home:",
  "explore:",
  "stock:detail",
  "stock:news",
  "order:order-1",
  "portfolio:",
  "ranking:",
  "archive:",
]);

// ── 데이터 자체 ─────────────────────────────────────────────────────────────

// id 는 겹치지 않는다.
const ids = TUTORIAL_STEPS.map((step) => step.id);
assert.equal(new Set(ids).size, ids.length);

for (const step of TUTORIAL_STEPS) {
  // 빈 칸이 있으면 말풍선이 반쯤 빈 채로 뜬다.
  for (const field of ["title", "what", "term", "concept", "hint"] as const) {
    assert.equal(step[field].trim().length > 0, true, `${step.id}.${field}`);
  }
  assert.equal(step.anchors.length > 0, true, step.id);
  // 미니바는 제목이 아니라 다음에 뭘 할지를 띄운다. 둘이 같으면 접은 뜻이 없다.
  assert.notEqual(step.hint, step.title, step.id);
  // 말투는 해요체다. 정본 톤이고, 원본의 반말을 되살리지 않는다.
  assert.match(step.what, /요[.!?]$/u, step.id);
  assert.match(step.concept, /요[.!?]$/u, step.id);
}

// 종목 추천·매매 시점·목표가·수익률 전망은 금지다. 문안에 새로 섞여 들어오면 잡는다.
const RED_LINES = /추천|사세요|파세요|오를 거|내릴 거|오릅니다|목표가|수익을 낼/u;
for (const step of TUTORIAL_STEPS) {
  assert.equal(RED_LINES.test(`${step.what} ${step.concept} ${step.hint}`), false, step.id);
}

// 원본 문안이 지금 화면과 어긋나 고친 자리 — 되돌아오면 잡는다.
const cards = TUTORIAL_STEPS.find((step) => step.id === "explore-cards")!;
assert.equal(cards.what.includes("위아래로"), true); // 탐색 카드는 세로 스와이프다
assert.equal(cards.what.includes("옆으로"), false);

// ── 지금 어느 장인가 ────────────────────────────────────────────────────────

const steps = tutorialSteps(13);
const idAt = (screen: string, stage?: string) =>
  steps[stepIndexAt(steps, { screen, stage } as never)]?.id;

// 자리를 정확히 아는 장이 먼저다.
assert.equal(idAt("stock", "detail"), "detail");
assert.equal(idAt("stock", "news"), "news");
assert.equal(idAt("order", "order-1"), "order-amount");
assert.equal(idAt("order", "order-2"), "order-reason");

// 화면만 아는 장은 그 화면 어디에 있든 걸린다.
assert.equal(idAt("home"), "home");
assert.equal(idAt("portfolio"), "portfolio");

// 문안이 따로 없는 자리(차트)에서도 그 화면의 첫 장으로 물러선다 — 빈 화면을 주지 않는다.
assert.equal(idAt("stock", "chart"), "detail");

// 완료 단계처럼 문안이 없는 자리도 마찬가지다.
assert.equal(idAt("order", "order-3"), "order-amount");

// 튜토리얼이 다루지 않는 화면은 없다 — 화면 일곱 종이 전부 걸린다.
for (const screen of [
  "home",
  "explore",
  "ranking",
  "portfolio",
  "archive",
  "stock",
  "order",
] as const) {
  assert.notEqual(stepIndexAt(steps, { screen }), -1, screen);
}

// 짧은 길이에서는 그 화면에 남은 장이 걸린다 — 5 장짜리 탐색은 칩이 아니라 카드다.
const five = tutorialSteps(5);
assert.equal(five[stepIndexAt(five, { screen: "explore" })].id, "explore-cards");

// ── 이어보기 ────────────────────────────────────────────────────────────────

// 같은 자리면 그 자리에서 바로 이어진다.
const amount = steps.findIndex((step) => step.id === "order-amount");
assert.equal(steps[nextStepIndex(steps, amount)].id, "order-reserve");
assert.equal(isSamePlace(steps[amount], steps[amount + 1]), true);

// 자리가 바뀌면 이어지지 않는다 — 대신 눌러 주지 않고 힌트만 남긴다.
const reserve = amount + 1;
assert.equal(isSamePlace(steps[reserve], steps[nextStepIndex(steps, reserve)]), false);

// 계좌 화면 세 장은 한자리에서 이어진다.
const holdings = steps.findIndex((step) => step.id === "portfolio");
assert.equal(steps[nextStepIndex(steps, holdings)].id, "portfolio-pending");
assert.equal(steps[nextStepIndex(steps, holdings + 1)].id, "portfolio-sell");
assert.equal(isSamePlace(steps[holdings], steps[holdings + 2]), true);

// 마지막 장 다음은 없다.
assert.equal(nextStepIndex(steps, steps.length - 1), -1);
assert.equal(nextStepIndex(steps, -1), -1);

// ── 진입로 ──────────────────────────────────────────────────────────────────

// `다음` 이 자리를 옮겨야 하는데 진입로가 없으면 데려갈 수가 없다. 아이가 직접 골라야
// 넘어가는 자리(주문 2단계)만 예외로 둔다 — 대신 골라 주는 것이 원본의 문제였다.
const NEEDS_CHOICE = new Set(["order-reason"]);
for (const [length, list] of TUTORIAL_LENGTHS.map(
  (n) => [n, tutorialSteps(n)] as const,
)) {
  for (let i = 0; i + 1 < list.length; i += 1) {
    if (isSamePlace(list[i], list[i + 1])) continue;
    const target = list[i + 1];
    const has = target.enter !== undefined;
    assert.equal(has, !NEEDS_CHOICE.has(target.id), `${length}장: ${target.id} 진입로`);
  }
}

// 진입로는 목적지가 들고 있다 — 길이가 달라도 같은 자리로는 같은 길로 들어간다.
// (8장에서 주문 다음은 계좌, 13장에서는 예약이다. 장에 매달면 둘이 어긋난다.)
const enterOf = (id: string) => TUTORIAL_STEPS.find((step) => step.id === id)?.enter;
assert.deepEqual(enterOf("home"), { path: "/" });
assert.deepEqual(enterOf("portfolio"), { path: "/portfolio" });
assert.deepEqual(enterOf("archive"), { path: "/archive" });

// 종목 코드는 주소에 필요한데 화면만 안다. 그런 자리는 이동 버튼을 눌러 들어간다.
assert.deepEqual(enterOf("detail"), { anchor: "tut-explore-cards" });
assert.deepEqual(enterOf("news"), { anchor: "tut-detail-news" });
assert.deepEqual(enterOf("order-amount"), { anchor: "tut-detail-buy" });

// 진입로가 가리키는 앵커는 **그 자리로 데려가는 버튼**이고, 어느 장이든 짚는 앵커
// 목록에 실재하는 id 여야 한다 — 오타면 `다음` 이 조용히 아무 일도 안 한다.
const KNOWN_ANCHORS = new Set(TUTORIAL_STEPS.flatMap((step) => step.anchors));
KNOWN_ANCHORS.add("tut-detail-news");
for (const step of TUTORIAL_STEPS) {
  if (!step.enter || !("anchor" in step.enter)) continue;
  assert.equal(KNOWN_ANCHORS.has(step.enter.anchor), true, step.id);
}

// 주소로 들어가는 자리는 그 화면의 실제 주소여야 한다.
const PATH_OF: Record<string, string> = {
  home: "/",
  explore: "/explore",
  portfolio: "/portfolio",
  ranking: "/ranking",
  archive: "/archive",
};
for (const step of TUTORIAL_STEPS) {
  if (!step.enter || !("path" in step.enter)) continue;
  assert.equal(step.enter.path, PATH_OF[step.screen], step.id);
}
