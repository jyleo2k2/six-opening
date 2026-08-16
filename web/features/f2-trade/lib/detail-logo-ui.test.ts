import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const universeUrl = new URL("../../../public/ui/assets/universe.js", import.meta.url);
const universeSource = readFileSync(universeUrl, "utf8");
// 종목 상세 화면이 React(`features/f0-home`)로 옮겨 가서 로고·이모지 대체 계약도
// 그 소스를 읽는다 (같은 폴더의 buy-amount-ui·news/prototype-ui 테스트와 같은 방식).
const detailScreen = readFileSync(
  new URL("../../f0-home/DetailScreen.tsx", import.meta.url),
  "utf8",
);

const stockCodes = Array.from(
  universeSource.matchAll(/\['(\d{6})',\s*"/gu),
  (match) => match[1],
);
const logoEntries = new Map(
  Array.from(
    universeSource.matchAll(
      /^\s*'(\d{6})': '(assets\/logos\/\d{6}\.png)'/gmu,
    ),
    (match) => [match[1], match[2]] as const,
  ),
);

assert.equal(stockCodes.length, 51);
assert.equal(new Set(stockCodes).size, 51);
assert.equal(logoEntries.size, 51);

for (const stockCode of stockCodes) {
  const logoPath = logoEntries.get(stockCode);
  assert.ok(logoPath, `${stockCode} 로고 매핑이 필요합니다`);
  assert.ok(
    existsSync(new URL(`../../../public/ui/${logoPath}`, import.meta.url)),
    `${stockCode} 로고 파일이 필요합니다`,
  );
}

assert.match(detailScreen, /background-image:url\(\$\{stock\.logoUrl\}\)/u);
assert.match(detailScreen, /\{stock\.logoUrl \? "" : stock\.sectorName\.charAt\(0\)\}/u);

console.log("detail stock logo UI contract tests passed");
