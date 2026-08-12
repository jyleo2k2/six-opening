"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { PROACTIVE_LIMITS } from "../../shared/engine/proactive-help";
import { useChatBehaviorStore } from "../../shared/store/chat-behavior-store";
import type { ChatUiAction, ExplainChoice, ExplainTurn } from "../../shared/types/chatbot";
import {
  isAllowedUiAction,
  isExplainAction,
  type ExplainActionPayload,
  type StandardChatActionPayload,
} from "./lib/contracts";
import { PROACTIVE_SCRIPTS } from "./lib/routing";

type Screen = "home" | "stock" | "order" | "archive";
type Message = {
  role: "assistant" | "user";
  text: string;
  suggestedQuestions?: string[];
  explainTurn?: ExplainTurn;
  uiAction?: ChatUiAction;
};

const COPY = {
  service: "\ud0a4\uc6c0 \uac00\uc871 \ubaa8\uc758\ud22c\uc790 \ub9ac\uadf8",
  account: "\ubbfc\uc900 \uacc4\uc815",
  title: "\ud0a4\uc6c5\uc774 \ucc57\ubd07 \ub370\ubaa8",
  subtitle: "\uc9c8\ubb38\uc5d0\ub294 \uc124\uba85\uc73c\ub85c, \ubd88\uc548\uc5d0\ub294 \uc9c8\ubb38\uc73c\ub85c",
  navLabel: "\ub370\ubaa8 \ud654\uba74 \uc120\ud0dd",
  current: "\ud604\uc7ac \ud654\uba74",
  orderQuantity: "\uc8fc\ubb38 \uc218\ub7c9",
  expectedAmount: "\uc608\uc0c1 \uae08\uc561 125,000\uc6d0",
  orderPractice: "주문 확인 연습",
  orderPracticeDescription: "매수와 매도 확인을 취소한 행동은 도움 신호 판정에만 사용돼.",
  cancelBuy: "매수 확인 취소",
  cancelSell: "매도 확인 취소",
  proactive: "\ud0a4\uc6c5\uc774\uc758 \uc120\uc81c \ub3c4\uc6c0",
  explain: "\uc0c1\ud669 \uc124\uba85",
  askDirectly: "\uc9c1\uc811 \uc9c8\ubb38",
  dismiss: "\uad1c\ucc2e\uc544",
  openChat: "\ud0a4\uc6c5\uc774 \ucc57\ubd07 \uc5f4\uae30",
  close: "\ub2eb\uae30",
  greeting:
    "\uc548\ub155, \ub098\ub294 \ud0a4\uc6c5\uc774\uc57c. \ud22c\uc790 \uae30\ucd08\uc640 \ud654\uba74 \uc0ac\uc6a9\ubc95\uc744 \ud568\uaed8 \ubcfc \uc218 \uc788\uc5b4.",
  recommended: "\ucd94\ucc9c \uc9c8\ubb38",
  aiNotice: "\ud0a4\uc6c5\uc774\ub294 AI \ub3c4\uc6b0\ubbf8\uc57c",
  status: "\ucc98\ub9ac \uc0c1\ud0dc",
  input: "\uad81\uae08\ud55c \uac83\uc744 \uc785\ub825\ud574 \uc918",
  send: "\ubcf4\ub0b4\uae30",
  relatedScreen: "관련 화면 보기",
  avatar: "\uacf0",
} as const;

const SCREENS: Record<
  Screen,
  { label: string; title: string; description: string; chips: string[] }
> = {
  home: {
    label: "\ud648",
    title: "\uc774\ubc88 \uc8fc \uac00\uc871 \ubaa8\uc758\ud22c\uc790 \ub9ac\uadf8",
    description: "\uc774\ubc88 \uc8fc \ud3ec\ud2b8\ud3f4\ub9ac\uc624\uc640 \ub9ac\uadf8 \uc9c4\ud589 \uc0c1\ud669\uc744 \ud655\uc778\ud574 \ubd10.",
    chips: ["\ub9e4\uc218 \uc5b4\ub5bb\uac8c \ud574?", "\uc218\uc775\ub960\uc774 \ubb50\uc57c?", "\ud0a4\uc6c5\uc774\uac00 \ubb58 \ub3c4\uc640\uc918?"],
  },
  stock: {
    label: "\uc885\ubaa9 \uc0c1\uc138",
    title: "삼성전자",
    description: "\uae30\uc5c5 \uc815\ubcf4\uc640 \uacf5\uac1c\ub41c \uacfc\uac70 \ub370\uc774\ud130\ub97c \uc0b4\ud3b4\ubcf4\ub294 \ud654\uba74\uc774\uc57c.",
    chips: ["\uc774 \ud68c\uc0ac\ub294 \ubb50 \ud558\ub294 \ud68c\uc0ac\uc57c?", "PER\uc774 \ubb50\uc57c?", "\uc2dc\uc7a5\uac00\uac00 \ubb50\uc57c?"],
  },
  order: {
    label: "\uc8fc\ubb38",
    title: "삼성전자 매수",
    description: "\uc218\ub7c9\uacfc \uc608\uc0c1 \uae08\uc561\uc744 \ud655\uc778\ud558\uace0 \ub124 \uc0dd\uac01\uc744 \uae30\ub85d\ud558\ub294 \ud654\uba74\uc774\uc57c.",
    chips: ["\uc2dc\uc7a5\uac00\uac00 \ubb50\uc57c?", "\uc8fc\ubb38 \uc804\uc5d0 \ubb58 \ud655\uc778\ud574?", "\uc218\uc775\ub960\uc774 \ubb50\uc57c?"],
  },
  archive: {
    label: "\uc544\uce74\uc774\ube0c",
    title: "\ubbfc\uc900\uc758 \ud22c\uc790 \uae30\ub85d",
    description: "\ub0b4\uac00 \uace0\ub978 \uc774\uc720\uc640 \uae30\ub85d\uc744 \ub2e4\uc2dc \ucc3e\uc544\ubcf4\ub294 \ud654\uba74\uc774\uc57c.",
    chips: ["\uc9c0\ub09c \uae30\ub85d\uc740 \uc5b4\ub5bb\uac8c \ubd10?", "\ud655\uc2e0\uc740 \ubb34\uc2a8 \ub73b\uc774\uc57c?", "\uc218\uc775\ub960\uc774 \ubb50\uc57c?"],
  },
};

function MessageBubble({
  message,
  onAction,
  onQuestion,
  onExplainChoice,
}: {
  message: Message;
  onAction: (action: ChatUiAction) => void;
  onQuestion: (question: string) => void;
  onExplainChoice: (choice: ExplainChoice) => void;
}) {
  const userMessage = message.role === "user";
  const uiAction = message.uiAction;

  return (
    <div className={userMessage ? "flex justify-end" : "flex justify-start"}>
      <div className="max-w-[84%]">
        <p
          className={
            userMessage
              ? "rounded-2xl bg-magenta px-4 py-3 text-sm leading-6 text-white"
              : "rounded-2xl bg-bg px-4 py-3 text-sm leading-6 text-ink"
          }
        >
          {message.text}
        </p>
        {!userMessage && uiAction && (
          <button
            className="mt-2 w-full rounded-xl border border-navy/20 bg-white px-3 py-2 text-xs font-semibold text-navy"
            onClick={() => onAction(uiAction)}
            type="button"
          >
            {COPY.relatedScreen}
          </button>
        )}
        {!userMessage && Boolean(message.suggestedQuestions?.length) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.suggestedQuestions?.map((question) => (
              <button
                className="rounded-full bg-bg px-3 py-2 text-xs font-medium text-navy"
                key={question}
                onClick={() => onQuestion(question)}
                type="button"
              >
                {question}
              </button>
            ))}
          </div>
        )}
        {!userMessage && message.explainTurn && (
          <div className="mt-2 flex flex-wrap gap-2">
            <p className="w-full text-xs text-ink/70">{message.explainTurn.prompt}</p>
            {message.explainTurn.choices.map((choice) => (
              <button
                className="rounded-full bg-bg px-3 py-2 text-xs font-medium text-navy"
                key={choice.id}
                onClick={() => onExplainChoice(choice)}
                type="button"
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function F10ChatbotDemo() {
  const [screen, setScreen] = useState<Screen>("stock");
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState("\uc9c8\ubb38\uc744 \uae30\ub2e4\ub9ac\uace0 \uc788\uc5b4");
  const [isLoading, setIsLoading] = useState(false);
  const [explainAction, setExplainAction] =
    useState<ExplainActionPayload | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const lastScreenEntryRef = useRef<{ screen: Screen; at: number } | null>(null);
  const signal = useChatBehaviorStore((state) => state.activeSignal);
  const recordBehaviorEvent = useChatBehaviorStore((state) => state.recordEvent);
  const acceptActiveSignal = useChatBehaviorStore((state) => state.acceptActiveSignal);
  const muteActiveSignal = useChatBehaviorStore((state) => state.muteActiveSignal);

  const currentScreen = SCREENS[screen];
  const chatContext = useMemo(
    () => ({
      screen,
      stockId: screen === "stock" || screen === "order" ? ("KRX:005930" as const) : undefined,
      stockName: screen === "stock" || screen === "order" ? "삼성전자" : undefined,
      quantity: screen === "order" ? 10 : undefined,
      unitPrice: screen === "order" ? 12500 : undefined,
    }),
    [screen],
  );

  useEffect(() => {
    const enteredAt = Date.now();
    const stockId = screen === "stock" || screen === "order" ? "KRX:005930" : undefined;
    const lastEntry = lastScreenEntryRef.current;
    if (!lastEntry || lastEntry.screen !== screen || enteredAt - lastEntry.at > 1_000) {
      recordBehaviorEvent({ type: "screen_entered", screen, stockId, at: enteredAt });
      lastScreenEntryRef.current = { screen, at: enteredAt };
    }

    if (screen !== "stock" && screen !== "order") return;

    let accumulatedVisibleMs = 0;
    let visibleStartedAt = document.visibilityState === "visible" ? enteredAt : null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let completed = false;

    const completeDwell = () => {
      if (completed) return;
      completed = true;
      recordBehaviorEvent({
        type: "screen_dwell_completed",
        screen,
        stockId,
        durationMs: PROACTIVE_LIMITS.dwellMs + 1,
        at: Date.now(),
      });
    };

    const schedule = () => {
      if (completed || visibleStartedAt === null) return;
      const remaining = PROACTIVE_LIMITS.dwellMs - accumulatedVisibleMs;
      timer = setTimeout(completeDwell, Math.max(1, remaining + 1));
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (visibleStartedAt !== null) {
          accumulatedVisibleMs += Date.now() - visibleStartedAt;
          visibleStartedAt = null;
        }
        if (timer) clearTimeout(timer);
      } else {
        visibleStartedAt = Date.now();
        schedule();
      }
    };

    schedule();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [recordBehaviorEvent, screen]);

  useEffect(() => {
    const element = messagesRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [isOpen, messages]);

  async function ask(question: string, explainChoiceId?: string) {
    const explainTurn = explainAction?.turn;
    setMessages((current) => [
      ...current,
      { role: "user", text: question },
      { role: "assistant", text: "" },
    ]);
    setIsOpen(true);
    setInput("");
    setStatus("질문을 보내는 중");
    setExplainAction(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          context: chatContext,
          ...(explainTurn && explainChoiceId
            ? {
                explain: {
                  scriptId: explainTurn.scriptId,
                  stage: explainTurn.stage,
                  choiceId: explainChoiceId,
                },
              }
            : {}),
        }),
      });

      if (!response.ok || !response.body) throw new Error("Chat request failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        pending += decoder.decode(value, { stream: true });
        const events = pending.split("\n\n");
        pending = events.pop() ?? "";

        for (const item of events) {
          const type = item.match(/^event: (.+)$/m)?.[1];
          const data = item.match(/^data: (.+)$/m)?.[1];
          if (!type || !data) continue;
          const value = JSON.parse(data) as unknown;

          if (type === "status" && typeof value === "string") {
            setStatus(value);
          }
          if (type === "text" && typeof value === "string") {
            setMessages((current) => {
              const last = current.at(-1);
              if (!last || last.role !== "assistant") return current;
              return [...current.slice(0, -1), { ...last, text: `${last.text}${value}` }];
            });
          }
          if (type === "action" && value && typeof value === "object") {
            if (isExplainAction(value)) {
              setExplainAction(value);
              setMessages((current) => {
                const last = current.at(-1);
                if (!last || last.role !== "assistant") return current;
                return [...current.slice(0, -1), { ...last, explainTurn: value.turn }];
              });
              continue;
            }

            const action = value as StandardChatActionPayload;
            setMessages((current) => {
              const last = current.at(-1);
              if (!last || last.role !== "assistant") return current;
              return [
                ...current.slice(0, -1),
                {
                  ...last,
                  ...(Array.isArray(action.suggestedQuestions)
                    ? { suggestedQuestions: action.suggestedQuestions }
                    : {}),
                  ...(isAllowedUiAction(action.uiAction)
                    ? { uiAction: action.uiAction }
                    : {}),
                },
              ];
            });
          }
        }
      }
    } catch {
      setStatus("연결을 다시 확인해 줘");
      setMessages((current) => {
        const last = current.at(-1);
        if (!last || last.role !== "assistant") return current;
        return [
          ...current.slice(0, -1),
          { role: "assistant", text: "키웅이가 잠깐 낮잠 중이야! 조금 있다 다시 물어봐 줘 🐻" },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (input.trim() && !isLoading) void ask(input);
  }

  function dismissSignal() {
    if (!signal) return;
    muteActiveSignal(Date.now());
  }

  function handleUiAction(action: ChatUiAction) {
    setScreen(action.target);
    setIsOpen(false);
    setStatus(`${SCREENS[action.target].label} 화면으로 이동했어`);
  }

  function recordOrderCancellation(side: "buy" | "sell") {
    recordBehaviorEvent({
      type: "order_confirmation_cancelled",
      stockId: "KRX:005930",
      side,
      at: Date.now(),
    });
    setStatus(`${side === "buy" ? "매수" : "매도"} 확인을 취소했어`);
  }

  return (
    <main className="min-h-dvh bg-bg px-4 py-6 text-ink">
      <div className="mx-auto min-h-[720px] max-w-[430px] overflow-hidden rounded-[24px] bg-white shadow-lg">
        <header className="bg-navy px-5 pb-5 pt-4 text-white">
          <div className="flex items-center justify-between text-xs text-white/80">
            <span>{COPY.service}</span>
            <span>{COPY.account}</span>
          </div>
          <h1 className="mt-3 text-xl font-bold">{COPY.title}</h1>
          <p className="mt-1 text-sm text-white/80">{COPY.subtitle}</p>
        </header>

        <nav
          className="flex gap-2 overflow-x-auto border-b border-gray/40 px-4 py-3"
          aria-label={COPY.navLabel}
        >
          {(Object.keys(SCREENS) as Screen[]).map((key) => (
            <button
              className={
                screen === key
                  ? "shrink-0 rounded-full bg-magenta px-3 py-2 text-xs font-semibold text-white"
                  : "shrink-0 rounded-full bg-bg px-3 py-2 text-xs font-semibold text-ink"
              }
              key={key}
              onClick={() => setScreen(key)}
              type="button"
            >
              {SCREENS[key].label}
            </button>
          ))}
        </nav>

        <section className="px-4 py-5">
          <p className="text-xs font-semibold text-magenta">{COPY.current}</p>
          <h2 className="mt-1 text-xl font-bold">{currentScreen.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            {currentScreen.description}
          </p>

          {screen === "order" && (
            <div className="mt-5 rounded-2xl border border-gray/50 bg-bg p-4">
              <p className="text-sm font-semibold">{COPY.orderQuantity}</p>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm">
                <span>10\uc8fc</span>
                <span className="font-semibold tabular-nums">
                  {COPY.expectedAmount}
                </span>
              </div>
              <p className="mt-4 text-xs font-semibold text-navy">{COPY.orderPractice}</p>
              <p className="mt-1 text-xs leading-5 text-ink/70">
                {COPY.orderPracticeDescription}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="rounded-xl bg-white px-3 py-3 text-xs font-semibold text-navy ring-1 ring-gray/50"
                  onClick={() => recordOrderCancellation("buy")}
                  type="button"
                >
                  {COPY.cancelBuy}
                </button>
                <button
                  className="rounded-xl bg-white px-3 py-3 text-xs font-semibold text-navy ring-1 ring-gray/50"
                  onClick={() => recordOrderCancellation("sell")}
                  type="button"
                >
                  {COPY.cancelSell}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {signal && (
        <aside
          className="fixed bottom-24 left-1/2 z-20 w-[min(390px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-magenta/30 bg-white p-4 shadow-lg"
          aria-live="polite"
        >
          <div className="flex gap-3">
            <div
              className="grid size-10 shrink-0 place-items-center rounded-full bg-navy text-lg text-white"
              aria-hidden="true"
            >
              {COPY.avatar}
            </div>
            <div>
              <p className="text-xs font-semibold text-magenta">
                {COPY.proactive}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {PROACTIVE_SCRIPTS[signal].text}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
            <button
              className="rounded-xl bg-navy px-2 py-3 text-white"
              onClick={() => {
                acceptActiveSignal();
                setIsOpen(true);
              }}
              type="button"
            >
              {COPY.askDirectly}
            </button>
            <button
              className="rounded-xl bg-white px-2 py-3 text-ink ring-1 ring-gray/50"
              onClick={dismissSignal}
              type="button"
            >
              {COPY.dismiss}
            </button>
          </div>
        </aside>
      )}

      <button
        aria-label={COPY.openChat}
        className="fixed bottom-5 left-1/2 z-10 grid size-14 -translate-x-1/2 place-items-center rounded-full bg-magenta text-lg font-bold text-white shadow-lg"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        {COPY.avatar}
      </button>

      {isOpen && (
        <section
          aria-label={COPY.title}
          className="fixed inset-x-0 bottom-0 z-30 mx-auto flex h-[min(72dvh,720px)] max-w-[430px] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-gray/40 px-5 py-4">
            <div>
              <p className="text-base font-bold text-navy">{COPY.title}</p>
              <p className="mt-0.5 text-xs text-ink/60">{COPY.subtitle}</p>
              <p className="mt-1 text-xs text-ink/60">{COPY.aiNotice}</p>
            </div>
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-ink"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              {COPY.close}
            </button>
          </div>

          <div ref={messagesRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <MessageBubble
                message={{ role: "assistant", text: COPY.greeting }}
                onAction={handleUiAction}
                onQuestion={(question) => {
                  if (!isLoading) void ask(question);
                }}
                onExplainChoice={(choice) => {
                  if (!isLoading) void ask(choice.label, choice.id);
                }}
              />
            )}
            {messages.map((message, index) => (
              <MessageBubble
                key={index}
                message={message}
                onAction={handleUiAction}
                onQuestion={(question) => {
                  if (!isLoading) void ask(question);
                }}
                onExplainChoice={(choice) => {
                  if (!isLoading) void ask(choice.label, choice.id);
                }}
              />
            ))}
          </div>

          <div className="shrink-0 border-t border-gray/40 px-4 py-3">
            <p className="mb-3 rounded-xl bg-bg px-3 py-2 text-xs text-ink/70">
              <span className="font-semibold text-navy">{COPY.status}: </span>
              {status}
            </p>
            <p className="mb-2 text-xs font-semibold text-navy">
              {COPY.recommended}
            </p>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {currentScreen.chips.map((question) => (
                <button
                  className="shrink-0 rounded-full bg-bg px-3 py-2 text-xs font-medium text-navy"
                  key={question}
                  disabled={isLoading}
                  onClick={() => void ask(question)}
                  type="button"
                >
                  {question}
                </button>
              ))}
            </div>

            <form className="flex gap-2" onSubmit={submit}>
              <input
                aria-label={COPY.input}
                className="min-w-0 flex-1 rounded-xl bg-bg px-3 py-3 text-sm outline-none ring-magenta focus:ring-2"
                onChange={(event) => setInput(event.target.value)}
                placeholder={COPY.input}
                value={input}
              />
              <button
                className="rounded-xl bg-magenta px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"
                disabled={!input.trim() || isLoading}
                type="submit"
              >
                {COPY.send}
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}

