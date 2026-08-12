import { NextRequest } from "next/server";
import { filterGeneratedText, SAFE_REFUSAL, takeCompleteSentences } from "../../../shared/llm/filter";
import { streamChatAnswer } from "../../../features/f10-chatbot/lib/openai";
import type { ConversationMessage } from "../../../features/f10-chatbot/lib/openai";
import { ChatContext, routeMessage } from "../../../features/f10-chatbot/lib/routing";
import {
  advanceGuidedDialogue,
  isGuidedOptionId,
  isGuidedTopicId,
  startGuidedDialogue,
} from "../../../features/f10-chatbot/lib/dialogue-engine";
import type {
  GuidedDialogueState,
  GuidedDialogueTurn,
} from "../../../features/f10-chatbot/lib/dialogue-engine";

export const runtime = "nodejs";

const encoder = new TextEncoder();
const FALLBACK = "키웅이가 잠깐 낮잠 중이야! 조금 있다 다시 물어봐 줘 🐻";
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_TEXT_LENGTH = 500;

type ChatEvent = "status" | "text" | "action" | "done";

function event(type: ChatEvent, value: unknown) {
  return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(value)}\n\n`);
}

function isChatContext(value: unknown): value is ChatContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Record<string, unknown>;
  return ["home", "stock", "order", "archive"].includes(String(context.screen));
}

function parseHistory(value: unknown): ConversationMessage[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;

  const recent = value.slice(-MAX_HISTORY_MESSAGES);
  if (
    !recent.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        ["assistant", "user"].includes(String((entry as Record<string, unknown>).role)) &&
        typeof (entry as Record<string, unknown>).text === "string",
    )
  ) {
    return null;
  }

  return recent
    .map((entry) => entry as ConversationMessage)
    .map(({ role, text }) => ({ role, text: text.trim().slice(0, MAX_HISTORY_TEXT_LENGTH) }))
    .filter(({ text }) => text.length > 0);
}

function parseGuidedDialogue(value: unknown) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") return null;

  const guided = value as Record<string, unknown>;
  if (
    !isGuidedTopicId(guided.topicId) ||
    typeof guided.currentNodeId !== "string" ||
    !isGuidedOptionId(guided.optionId)
  ) {
    return null;
  }

  return {
    state: {
      topicId: guided.topicId,
      currentNodeId: guided.currentNodeId.slice(0, 80),
    } satisfies GuidedDialogueState,
    optionId: guided.optionId,
  };
}

function guidedAction(turn: GuidedDialogueTurn) {
  if (!turn.state) return null;
  return {
    kind: "guided_options" as const,
    state: turn.state,
    options: turn.options,
  };
}

export async function POST(request: NextRequest) {
  let body: { message?: unknown; context?: unknown; history?: unknown; guidedDialogue?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const history = parseHistory(body.history);
  const guidedDialogue = parseGuidedDialogue(body.guidedDialogue);
  if (
    typeof body.message !== "string" ||
    !isChatContext(body.context) ||
    !history ||
    guidedDialogue === null
  ) {
    return Response.json({ error: "Invalid chat payload" }, { status: 400 });
  }

  const message = body.message.trim().slice(0, 500);
  const context = body.context;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: ChatEvent, value: unknown) => controller.enqueue(event(type, value));
      const routed = routeMessage(message, context);

      send("status", "무슨 질문인지 보는 중");
      const shouldUseGuidedDialogue =
        routed.route === "faq" || routed.route === "context" || routed.route === "fallback";
      const guidedTurn = shouldUseGuidedDialogue
        ? guidedDialogue
          ? advanceGuidedDialogue(guidedDialogue.state, guidedDialogue.optionId)
          : startGuidedDialogue(message, context)
        : null;

      if (guidedDialogue && shouldUseGuidedDialogue && !guidedTurn) {
        send("text", "그 설명 단계는 이어 갈 수 없어. 궁금한 용어를 다시 물어봐 줘! 🐻");
        send("done", "");
        controller.close();
        return;
      }

      if (guidedTurn) {
        send("status", "단계별 설명 준비 완료");
        send("text", filterGeneratedText(guidedTurn.text) ? guidedTurn.text : SAFE_REFUSAL);
        const action = guidedAction(guidedTurn);
        if (action) send("action", action);
        send("done", "");
        controller.close();
        return;
      }

      if (routed.route !== "fallback") {
        send("status", routed.steps.at(-1) ?? "안전 점검 통과!");
        send("text", routed.text);
        send("done", "");
        controller.close();
        return;
      }

      try {
        send("status", "답변을 준비하는 중");
        const response = await streamChatAnswer(message, context, history);
        let buffer = "";
        let sentSentences = 0;

        for await (const chunk of response) {
          if (chunk.type !== "response.output_text.delta") continue;

          buffer += chunk.delta;
          const sentences = takeCompleteSentences(buffer);
          buffer = sentences.remainder;

          for (const sentence of sentences.complete) {
            if (sentSentences >= 3) break;
            if (!filterGeneratedText(sentence)) {
              send("text", SAFE_REFUSAL);
              send("done", "");
              controller.close();
              return;
            }
            send("text", sentence);
            sentSentences += 1;
          }

          if (sentSentences >= 3) break;
        }

        const finalText = buffer.trim();
        if (finalText && sentSentences < 3) {
          if (!filterGeneratedText(finalText)) {
            send("text", SAFE_REFUSAL);
          } else {
            send("text", finalText);
          }
        }
        send("status", "안전 점검 통과!");
      } catch {
        send("text", FALLBACK);
      }

      send("done", "");
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}
