/**
 * 챗봇 요청이 실패했을 때 무엇이 잘못됐는지 가르는 순수 함수.
 *
 * 화면은 오랫동안 모든 실패를 "키웅이가 잠깐 낮잠 중이에요" 하나로 보여 줬다. 분당 한도에
 * 막힌 것도, 개발 서버가 죽은 것도, 본문이 어긋난 것도 같은 문구라 무엇이 잘못됐는지
 * 화면만 봐서는 알 수 없었다. 서버는 `requestId` 로 결과를 남기고 있었지만 화면이 그 ID 를
 * 버려서 두 기록을 맞춰 볼 수도 없었다.
 *
 * 판정 기준은 HTTP 상태 코드와 `Retry-After` 뿐이다(SPEC §5.1). 거절 본문의 `code` 는
 * 사람이 로그에서 읽는 값이라 여기서 읽지 않는다 — 그것까지 계약으로 삼으면 서버와 화면이
 * 같은 문자열 집합을 두 곳에서 관리해야 한다.
 */

export type ChatFailureKind =
  /** 분당 한도(`429`). 기다리면 저절로 풀린다. */
  | "rate_limited"
  /** 서버까지 닿지 못했다(네트워크 끊김·`5xx`·중간에 끊긴 스트림). 다시 보내면 될 수 있다. */
  | "unreachable"
  /** 요청 자체가 어긋났다(`4xx`). 같은 질문을 다시 보내도 같은 답이라 재시도를 권하지 않는다. */
  | "unknown";

export type ChatFailure = {
  kind: ChatFailureKind;
  status: number | null;
  requestId: string | null;
  retryAfterSeconds: number | null;
};

/** `Response.headers` 만큼만 필요하다. 테스트가 `Headers` 를 만들지 않아도 되게 좁혀 둔다. */
type HeaderReader = { get(name: string): string | null };

/** 응답이 없는 실패(fetch 자체가 던짐·스트림이 끊김)는 서버까지 닿지 못한 것으로 본다. */
export const UNREACHABLE_CHAT_FAILURE: ChatFailure = {
  kind: "unreachable",
  status: null,
  requestId: null,
  retryAfterSeconds: null,
};

function parseRetryAfterSeconds(raw: string | null): number | null {
  if (!raw) return null;
  const seconds = Number(raw.trim());
  // 음수·소수·`Date` 형식은 화면에 그대로 옮길 수 없다. 값이 이상하면 초를 말하지 않는다.
  if (!Number.isInteger(seconds) || seconds < 1) return null;
  return seconds;
}

/** 상태 코드가 실린 실패를 읽는다. `response.ok` 가 아닐 때만 부른다. */
export function readChatFailure(
  status: number,
  headers: HeaderReader,
): ChatFailure {
  const requestId = headers.get("X-Request-Id");
  if (status === 429) {
    return {
      kind: "rate_limited",
      status,
      requestId,
      retryAfterSeconds: parseRetryAfterSeconds(headers.get("Retry-After")),
    };
  }
  return {
    // 5xx 는 서버가 넘어진 것이라 다시 보내면 될 수 있다. 그 밖의 4xx 는 요청이 어긋난 것이다.
    kind: status >= 500 ? "unreachable" : "unknown",
    status,
    requestId,
    retryAfterSeconds: null,
  };
}

/**
 * 아이에게 보여 줄 한 줄.
 *
 * 무엇이 잘못됐는지 말하되 아이 탓으로 들리지 않게 한다. 기다리면 풀리는 실패는 얼마나
 * 기다리면 되는지까지 말해 준다 — "조금 있다"만 남기면 아이는 계속 두드린다.
 */
export function chatFailureText(failure: ChatFailure): string {
  if (failure.kind === "rate_limited") {
    return failure.retryAfterSeconds
      ? `질문이 한꺼번에 몰려서 키웅이가 숨을 고르고 있어요. ${failure.retryAfterSeconds}초 뒤에 다시 물어봐 주세요 🐻`
      : "질문이 한꺼번에 몰려서 키웅이가 숨을 고르고 있어요. 조금 뒤에 다시 물어봐 주세요 🐻";
  }
  if (failure.kind === "unreachable") {
    return "키웅이한테 가는 길이 잠깐 끊겼어요. 아래 버튼으로 다시 보내면 돼요 🐻";
  }
  return "키웅이가 잠깐 낮잠 중이에요! 조금 있다 다시 물어봐 주세요 🐻";
}

/** 같은 질문을 그대로 다시 보내 볼 만한 실패인가. */
export function isRetryableChatFailure(failure: ChatFailure): boolean {
  return failure.kind === "unreachable";
}

/**
 * 개발 콘솔에 남길 값.
 *
 * 질문 원문은 절대 넣지 않는다(SPEC §11). 상태 코드와 요청 ID 만 있으면 서버 로그의
 * `{"event":"f10_chat", …}` 줄을 같은 ID 로 찾을 수 있다.
 */
export function chatFailureLog(failure: ChatFailure) {
  return {
    kind: failure.kind,
    status: failure.status,
    requestId: failure.requestId,
  };
}
