import { NextRequest } from "next/server";
import {
  parseChatRequest,
  type ChatActionPayload,
} from "../../../features/f10-chatbot/lib/contracts";
import {
  CHAT_FALLBACK,
  createChatOutcome,
} from "../../../features/f10-chatbot/lib/orchestrator";
import { resolveChatSession } from "../../../features/f10-chatbot/lib/session";
import { classifyTermKind } from "../../../features/f10-chatbot/lib/term-classify";
import { createReadOnlyToolRunner } from "../../../features/f10-chatbot/lib/tools";
import { findProfileById, sessionUserId } from "../supabase";
import { createSupabasePersonalData } from "./personal-data";
import { isChatRateLimited } from "./rate-limit";

export const runtime = "nodejs";

const encoder = new TextEncoder();

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
  if (isChatRateLimited(String(userId ?? "anonymous"))) {
    logChatResult({ requestId, result: "rate_limited" });
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logChatResult({ requestId, result: "invalid_json" });
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const chatRequest = parseChatRequest(body);
  if (!chatRequest) {
    logChatResult({ requestId, result: "invalid_payload" });
    return Response.json({ error: "Invalid chat payload" }, { status: 400 });
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
    },
  });
}
