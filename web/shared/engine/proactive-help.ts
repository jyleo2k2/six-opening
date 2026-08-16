import type {
  ChatBehaviorEvent,
  ProactiveSessionState,
  ProactiveSignal,
} from "../types/chatbot";

export const PROACTIVE_LIMITS = {
  dwellMs: 5 * 60 * 1000,
  sessionIdleMs: 30 * 60 * 1000,
} as const;

export function createProactiveSession(now: number): ProactiveSessionState {
  return {
    lastActivityAt: now,
  };
}

export function refreshProactiveSession(
  state: ProactiveSessionState,
  now: number,
): ProactiveSessionState {
  if (now - state.lastActivityAt >= PROACTIVE_LIMITS.sessionIdleMs) {
    return createProactiveSession(now);
  }

  return { ...state, lastActivityAt: now };
}

export function detectProactiveSignals(
  events: readonly ChatBehaviorEvent[],
  now: number,
): ProactiveSignal[] {
  const signals: ProactiveSignal[] = [];
  const latestEvent = events.at(-1);
  let lastBuyFillIndex = -1;
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.type === "trade_filled" && event.side === "buy") {
      lastBuyFillIndex = index;
      break;
    }
  }
  const recentAbandonedBuys = events
    .slice(lastBuyFillIndex + 1)
    .filter(
      (event): event is Extract<
        ChatBehaviorEvent,
        { type: "buy_confirmation_abandoned" }
      > => event.type === "buy_confirmation_abandoned",
    )
    .slice(-3);

  if (
    latestEvent?.type === "buy_confirmation_abandoned" &&
    recentAbandonedBuys.length === 3
  ) {
    signals.push("buyHesitation");
  }

  if (latestEvent?.type === "order_method_selected") {
    let lastOrderFlowBoundary = -1;
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event.type === "screen_entered" && event.screen !== "order") {
        lastOrderFlowBoundary = index;
        break;
      }
    }
    const orderMethodSelections = events.slice(lastOrderFlowBoundary + 1).filter(
      (event): event is Extract<
        ChatBehaviorEvent,
        { type: "order_method_selected" }
      > =>
        event.type === "order_method_selected" &&
        event.orderFlowId === latestEvent.orderFlowId,
    );
    const isAlternating = orderMethodSelections.every(
      (event, index) =>
        index === 0 ||
        event.orderType !== orderMethodSelections[index - 1]?.orderType,
    );

    // 세 번째 실제 변경에서만 발화한다. 이 주문 흐름 안에서는 한 번만
    // 보여 주므로 시간·횟수 기반 발화 제한을 둘 필요가 없다.
    if (orderMethodSelections.length === 3 && isAlternating) {
      signals.push("orderMethodConfusion");
    }
  }

  if (
    latestEvent?.type === "screen_dwell_completed" &&
    latestEvent.durationMs > PROACTIVE_LIMITS.dwellMs
  ) {
    signals.push("dwell");
  }

  return signals;
}

export function selectProactiveSignal(
  signals: readonly ProactiveSignal[],
): ProactiveSignal | null {
  return signals[0] ?? null;
}

/**
 * 선제 도움 끄기 — 아이가 "먼저 말 걸지 마"라고 말하는 방법.
 *
 * 플로팅 버튼을 삭제 타깃에 버리는 것은 "챗봇 안 쓸래"이지 "먼저 말 걸지 마"가 아니다.
 * 둘을 한 스위치로 묶으면 선제 도움만 끄고 싶은 아이가 챗봇을 통째로 버려야 한다.
 *
 * 세기는 거절 횟수로 읽는다. 한 번은 "지금은 아니야", 세 번은 "그만해"다 — `buyHesitation`
 * 이 3회 이탈을 망설임으로 읽는 것과 **같은 저울을 반대 방향으로** 쓴다. 한 번에 전부 끄면
 * 8초짜리 말풍선을 치우려고 누른 버튼이 기능 하나를 통째로 없앤다.
 */
export const PROACTIVE_OFF_DECLINES = 3;

export type ProactiveMuteState = {
  /** 누적 거절 수. 끌 때 0 으로 되돌린다. */
  declines: number;
  /** 이번 세션에만 재울 신호. 30분 세션이 갈리면 비운다. */
  mutedSignals: readonly ProactiveSignal[];
  /** 전체 끄기. **세션이 갈려도 유지된다** — 아이가 직접 켤 때까지다. */
  off: boolean;
};

export function createProactiveMute(): ProactiveMuteState {
  return { declines: 0, mutedSignals: [], off: false };
}

/** “아니요”를 눌렀다. 그 신호를 이번 세션 동안 재우고, 세 번째면 전체를 끈다. */
export function declineProactive(
  state: ProactiveMuteState,
  signal: ProactiveSignal,
): ProactiveMuteState {
  const declines = state.declines + 1;
  if (declines >= PROACTIVE_OFF_DECLINES) {
    // 끄고 나면 누적을 비운다. 다시 켠 아이가 한 번 거절했다고 곧바로 또 꺼지면 안 된다.
    return { declines: 0, mutedSignals: [], off: true };
  }
  const mutedSignals = state.mutedSignals.includes(signal)
    ? state.mutedSignals
    : [...state.mutedSignals, signal];
  return { declines, mutedSignals, off: false };
}

/** 대화창에서 다시 켰다. 거절 이력까지 함께 지운다. */
export function enableProactive(): ProactiveMuteState {
  return createProactiveMute();
}

/** 30분 무활동으로 세션이 갈렸다. 세션 단위 침묵만 풀고 전체 끄기는 그대로 둔다. */
export function refreshProactiveMute(state: ProactiveMuteState): ProactiveMuteState {
  return { ...state, mutedSignals: [] };
}

export function isProactiveSilenced(
  state: ProactiveMuteState,
  signal: ProactiveSignal,
): boolean {
  return state.off || state.mutedSignals.includes(signal);
}
