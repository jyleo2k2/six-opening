import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// 홈 보유종목 카드는 두 번이나 고정 데모로 되돌아간 적이 있다(PR #180·#186·#187 복구 이력).
// 조립된 화면에서 실제 계좌를 읽는 경로가 살아 있는지만 확인한다.
const source = readFileSync(
  new URL("../../../public/ui/app.html", import.meta.url),
  "utf8",
);

// 1. 보유 목록은 로그인 사용자의 실제 응답에서 만든다 (PR #198).
assert.match(source, /const holdings = homeLoaded \? liveHoldings : home\.holdings;/u);
assert.match(source, /holdingsPreview: holdings\.slice\(0, 3\)/u);
assert.doesNotMatch(source, /holdings(Preview|Full): home\.holdings/u);

// 2. 수익도 실제 보유에서 낸다. 데모 상수를 실제 평가금액으로 나누면 근거 없는 값이 된다.
assert.match(source, /const homeProfit = homeLoaded \? liveHoldings\.reduce/u);
assert.match(source, /Math\.floor\(homeProfit \/ home\.unitPrice\)/u);
assert.match(source, /homeRate = homeHoldingsTotal \? \(homeProfit \/ homeHoldingsTotal \* 100\)/u);
assert.doesNotMatch(source, /home\.profit \/ home(HoldingsTotal|\.unitPrice)/u);

// 3. 수익률 부호·색은 계산값이다. 데모가 늘 흑자였던 탓에 고정돼 있었다.
assert.doesNotMatch(source, /homeRateText: '\+'/u);
assert.match(source, /homeRateText: \(homeRate >= 0 \? '\+' : '−'\)/u);
assert.match(source, /\{\{ homeRateStyle \}\}/u);

// 4. 계좌를 읽은 뒤 보유가 없으면 데모로 되돌아가지 않고 빈 상태를 보인다.
assert.match(source, /homeNoHoldings: homeLoaded && holdings\.length === 0/u);
assert.match(source, /아직 가진 회사가 없어/u);

// 5. 목표 아이템은 저장소에 없는 값이라 계속 HOME_INFO 가 준다.
assert.match(source, /goalImg: home\.goalImg/u);
assert.match(source, /home\.unitPrice/u);

console.log("home holdings prototype UI contract tests passed");
