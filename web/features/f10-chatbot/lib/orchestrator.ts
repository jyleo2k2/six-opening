import {
  gateChatOutput,
  SAFE_REFUSAL,
  type ChatOutputSource,
} from "../../../shared/llm/filter";
import type { ChatResponse } from "../../../shared/types/chatbot";
import { findExplainScript } from "../../../shared/data/chatbot-knowledge";
import type { ChatActionPayload, ChatRequest } from "./contracts";
import { sanitizeActionPayload } from "./contracts";
import {
  advanceExplain,
  findCommonExplainScript,
  reaskExplain,
  resolveTextReply,
  startExplain,
  startGuidedExplain,
  type ExplainStep,
} from "./explain";
import { generateChatAnswer } from "./openai";
import { looksLikeNewQuestion } from "./colloquial";
import { routeMessage, type ChatIntent, type ChatRoute } from "./routing";
import type { ChatSession } from "./session";
import {
  advanceStockExplore,
  createStockExploreTurn,
  formatStockFactAnswer,
  startStockExplore,
  type StockExploreStep,
} from "./stock-explore";
import { runReadOnlyTool, type ToolExecution } from "./tools";

export const CHAT_FALLBACK =
  "답변을 안전하게 확인하지 못했어. 금융 용어나 화면 사용법을 다시 짧게 물어봐 줘. 🐻";

export type ChatOutcome = {
  response: ChatResponse;
  action?: ChatActionPayload;
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

/**
 * DAPIE 설명 경로를 결정한다.
 * - `"invalid"` = 위조되었거나 이어 갈 수 없는 응답
 * - `ExplainStep` = 새로 시작하거나 다음 단계로 진행 (되묻기 포함)
 * - `null` = 진행 중인 DAPIE 전이와 무관 (기존 라우팅으로)
 */
function resolveExplainStep(
  request: ChatRequest,
  routed: ReturnType<typeof routeMessage>,
): ExplainStep | "invalid" | null {
  const protectedRoute =
    routed.route === "refusal" ||
    routed.route === "safety" ||
    routed.route === "outOfScope";
  if (protectedRoute) return null;

  if (request.explain) {
    const script =
      findExplainScript(request.explain.scriptId) ??
      findCommonExplainScript(request.explain.scriptId);
    if (!script) return "invalid";

    // 버튼을 누르지 않고 타이핑했으면 구어체를 해석한다.
    const choiceId =
      request.explain.choiceId ??
      resolveTextReply(script, request.explain.stage, request.message);
    if (!choiceId) {
      // 새 전용 설명 질문이면 해당 스크립트를 시작하고, 그 밖의 새 질문은 일반 라우팅으로 넘긴다.
      if (routed.explainScript) return startExplain(routed.explainScript);
      return looksLikeNewQuestion(request.message) || routed.route !== "fallback"
        ? null
        : reaskExplain(script, request.explain.stage);
    }
    return advanceExplain(script, { ...request.explain, choiceId }) ?? "invalid";
  }

  return routed.explainScript ? startExplain(routed.explainScript) : null;
}

function resolveStockExploreStep(
  request: ChatRequest,
  routed: ReturnType<typeof routeMessage>,
): StockExploreStep | "invalid" | null {
  const protectedRoute =
    routed.route === "refusal" ||
    routed.route === "safety" ||
    routed.route === "outOfScope";
  if (protectedRoute) return null;

  if (request.stockExplore) {
    return advanceStockExplore(request.stockExplore) ?? "invalid";
  }
  if (routed.stockFact) {
    return (
      startStockExplore(routed.stockFact.stockId, routed.stockFact.topic) ??
      "invalid"
    );
  }
  return null;
}

function dapieFeedback(
  route: ChatRoute,
  intent: ChatIntent,
  source: ChatOutputSource,
) {
  if (source === "tool") return "네가 볼 수 있는 자료를 확인했어";
  if (route === "context") return "지금 화면을 잘 살펴봤네";
  if (intent === "service_help") return "어디서 확인할지 잘 물어봤어";
  if (intent === "financial_concept") return "궁금한 개념을 잘 찾았어";
  return "궁금한 지점을 잘 짚었어";
}

export async function createChatOutcome(
  request: ChatRequest,
  session: ChatSession,
  dependencies: ChatOrchestratorDependencies = {},
): Promise<ChatOutcome> {
  const onStatus = dependencies.onStatus ?? (() => undefined);
  const routed = routeMessage(request.message, request.context);
  const explainStep = resolveExplainStep(request, routed);
  const stockExploreStep = resolveStockExploreStep(request, routed);
  let response: ChatResponse = {
    text: routed.text,
    suggestedQuestions: routed.suggestedQuestions,
    uiAction: routed.uiAction,
  };
  let source: ChatOutputSource = "fixed";
  let toolExecution: ToolExecution | undefined;
  let failure: ChatOutcome["failure"];
  let explainAction: ChatActionPayload | undefined;
  let stockExploreAction: ChatActionPayload | undefined;

  onStatus("질문을 안전하게 확인하는 중");

  if (stockExploreStep === "invalid") {
    response = {
      text: "그 종목 정보 단계는 이어 갈 수 없어. 종목 이름과 궁금한 점을 다시 적어 줘.",
    };
  } else if (stockExploreStep?.kind === "end") {
    response = { text: stockExploreStep.text };
  } else if (stockExploreStep?.kind === "topic") {
    onStatus("승인된 종목 정보를 확인하는 중");
    try {
      toolExecution = await (dependencies.runTool ?? runReadOnlyTool)(
        "approved_stock_facts",
        { ...request.context, stockId: stockExploreStep.stockId },
        session,
        stockExploreStep.topic,
      );
      response = toolExecution.response;
      source = "tool";
      if (toolExecution.status === "ok") {
        response = {
          ...response,
          text: formatStockFactAnswer(
            stockExploreStep.topic,
            response.text,
          ),
        };
        const turn = createStockExploreTurn(
          stockExploreStep.stockId,
          stockExploreStep.shownTopics,
        );
        if (turn) stockExploreAction = { kind: "stock-explore", turn };
      }
    } catch {
      failure = "tool_error";
      response = { text: CHAT_FALLBACK };
      source = "fixed";
    }
  } else if (explainStep === "invalid") {
    response = {
      text: "그 설명 단계는 이어 갈 수 없어. 궁금한 용어를 다시 물어봐 줘. 🐻",
    };
  } else if (explainStep) {
    onStatus("단계별 설명 준비 완료");
    response = { text: explainStep.text };
    if (explainStep.kind === "turn") {
      explainAction = { kind: "explain", turn: explainStep.turn };
    }
  } else if (routed.route === "tool" && routed.tool) {
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

  const protectedRoute =
    routed.route === "refusal" ||
    routed.route === "safety" ||
    routed.route === "outOfScope";
  if (explainStep === null && stockExploreStep === null && !protectedRoute) {
    const guided = startGuidedExplain(
      response.text,
      dapieFeedback(routed.route, routed.intent, source),
    );
    response = { ...response, text: guided.text };
    if (guided.kind === "turn") {
      explainAction = { kind: "explain", turn: guided.turn };
    }
  }

  onStatus("답변을 안전하게 점검하는 중");
  const gate = gateChatOutput({
    text: response.text,
    source,
    allowedNumbers: allowedContextNumbers(request),
  });
  const standardAction = gate.ok
    ? sanitizeActionPayload(response)
    : undefined;
  const outputAction = gate.ok
    ? stockExploreAction
      ? { ...standardAction, ...stockExploreAction }
      : explainAction
        ? { ...standardAction, ...explainAction }
        : standardAction
    : undefined;
  const gatedResponse: ChatResponse = {
    text: gate.ok
      ? gate.text
      : gate.reason === "prohibited"
        ? SAFE_REFUSAL
        : CHAT_FALLBACK,
    ...(standardAction ?? {}),
  };

  onStatus(gate.ok ? "안전 점검 통과" : "안전한 답변으로 바꿨어");
  return {
    response: gatedResponse,
    ...(outputAction ? { action: outputAction } : {}),
    route: stockExploreStep ? "tool" : routed.route,
    intent: stockExploreStep ? "stock_facts" : routed.intent,
    source,
    ...(toolExecution
      ? { tool: toolExecution.tool, toolStatus: toolExecution.status }
      : routed.tool
        ? { tool: routed.tool }
        : {}),
    gate: gate.ok ? "passed" : "replaced",
    ...(!gate.ok ? { gateReason: gate.reason } : {}),
    ...(failure ? { failure } : {}),
  };
}
