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
import { createReadOnlyToolRunner } from "../../../features/f10-chatbot/lib/tools";
import { createSupabasePersonalData } from "./personal-data";

export const runtime = "nodejs";

const encoder = new TextEncoder();

type ChatEvent = "status" | "text" | "action" | "done";

function event(type: ChatEvent, value: string | ChatActionPayload) {
  return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(value)}\n\n`);
}

function logChatResult(value: Record<string, unknown>) {
  console.info(JSON.stringify({ event: "f10_chat", ...value }));
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
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

  const session = resolveChatSession();
  // 조회 대상 사용자는 요청 쿠키가 정한다. 본문 식별자는 parseChatRequest 가 이미 거부했다.
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
        });

        send("text", outcome.response.text);
        if (outcome.action) send("action", outcome.action);
        send("done", "");
        logChatResult({
          requestId,
          route: outcome.route,
          intent: outcome.intent,
          source: outcome.source,
          tool: outcome.tool ?? null,
          toolStatus: outcome.toolStatus ?? null,
          gate: outcome.gate,
          gateReason: outcome.gateReason ?? null,
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
