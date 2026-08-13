"use client";

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PROACTIVE_LIMITS } from "../../shared/engine/proactive-help";
import { useChatBehaviorStore } from "../../shared/store/chat-behavior-store";
import type {
  ChatContext,
  ChatUiAction,
  ExplainChoice,
  ExplainTurn,
  StockExploreChoiceId,
  StockExploreTurn,
} from "../../shared/types/chatbot";
import {
  isAllowedUiAction,
  isExplainAction,
  isStockExploreAction,
  type ExplainActionPayload,
  type StandardChatActionPayload,
  type StockExploreActionPayload,
} from "./lib/contracts";
import {
  getPrototypeScreenRect,
  PROTOTYPE_PHONE,
  PROTOTYPE_SHEET_HEIGHT,
  type PrototypeScreenRect,
  shouldDismissBottomSheet,
} from "./lib/bottom-sheet";
import { PROACTIVE_SCRIPTS } from "./lib/routing";

type Screen = "home" | "stock" | "order" | "archive";
type F10ChatbotDemoProps = {
  context?: ChatContext;
  onUiAction?: (action: ChatUiAction) => void;
};
type Message = {
  role: "assistant" | "user";
  text: string;
  suggestedQuestions?: string[];
  explainTurn?: ExplainTurn;
  stockExploreTurn?: StockExploreTurn;
  uiAction?: ChatUiAction;
};
type SheetDragState = {
  pointerId: number;
  startY: number;
  lastY: number;
  lastAt: number;
  offsetY: number;
  velocityY: number;
};
type FloatingChatPosition = { x: number; y: number };
type FloatingChatDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  origin: FloatingChatPosition;
  moved: boolean;
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
  orderPracticeDescription: "종목과 상관없이 매수 최종 확인 화면을 세 번 연이어 나가면 도움 신호가 나타나요.",
  abandonBuy: "매수 최종 확인에서 뒤로가기",
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
  openArchive: "아카이브에서 보기",
  avatar: "\uacf0",
} as const;

const PROACTIVE_BUBBLE_VISIBLE_MS = 8_000;
const FLOATING_CHAT_RADIUS = 28;

function defaultFloatingChatPosition(
  prototypeScreen: PrototypeScreenRect | null,
): FloatingChatPosition {
  if (prototypeScreen) {
    return {
      x: prototypeScreen.left + prototypeScreen.width - 44 * prototypeScreen.scale,
      y: prototypeScreen.top + prototypeScreen.height - 108 * prototypeScreen.scale,
    };
  }
  const width = typeof window === "undefined" ? 390 : window.innerWidth;
  const height = typeof window === "undefined" ? 844 : window.innerHeight;
  return { x: width - 44, y: height - 108 };
}

function clampFloatingChatPosition(
  position: FloatingChatPosition,
  prototypeScreen: PrototypeScreenRect | null,
): FloatingChatPosition {
  const left = prototypeScreen?.left ?? 0;
  const top = prototypeScreen?.top ?? 0;
  const width = prototypeScreen?.width ?? (typeof window === "undefined" ? 390 : window.innerWidth);
  const height = prototypeScreen?.height ?? (typeof window === "undefined" ? 844 : window.innerHeight);
  return {
    x: Math.min(left + width - FLOATING_CHAT_RADIUS, Math.max(left + FLOATING_CHAT_RADIUS, position.x)),
    y: Math.min(top + height - FLOATING_CHAT_RADIUS, Math.max(top + FLOATING_CHAT_RADIUS, position.y)),
  };
}

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
  onStockExploreChoice,
  actionsDisabled,
}: {
  message: Message;
  onAction: (action: ChatUiAction) => void;
  onQuestion: (question: string) => void;
  onExplainChoice: (choice: ExplainChoice) => void;
  onStockExploreChoice: (
    question: string,
    choiceId: StockExploreChoiceId,
  ) => void;
  actionsDisabled: boolean;
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
            disabled={actionsDisabled}
            onClick={() => onAction(uiAction)}
            type="button"
          >
            {uiAction.label ?? (uiAction.target === "archive" ? COPY.openArchive : COPY.relatedScreen)}
          </button>
        )}
        {!userMessage && Boolean(message.suggestedQuestions?.length) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.suggestedQuestions?.map((question) => (
              <button
                className="rounded-full bg-bg px-3 py-2 text-xs font-medium text-navy"
                disabled={actionsDisabled}
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
                disabled={actionsDisabled}
                key={choice.id}
                onClick={() => onExplainChoice(choice)}
                type="button"
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
        {!userMessage && message.stockExploreTurn && (
          <div className="mt-2 flex flex-wrap gap-2">
            <p className="w-full text-xs text-ink/70">
              {message.stockExploreTurn.prompt}
            </p>
            {message.stockExploreTurn.choices.map((choice) => (
              <button
                className="rounded-full bg-bg px-3 py-2 text-xs font-medium text-navy disabled:opacity-50"
                disabled={actionsDisabled}
                key={choice.id}
                onClick={() => onStockExploreChoice(choice.label, choice.id)}
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

export function F10ChatbotDemo({ context, onUiAction }: F10ChatbotDemoProps = {}) {
  const [screen, setScreen] = useState<Screen>(context?.screen ?? "stock");
  const [isOpen, setIsOpen] = useState(false);
  const [prototypeScreen, setPrototypeScreen] =
    useState<PrototypeScreenRect | null>(null);
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState("\uc9c8\ubb38\uc744 \uae30\ub2e4\ub9ac\uace0 \uc788\uc5b4");
  const [isLoading, setIsLoading] = useState(false);
  const [isBuyHesitationBubbleVisible, setIsBuyHesitationBubbleVisible] =
    useState(false);
  const [floatingChatPosition, setFloatingChatPosition] =
    useState<FloatingChatPosition | null>(null);
  const [explainAction, setExplainAction] =
    useState<ExplainActionPayload | null>(null);
  const [stockExploreAction, setStockExploreAction] =
    useState<StockExploreActionPayload | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const sheetDragRef = useRef<SheetDragState | null>(null);
  const floatingChatDragRef = useRef<FloatingChatDragState | null>(null);
  const suppressFloatingChatClickRef = useRef(false);
  const lastScreenEntryRef = useRef<{ screen: Screen; at: number } | null>(null);
  const signal = useChatBehaviorStore((state) => state.activeSignal);
  const signalVersion = useChatBehaviorStore((state) => state.activeSignalVersion);
  const recordBehaviorEvent = useChatBehaviorStore((state) => state.recordEvent);
  const acceptActiveSignal = useChatBehaviorStore((state) => state.acceptActiveSignal);

  const currentScreen = SCREENS[screen];
  const resolvedFloatingChatPosition = clampFloatingChatPosition(
    floatingChatPosition ?? defaultFloatingChatPosition(prototypeScreen),
    prototypeScreen,
  );
  const bubbleOpensLeft = resolvedFloatingChatPosition.x >=
    (prototypeScreen
      ? prototypeScreen.left + prototypeScreen.width / 2
      : typeof window === "undefined"
        ? 195
        : window.innerWidth / 2);
  const chatContext = useMemo(
    () =>
      context ?? {
        screen,
        stockId:
          screen === "stock" || screen === "order"
            ? ("KRX:005930" as const)
            : undefined,
        stockName:
          screen === "stock" || screen === "order" ? "삼성전자" : undefined,
        quantity: screen === "order" ? 10 : undefined,
        unitPrice: screen === "order" ? 12500 : undefined,
      },
    [context, screen],
  );

  useEffect(() => {
    if (context) setScreen(context.screen);
  }, [context]);

  useEffect(() => {
    const syncPrototypeScreen = () => {
      setPrototypeScreen(
        getPrototypeScreenRect(window.innerWidth, window.innerHeight),
      );
    };

    syncPrototypeScreen();
    window.addEventListener("resize", syncPrototypeScreen);
    return () => window.removeEventListener("resize", syncPrototypeScreen);
  }, []);

  useEffect(() => {
    const enteredAt = Date.now();
    const stockId = chatContext.stockId;
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
  }, [chatContext.stockId, recordBehaviorEvent, screen]);

  useEffect(() => {
    const element = messagesRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [isOpen, messages]);

  useEffect(() => {
    if (signal !== "buyHesitation") {
      setIsBuyHesitationBubbleVisible(false);
      return;
    }

    setIsBuyHesitationBubbleVisible(true);
    const timer = window.setTimeout(
      () => setIsBuyHesitationBubbleVisible(false),
      PROACTIVE_BUBBLE_VISIBLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [signal, signalVersion]);

  function openChat() {
    setPrototypeScreen(
      getPrototypeScreenRect(window.innerWidth, window.innerHeight),
    );
    setSheetDragY(0);
    setIsSheetDragging(false);
    sheetDragRef.current = null;
    setIsOpen(true);
  }

  function openProactiveChat() {
    if (!signal) {
      openChat();
      return;
    }

    setMessages((current) => [
      ...current,
      { role: "assistant", text: PROACTIVE_SCRIPTS[signal].text },
    ]);
    acceptActiveSignal();
    openChat();
    if (signal === "orderMethodConfusion") void ask("시장가가 뭐예요?");
  }

  function dismissProactiveHelp() {
    setIsBuyHesitationBubbleVisible(false);
    acceptActiveSignal();
  }

  function handleFloatingChatPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    const origin = resolvedFloatingChatPosition;
    event.currentTarget.setPointerCapture(event.pointerId);
    floatingChatDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin,
      moved: false,
    };
  }

  function handleFloatingChatPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = floatingChatDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = clampFloatingChatPosition(
      { x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY },
      prototypeScreen,
    );
    if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 4) {
      drag.moved = true;
    }
    setFloatingChatPosition(next);
  }

  function finishFloatingChatDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = floatingChatDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    suppressFloatingChatClickRef.current = drag.moved;
    floatingChatDragRef.current = null;
  }

  function handleFloatingChatClick() {
    if (suppressFloatingChatClickRef.current) {
      suppressFloatingChatClickRef.current = false;
      return;
    }
    if (signal) openProactiveChat();
    else openChat();
  }

  function closeChat() {
    setIsOpen(false);
    setSheetDragY(0);
    setIsSheetDragging(false);
    sheetDragRef.current = null;
  }

  function handleSheetPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (!event.isPrimary || event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    sheetDragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastAt: event.timeStamp,
      offsetY: 0,
      velocityY: 0,
    };
    setIsSheetDragging(true);
  }

  function handleSheetPointerMove(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    const scale = prototypeScreen?.scale || 1;
    const offsetY = Math.min(
      PROTOTYPE_SHEET_HEIGHT,
      Math.max(0, (event.clientY - drag.startY) / scale),
    );
    const elapsed = event.timeStamp - drag.lastAt;
    if (elapsed > 0) {
      const sampleVelocity =
        ((event.clientY - drag.lastY) / elapsed / scale) * 1_000;
      drag.velocityY = drag.velocityY * 0.65 + sampleVelocity * 0.35;
    }
    drag.lastY = event.clientY;
    drag.lastAt = event.timeStamp;
    drag.offsetY = offsetY;
    setSheetDragY(offsetY);
  }

  function finishSheetDrag(
    event: ReactPointerEvent<HTMLDivElement>,
    cancelled = false,
  ) {
    const drag = sheetDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const scale = prototypeScreen?.scale || 1;
    const offsetY = Math.min(
      PROTOTYPE_SHEET_HEIGHT,
      Math.max(0, (event.clientY - drag.startY) / scale),
    );
    const elapsed = event.timeStamp - drag.lastAt;
    const velocityY =
      elapsed > 0
        ? drag.velocityY * 0.65 +
          ((event.clientY - drag.lastY) / elapsed / scale) * 1_000 * 0.35
        : drag.velocityY;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    sheetDragRef.current = null;
    setIsSheetDragging(false);

    if (
      !cancelled &&
      shouldDismissBottomSheet({
        distance: offsetY,
        velocity: velocityY,
      })
    ) {
      closeChat();
      return;
    }

    setSheetDragY(0);
  }

  async function ask(
    question: string,
    explainChoiceId?: string,
    stockExploreChoiceId?: StockExploreChoiceId,
  ) {
    const explainTurn = explainAction?.turn;
    const stockExploreTurn = stockExploreAction?.turn;
    const previousMessage = messages.at(-1);
    const previousAnswer =
      explainTurn?.scriptId === "flow:guided" &&
      explainTurn.stage === "brief" &&
      (!explainChoiceId || explainChoiceId === "simpler") &&
      previousMessage?.role === "assistant"
        ? previousMessage.text
        : undefined;
    setMessages((current) => [
      ...current,
      { role: "user", text: question },
      { role: "assistant", text: "" },
    ]);
    openChat();
    setInput("");
    setStatus("질문을 보내는 중");
    setExplainAction(null);
    setStockExploreAction(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          context: chatContext,
          // 버튼을 눌렀으면 choiceId를 보내고, 직접 타이핑했으면 진행 중인 단계만 보내
          // 서버가 구어체("ㅇㅇ", "몰라"…)를 해석하게 한다.
          ...(explainTurn && explainTurn.stage !== "example"
            ? {
                explain: {
                  scriptId: explainTurn.scriptId,
                  stage: explainTurn.stage,
                  ...(explainChoiceId ? { choiceId: explainChoiceId } : {}),
                  ...(previousAnswer ? { previousAnswer } : {}),
                },
              }
            : {}),
          ...(stockExploreTurn && stockExploreChoiceId
            ? {
                stockExplore: {
                  stockId: stockExploreTurn.stockId,
                  shownTopics: stockExploreTurn.shownTopics,
                  choiceId: stockExploreChoiceId,
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
                return [
                  ...current.slice(0, -1),
                  {
                    ...last,
                    explainTurn: value.turn,
                    ...(Array.isArray(value.suggestedQuestions)
                      ? { suggestedQuestions: value.suggestedQuestions }
                      : {}),
                    ...(isAllowedUiAction(value.uiAction)
                      ? { uiAction: value.uiAction }
                      : {}),
                  },
                ];
              });
              continue;
            }

            if (isStockExploreAction(value)) {
              setStockExploreAction(value);
              setMessages((current) => {
                const last = current.at(-1);
                if (!last || last.role !== "assistant") return current;
                return [
                  ...current.slice(0, -1),
                  {
                    ...last,
                    stockExploreTurn: value.turn,
                    ...(Array.isArray(value.suggestedQuestions)
                      ? { suggestedQuestions: value.suggestedQuestions }
                      : {}),
                    ...(isAllowedUiAction(value.uiAction)
                      ? { uiAction: value.uiAction }
                      : {}),
                  },
                ];
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
      setStatus("연결을 다시 확인해 주세요");
      setMessages((current) => {
        const last = current.at(-1);
        if (!last || last.role !== "assistant") return current;
        return [
          ...current.slice(0, -1),
          { role: "assistant", text: "키웅이가 잠깐 낮잠 중이에요! 조금 있다 다시 물어봐 주세요 🐻" },
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

  function handleUiAction(action: ChatUiAction) {
    if (onUiAction) {
      onUiAction(action);
    } else if (action.target !== "portfolio") {
      setScreen(action.target);
    }
    closeChat();
    setStatus(`${action.label ?? "관련 화면"}으로 이동했어요`);
  }

  function recordBuyConfirmationAbandonment() {
    if (!chatContext.stockId) return;
    recordBehaviorEvent({
      type: "buy_confirmation_abandoned",
      stockId: chatContext.stockId,
      at: Date.now(),
    });
    setStatus("매수 최종 확인에서 뒤로갔어요");
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
              <div className="mt-3">
                <button
                  className="w-full rounded-xl bg-white px-3 py-3 text-xs font-semibold text-navy ring-1 ring-gray/50"
                  onClick={recordBuyConfirmationAbandonment}
                  type="button"
                >
                  {COPY.abandonBuy}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {signal && (signal !== "buyHesitation" || isBuyHesitationBubbleVisible) && (
        <aside
          aria-live="polite"
          className="fixed z-20"
          style={{
            left: resolvedFloatingChatPosition.x + (bubbleOpensLeft ? 24 : -24),
            top: resolvedFloatingChatPosition.y - 36,
            width: prototypeScreen ? prototypeScreen.width / 2 : "50vw",
            transform: bubbleOpensLeft
              ? "translate(-100%, -100%)"
              : "translateY(-100%)",
          }}
        >
          <div
            className={`relative rounded-2xl border border-magenta/30 bg-white px-4 py-3 text-left text-sm font-semibold text-navy shadow-[0_10px_24px_rgba(0,30,90,0.18)] after:absolute after:-bottom-2 after:size-4 after:rotate-45 after:border-b after:border-r after:border-magenta/30 after:bg-white after:content-[''] ${
              bubbleOpensLeft ? "after:right-5" : "after:left-5"
            }`}
          >
            <p className="whitespace-nowrap overflow-hidden text-ellipsis px-1">
              {PROACTIVE_SCRIPTS[signal].text}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-navy/10 pt-3">
              <button
                className="rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white"
                onClick={openProactiveChat}
                type="button"
              >
                직접 질문
              </button>
              <button
                className="rounded-xl border border-navy/20 bg-white px-3 py-2 text-xs font-semibold text-navy"
                onClick={dismissProactiveHelp}
                type="button"
              >
                괜찮아요
              </button>
            </div>
          </div>
        </aside>
      )}

      <button
        aria-label={COPY.openChat}
        className="fixed z-10 grid size-14 touch-none place-items-center rounded-full bg-magenta text-lg font-bold text-white shadow-lg cursor-grab active:cursor-grabbing"
        onClick={handleFloatingChatClick}
        onPointerCancel={finishFloatingChatDrag}
        onPointerDown={handleFloatingChatPointerDown}
        onPointerMove={handleFloatingChatPointerMove}
        onPointerUp={finishFloatingChatDrag}
        style={{
          bottom: "auto",
          left: resolvedFloatingChatPosition.x,
          top: resolvedFloatingChatPosition.y,
          transform: "translate(-50%, -50%)",
        }}
        type="button"
      >
        {COPY.avatar}
      </button>

      {isOpen && prototypeScreen && (
        <div
          className="pointer-events-auto fixed z-30 overflow-hidden"
          style={{
            left: prototypeScreen.left,
            top: prototypeScreen.top,
            width: prototypeScreen.width,
            height: prototypeScreen.height,
            borderRadius: 40 * prototypeScreen.scale,
          }}
        >
          <button
            aria-label={COPY.close}
            className="absolute inset-0 z-0 cursor-default bg-navy/20 backdrop-blur-[1px]"
            onClick={closeChat}
            type="button"
          />

          <section
            aria-labelledby="kiwoong-chat-title"
            aria-modal="true"
            className={`absolute bottom-0 left-0 z-10 flex flex-col overflow-hidden rounded-t-[28px] bg-white shadow-card ${
              isSheetDragging
                ? ""
                : "transition-transform duration-200 ease-out motion-reduce:transition-none"
            }`}
            role="dialog"
            style={{
              width: PROTOTYPE_PHONE.screenWidth,
              height: PROTOTYPE_SHEET_HEIGHT,
              transform: `scale(${prototypeScreen.scale}) translateY(${sheetDragY}px)`,
              transformOrigin: "bottom left",
              willChange: "transform",
            }}
          >
            <div
              className="flex h-7 shrink-0 touch-none cursor-grab items-center justify-center active:cursor-grabbing"
              onPointerCancel={(event) => finishSheetDrag(event, true)}
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={finishSheetDrag}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-12 rounded-full bg-gray/60"
              />
            </div>

            <div className="flex shrink-0 items-center justify-between border-b border-gray/40 px-5 pb-4">
              <div>
                <p
                  className="text-base font-bold text-navy"
                  id="kiwoong-chat-title"
                >
                  {COPY.title}
                </p>
                <p className="mt-0.5 text-xs text-ink/60">{COPY.subtitle}</p>
                <p className="mt-1 text-xs text-ink/60">{COPY.aiNotice}</p>
              </div>
              <button
                className="rounded-lg px-3 py-2 text-sm font-semibold text-ink"
                onClick={closeChat}
                type="button"
              >
                {COPY.close}
              </button>
            </div>

            <div
              ref={messagesRef}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
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
                  onStockExploreChoice={(question, choiceId) => {
                    if (!isLoading) void ask(question, undefined, choiceId);
                  }}
                  actionsDisabled={isLoading}
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
                  onStockExploreChoice={(question, choiceId) => {
                    if (!isLoading) void ask(question, undefined, choiceId);
                  }}
                  actionsDisabled={isLoading || index !== messages.length - 1}
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
        </div>
      )}
    </main>
  );
}

