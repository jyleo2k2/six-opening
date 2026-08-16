import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CTA_OFF_CSS, CTA_ON_CSS, DETAIL_BUY_CSS, SCREEN_BG } from "./prototype-theme";

/**
 * 원본 프로토타입과 React 화면이 같은 값을 쓰는지 대조한다.
 *
 * 화면을 옮기는 동안 바탕색과 주문 CTA 가 원본과 조용히 어긋났고, 눈으로 보기 전까지
 * 아무도 몰랐다. 어긋날 수 있는 값은 사람이 두 파일을 번갈아 보는 대신 여기서 대조한다 —
 * `detail-logo-ui.test.ts` 가 `universe.js` 와 카드 코드를 대조하는 것과 같은 방식이다.
 */
const prototype = readFileSync(
  new URL("../../../design-system/prototype/모의투자-화면-프로토타입.html", import.meta.url),
  "utf8",
);
const screenSource = (name: string) =>
  readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

/** `'a' + 'b'` 로 나눠 적은 문자열 리터럴을 원래 한 줄로 잇는다. */
function joinLiterals(source: string, quote: "'" | '"') {
  const literal = new RegExp(`${quote}([^${quote}]*)${quote}`, "gu");
  return Array.from(source.matchAll(literal), (match) => match[1]).join("");
}

/**
 * 화면 루트 스타일만 고른다. 화면을 덮는 스크림·오버레이도 같은 사각형을 쓰므로
 * (`left:0;top:0;right:0;bottom:0`) 세로 흐름(`flex-direction:column`)까지 봐야 갈린다.
 */
const screenRoots = (source: string) =>
  source.match(/position:absolute;left:0;top:0;right:0;bottom:0[^"]*flex-direction:column[^"]*/gu) ??
  [];

test("바탕색의 원본은 원본 HTML 의 폰 화면 컨테이너 하나다", () => {
  // 원본 42행 — 화면들이 그 위에 투명하게 얹힌다.
  const container = prototype.match(/left:24px;top:23px;[^"]*/u)?.[0];
  assert.ok(container, "원본에서 폰 화면 컨테이너를 찾지 못했습니다");
  assert.equal(container.match(/background:(#[0-9A-Fa-f]{6})/u)?.[1], SCREEN_BG);
});

test("`PhoneFrame` 이 그 값을 쓴다 — 색을 직접 적지 않는다", () => {
  const container = screenSource("PhoneFrame.tsx").match(/id=\{PROTOTYPE_SCREEN_ID\}[\s\S]{0,200}/u)?.[0];
  assert.ok(container, "PhoneFrame 에서 화면 컨테이너를 찾지 못했습니다");
  assert.match(container, /background: SCREEN_BG/u);
});

test("원본에서 배경을 갖는 화면 루트는 아카이브와 탐색뿐이고, 탐색은 컨테이너와 같은 색이다", () => {
  const withBackground = screenRoots(prototype).filter((root) => root.includes("background:"));
  const colors = withBackground.map((root) => root.match(/background:(#[0-9A-Fa-f]{6})/u)?.[1]);
  assert.deepEqual(colors, ["#F7F6FB", SCREEN_BG]);
  // 탐색이 자기 루트에 다시 적은 색이 컨테이너 색과 같다는 것이 이 대조의 핵심이다. 같으므로
  // React 쪽에서는 그 중복을 지웠다 — 지우지 않으면 컨테이너를 고쳐도 이 화면만 안 따라온다.
});

test("React 화면 루트에서 배경을 갖는 것은 아카이브 하나다", () => {
  const screens = [
    "HomeScreen.tsx",
    "ExploreScreen.tsx",
    "ChartScreen.tsx",
    "NewsScreen.tsx",
    "OrderScreen.tsx",
    "PortfolioScreen.tsx",
    "RankingScreen.tsx",
    "lib/stock-chrome.tsx",
  ];
  for (const screen of screens) {
    for (const root of screenRoots(screenSource(screen))) {
      assert.doesNotMatch(
        root,
        /background/u,
        `${screen} 의 화면 루트가 배경을 갖습니다. 색은 PhoneFrame 하나가 정합니다`,
      );
    }
  }
  // 아카이브만 원본대로 자기 색을 갖는다.
  assert.ok(
    screenRoots(screenSource("ArchiveScreen.tsx")).some((root) => root.includes("background:#F7F6FB")),
  );
});

test("상세·차트 주문 CTA 는 원본 `detailBuyStyle` 그대로다", () => {
  // 원본에는 값이 없을 때 쓰는 `'display:none'` 짝이 함께 있으므로 실제 버튼 쪽만 고른다.
  const blocks = Array.from(
    prototype.matchAll(/detailBuyStyle: ((?:\s*\+?\s*'[^']*')+)/gu),
    (match) => joinLiterals(match[1], "'"),
  );
  const original = blocks.find((block) => block.includes("background:"));
  assert.ok(original, "원본에서 detailBuyStyle 을 찾지 못했습니다");
  assert.equal(DETAIL_BUY_CSS, original);
  // 상세·차트 푸터가 실제로 그 버튼을 쓰는지 — 범용 CTA 로 되돌아가면 여기서 걸린다.
  assert.match(screenSource("lib/stock-chrome.tsx"), /styleFromCss\(DETAIL_BUY_CSS\)/u);
});

test("범용 CTA 는 원본 `CTA_ON`·`CTA_OFF` 그대로다", () => {
  assert.equal(CTA_ON_CSS, prototype.match(/^const CTA_ON = "([^"]*)";$/mu)?.[1]);
  assert.equal(CTA_OFF_CSS, prototype.match(/^const CTA_OFF = "([^"]*)";$/mu)?.[1]);
});

test("주문 화면이 들고 있는 CTA 사본도 같은 값이다", () => {
  // `OrderScreen` 은 아직 자기 사본을 갖는다. 한곳으로 모으기 전까지는 여기서 대조한다.
  const block = screenSource("OrderScreen.tsx").match(
    /const CTA_ON = styleFromCss\(([\s\S]*?)\n\);/u,
  )?.[1];
  assert.ok(block, "주문 화면에서 CTA_ON 을 찾지 못했습니다");
  assert.equal(joinLiterals(block, '"'), CTA_ON_CSS);
});
