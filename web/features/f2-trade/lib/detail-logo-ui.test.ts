import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const universeUrl = new URL("../../../public/ui/assets/universe.js", import.meta.url);
const universeSource = readFileSync(universeUrl, "utf8");
// 로고가 있으면 이미지, 없으면 섹터 이모지 — 그 분기는 **탐색 카드**가 갖는다.
//
// 잠깐 종목 상세를 읽었는데, 상세의 가격 카드를 프로토타입 원본대로 되돌리면서 그 자리에
// 로고가 없어졌다(원본은 종목명과 업종 배지만 둔다). 계약이 사는 곳은 카드이므로 그쪽을 본다.
const exploreCards = readFileSync(
  new URL("../../f0-home/lib/explore-cards.ts", import.meta.url),
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

// 로고가 있으면 카드 아트에 이미지를 깔고, 없으면 섹터 이모지로 대신한다.
assert.match(exploreCards, /logo \? "url\(" \+ logo \+ "\) center\/84px 84px no-repeat," : ""/u);
assert.match(exploreCards, /hasLogo: !!logo/u);

console.log("detail stock logo UI contract tests passed");
