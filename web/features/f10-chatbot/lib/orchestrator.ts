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
  GUIDED_SCRIPT_ID,
  reaskExplain,
  resolveTextReply,
  startExplain,
  startGuidedExplain,
  type ExplainStep,
} from "./explain";
import { generateChatAnswer } from "./openai";
import { judgeChatOutput } from "./output-judge";
import { rewriteFollowUp } from "./rewrite";
import { classifyTermKind, type ClassifiedTermKind } from "./term-classify";
import { looksLikeNewQuestion } from "./colloquial";
import { isHaeyoKorean, toPoliteKorean } from "./polite";
import {
  normalizeChatInput,
  routeMessage,
  termReply,
  type ChatIntent,
  type ChatRoute,
} from "./routing";
import type { ChatSession } from "./session";
import {
  advanceStockExplore,
  createStockExploreTurn,
  formatStockFactAnswer,
  startStockExplore,
  type StockExploreStep,
} from "./stock-explore";
import { createSectorExploreTurn, resolveSectorExplore } from "./sector-explore";
import { runReadOnlyTool, type ToolExecution } from "./tools";

export const CHAT_FALLBACK =
  "답변을 안전하게 확인하지 못했어요. 금융 용어나 화면 사용법을 다시 짧게 물어봐 주세요. 🐻";

export type ChatOutcome = {
  response: ChatResponse;
  action?: ChatActionPayload;
  route: ChatRoute;
  intent: ChatIntent;
  source: ChatOutputSource;
  tool?: ToolExecution["tool"];
  toolStatus?: ToolExecution["status"];
  gate: "passed" | "replaced";
  gateReason?:
    | Exclude<ReturnType<typeof gateChatOutput>, { ok: true }>["reason"]
    | "judge_violation"
    | "judge_unavailable"
    | "tone_violation";
  failure?: "timeout" | "model_error" | "tool_error";
  /** 지시어 후속 질문을 다시 써서 라우팅했는지. 원문은 남기지 않는다. */
  rewritten?: boolean;
};

type ChatOrchestratorDependencies = {
  generateAnswer?: typeof generateChatAnswer;
  judgeOutput?: typeof judgeChatOutput;
  rewriteQuestion?: typeof rewriteFollowUp;
  /**
   * 실험 단계 T5c(§6.1.5 term 9종 커버리지 보강). 다른 의존성과 달리 기본값이
   * 실제 Luna 호출이 아니라 무조건 "none"이다 — 호출부(`app/api/chat/route.ts`
   * 등)가 명시적으로 `classifyTermKind`를 넘겨야만 켜진다. 이 폴더의 기존
   * 테스트들이 `fallback` 라우팅 케이스에서 `classifyTerm`을 안 넘기고 있어서
   * 기본값이 실제 호출이면 네트워크를 타 테스트가 깨진다.
   */
  classifyTerm?: (message: string, signal: AbortSignal) => Promise<ClassifiedTermKind>;
  runTool?: typeof runReadOnlyTool;
  timeoutMs?: number;
  judgeTimeoutMs?: number;
  rewriteTimeoutMs?: number;
  requestSignal?: AbortSignal;
  onStatus?: (status: string) => void;
};

async function noTermClassification(): Promise<ClassifiedTermKind> {
  return "none";
}

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

function allowedContextNumbers(request: ChatRequest): (string | number)[] {
  const numbers: (string | number)[] = [
    request.context.quantity,
    request.context.unitPrice,
    // 화면이 지금 보여주는 내 지갑 값. 화면과 같은 숫자만 말할 수 있게 허용한다.
    request.context.pnlPercent,
    request.context.cash,
    request.context.holdingCount,
  ].filter((value): value is number => value !== undefined);

  // 사용자가 같은 질문에 적은 값은 되짚어 말할 수 있어야 한다 (SPEC §6.1.5 조건 계산).
  for (const match of request.message.matchAll(/\d[\d,.]*/g)) {
    numbers.push(match[0].replace(/[.,]$/, ""));
  }

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
 * - `"simpler"` = 직전 guided 답변을 모델로 한 번 더 쉽게 설명
 * - `ExplainStep` = 새로 시작하거나 다음 단계로 진행 (되묻기 포함)
 * - `null` = 진행 중인 DAPIE 전이와 무관 (기존 라우팅으로)
 */
function resolveExplainStep(
  request: ChatRequest,
  routed: ReturnType<typeof routeMessage>,
): ExplainStep | "invalid" | "simpler" | null {
  const protectedRoute =
    routed.route === "refusal" ||
    routed.route === "safety" ||
    (routed.route === "outOfScope" && !isGenericOutOfScope(routed));
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
      return looksLikeNewQuestion(request.message) ||
        (routed.route !== "fallback" && !isGenericOutOfScope(routed))
        ? null
        : reaskExplain(script, request.explain.stage, request.explain.reaskCount ?? 0);
    }
    if (choiceId === "ask" && looksLikeNewQuestion(request.message)) {
      return routed.explainScript ? startExplain(routed.explainScript) : null;
    }
    if (
      script.id === GUIDED_SCRIPT_ID &&
      request.explain.stage === "brief" &&
      choiceId === "simpler" &&
      request.explain.previousAnswer
    ) {
      return "simpler";
    }
    return advanceExplain(script, { ...request.explain, choiceId }) ?? "invalid";
  }

  return routed.explainScript ? startExplain(routed.explainScript) : null;
}

function isGenericOutOfScope(routed: ReturnType<typeof routeMessage>): boolean {
  return routed.route === "outOfScope" && routed.steps[0] === "허용 목적 미판정 범위 안내";
}

function resolveStockExploreStep(
  request: ChatRequest,
  routed: ReturnType<typeof routeMessage>,
): StockExploreStep | "invalid" | null {
  const protectedRoute =
    routed.route === "refusal" ||
    routed.route === "safety" ||
    (routed.route === "outOfScope" && !isGenericOutOfScope(routed));
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

function resolveSectorExploreStep(
  request: ChatRequest,
  routed: ReturnType<typeof routeMessage>,
) {
  if (
    routed.route === "refusal" ||
    routed.route === "safety" ||
    (routed.route === "outOfScope" && !isGenericOutOfScope(routed))
  ) {
    return null;
  }
  if (request.sectorExplore) return resolveSectorExplore(request.sectorExplore) ?? "invalid";
  return null;
}

function dapieFeedback(
  route: ChatRoute,
  intent: ChatIntent,
  source: ChatOutputSource,
) {
  if (source === "tool") return "볼 수 있는 자료를 확인했어요";
  if (route === "context") return "지금 화면을 잘 살펴봤네요";
  if (intent === "service_help") return "어디서 확인할지 잘 물어봤어요";
  if (intent === "financial_concept") return "궁금한 개념을 잘 찾았어요";
  return "궁금한 지점을 잘 짚었어요";
}

function toPoliteAction(
  action: ChatActionPayload | undefined,
): ChatActionPayload | undefined {
  if (!action) return undefined;
  const suggestedQuestions = action.suggestedQuestions?.map(toPoliteKorean);
  if (!("kind" in action)) return { ...action, suggestedQuestions };

  if (action.kind === "explain") {
    return {
      ...action,
      suggestedQuestions,
      turn: {
        ...action.turn,
        prompt: toPoliteKorean(action.turn.prompt),
        choices: action.turn.choices.map((choice) => ({ ...choice, label: toPoliteKorean(choice.label) })),
      },
    };
  }
  if (action.kind === "stock-explore") {
    return {
      ...action,
      suggestedQuestions,
      turn: {
        ...action.turn,
        prompt: toPoliteKorean(action.turn.prompt),
        choices: action.turn.choices.map((choice) => ({ ...choice, label: toPoliteKorean(choice.label) })),
      },
    };
  }
  return {
    ...action,
    suggestedQuestions,
    turn: {
      ...action.turn,
      prompt: toPoliteKorean(action.turn.prompt),
      choices: action.turn.choices.map((choice) => ({ ...choice, label: toPoliteKorean(choice.label) })),
    },
  };
}

/**
 * 2단 — 지시어 후속 질문 되살리기 (SPEC §3.5).
 *
 * 1단이 어떤 허용 목적도 판정하지 못했을 때만 돈다. 위기·추천·개인정보처럼 1단이
 * 이미 잡은 입력은 여기에 오지 않으므로 재작성이 차단을 우회하는 통로가 되지
 * 않는다. 재작성문은 같은 `routeMessage` 를 처음부터 다시 통과한다.
 */
async function resolveFollowUp(
  request: ChatRequest,
  firstPass: ReturnType<typeof routeMessage>,
  dependencies: ChatOrchestratorDependencies,
  onStatus: (status: string) => void,
): Promise<{
  routed: ReturnType<typeof routeMessage>;
  modelMessage: string;
  rewritten?: string;
  /** 3단으로 보낸 경우의 2단 승인 답변. 모델 답변이 게이트에 막히면 이걸 쓴다. */
  approvedFallbackText?: string;
}> {
  const unresolved =
    isGenericOutOfScope(firstPass) ||
    firstPass.route === "fallback" ||
    // "말한 회사 이름을 찾지 못했어요" 도 사실은 못 알아들은 것이다. 지시어로 회사를
    // 가리킨 후속 질문("그럼 거기는 돈을 어떻게 벌어?")이 여기로 떨어진다.
    firstPass.steps[0] === "미등록 종목명 대체 차단";
  if (!unresolved || !request.lastAnswer) {
    return { routed: firstPass, modelMessage: request.message };
  }

  onStatus("무엇을 묻는지 확인하는 중");
  const timed = createTimedSignal(
    dependencies.requestSignal,
    dependencies.rewriteTimeoutMs ?? 4_000,
  );
  let rewritten: string | null = null;
  try {
    rewritten = await raceWithAbort(
      (dependencies.rewriteQuestion ?? rewriteFollowUp)(
        request.message,
        request.lastAnswer,
        timed.signal,
      ),
      timed.signal,
    );
  } catch (error) {
    // 재작성 실패는 1단 결과를 그대로 쓴다. 답변 경로를 넓히지 않는다.
    if (!timed.signal.aborted) {
      console.error(
        "F10 follow-up rewrite failed",
        error instanceof Error ? error.name : "unknown",
      );
    }
  } finally {
    timed.cleanup();
  }
  if (!rewritten) return { routed: firstPass, modelMessage: request.message };

  const secondPass = routeMessage(rewritten, request.context);
  if (isGenericOutOfScope(secondPass)) {
    return { routed: firstPass, modelMessage: request.message };
  }

  // 재작성이 직전과 같은 용어 정의로 흡수되면 아이가 물은 각도를 놓친다.
  // ("시장가는 언제 쓰나요?" → 시장가 정의 반복) 이럴 때만 모델에게 넘긴다.
  if (
    secondPass.route === "faq" &&
    request.lastTopicId &&
    secondPass.explainScript?.id === request.lastTopicId
  ) {
    return {
      routed: { ...secondPass, route: "fallback", explainScript: undefined },
      modelMessage: rewritten,
      rewritten,
      // 모델이 게이트에 막히면 안전 거절 대신 이 승인 정의로 되돌린다. "수익률이
      // 높으면 좋은가?" 같은 정상 질문에 거절이 나가는 편이 훨씬 나쁘다.
      approvedFallbackText: secondPass.text,
    };
  }

  return { routed: secondPass, modelMessage: rewritten, rewritten };
}

export async function createChatOutcome(
  request: ChatRequest,
  session: ChatSession,
  dependencies: ChatOrchestratorDependencies = {},
): Promise<ChatOutcome> {
  const onStatus = dependencies.onStatus ?? (() => undefined);
  const firstPass = routeMessage(request.message, request.context);
  const { routed, modelMessage, rewritten, approvedFallbackText } = await resolveFollowUp(
    request,
    firstPass,
    dependencies,
    onStatus,
  );
  const explainStep = resolveExplainStep(request, routed);
  const stockExploreStep = resolveStockExploreStep(request, routed);
  const sectorExploreStep = resolveSectorExploreStep(request, routed);
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
  let sectorExploreAction: ChatActionPayload | undefined;
  let simplerFallbackText: string | undefined;

  onStatus("질문을 안전하게 확인하는 중");

  if (sectorExploreStep === "invalid") {
    response = { text: "그 섹터 선택은 이어 갈 수 없어요. 섹터 이름을 다시 물어봐 줘." };
  } else if (sectorExploreStep !== null) {
    response = sectorExploreStep;
  } else if (stockExploreStep === "invalid") {
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
      text: "그 설명 단계는 이어 갈 수 없어요. 궁금한 용어를 다시 물어봐 주세요. 🐻",
    };
  } else if (explainStep === "simpler") {
    const script = findCommonExplainScript(GUIDED_SCRIPT_ID)!;
    const fallbackStep = advanceExplain(script, {
      scriptId: GUIDED_SCRIPT_ID,
      stage: "brief",
      choiceId: "simpler",
    })!;
    simplerFallbackText = fallbackStep.text;
    if (fallbackStep.kind === "turn") {
      explainAction = { kind: "explain", turn: fallbackStep.turn };
    }

    onStatus("더 쉬운 설명을 준비하는 중");
    const timed = createTimedSignal(
      dependencies.requestSignal,
      dependencies.timeoutMs ?? 8_000,
    );
    try {
      response = {
        text: await raceWithAbort(
          (dependencies.generateAnswer ?? generateChatAnswer)(
            `방금 답을 초등학교 4학년도 알 수 있게, 어려운 낱말 없이 2문장으로 다시 설명해 줘.\n\n방금 답:\n${request.explain?.previousAnswer}`,
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
      response = { text: fallbackStep.text };
      source = "fixed";
      if (!aborted) {
        console.error(
          "F10 simpler model call failed",
          error instanceof Error ? error.name : "unknown",
        );
      }
    } finally {
      timed.cleanup();
    }
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
      // 키워드 조합(findTermKind)이 놓친 표현 변형을 보조 분류기로 한 번 더
      // 확인한다. 분류돼도 화면에 나가는 문장은 여전히 termReply의 승인된
      // 고정 텍스트다 — 이 분기는 자유 생성을 하지 않는다. 실패하면 "none"으로
      // 닫힌 실패 처리해 기존 자유 생성 경로를 그대로 쓴다.
      const classifiedKind = await (dependencies.classifyTerm ?? noTermClassification)(
        modelMessage,
        timed.signal,
      ).catch(() => "none" as const);

      if (classifiedKind !== "none") {
        response = termReply(classifiedKind, normalizeChatInput(modelMessage));
        source = "fixed";
      } else {
        response = {
          text: await raceWithAbort(
            // 지시어가 풀린 단독 질문을 준다. 모델이 "그거"를 추측하지 않는다.
            (dependencies.generateAnswer ?? generateChatAnswer)(
              modelMessage,
              request.context,
              timed.signal,
            ),
            timed.signal,
          ),
        };
        source = "model";
      }
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

  if (sectorExploreStep === null && routed.sectorFact) {
    sectorExploreAction = { kind: "sector-explore", turn: createSectorExploreTurn(routed.sectorFact.sectorId) };
  }

  const protectedRoute =
    routed.route === "refusal" ||
    routed.route === "safety" ||
    routed.route === "outOfScope";
  const directServiceHelp = routed.intent === "service_help";
  // 성향·시즌 기록은 값을 설명하지 않고 그 화면으로 보낸다. 이해 확인 전이를
  // 붙이면 다음 행동이 버튼과 선택지로 갈라진다 — 답변 자체가 다음 행동이다.
  const screenGuidance =
    routed.intent === "own_records" ||
    routed.intent === "own_profile" ||
    routed.intent === "own_archive";
  if (
    explainStep === null &&
    stockExploreStep === null &&
    sectorExploreStep === null &&
    !protectedRoute &&
    !directServiceHelp &&
    !screenGuidance
  ) {
    const guided = startGuidedExplain(
      response.text,
      dapieFeedback(routed.route, routed.intent, source),
    );
    response = { ...response, text: guided.text };
    if (guided.kind === "turn") {
      explainAction = { kind: "explain", turn: guided.turn };
    }
  }

  response = {
    ...response,
    text: toPoliteKorean(response.text),
    ...(response.suggestedQuestions
      ? { suggestedQuestions: response.suggestedQuestions.map(toPoliteKorean) }
      : {}),
  };

  onStatus("답변을 안전하게 점검하는 중");
  const politeOutput =
    isHaeyoKorean(response.text) &&
    (response.suggestedQuestions?.every(isHaeyoKorean) ?? true);
  const gate = politeOutput
    ? gateChatOutput({
        text: response.text,
        source,
        allowedNumbers: allowedContextNumbers(request),
      })
    : { ok: false as const, reason: "tone_violation" as const };

  // T5b (SPEC §6.0.2) — 룰을 통과한 모델 생성 답변만 다시 판정한다. 고정 응답·
  // 사전·FAQ·Tool 응답은 승인된 정적 텍스트라 호출하지 않는다.
  let judgeReason: "judge_violation" | "judge_unavailable" | undefined;
  if (gate.ok && source === "model") {
    const timed = createTimedSignal(
      dependencies.requestSignal,
      dependencies.judgeTimeoutMs ?? 5_000,
    );
    try {
      const verdict = await raceWithAbort(
        (dependencies.judgeOutput ?? judgeChatOutput)(gate.text, timed.signal),
        timed.signal,
      );
      if (verdict.violation) judgeReason = "judge_violation";
    } catch (error) {
      // 닫힌 실패 — 검사하지 못한 생성문은 내보내지 않는다.
      judgeReason = "judge_unavailable";
      if (!timed.signal.aborted) {
        console.error(
          "F10 output judge failed",
          error instanceof Error ? error.name : "unknown",
        );
      }
    } finally {
      timed.cleanup();
    }
  }

  const gateReason = gate.ok ? judgeReason : gate.reason;
  const useSimplerFallback =
    explainStep === "simpler" && gateReason !== undefined && simplerFallbackText;
  // 재작성 뒤 모델에 넘겼는데 게이트가 막으면 2단 승인 답변으로 되돌린다.
  const useApprovedFallback =
    !useSimplerFallback && gateReason !== undefined && approvedFallbackText;
  const safeOutput =
    gateReason === undefined ||
    Boolean(useSimplerFallback) ||
    Boolean(useApprovedFallback);
  const standardAction = safeOutput
    ? sanitizeActionPayload(response)
    : undefined;
  const outputAction = toPoliteAction(safeOutput
    ? sectorExploreAction
      ? { ...standardAction, ...sectorExploreAction }
      : stockExploreAction
      ? { ...standardAction, ...stockExploreAction }
      : explainAction
        ? { ...standardAction, ...explainAction }
        : standardAction
    : undefined);
  const gatedResponse: ChatResponse = {
    text: useSimplerFallback
      ? useSimplerFallback
      : useApprovedFallback
      ? useApprovedFallback
      : gateReason === undefined
      ? (gate as { ok: true; text: string }).text
      : gateReason === "prohibited" || gateReason === "judge_violation"
        ? SAFE_REFUSAL
        : CHAT_FALLBACK,
    ...(standardAction ?? {}),
  };

  onStatus(
    gateReason === undefined ? "안전 점검 통과" : "안전한 답변으로 바꿨어요",
  );
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
    gate: gateReason === undefined ? "passed" : "replaced",
    ...(gateReason !== undefined ? { gateReason } : {}),
    ...(failure ? { failure } : {}),
    ...(rewritten ? { rewritten: true } : {}),
  };
}
