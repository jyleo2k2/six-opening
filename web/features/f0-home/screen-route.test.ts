import assert from "node:assert/strict";
import { pathFromRoute, routeFromPath, SCREEN_SEGMENTS } from "./screen-route";

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
  assert.deepEqual(routeFromPath("/explore/game"), { screen: "explore", sector: "game" });
  assert.deepEqual(routeFromPath("/explore/watch"), { screen: "explore", sector: "watch" });
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
  // 탐색 섹터는 소문자 영문만. 형식이 아니면 주소가 아니다.
  assert.equal(routeFromPath("/explore/GAME"), null);
  assert.equal(routeFromPath("/explore/game/extra"), null);
});

test("화면을 주소로 되돌린다 — 왕복이 같아야 한다", () => {
  const routes = [
    { screen: "home" },
    { screen: "explore" },
    { screen: "explore", sector: "game" },
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

console.log("screen-route tests passed");
