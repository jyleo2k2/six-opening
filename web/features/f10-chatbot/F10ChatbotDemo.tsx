"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  PROACTIVE_SCRIPTS,
  ProactiveSignal,
  routeMessage,
} from "./lib/routing";

type Screen = "home" | "stock" | "order" | "archive";
type Message = { role: "assistant" | "user"; text: string };

const COPY = {
  service: "\ud0a4\uc6c0 \uac00\uc871 \ubaa8\uc758\ud22c\uc790 \ub9ac\uadf8",
  account: "\ubbfc\uc900 \uacc4\uc815",
  title: "\ud0a4\uc6c5\uc774 \ucc57\ubd07 \ub370\ubaa8",
  subtitle: "\uc9c8\ubb38\uc5d0\ub294 \uc124\uba85\uc73c\ub85c, \ubd88\uc548\uc5d0\ub294 \uc9c8\ubb38\uc73c\ub85c",
  navLabel: "\ub370\ubaa8 \ud654\uba74 \uc120\ud0dd",
  current: "\ud604\uc7ac \ud654\uba74",
  orderQuantity: "\uc8fc\ubb38 \uc218\ub7c9",
  expectedAmount: "\uc608\uc0c1 \uae08\uc561 125,000\uc6d0",
  signalDemo: "\uc120\uc81c \ub3c4\uc6c0 \ub370\ubaa8",
  signalDescription:
    "\uc2e4\uc81c \uc8fc\ubb38 UI \uc774\ubca4\ud2b8\uc640 \uc5f0\uacb0\ud558\uae30 \uc804, 6\uac00\uc9c0 \ub3c4\uc6c0 \uc2e0\ud638\ub97c \uc5ec\uae30\uc5d0\uc11c \ud655\uc778\ud560 \uc218 \uc788\uc5b4.",
  allSignalsMuted: "\uc774\ubc88 \uc138\uc158\uc5d0\uc11c \ubaa8\ub4e0 \uc2e0\ud638\ub97c \ub2eb\uc558\uc5b4.",
  proactive: "\ud0a4\uc6c5\uc774\uc758 \uc120\uc81c \ub3c4\uc6c0",
  explain: "\uc0c1\ud669 \uc124\uba85",
  askDirectly: "\uc9c1\uc811 \uc9c8\ubb38",
  dismiss: "\uad1c\ucc2e\uc544",
  openChat: "\ud0a4\uc6c5\uc774 \ucc57\ubd07 \uc5f4\uae30",
  close: "\ub2eb\uae30",
  greeting:
    "\uc548\ub155, \ub098\ub294 \ud0a4\uc6c5\uc774\uc57c. \ud22c\uc790 \uae30\ucd08\uc640 \ud654\uba74 \uc0ac\uc6a9\ubc95\uc744 \ud568\uaed8 \ubcfc \uc218 \uc788\uc5b4.",
  recommended: "\ucd94\ucc9c \uc9c8\ubb38",
  input: "\uad81\uae08\ud55c \uac83\uc744 \uc785\ub825\ud574 \uc918",
  send: "\ubcf4\ub0b4\uae30",
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
    title: "\ud0a4\uc6c0\ud14c\ud06c",
    description: "\uae30\uc5c5 \uc815\ubcf4\uc640 \uacf5\uac1c\ub41c \uacfc\uac70 \ub370\uc774\ud130\ub97c \uc0b4\ud3b4\ubcf4\ub294 \ud654\uba74\uc774\uc57c.",
    chips: ["\uc774 \ud68c\uc0ac\ub294 \ubb50 \ud558\ub294 \ud68c\uc0ac\uc57c?", "PER\uc774 \ubb50\uc57c?", "\uc2dc\uc7a5\uac00\uac00 \ubb50\uc57c?"],
  },
  order: {
    label: "\uc8fc\ubb38",
    title: "\ud0a4\uc6c0\ud14c\ud06c \ub9e4\uc218",
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

function MessageBubble({ message }: { message: Message }) {
  const userMessage = message.role === "user";

  return (
    <div className={userMessage ? "flex justify-end" : "flex justify-start"}>
      <p
        className={
          userMessage
            ? "max-w-[84%] rounded-2xl bg-magenta px-4 py-3 text-sm leading-6 text-white"
            : "max-w-[84%] rounded-2xl bg-bg px-4 py-3 text-sm leading-6 text-ink"
        }
      >
        {message.text}
      </p>
    </div>
  );
}

export function F10ChatbotDemo() {
  const [screen, setScreen] = useState<Screen>("stock");
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [signal, setSignal] = useState<ProactiveSignal | null>(null);
  const [mutedSignals, setMutedSignals] = useState<ProactiveSignal[]>([]);

  const currentScreen = SCREENS[screen];
  const visibleSignals = useMemo(
    () =>
      (Object.keys(PROACTIVE_SCRIPTS) as ProactiveSignal[]).filter(
        (key) => !mutedSignals.includes(key),
      ),
    [mutedSignals],
  );

  function ask(question: string) {
    const reply = routeMessage(question);
    setMessages((current) => [
      ...current,
      { role: "user", text: question },
      { role: "assistant", text: reply.text },
    ]);
    setIsOpen(true);
    setInput("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (input.trim()) ask(input);
  }

  function explainSignal() {
    if (!signal) return;
    setMessages((current) => [
      ...current,
      { role: "assistant", text: PROACTIVE_SCRIPTS[signal].guide },
    ]);
    setSignal(null);
    setIsOpen(true);
  }

  function dismissSignal() {
    if (!signal) return;
    setMutedSignals((current) => [...current, signal]);
    setSignal(null);
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
            </div>
          )}

          <section className="mt-6 rounded-2xl bg-bg p-4">
            <p className="text-xs font-semibold text-navy">{COPY.signalDemo}</p>
            <p className="mt-1 text-xs leading-5 text-ink/70">
              {COPY.signalDescription}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {visibleSignals.map((key) => (
                <button
                  className="rounded-full border border-navy/20 bg-white px-3 py-2 text-xs font-medium text-navy"
                  key={key}
                  onClick={() => setSignal(key)}
                  type="button"
                >
                  {PROACTIVE_SCRIPTS[key].label}
                </button>
              ))}
              {visibleSignals.length === 0 && (
                <p className="text-xs text-ink/70">{COPY.allSignalsMuted}</p>
              )}
            </div>
          </section>
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
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold">
            <button
              className="rounded-xl bg-bg px-2 py-3 text-navy"
              onClick={explainSignal}
              type="button"
            >
              {COPY.explain}
            </button>
            <button
              className="rounded-xl bg-navy px-2 py-3 text-white"
              onClick={() => {
                setSignal(null);
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
          className="fixed inset-x-0 bottom-0 z-30 mx-auto max-h-[72vh] max-w-[430px] rounded-t-[24px] bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-gray/40 px-5 py-4">
            <div>
              <p className="text-base font-bold text-navy">{COPY.title}</p>
              <p className="mt-0.5 text-xs text-ink/60">{COPY.subtitle}</p>
            </div>
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-ink"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              {COPY.close}
            </button>
          </div>

          <div className="max-h-[42vh] space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <MessageBubble
                message={{ role: "assistant", text: COPY.greeting }}
              />
            )}
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
          </div>

          <div className="border-t border-gray/40 px-4 py-3">
            <p className="mb-2 text-xs font-semibold text-navy">
              {COPY.recommended}
            </p>
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {currentScreen.chips.map((question) => (
                <button
                  className="shrink-0 rounded-full bg-bg px-3 py-2 text-xs font-medium text-navy"
                  key={question}
                  onClick={() => ask(question)}
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
                disabled={!input.trim()}
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

