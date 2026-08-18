import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * 관심 종목 하트를 상세와 차트가 **같은 것 하나**로 그리는지 지킨다.
 *
 * 차트 화면에도 하트가 생기면서 하트를 그리는 자리가 둘이 되었다. 각자 그리면 색·크기·
 * 그림자가 조용히 갈리고(예전 `SCREEN_BG` 가 그랬다), 화면을 오갈 때 같은 종목의 하트가
 * 서로 다르게 보인다. 브라우저 없이 확인해야 하므로 화면 소스를 문자열로 읽어 대조한다 —
 * `f2-trade/lib/*-ui.test.ts` 와 같은 방식이다.
 */
const source = (name: string) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

const chrome = source("lib/stock-chrome.tsx");
const screens = ["DetailScreen.tsx", "ChartScreen.tsx"] as const;

test("하트를 그리는 곳은 `stock-chrome` 의 `WatchButton` 하나다", () => {
  // 하트 path 는 공용 컴포넌트에만 있어야 한다. 화면이 다시 그리기 시작하면 여기서 걸린다.
  const heart = /M10\.5 17\.5 2\.6 9\.9/u;
  assert.match(chrome, heart);
  for (const screen of screens) {
    assert.doesNotMatch(
      source(screen),
      heart,
      `${screen} 이 하트를 직접 그립니다. WatchButton 하나만 씁니다`,
    );
  }
});

test("상세와 차트가 모두 그 버튼을 헤더 오른쪽에 세운다", () => {
  for (const screen of screens) {
    const text = source(screen);
    assert.match(text, /WatchButton/u, `${screen} 에 하트가 없습니다`);
    // `SubScreenHeader` 의 `right` 자리다. 다른 데 두면 뒤로가기와 높이가 갈린다.
    assert.match(
      text,
      /right=\{<WatchButton[^}]*\}/u,
      `${screen} 의 하트가 헤더 오른쪽(right) 자리에 있지 않습니다`,
    );
  }
});

test("차트 화면은 하트 상태를 스스로 만들지 않고 상세에게서 받는다", () => {
  const chart = source("ChartScreen.tsx");
  // 두 화면이 관심 목록을 각자 부르면 상세에서 담고 들어간 차트가 잠깐 비어 보인다.
  // 주석에 이름이 적히는 것은 괜찮으므로 **부르는지**(import)만 본다.
  assert.equal(
    /from "\.\/lib\/use-watchlist"/u.test(chart),
    false,
    "차트 화면이 관심 목록을 따로 읽습니다",
  );
  assert.match(chart, /watched: boolean/u);
  assert.match(chart, /onToggleWatch: \(\) => void/u);
  // 상세는 그 둘을 실제로 넘겨야 한다 — 타입만 있고 안 넘기면 하트가 늘 꺼져 있다.
  const detail = source("DetailScreen.tsx");
  assert.match(detail, /onToggleWatch=\{toggleWatch\}/u);
  assert.match(detail, /watched=\{watched\}/u);
});

test("헤더 양 끝 상자는 크기가 같다 — 가운데 제목이 밀리지 않게", () => {
  // 뒤로가기·하트·하트가 없는 화면의 빈 칸이 모두 38px 이어야 제목이 가운데에 선다.
  const boxes = chrome.match(/width:38px;height:38px/gu) ?? [];
  assert.equal(boxes.length, 2, "뒤로가기와 하트의 상자 크기가 갈렸습니다");
  assert.match(chrome, /<div style=\{\{ width: 38 \}\} \/>/u);
});
