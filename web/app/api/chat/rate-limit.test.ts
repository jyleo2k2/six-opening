import assert from "node:assert/strict";
import { CHAT_RATE_LIMIT_PER_MINUTE, isChatRateLimited } from "./rate-limit";

// 카운터가 모듈 전역이라 케이스마다 다른 키를 쓴다.
function main() {
  const start = 1_000_000;

  // 한도까지는 통과하고 그다음 요청부터 막는다.
  for (let i = 0; i < CHAT_RATE_LIMIT_PER_MINUTE; i += 1) {
    assert.equal(isChatRateLimited("burst", start + i), false);
  }
  assert.equal(isChatRateLimited("burst", start), true);

  // 사용자가 다르면 서로 영향을 주지 않는다.
  assert.equal(isChatRateLimited("other-user", start), false);

  // 1분이 지나면 다시 열린다.
  assert.equal(isChatRateLimited("burst", start + 60_000), false);

  // 막힌 요청은 세지 않으므로, 연타를 계속해도 창이 1분보다 길게 잠기지 않는다.
  const blockedAt = start + 30_000;
  for (let i = 0; i < 50; i += 1) assert.equal(isChatRateLimited("spam-forever", blockedAt), i >= CHAT_RATE_LIMIT_PER_MINUTE);
  assert.equal(isChatRateLimited("spam-forever", blockedAt + 60_000), false);

  console.log("chat rate limit tests passed");
}

main();
