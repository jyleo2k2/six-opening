import type {
  ChatBehaviorEvent,
  ProactiveSessionState,
  ProactiveSignal,
} from "../types/chatbot";

export const PROACTIVE_LIMITS = {
  dwellMs: 5 * 60 * 1000,
  lossRevisitWindowMs: 5 * 60 * 1000,
  minimumGapMs: 3 * 60 * 1000,
  sameSignalGapMs: 10 * 60 * 1000,
  sessionIdleMs: 30 * 60 * 1000,
  maximumPerSession: 2,
} as const;

export function createProactiveSession(now: number): ProactiveSessionState {
  return {
    lastActivityAt: now,
    lastShownAt: null,
    shownAtBySignal: {},
    shownCount: 0,
    mutedSignals: [],
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
  const abandonedBuys = events.filter(
    (event): event is Extract<ChatBehaviorEvent, { type: "buy_confirmation_abandoned" }> =>
      event.type === "buy_confirmation_abandoned",
  );
  const recentAbandonedBuys = abandonedBuys.slice(-2);

  if (
    latestEvent?.type === "buy_confirmation_abandoned" &&
    recentAbandonedBuys.length === 2 &&
    recentAbandonedBuys[0].stockId === recentAbandonedBuys[1].stockId &&
    events.some(
      (event) =>
        event.type === "screen_entered" &&
        event.screen !== "order" &&
        event.at > recentAbandonedBuys[0].at &&
        event.at < recentAbandonedBuys[1].at,
    ) &&
    !events.some(
      (event) =>
        event.type === "trade_filled" &&
        event.side === "buy" &&
        event.stockId === recentAbandonedBuys[1].stockId &&
        event.at > recentAbandonedBuys[0].at &&
        event.at < recentAbandonedBuys[1].at,
    )
  ) {
    signals.push("buyHesitation");
  }

  const dwell = [...events].reverse().find(
    (event): event is Extract<ChatBehaviorEvent, { type: "screen_dwell_completed" }> =>
      event.type === "screen_dwell_completed",
  );
  if (dwell && dwell.durationMs > PROACTIVE_LIMITS.dwellMs) {
    signals.push("dwell");
  }

  const realizedLoss = [...events].reverse().find(
    (event): event is Extract<ChatBehaviorEvent, { type: "trade_filled" }> =>
      event.type === "trade_filled" &&
      event.side === "sell" &&
      event.realizedPnlPct !== undefined &&
      event.realizedPnlPct <= -10,
  );

  if (
    realizedLoss &&
    now >= realizedLoss.at &&
    now - realizedLoss.at <= PROACTIVE_LIMITS.lossRevisitWindowMs
  ) {
    const revisitCount = events.filter(
      (event) =>
        event.type === "screen_entered" &&
        event.screen === "stock" &&
        event.stockId === realizedLoss.stockId &&
        event.at >= realizedLoss.at &&
        event.at <= now,
    ).length;
    if (revisitCount >= 4) signals.push("lossRevisit");
  }

  return signals;
}

export function selectProactiveSignal(
  signals: readonly ProactiveSignal[],
  state: ProactiveSessionState,
  now: number,
): ProactiveSignal | null {
  if (state.shownCount >= PROACTIVE_LIMITS.maximumPerSession) return null;
  if (
    state.lastShownAt !== null &&
    now - state.lastShownAt < PROACTIVE_LIMITS.minimumGapMs
  ) {
    return null;
  }

  return (
    signals.find((signal) => {
      if (state.mutedSignals.includes(signal)) return false;
      const lastShownAt = state.shownAtBySignal[signal];
      return (
        lastShownAt === undefined ||
        now - lastShownAt >= PROACTIVE_LIMITS.sameSignalGapMs
      );
    }) ?? null
  );
}

export function markProactiveSignalShown(
  state: ProactiveSessionState,
  signal: ProactiveSignal,
  now: number,
): ProactiveSessionState {
  return {
    ...state,
    lastActivityAt: now,
    lastShownAt: now,
    shownAtBySignal: { ...state.shownAtBySignal, [signal]: now },
    shownCount: state.shownCount + 1,
  };
}

export function muteProactiveSignal(
  state: ProactiveSessionState,
  signal: ProactiveSignal,
  now: number,
): ProactiveSessionState {
  return {
    ...state,
    lastActivityAt: now,
    mutedSignals: state.mutedSignals.includes(signal)
      ? state.mutedSignals
      : [...state.mutedSignals, signal],
  };
}
