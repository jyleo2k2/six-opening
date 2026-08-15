import { NextRequest } from "next/server";
import {
  parseChatRequest,
  type ChatActionPayload,
} from "../../../features/f10-chatbot/lib/contracts";
import {
  CHAT_FALLBACK,
  createChatOutcome,
} from "../../../features/f10-chatbot/lib/orchestrator";
import { checkAnswerRelevance } from "../../../features/f10-chatbot/lib/answer-relevance";
import { resolveChatSession } from "../../../features/f10-chatbot/lib/session";
import { classifyTermKind } from "../../../features/f10-chatbot/lib/term-classify";
import { createReadOnlyToolRunner } from "../../../features/f10-chatbot/lib/tools";
import { findProfileById, sessionUserId } from "../supabase";
import { createSupabasePersonalData } from "./personal-data";
import { chatRateLimitRetryAfterSeconds, isChatRateLimited } from "./rate-limit";

export const runtime = "nodejs";

const encoder = new TextEncoder();

/**
 * 실패한 요청에도 요청 ID 를 붙여 돌려준다.
 *
 * 화면은 지금까지 모든 실패를 "키웅이가 잠깐 낮잠 중이에요" 하나로 보여 줬다. 분당 한도에
 * 막힌 것과 서버가 죽은 것이 같은 문구라, 화면만 봐서는 무엇이 잘못됐는지 알 수 없었고
 * 서버 로그의 `requestId` 와 이어 붙일 실마리도 없었다. 성공·실패를 가리지 않고 같은
 * 머리글을 실어 두 기록을 같은 ID 로 맞춰 본다.
 *
 * `code` 는 사람이 로그에서 읽으라고 넣는다. 화면이 문구를 가르는 기준은 HTTP 상태 코드와
 * `Retry-After` 로 충분해서, 이 값을 읽으려고 계약 타입을 새로 만들지는 않는다.
 */
function failure(
  requestId: string,
  status: number,
  code: string,
  error: string,
  headers: Record<string, string> = {},
) {
  return Response.json(
    { error, code },
    { status, headers: { ...headers, "X-Request-Id": requestId } },
  );
}

type ChatEvent = "status" | "text" | "action" | "done";

function event(type: ChatEvent, value: string | ChatActionPayload) {
  return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(value)}\n\n`);
}

function logChatResult(value: Record<string, unknown>) {
  console.info(JSON.stringify({ event: "f10_chat", ...value }));
}

/**
 * 로그인 쿠키가 가리키는 프로필을 읽는다. 저장소가 없거나 조회가 실패하면 `null` 을
 * 돌려주고 데모 세션으로 낮춰 잡는다 — 프로필을 못 읽었다고 답변 자체를 막지는 않는다.
 */
async function loadSessionProfile(userId: number | null) {
  if (!userId) return null;
  try {
    return await findProfileById(userId);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const userId = sessionUserId(request);

  // 본문을 읽기 전에 막는다. 잘못된 요청도 연타면 그대로 부하다.
  const rateLimitKey = String(userId ?? "anonymous");
  if (isChatRateLimited(rateLimitKey)) {
    const retryAfterSeconds = chatRateLimitRetryAfterSeconds(rateLimitKey);
    logChatResult({ requestId, result: "rate_limited", retryAfterSeconds });
    return failure(requestId, 429, "rate_limited", "Too many requests", {
      "Retry-After": String(retryAfterSeconds),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logChatResult({ requestId, result: "invalid_json" });
    return failure(requestId, 400, "invalid_json", "Invalid request");
  }

  const chatRequest = parseChatRequest(body);
  if (!chatRequest) {
    logChatResult({ requestId, result: "invalid_payload" });
    return failure(requestId, 400, "invalid_payload", "Invalid chat payload");
  }

  // 조회 대상 사용자는 요청 쿠키가 정한다. 본문 식별자는 parseChatRequest 가 이미 거부했다.
  const session = resolveChatSession(await loadSessionProfile(userId));
  const runTool = createReadOnlyToolRunner(createSupabasePersonalData(request));
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: ChatEvent, value: string | ChatActionPayload) => {
        if (!request.signal.aborted) controller.enqueue(event(type, value));
      };

      try {
        const outcome = await createChatOutcome(chatRequest, session, {
          requestSignal: request.signal,
          onStatus: (status) => send("status", status),
          runTool,
          classifyTerm: classifyTermKind,
          checkRelevance: checkAnswerRelevance,
        });

        send("text", outcome.response.text);
        if (outcome.action) send("action", outcome.action);
        send("done", "");
        logChatResult({
          requestId,
          // 실제 로그인 세션인지 데모 폴백인지 남긴다. 폴백은 역할이 항상 child 라
          // 로그가 없으면 잘못된 역할로 답한 것을 나중에 알아낼 수 없다.
          sessionSource: session.source,
          sessionRole: session.role,
          route: outcome.route,
          intent: outcome.intent,
          source: outcome.source,
          tool: outcome.tool ?? null,
          toolStatus: outcome.toolStatus ?? null,
          gate: outcome.gate,
          gateReason: outcome.gateReason ?? null,
          rewritten: outcome.rewritten ?? false,
          relevanceRedirected: outcome.relevanceRedirected ?? false,
          failure: outcome.failure ?? null,
          result: "completed",
        });
      } catch (error) {
        send("text", CHAT_FALLBACK);
        send("done", "");
        logChatResult({
          requestId,
          result: "orchestration_error",
          error: error instanceof Error ? error.name : "unknown",
        });
      } finally {
        if (!request.signal.aborted) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
      // 성공한 요청에도 같은 머리글을 붙인다. 답은 왔는데 이상하다는 신고도 로그에서 찾아야 한다.
      "X-Request-Id": requestId,
    },
  });
}
