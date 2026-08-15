import assert from "node:assert/strict";
import {
  actionFromRoute,
  pathFromRoute,
  routeFromAppScreen,
  routeFromChatContext,
  routeFromPath,
  SCREEN_SEGMENTS,
} from "./screen-route";

function test(name: string, run: () => void): void {
  run();
  console.log(`✓ ${name}`);
}

test("주소를 화면으로 읽는다", () => {
  assert.deepEqual(routeFromPath("/"), { screen: "home" });
  assert.deepEqual(routeFromPath(""), { screen: "home" });
  assert.deepEqual(routeFromPath("/archive"), { screen: "archive" });
  assert.deepEqual(routeFromPath("/ranking"), { screen: "ranking" });
  assert.deepEqual(routeFromPath("/portfolio"), { screen: "portfolio" });
  assert.deepEqual(routeFromPath("/explore"), { screen: "explore" });
  assert.deepEqual(routeFromPath("/stock/005930"), { screen: "stock", code: "005930" });
  assert.deepEqual(routeFromPath("/buy/005930"), { screen: "order", code: "005930", side: "buy" });
  assert.deepEqual(routeFromPath("/sell/000660"), { screen: "order", code: "000660", side: "sell" });
});

test("앞뒤 슬래시와 중복 슬래시를 견딘다", () => {
  assert.deepEqual(routeFromPath("/archive/"), { screen: "archive" });
  assert.deepEqual(routeFromPath("//archive//"), { screen: "archive" });
  assert.deepEqual(routeFromPath("/stock/005930/"), { screen: "stock", code: "005930" });
});

// 모르는 경로까지 앱을 띄우면 오타가 404 대신 홈으로 조용히 넘어간다.
test("모르는 경로와 잘못된 종목 코드는 null 이다", () => {
  assert.equal(routeFromPath("/asdf"), null);
  assert.equal(routeFromPath("/stock"), null);
  assert.equal(routeFromPath("/stock/12345"), null, "5자리는 종목 코드가 아니다");
  assert.equal(routeFromPath("/stock/abcdef"), null);
  assert.equal(routeFromPath("/stock/005930/extra"), null);
  assert.equal(routeFromPath("/buy"), null);
  assert.equal(routeFromPath("/archive/report"), null);
});

test("화면을 주소로 되돌린다 — 왕복이 같아야 한다", () => {
  const routes = [
    { screen: "home" },
    { screen: "explore" },
    { screen: "ranking" },
    { screen: "portfolio" },
    { screen: "archive" },
    { screen: "stock", code: "005930" },
    { screen: "order", code: "005930", side: "buy" },
    { screen: "order", code: "000660", side: "sell" },
  ] as const;
  for (const route of routes) {
    assert.deepEqual(routeFromPath(pathFromRoute(route)), route, pathFromRoute(route));
  }
});

// 라우트가 실제로 서빙되려면 Next 캐치올이 받을 수 있는 첫 칸이어야 한다.
test("주소 첫 칸 목록이 매핑과 어긋나지 않는다", () => {
  for (const segment of SCREEN_SEGMENTS) {
    const single = routeFromPath(`/${segment}`);
    const withCode = routeFromPath(`/${segment}/005930`);
    assert.ok(single || withCode, `${segment} 은 어느 형태로도 읽히지 않는다`);
  }
});

test("주소를 app.html 이 아는 화면 이동 지시로 바꾼다", () => {
  // 홈도 지시를 보낸다. 되살린 화면 임시값 때문에 앱이 홈에서 시작하지 않을 수 있다.
  assert.deepEqual(actionFromRoute({ screen: "home" }), {
    type: "open_screen",
    target: "home",
  });
  assert.deepEqual(actionFromRoute({ screen: "ranking" }), {
    type: "open_screen",
    target: "ranking",
  });
  assert.deepEqual(actionFromRoute({ screen: "explore" }), {
    type: "open_screen",
    target: "stock",
    stockView: "explore",
  });
  assert.deepEqual(actionFromRoute({ screen: "stock", code: "005930" }), {
    type: "open_screen",
    target: "stock",
    stockView: "detail",
    stockId: "KRX:005930",
  });
  assert.deepEqual(actionFromRoute({ screen: "order", code: "005930", side: "sell" }), {
    type: "open_screen",
    target: "order",
    orderSide: "sell",
    orderStep: "quantity",
    stockId: "KRX:005930",
  });
});

test("앱이 보내는 맥락을 주소로 바꾼다", () => {
  assert.deepEqual(routeFromChatContext({ screen: "home" }), { screen: "home" });
  assert.deepEqual(routeFromChatContext({ screen: "archive" }), { screen: "archive" });
  assert.deepEqual(routeFromChatContext({ screen: "stock", stockId: "KRX:005930" }), {
    screen: "stock",
    code: "005930",
  });
  // 맥락만으로는 매수·매도를 못 가리므로 종목까지만 좁힌다.
  assert.deepEqual(routeFromChatContext({ screen: "order", stockId: "KRX:000660" }), {
    screen: "stock",
    code: "000660",
  });
});

// 종목을 모르는 채 주소를 바꾸면 엉뚱한 곳을 가리킨다. 그럴 땐 주소를 그대로 둬야 한다.
test("종목 코드가 없는 맥락은 주소를 만들지 않는다", () => {
  assert.equal(routeFromChatContext({ screen: "stock" }), null);
  assert.equal(routeFromChatContext({ screen: "order" }), null);
  assert.equal(
    routeFromChatContext({ screen: "stock", stockId: "KRX:12345" as `KRX:${string}` }),
    null,
  );
});

// ── app.html 이 보내는 원래 화면 이름 ─────────────────────────────────────────
// 챗봇 맥락과 달리 홈·탐색·랭킹·계좌가 구분되고 매수·매도도 갈린다.

test("원래 화면 이름을 주소로 바꾼다 — 뭉뚱그리지 않는다", () => {
  assert.deepEqual(routeFromAppScreen("home", null), { screen: "home" });
  assert.deepEqual(routeFromAppScreen("explore", null), { screen: "explore" });
  assert.deepEqual(routeFromAppScreen("ranking", null), { screen: "ranking" });
  assert.deepEqual(routeFromAppScreen("portfolio", null), { screen: "portfolio" });
  assert.deepEqual(routeFromAppScreen("archive", null), { screen: "archive" });
  assert.deepEqual(routeFromAppScreen("detail", "005930"), { screen: "stock", code: "005930" });
  assert.deepEqual(routeFromAppScreen("buy", "005930"), {
    screen: "order",
    code: "005930",
    side: "buy",
  });
  assert.deepEqual(routeFromAppScreen("sell", "000660"), {
    screen: "order",
    code: "000660",
    side: "sell",
  });
});

// 차트·뉴스는 상세에서 열리는 하위 화면이라 아직 자기 주소가 없다.
test("차트·뉴스는 종목 상세 주소를 쓴다", () => {
  assert.deepEqual(routeFromAppScreen("chart", "005930"), { screen: "stock", code: "005930" });
  assert.deepEqual(routeFromAppScreen("news", "005930"), { screen: "stock", code: "005930" });
});

test("종목이 필요한 화면인데 코드가 없거나 이상하면 주소를 만들지 않는다", () => {
  assert.equal(routeFromAppScreen("detail", null), null);
  assert.equal(routeFromAppScreen("buy", null), null);
  assert.equal(routeFromAppScreen("sell", "12345"), null);
  assert.equal(routeFromAppScreen("모르는화면", null), null);
});

// 뭉뚱그린 맥락과 원래 이름이 같은 결론을 내는 화면은 서로 어긋나면 안 된다.
test("두 경로가 같은 화면에서 같은 주소를 만든다", () => {
  assert.deepEqual(routeFromAppScreen("home", null), routeFromChatContext({ screen: "home" }));
  assert.deepEqual(
    routeFromAppScreen("archive", null),
    routeFromChatContext({ screen: "archive" }),
  );
  assert.deepEqual(
    routeFromAppScreen("detail", "005930"),
    routeFromChatContext({ screen: "stock", stockId: "KRX:005930" }),
  );
});

console.log("screen route tests passed");
