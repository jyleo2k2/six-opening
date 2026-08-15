"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createProactiveMute,
  createProactiveSession,
  declineProactive,
  detectProactiveSignals,
  enableProactive,
  isProactiveSilenced,
  PROACTIVE_LIMITS,
  type ProactiveMuteState,
  refreshProactiveMute,
  refreshProactiveSession,
  selectProactiveSignal,
} from "../engine/proactive-help";
import type {
  ChatBehaviorEvent,
  ProactiveSessionState,
  ProactiveSignal,
} from "../types/chatbot";

const MAX_SESSION_EVENTS = 100;

type ChatBehaviorStore = {
  events: ChatBehaviorEvent[];
  proactiveSession: ProactiveSessionState;
  activeSignal: ProactiveSignal | null;
  activeSignalVersion: number;
  /** 선제 도움 침묵 상태. 판정은 `shared/engine/proactive-help` 가 한다. */
  proactiveMute: ProactiveMuteState;
  recordEvent: (event: ChatBehaviorEvent) => void;
  acceptActiveSignal: () => void;
  /** “아니요”. 거절을 **기록한다** — 예전에는 수락과 몸통이 같아 거절이 어디에도 안 남았다. */
  dismissActiveSignal: (signal: ProactiveSignal) => void;
  /** 대화창에서 선제 도움을 다시 켠다. */
  enableProactiveHelp: () => void;
  clearSession: (now: number) => void;
};

export const useChatBehaviorStore = create<ChatBehaviorStore>()(
  persist(
    (set) => ({
      events: [],
      proactiveSession: createProactiveSession(0),
      activeSignal: null,
      activeSignalVersion: 0,
      proactiveMute: createProactiveMute(),
      recordEvent: (event) =>
        set((state) => {
          const sessionExpired =
            event.at - state.proactiveSession.lastActivityAt >=
            PROACTIVE_LIMITS.sessionIdleMs;
          const events = [
            ...(sessionExpired ? [] : state.events),
            event,
          ].slice(-MAX_SESSION_EVENTS);
          const refreshedSession = refreshProactiveSession(
            state.proactiveSession,
            event.at,
          );
          // 세션이 갈리면 신호별 침묵만 푼다. 전체 끄기는 아이가 켤 때까지 그대로다.
          const mute = sessionExpired
            ? refreshProactiveMute(state.proactiveMute)
            : state.proactiveMute;
          const detected = selectProactiveSignal(detectProactiveSignals(events, event.at));
          // 침묵 중인 신호는 뜨지 않는다. 판정 자체는 그대로 돌려 이벤트 누적을 망가뜨리지 않는다.
          const signal =
            detected && isProactiveSilenced(mute, detected) ? null : detected;
          // 침묵 여부와 무관하게 판정이 섰으면 이탈 기록을 비운다. 침묵 중이라고 남겨 두면
          // 다시 켰을 때 예전 이탈로 곧바로 말풍선이 뜬다.
          const retainedEvents =
            detected === "buyHesitation"
              ? events.filter(
                  (storedEvent) =>
                    storedEvent.type !== "buy_confirmation_abandoned",
                )
              : events;

          return {
            events: retainedEvents,
            proactiveSession: refreshedSession,
            proactiveMute: mute,
            activeSignal: signal ?? (sessionExpired ? null : state.activeSignal),
            activeSignalVersion: signal
              ? state.activeSignalVersion + 1
              : state.activeSignalVersion,
          };
        }),
      acceptActiveSignal: () => set({ activeSignal: null }),
      dismissActiveSignal: (signal) =>
        set((state) => ({
          activeSignal: null,
          proactiveMute: declineProactive(state.proactiveMute, signal),
        })),
      enableProactiveHelp: () => set({ proactiveMute: enableProactive() }),
      clearSession: (now) =>
        set({
          events: [],
          proactiveSession: createProactiveSession(now),
          activeSignal: null,
          activeSignalVersion: 0,
        }),
    }),
    {
      name: "kiwoom-chat-behavior-unlimited-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
