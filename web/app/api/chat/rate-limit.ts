/**
 * 질문 연타가 그대로 Luna 호출로 나가는 것을 막는 요청 카운터.
 *
 * 한 요청이 Luna 를 최대 3회 부르므로(SPEC §6.0.3) 게이트가 없으면 아이가 전송 버튼을
 * 연타하는 만큼 비용과 지연이 그대로 늘어난다. 사용자별로 1분 안의 요청 수만 세고
 * 넘으면 거절한다. 거절은 `/api/chat` 이 `429` 로 돌려주며, 화면은 이미 실패를
 * "키웅이가 잠깐 낮잠 중이에요" 안내로 바꿔 보여 준다.
 *
 * ponytail: 카운터가 프로세스 메모리에만 있어서 단일 인스턴스 데모에서만 정확하다.
 * 서버를 여러 대로 늘리면 Redis 같은 공유 저장소로 옮긴다.
 */

/** 한 사용자가 1분 안에 보낼 수 있는 요청 수. 정상 대화는 분당 3~6건이다. */
export const CHAT_RATE_LIMIT_PER_MINUTE = 12;

const WINDOW_MS = 60_000;

// 키는 로그인 사용자 id 이고, 쿠키가 없으면 익명 하나를 함께 쓴다. 데모 계정 수가
// 고정이라 키가 무한정 늘지 않는다.
const hitsByKey = new Map<string, number[]>();

/**
 * 이번 요청을 거절해야 하면 `true`.
 *
 * 거절한 요청은 세지 않는다. 연타를 멈추면 창이 저절로 비워져서, 한 번 막힌 사용자가
 * 계속 두드린다는 이유로 1분보다 오래 잠기지 않는다.
 */
export function isChatRateLimited(key: string, now: number = Date.now()): boolean {
  const hits = (hitsByKey.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  hitsByKey.set(key, hits);
  if (hits.length >= CHAT_RATE_LIMIT_PER_MINUTE) return true;
  hits.push(now);
  return false;
}

/**
 * 가장 오래된 기록이 창을 빠져나갈 때까지 남은 초. 창 안에 기록이 없으면 `0`.
 *
 * 막혔다는 사실만 알려 주면 화면은 "조금 있다" 말고는 할 말이 없고, 아이는 언제까지
 * 기다려야 하는지 몰라 계속 두드린다. 가장 오래된 요청이 창을 빠져나가는 순간이 곧
 * 한 자리가 비는 시각이므로 그 값을 초로 돌려준다.
 *
 * 한도에 닿지 않은 키에도 남은 시간을 계산하므로, `isChatRateLimited` 가 `true` 를
 * 준 직후에만 부른다 — 그때가 이 값이 "다시 물어봐도 되는 때"와 같아지는 유일한 시점이다.
 */
export function chatRateLimitRetryAfterSeconds(
  key: string,
  now: number = Date.now(),
): number {
  const oldest = (hitsByKey.get(key) ?? []).find((at) => now - at < WINDOW_MS);
  if (oldest === undefined) return 0;
  // 0 초를 주면 화면이 곧바로 다시 보내 또 막힌다. 최소 1 초는 기다리게 한다.
  return Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1_000));
}
