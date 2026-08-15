import assert from "node:assert/strict";
import {
  CHAT_RATE_LIMIT_PER_MINUTE,
  chatRateLimitRetryAfterSeconds,
  isChatRateLimited,
} from "./rate-limit";

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

  // 막힌 순간에는 한 자리가 비기까지 남은 초를 알려 준다. 1초 간격으로 12건을 채웠으면
  // 가장 오래된 요청은 11초 전 것이므로 49초가 남는다.
  const waiting = 2_000_000;
  for (let i = 0; i < CHAT_RATE_LIMIT_PER_MINUTE; i += 1) {
    assert.equal(isChatRateLimited("retry-after", waiting + i * 1_000), false);
  }
  const blocked = waiting + (CHAT_RATE_LIMIT_PER_MINUTE - 1) * 1_000;
  assert.equal(isChatRateLimited("retry-after", blocked), true);
  assert.equal(chatRateLimitRetryAfterSeconds("retry-after", blocked), 49);

  // 창이 완전히 비는 때는 마지막 기록 기준이다. 그전까지는 남은 기록이 있어 0이 아니다.
  const emptied = blocked + 60_000;
  assert.equal(chatRateLimitRetryAfterSeconds("retry-after", emptied), 0);
  assert.equal(chatRateLimitRetryAfterSeconds("never-asked", waiting), 0);

  // 창이 열리기 직전이라도 0초를 주지 않는다. 0이면 화면이 곧바로 다시 보내 또 막힌다.
  assert.equal(chatRateLimitRetryAfterSeconds("retry-after", emptied - 1), 1);

  console.log("chat rate limit tests passed");
}

main();
