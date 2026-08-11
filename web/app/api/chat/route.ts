import { NextRequest } from "next/server";
import { filterGeneratedText, SAFE_REFUSAL, takeCompleteSentences } from "../../../shared/llm/filter";
import { streamGeminiAnswer } from "../../../features/f10-chatbot/lib/gemini";
import { ChatContext, routeMessage } from "../../../features/f10-chatbot/lib/routing";

export const runtime = "nodejs";

const encoder = new TextEncoder();
const FALLBACK = "키웅이가 잠깐 낮잠 중이야! 조금 있다 다시 물어봐 줘 🐻";

function event(type: "status" | "text" | "done", value: string) {
  return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(value)}\n\n`);
}

function isChatContext(value: unknown): value is ChatContext {
  if (!value || typeof value !== "object") return false;
  const context = value as Record<string, unknown>;
  return ["home", "stock", "order", "archive"].includes(String(context.screen));
}

export async function POST(request: NextRequest) {
  let body: { message?: unknown; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof body.message !== "string" || !isChatContext(body.context)) {
    return Response.json({ error: "Invalid chat payload" }, { status: 400 });
  }

  const message = body.message.trim().slice(0, 500);
  const context = body.context;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: "status" | "text" | "done", value: string) => controller.enqueue(event(type, value));
      const routed = routeMessage(message, context);

      send("status", "무슨 질문인지 보는 중");
      if (routed.route !== "fallback") {
        send("status", routed.steps.at(-1) ?? "안전 점검 통과!");
        send("text", routed.text);
        send("done", "");
        controller.close();
        return;
      }

      try {
        send("status", "답변을 준비하는 중");
        const response = await streamGeminiAnswer(message, context);
        let buffer = "";
        let sentSentences = 0;

        for await (const chunk of response) {
          buffer += chunk.text ?? "";
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
