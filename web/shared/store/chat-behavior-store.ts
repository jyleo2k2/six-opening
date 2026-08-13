"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createProactiveSession,
  detectProactiveSignals,
  PROACTIVE_LIMITS,
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
  recordEvent: (event: ChatBehaviorEvent) => void;
  acceptActiveSignal: () => void;
  dismissActiveSignal: () => void;
  clearSession: (now: number) => void;
};

export const useChatBehaviorStore = create<ChatBehaviorStore>()(
  persist(
    (set) => ({
      events: [],
      proactiveSession: createProactiveSession(0),
      activeSignal: null,
      activeSignalVersion: 0,
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
          const signal = selectProactiveSignal(detectProactiveSignals(events, event.at));
          const retainedEvents =
            signal === "buyHesitation"
              ? events.filter(
                  (storedEvent) =>
                    storedEvent.type !== "buy_confirmation_abandoned",
                )
              : events;

          return {
            events: retainedEvents,
            proactiveSession: refreshedSession,
            activeSignal: signal ?? (sessionExpired ? null : state.activeSignal),
            activeSignalVersion: signal
              ? state.activeSignalVersion + 1
              : state.activeSignalVersion,
          };
        }),
      acceptActiveSignal: () => set({ activeSignal: null }),
      dismissActiveSignal: () => set({ activeSignal: null }),
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
