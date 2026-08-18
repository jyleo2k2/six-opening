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

/** `proactiveMute` 를 저장본에서 뺀 판. v1 저장본은 `migrate` 가 걸러 낸다. */
const PERSIST_VERSION = 2;

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

/** localStorage 에 남기는 부분. 끄기 상태(`proactiveMute`)는 여기 없다. */
type PersistedChatBehavior = Pick<
  ChatBehaviorStore,
  "events" | "proactiveSession" | "activeSignal" | "activeSignalVersion"
>;

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
      version: PERSIST_VERSION,
      /**
       * **선제 도움 끄기는 저장하지 않는다.** 앱을 다시 켜거나 다시 로그인하면 켜진 채로
       * 시작한다(로그아웃은 `window.location.href = "/"` 라 그때도 새 로드다).
       *
       * 예전에는 전체 상태를 통째로 저장해 `off` 가 브라우저에 영구히 남았다. 그런데 되살릴
       * 스위치는 대화창 머리에 **꺼져 있을 때만** 보이는 버튼 하나뿐이고, 말풍선은
       * `buyHesitation` 을 빼면 스스로 사라지지 않는다 — 8초짜리를 치우려고 누른 `아니요` 가
       * 세 번 쌓이면 그 브라우저에서는 선제 도움이 두 번 다시 뜨지 않았다. 끄기의 수명을
       * 한 번의 앱 사용으로 줄여 되살릴 길을 앱 재시작으로 넓힌다.
       *
       * 행동 이벤트와 30분 세션은 그대로 저장한다. 새로고침으로 이탈 기록이 사라지면
       * 신호가 조건을 채울 수 없다.
       */
      partialize: ({
        events,
        proactiveSession,
        activeSignal,
        activeSignalVersion,
      }) => ({ events, proactiveSession, activeSignal, activeSignalVersion }),
      /**
       * v1 저장본에는 `proactiveMute` 가 들어 있다. 되읽기는 얕은 병합이라 그대로 두면
       * 이미 꺼 둔 브라우저가 이 변경 뒤에도 꺼진 채로 뜬다 — 남은 값을 여기서 떨어뜨린다.
       */
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return persisted as PersistedChatBehavior;
        const { proactiveMute: _legacyMute, ...rest } = persisted as Record<string, unknown>;
        return rest as PersistedChatBehavior;
      },
    },
  ),
);
