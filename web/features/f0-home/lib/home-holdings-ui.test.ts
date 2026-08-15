import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// 홈 보유종목 카드는 두 번이나 고정 데모로 되돌아간 적이 있다(PR #180·#186·#187 복구 이력).
// 조립된 화면에서 실제 계좌를 읽는 경로가 살아 있는지만 확인한다.
const source = readFileSync(
  new URL("../../../public/ui/app.html", import.meta.url),
  "utf8",
);

// 1. 로그인 역할의 계좌에서 보유를 만든다 — HOME_INFO 상수를 그대로 쓰지 않는다.
assert.match(source, /const homeAcc = this\.dbUser \? s\.acc\[this\.dbUser\.parent_child\] : null;/u);
assert.match(source, /const homeHoldings = homeLoaded \? liveHoldings : home\.holdings;/u);
// 계좌를 읽은 뒤 보유가 없으면 데모로 되돌아가지 않고 빈 상태를 보인다.
assert.match(source, /homeNoHoldings: homeLoaded && homeRawHoldings\.length === 0/u);
assert.match(source, /아직 가진 회사가 없어/u);
assert.match(source, /holdingsPreview: homeHoldings\.slice\(0, 3\)/u);
assert.match(source, /holdingsFull: homeHoldings\.map\(/u);
assert.doesNotMatch(source, /holdings(Preview|Full): home\.holdings/u);

// 2. 수익률은 계산값이다. 데모가 늘 흑자였던 탓에 부호·색이 고정돼 있었다.
assert.doesNotMatch(source, /homeRateText: '\+'/u);
assert.match(source, /homeRateText: \(homeRate >= 0 \? '\+' : '−'\)/u);
assert.match(source, /homeRateStyle: /u);
assert.match(source, /\{\{ homeRateStyle \}\}/u);

// 3. 목표 아이템은 저장소에 없는 값이라 계속 HOME_INFO 가 준다.
assert.match(source, /goalImg: home\.goalImg/u);
assert.match(source, /home\.unitPrice/u);

console.log("home holdings prototype UI contract tests passed");
