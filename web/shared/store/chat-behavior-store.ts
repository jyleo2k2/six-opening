"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  createProactiveSession,
  detectProactiveSignals,
  markProactiveSignalShown,
  muteProactiveSignal,
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
  recordEvent: (event: ChatBehaviorEvent) => void;
  acceptActiveSignal: () => void;
  muteActiveSignal: (now: number) => void;
  clearSession: (now: number) => void;
};

export const useChatBehaviorStore = create<ChatBehaviorStore>()(
  persist(
    (set) => ({
      events: [],
      proactiveSession: createProactiveSession(0),
      activeSignal: null,
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
          const activeSignal = sessionExpired ? null : state.activeSignal;

          if (activeSignal) {
            return { events, proactiveSession: refreshedSession, activeSignal };
          }

          const signal = selectProactiveSignal(
            detectProactiveSignals(events, event.at),
            refreshedSession,
            event.at,
          );

          return {
            events,
            proactiveSession: signal
              ? markProactiveSignalShown(refreshedSession, signal, event.at)
              : refreshedSession,
            activeSignal: signal,
          };
        }),
      acceptActiveSignal: () => set({ activeSignal: null }),
      muteActiveSignal: (now) =>
        set((state) => ({
          activeSignal: null,
          proactiveSession: state.activeSignal
            ? muteProactiveSignal(state.proactiveSession, state.activeSignal, now)
            : state.proactiveSession,
        })),
      clearSession: (now) =>
        set({
          events: [],
          proactiveSession: createProactiveSession(now),
          activeSignal: null,
        }),
    }),
    {
      name: "kiwoom-chat-behavior-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
