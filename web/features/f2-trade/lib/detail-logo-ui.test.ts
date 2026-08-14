import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const universeUrl = new URL("../../../public/ui/assets/universe.js", import.meta.url);
const universeSource = readFileSync(universeUrl, "utf8");
const uiSource = readFileSync(
  new URL("../../../ui-src/methods/renderVals-return.js", import.meta.url),
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

assert.match(uiSource, /stockEmoji: st && !logos\[st\.code\]/u);
assert.match(uiSource, /background-image:url\(' \+ logos\[st\.code\] \+ '\)/u);

console.log("detail stock logo UI contract tests passed");
