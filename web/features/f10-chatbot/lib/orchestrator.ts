import {
  gateChatOutput,
  SAFE_REFUSAL,
  type ChatOutputSource,
} from "../../../shared/llm/filter";
import type { ChatResponse } from "../../../shared/types/chatbot";
import type { ChatRequest } from "./contracts";
import { sanitizeActionPayload } from "./contracts";
import { generateChatAnswer } from "./openai";
import { routeMessage, type ChatIntent, type ChatRoute } from "./routing";
import type { ChatSession } from "./session";
import { runReadOnlyTool, type ToolExecution } from "./tools";

export const CHAT_FALLBACK =
  "답변을 안전하게 확인하지 못했어. 금융 용어나 화면 사용법을 다시 짧게 물어봐 줘. 🐻";

export type ChatOutcome = {
  response: ChatResponse;
  route: ChatRoute;
  intent: ChatIntent;
  source: ChatOutputSource;
  tool?: ToolExecution["tool"];
  toolStatus?: ToolExecution["status"];
  gate: "passed" | "replaced";
  gateReason?: Exclude<ReturnType<typeof gateChatOutput>, { ok: true }>["reason"];
  failure?: "timeout" | "model_error" | "tool_error";
};

type ChatOrchestratorDependencies = {
  generateAnswer?: typeof generateChatAnswer;
  runTool?: typeof runReadOnlyTool;
  timeoutMs?: number;
  requestSignal?: AbortSignal;
  onStatus?: (status: string) => void;
};

function createTimedSignal(parent: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parent?.aborted) controller.abort();
  parent?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, timeoutMs);

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
      parent?.removeEventListener("abort", abort);
    },
  };
}

function allowedContextNumbers(request: ChatRequest) {
  const numbers = [request.context.quantity, request.context.unitPrice].filter(
    (value): value is number => value !== undefined,
  );
  if (
    request.context.quantity !== undefined &&
    request.context.unitPrice !== undefined
  ) {
    numbers.push(request.context.quantity * request.context.unitPrice);
  }
  return numbers;
}

function raceWithAbort<T>(promise: Promise<T>, signal: AbortSignal) {
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new Error("aborted"));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

export async function createChatOutcome(
  request: ChatRequest,
  session: ChatSession,
  dependencies: ChatOrchestratorDependencies = {},
): Promise<ChatOutcome> {
  const onStatus = dependencies.onStatus ?? (() => undefined);
  const routed = routeMessage(request.message, request.context);
  let response: ChatResponse = {
    text: routed.text,
    suggestedQuestions: routed.suggestedQuestions,
    uiAction: routed.uiAction,
  };
  let source: ChatOutputSource = "fixed";
  let toolExecution: ToolExecution | undefined;
  let failure: ChatOutcome["failure"];

  onStatus("질문을 안전하게 확인하는 중");

  if (routed.route === "tool" && routed.tool) {
    onStatus("허용된 내 자료를 확인하는 중");
    try {
      toolExecution = await (dependencies.runTool ?? runReadOnlyTool)(
        routed.tool,
        request.context,
        session,
      );
      response = toolExecution.response;
      source = "tool";
    } catch {
      failure = "tool_error";
      response = { text: CHAT_FALLBACK };
      source = "fixed";
    }
  } else if (routed.route === "fallback") {
    onStatus("답변을 준비하는 중");
    const timed = createTimedSignal(
      dependencies.requestSignal,
      dependencies.timeoutMs ?? 8_000,
    );
    try {
      response = {
        text: await raceWithAbort(
          (dependencies.generateAnswer ?? generateChatAnswer)(
            request.message,
            request.context,
            timed.signal,
          ),
          timed.signal,
        ),
      };
      source = "model";
    } catch (error) {
      const aborted = timed.signal.aborted;
      failure = aborted ? "timeout" : "model_error";
      response = { text: CHAT_FALLBACK };
      source = "fixed";
      if (!aborted) {
        console.error(
          "F10 model call failed",
          error instanceof Error ? error.name : "unknown",
        );
      }
    } finally {
      timed.cleanup();
    }
  }

  onStatus("답변을 안전하게 점검하는 중");
  const gate = gateChatOutput({
    text: response.text,
    source,
    allowedNumbers: allowedContextNumbers(request),
  });
  const gatedResponse: ChatResponse = {
    text: gate.ok
      ? gate.text
      : gate.reason === "prohibited"
        ? SAFE_REFUSAL
        : CHAT_FALLBACK,
    ...sanitizeActionPayload(response),
  };

  onStatus(gate.ok ? "안전 점검 통과" : "안전한 답변으로 바꿨어");
  return {
    response: gatedResponse,
    route: routed.route,
    intent: routed.intent,
    source,
    ...(routed.tool ? { tool: routed.tool } : {}),
    ...(toolExecution ? { toolStatus: toolExecution.status } : {}),
    gate: gate.ok ? "passed" : "replaced",
    ...(!gate.ok ? { gateReason: gate.reason } : {}),
    ...(failure ? { failure } : {}),
  };
}
