import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { STOCKS } from "../../../shared/data/stocks";
import { routeFromPath } from "../screen-route";
import {
  TUTORIAL_STEPS,
  TUTORIAL_STOCK,
  type TutorialPlace,
  type TutorialStage,
  enterPath,
  isSamePlace,
  nextStepIndex,
  stepIndexAt,
} from "./tutorial-steps";

// 튜토리얼 단계 데이터와 "지금 어느 장인가" 판정.
// 화면에서 읽으므로 카운터가 없다 — 아이가 뒤로 가도 설명이 어긋나지 않는지를 여기서 지킨다.

const steps = TUTORIAL_STEPS;

// ── 순서 ────────────────────────────────────────────────────────────────────

// 사러 가는 길 하나를 끝까지 따라간다. 홈에서 시작해 매수 3단계, 매도 3단계로 끝난다.
assert.deepEqual(
  steps.map((step) => step.id),
  [
    "home-goal",
    "nav-trade",
    "explore-chips",
    "explore-cards",
    "detail-chart",
    "detail-about",
    "detail-news",
    "detail-buy",
    "buy-tabs",
    "buy-amount",
    "buy-price",
    "buy-reason",
    "buy-done",
    "sell-amount",
    "sell-price",
    "sell-recall",
    "sell-reason",
    "sell-done",
  ],
);

// ── 데이터 자체 ─────────────────────────────────────────────────────────────

const ids = steps.map((step) => step.id);
assert.equal(new Set(ids).size, ids.length);

for (const step of steps) {
  // 빈 문안은 말풍선을 빈 채로 띄운다.
  for (const [key, value] of Object.entries(step)) {
    if (typeof value === "string") assert.equal(value.trim().length > 0, true, `${step.id}.${key}`);
  }
  assert.equal(step.anchors.length > 0, true, step.id);
  // `side` 는 매수·매도가 갈리는 주문 화면에서만 뜻이 있다.
  if (step.side !== undefined) assert.equal(step.screen, "order", step.id);
  // 주문 화면은 반대로 `side` 가 없으면 매도 화면에 매수 문안이 뜬다.
  if (step.screen === "order") assert.notEqual(step.side, undefined, step.id);
}

// ── 진입로 ──────────────────────────────────────────────────────────────────

// **자리를 옮기는 모든 장에 진입로가 있다.** 하나라도 비면 `다음` 이 아무 일도 하지 않는
// 장이 생기고 안내가 거기서 끊긴다.
for (let i = 0; i + 1 < steps.length; i += 1) {
  if (isSamePlace(steps[i], steps[i + 1])) continue;
  assert.notEqual(steps[i + 1].enter, undefined, `${steps[i + 1].id} 진입로`);
}

// 같은 자리에 이어 붙은 장은 진입로가 필요 없다 — `다음` 이 그 자리에서 넘어간다.
assert.equal(isSamePlace(steps[8], steps[9]), true);
assert.equal(steps[9].enter, undefined);

// 진입로는 목적지가 들고 있다. 종목 코드가 주소에 필요한 자리는 이동 버튼을 눌러 들어간다.
const enterOf = (id: string) => steps.find((step) => step.id === id)?.enter;
assert.deepEqual(enterOf("home-goal"), { path: "/" });
assert.deepEqual(enterOf("explore-chips"), { anchors: ["tut-nav-trade"] });
assert.deepEqual(enterOf("buy-tabs"), { anchors: ["tut-detail-buy"] });

// 종목은 고정이다. 아이가 카드를 어디까지 밀어 놨든 같은 회사로 들어가야 뒤따르는
// 설명이 맞는다 — 카드를 대신 누르던 예전 길은 `id` 가 붙은 슬라이드에 `onClick` 이
// 없어 흐름이 거기서 끊겼다.
assert.deepEqual(enterOf("detail-chart"), { path: `/stock/${TUTORIAL_STOCK}` });
assert.deepEqual(routeFromPath(`/stock/${TUTORIAL_STOCK}`), {
  screen: "stock",
  code: TUTORIAL_STOCK,
});
// 유니버스에 있는 회사여야 한다. 없는 코드는 화면이 탐색으로 되돌려 보낸다.
assert.equal(
  STOCKS.some((stock) => stock.symbol === TUTORIAL_STOCK),
  true,
  TUTORIAL_STOCK,
);
// 방금 산 그 회사를 그대로 팔러 간다.
assert.deepEqual(enterOf("sell-amount"), { path: "/sell/:code" });

// 주문 단계는 고르는 자리를 지나야 `다음` 이 켜진다. 튜토리얼이 기본값을 눌러 두고 넘긴다.
assert.deepEqual(enterOf("buy-reason"), {
  anchors: ["tut-order-amount-preset", "tut-order-next"],
});
assert.deepEqual(enterOf("buy-done"), {
  anchors: ["tut-order-reason-first", "tut-order-plan-first", "tut-order-next"],
});
assert.deepEqual(enterOf("sell-recall"), { anchors: ["tut-order-next"] });
assert.deepEqual(enterOf("sell-done"), {
  anchors: ["tut-sell-reason-first", "tut-sell-change-first", "tut-order-next"],
});

// 주문 화면 **안에서** 다음 단계로 넘어가는 길은 마지막이 언제나 그 단계를 넘기는
// 버튼이다 — 고르기만 하고 안 넘기면 그 자리에서 멈춘다.
for (let i = 0; i + 1 < steps.length; i += 1) {
  const [from, to] = [steps[i], steps[i + 1]];
  if (from.screen !== "order" || to.screen !== "order" || from.side !== to.side) continue;
  if (!to.enter || !("anchors" in to.enter)) continue;
  assert.equal(to.enter.anchors.at(-1), "tut-order-next", to.id);
}

for (const step of steps) {
  if (step.enter && "anchors" in step.enter) assert.equal(step.enter.anchors.length > 0, true, step.id);
}

// 주소로 들어가는 자리는 그 화면의 실제 주소여야 한다.
const PATH_OF: Record<string, string> = {
  home: "/",
  explore: "/explore",
  portfolio: "/portfolio",
  ranking: "/ranking",
  archive: "/archive",
  stock: `/stock/${TUTORIAL_STOCK}`,
};
for (const step of steps) {
  if (!step.enter || !("path" in step.enter)) continue;
  if (step.screen === "order") {
    assert.equal(step.enter.path, `/${step.side}/:code`, step.id);
    continue;
  }
  assert.equal(step.enter.path, PATH_OF[step.screen], step.id);
}

// `:code` 는 지금 보고 있는 종목으로 채운다. 모르면 앱이 아는 주소가 아니라 404 다 —
// 엉뚱한 화면으로 데려가느니 그 자리에 머무는 편이 낫다.
assert.deepEqual(routeFromPath(enterPath("/sell/:code", { screen: "order", code: "005930" })), {
  screen: "order",
  code: "005930",
  side: "sell",
});
assert.equal(routeFromPath(enterPath("/sell/:code", { screen: "order" })), null);

// ── 앵커가 화면에 실재하는가 ────────────────────────────────────────────────

// 짚을 id 가 화면에 없으면 구멍이 안 뚫리고, 그 id 가 진입로면 `다음` 이 죽는다.
// 실제로 `tut-detail-news` 가 어느 화면에도 없는 채로 오래 남아 상세에서 뉴스로
// 넘어가지 않았다 — 그때 이 검사는 화이트리스트 한 줄로 비켜 가 있었다. 예외를 두지 않는다.
// `npm test` 는 `web/` 에서 돌고 테스트 glob 도 거기 기준이다. `import.meta.dirname` 은
// tsx 가 CJS 로 옮길 때 비어 있어 못 쓴다.
const screensDir = path.resolve("features/f0-home");
assert.equal(readdirSync(screensDir).includes("TutorialOverlay.tsx"), true, screensDir);
const domAnchors = new Set(
  [screensDir, path.join(screensDir, "lib")]
    .flatMap((dir) =>
      readdirSync(dir)
        .filter((name) => name.endsWith(".tsx"))
        .map((name) => readFileSync(path.join(dir, name), "utf8")),
    )
    .flatMap((source) => [...source.matchAll(/id=\{?[^}\n]*?"(tut-[a-z-]+)"/g)])
    .map((match) => match[1]),
);
// 짚는 앵커와 대신 눌러 주는 앵커 둘 다 화면에 있어야 한다.
const usedAnchors = new Set(
  steps.flatMap((step) => [
    ...step.anchors,
    ...(step.enter && "anchors" in step.enter ? step.enter.anchors : []),
  ]),
);
for (const anchor of usedAnchors) {
  assert.equal(domAnchors.has(anchor), true, `화면에 없는 앵커: ${anchor}`);
}

// ── 지금 어느 장인가 ────────────────────────────────────────────────────────

const at = (screen: TutorialPlace["screen"], stage?: TutorialStage, side?: "buy" | "sell") =>
  stepIndexAt(steps, { screen, stage, side });

assert.equal(steps[at("home")].id, "home-goal");
assert.equal(steps[at("explore")].id, "explore-chips");
assert.equal(steps[at("stock", "detail")].id, "detail-chart");

// 매수 1단계와 매도 1단계는 화면도 단계도 같다. `side` 가 둘을 가른다.
assert.equal(steps[at("order", "order-1", "buy")].id, "buy-tabs");
assert.equal(steps[at("order", "order-1", "sell")].id, "sell-amount");
assert.equal(steps[at("order", "order-2", "buy")].id, "buy-reason");
assert.equal(steps[at("order", "order-2", "sell")].id, "sell-recall");
assert.equal(steps[at("order", "order-3", "buy")].id, "buy-done");
assert.equal(steps[at("order", "order-3", "sell")].id, "sell-done");

// 문안이 따로 없는 자리(차트·뉴스 화면)에서도 그 화면 설명으로 물러선다.
assert.equal(steps[at("stock", "chart")].id, "detail-chart");
assert.equal(steps[at("stock", "news")].id, "detail-chart");

// 순서에 없는 화면은 못 찾는다 — 오버레이가 이때 튜토리얼을 닫는다.
assert.equal(at("archive"), -1);
assert.equal(at("portfolio"), -1);
assert.equal(at("ranking"), -1);

// ── 다음 장 ─────────────────────────────────────────────────────────────────

assert.equal(steps[nextStepIndex(steps, 0)].id, "nav-trade");
assert.equal(nextStepIndex(steps, steps.length - 1), -1);
assert.equal(nextStepIndex(steps, -1), -1);

// 같은 자리끼리 / 다른 자리끼리.
assert.equal(isSamePlace(steps[9], steps[10]), true);
assert.equal(isSamePlace(steps[10], steps[11]), false);
// 매수 1단계와 매도 1단계는 같은 자리가 아니다.
assert.equal(isSamePlace(steps[9], steps[13]), false);
