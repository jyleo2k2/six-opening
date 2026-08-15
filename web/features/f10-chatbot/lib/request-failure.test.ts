import assert from "node:assert/strict";
import {
  UNREACHABLE_CHAT_FAILURE,
  chatFailureLog,
  chatFailureText,
  isRetryableChatFailure,
  readChatFailure,
} from "./request-failure";

function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

function main() {
  // 분당 한도는 남은 초까지 읽어 화면이 "조금 있다" 대신 시간을 말할 수 있게 한다.
  const limited = readChatFailure(
    429,
    headers({ "Retry-After": "58", "X-Request-Id": "req-1" }),
  );
  assert.equal(limited.kind, "rate_limited");
  assert.equal(limited.retryAfterSeconds, 58);
  assert.equal(limited.requestId, "req-1");
  assert.equal(chatFailureText(limited).includes("58초 뒤에"), true);
  assert.equal(isRetryableChatFailure(limited), false);

  // Retry-After 를 아직 안 주는 서버와도 맞물려야 한다. 초를 모르면 초를 말하지 않는다.
  const limitedWithoutHeader = readChatFailure(429, headers({}));
  assert.equal(limitedWithoutHeader.retryAfterSeconds, null);
  assert.equal(chatFailureText(limitedWithoutHeader).includes("조금 뒤에"), true);
  assert.equal(chatFailureText(limitedWithoutHeader).includes("초 뒤에"), false);

  // 값이 이상하면 옮기지 않는다. 음수·소수·`Date` 형식이 화면 문구로 새지 않게 한다.
  for (const raw of ["0", "-3", "1.5", "Wed, 21 Oct 2026 07:28:00 GMT", " "]) {
    assert.equal(
      readChatFailure(429, headers({ "Retry-After": raw })).retryAfterSeconds,
      null,
    );
  }

  // 5xx 는 서버가 넘어진 것이라 다시 보내 볼 만하다.
  const serverError = readChatFailure(500, headers({ "X-Request-Id": "req-2" }));
  assert.equal(serverError.kind, "unreachable");
  assert.equal(isRetryableChatFailure(serverError), true);
  assert.equal(chatFailureText(serverError).includes("다시 보내면"), true);

  // 요청이 어긋난 4xx 는 같은 질문을 다시 보내도 같은 답이라 재시도를 권하지 않는다.
  const badRequest = readChatFailure(400, headers({}));
  assert.equal(badRequest.kind, "unknown");
  assert.equal(isRetryableChatFailure(badRequest), false);
  assert.equal(chatFailureText(badRequest).includes("낮잠"), true);

  // 응답조차 못 받은 실패도 같은 자리를 쓴다.
  assert.equal(UNREACHABLE_CHAT_FAILURE.kind, "unreachable");
  assert.equal(isRetryableChatFailure(UNREACHABLE_CHAT_FAILURE), true);
  assert.equal(UNREACHABLE_CHAT_FAILURE.status, null);

  // 세 문구 모두 해요체 세 문장 이내다 (SPEC §3.3).
  for (const failure of [limited, serverError, badRequest]) {
    const text = chatFailureText(failure);
    assert.equal(text.split(/(?<=[.!?])\s+/u).length <= 3, true);
    assert.equal(/해요|주세요|돼요/u.test(text), true);
  }

  // 로그에는 질문 원문이 들어가지 않는다 (SPEC §11).
  assert.deepEqual(chatFailureLog(limited), {
    kind: "rate_limited",
    status: 429,
    requestId: "req-1",
  });

  console.log("chat request failure tests passed");
}

main();
