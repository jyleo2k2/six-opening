"use client";

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import hero01 from "./assets/floating/hero-01.png";
import hero02 from "./assets/floating/hero-02.png";
import hero03 from "./assets/floating/hero-03.png";
import hero04 from "./assets/floating/hero-04.png";
import hero05 from "./assets/floating/hero-05.png";
import villain01 from "./assets/floating/villain-01.png";
import villain02 from "./assets/floating/villain-02.png";
import villain03 from "./assets/floating/villain-03.png";
import villain04 from "./assets/floating/villain-04.png";
import villain05 from "./assets/floating/villain-05.png";
import { PROACTIVE_LIMITS } from "../../shared/engine/proactive-help";
import { useChatBehaviorStore } from "../../shared/store/chat-behavior-store";
import type {
  ChatContext,
  ChatUiAction,
  ExplainChoice,
  ExplainTurn,
  ProactiveSignal,
  SectorExploreChoiceId,
  SectorExploreTurn,
  StockExploreChoiceId,
  StockExploreTurn,
} from "../../shared/types/chatbot";
import {
  isAllowedUiAction,
  isExplainAction,
  isStockExploreAction,
  isSectorExploreAction,
  type ExplainActionPayload,
  type StandardChatActionPayload,
  type StockExploreActionPayload,
  type SectorExploreActionPayload,
} from "./lib/contracts";
import {
  getPrototypeScreenRect,
  PROTOTYPE_PHONE,
  PROTOTYPE_SHEET_HEIGHT,
  type PrototypeScreenRect,
  SHEET_BOTTOM_SAFE_PX,
  shouldDismissBottomSheet,
} from "./lib/bottom-sheet";
import {
  RESPONSE_PREPARATION_STEPS,
  getPreparationStepIndex,
  nextStatusDisplayDelayMs,
  remainingPreparationMs,
} from "./lib/response-preparation";
import {
  FLOATING_AVATAR_IDLE_ROTATION_MS,
  DISMISS_TARGET_ARMED_DIAMETER_PX,
  DISMISS_TARGET_DIAMETER_PX,
  dismissTargetPosition,
  hasFloatingAvatarDragStarted,
  isOverDismissTarget,
  pickNextAvatarIndex,
} from "./lib/floating-avatar";
import { PROACTIVE_FOLLOWUP_QUESTION, PROACTIVE_SCRIPTS } from "./lib/routing";
import {
  UNREACHABLE_CHAT_FAILURE,
  type ChatFailure,
  chatFailureLog,
  chatFailureText,
  isRetryableChatFailure,
  readChatFailure,
} from "./lib/request-failure";

type Screen = "home" | "stock" | "order" | "archive";
type F10ChatbotDemoProps = {
  context?: ChatContext;
  /**
   * 답변 하단의 화면 이동 버튼을 없애면서 이 시트에는 누를 곳이 남지 않았다. 호스트
   * (`f0-home`)가 아직 넘기고 있어 계약만 남긴다 — 지금은 호출되지 않는다.
   */
  onUiAction?: (action: ChatUiAction) => void;
  /**
   * 폰 프레임 안 화면의 실제 사각형. 프로토타입 호스트가 `app.html` 요소를 재서 준다.
   * 넘기지 않으면(단독 데모) 창 크기로 같은 값을 근사한다 — 그 경우 iframe 이 없어 어긋날 일이 없다.
   */
  screenRect?: PrototypeScreenRect | null;
};
type Message = {
  role: "assistant" | "user";
  text: string;
  suggestedQuestions?: string[];
  explainTurn?: ExplainTurn;
  stockExploreTurn?: StockExploreTurn;
  sectorExploreTurn?: SectorExploreTurn;
  uiAction?: ChatUiAction;
  /** 다시 보내 볼 만한 실패에만 붙는다. 값이 있으면 이 질문 그대로 재전송하는 버튼을 그린다. */
  retryQuestion?: string;
};
/**
 * 새로고침해도 보던 대화가 남게 한다. 탭을 닫으면 사라지는 `sessionStorage` 만
 * 쓰고 서버로 보내지 않는다 — 대화 원문은 저장·전달하지 않는다는 SPEC §11 을
 * 그대로 지킨다.
 */
const CHAT_STORAGE_KEY = "kw_f10_chat_v1";
const MAX_STORED_MESSAGES = 40;

function readStoredMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Message =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as Message).text === "string" &&
        ((item as Message).role === "user" || (item as Message).role === "assistant"),
    );
  } catch {
    return [];
  }
}

function writeStoredMessages(messages: Message[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)),
    );
  } catch {
    // 저장 실패는 대화를 막지 않는다.
  }
}

function clearStoredMessages() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(CHAT_STORAGE_KEY);
  } catch {
    // 무시
  }
}

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
  // 놓는 순간 판정에 쓴다. state 로만 두면 pointerup 이 한 프레임 뒤진 값을 볼 수 있다.
  overDismiss: boolean;
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
  openChat: "\ud0a4\uc6c5\uc774 \ucc57\ubd07 \uc5f4\uae30",
  close: "\ub2eb\uae30",
  greeting:
    "안녕하세요, 저는 키웅이예요. 투자 기초와 화면 사용법을 함께 살펴볼 수 있어요.",
  input: "궁금한 것을 입력해 주세요",
  send: "\ubcf4\ub0b4\uae30",
  retry: "다시 보내기",
  reset: "초기화",
} as const;

/**
 * 답변 아래 붙는 선택지·추천 질문 칩.
 *
 * 답변 말풍선이 `bg-bg` 채움이라 칩도 같은 채움이면 **읽을 것과 누를 것이 구분되지 않는다.**
 * 디자인 토큰에는 회색이 한 단계뿐이라 색을 더 만들 수 없으므로, 흰 채움 + 남색 테두리로
 * 성격을 가른다. 글씨는 답변 본문과 같은 `text-sm` 이다.
 */
const CHOICE_CHIP_CLASS =
  "rounded-full border border-navy/20 bg-white px-3 py-2 text-sm font-medium text-navy";

const GREETING_SUGGESTED_QUESTIONS: string[] = [
  "매수는 어떻게 하나요?",
  "수익률이 무엇인가요?",
  "키웅이는 무엇을 도와주나요?",
];

const PROACTIVE_BUBBLE_VISIBLE_MS = 8_000;
const FLOATING_CHAT_RADIUS = 28;
const HERO_AVATARS = [hero01, hero02, hero03, hero04, hero05] as const;
const VILLAIN_AVATARS = [
  villain01,
  villain02,
  villain03,
  villain04,
  villain05,
] as const;
const PROACTIVE_BUBBLE_TOGGLE_COPY: Record<
  ProactiveSignal,
  { accept: string; decline: string }
> = {
  buyHesitation: { accept: "응!", decline: "아니" },
  orderMethodConfusion: { accept: "그래!", decline: "싫어" },
  dwell: { accept: "응!", decline: "아니" },
  lossRevisit: { accept: "응!", decline: "아니" },
};

function defaultFloatingChatPosition(
  prototypeScreen: PrototypeScreenRect | null,
): FloatingChatPosition {
  if (prototypeScreen) {
    return {
      x: prototypeScreen.left + prototypeScreen.width - 44 * prototypeScreen.scale,
      y: prototypeScreen.top + prototypeScreen.height - 108 * prototypeScreen.scale,
    };
  }
  return { x: 390 - 44, y: 844 - 108 };
}

function clampFloatingChatPosition(
  position: FloatingChatPosition,
  prototypeScreen: PrototypeScreenRect | null,
): FloatingChatPosition {
  const left = prototypeScreen?.left ?? 0;
  const top = prototypeScreen?.top ?? 0;
  const width = prototypeScreen?.width ?? 390;
  const height = prototypeScreen?.height ?? 844;
  return {
    x: Math.min(left + width - FLOATING_CHAT_RADIUS, Math.max(left + FLOATING_CHAT_RADIUS, position.x)),
    y: Math.min(top + height - FLOATING_CHAT_RADIUS, Math.max(top + FLOATING_CHAT_RADIUS, position.y)),
  };
}

const SCREENS: Record<
  Screen,
  { label: string; title: string; description: string }
> = {
  home: {
    label: "\ud648",
    title: "\uc774\ubc88 \uc8fc \uac00\uc871 \ubaa8\uc758\ud22c\uc790 \ub9ac\uadf8",
    description: "\uc774\ubc88 \uc8fc \ud3ec\ud2b8\ud3f4\ub9ac\uc624\uc640 \ub9ac\uadf8 \uc9c4\ud589 \uc0c1\ud669\uc744 \ud655\uc778\ud574 \ubd10.",
  },
  stock: {
    label: "\uc885\ubaa9 \uc0c1\uc138",
    title: "삼성전자",
    description: "\uae30\uc5c5 \uc815\ubcf4\uc640 \uacf5\uac1c\ub41c \uacfc\uac70 \ub370\uc774\ud130\ub97c \uc0b4\ud3b4\ubcf4\ub294 \ud654\uba74\uc774\uc57c.",
  },
  order: {
    label: "\uc8fc\ubb38",
    title: "삼성전자 매수",
    description: "\uc218\ub7c9\uacfc \uc608\uc0c1 \uae08\uc561\uc744 \ud655\uc778\ud558\uace0 \ub124 \uc0dd\uac01\uc744 \uae30\ub85d\ud558\ub294 \ud654\uba74\uc774\uc57c.",
  },
  archive: {
    label: "\uc544\uce74\uc774\ube0c",
    title: "\ubbfc\uc900\uc758 \ud22c\uc790 \uae30\ub85d",
    description: "\ub0b4\uac00 \uace0\ub978 \uc774\uc720\uc640 \uae30\ub85d\uc744 \ub2e4\uc2dc \ucc3e\uc544\ubcf4\ub294 \ud654\uba74\uc774\uc57c.",
  },
};

function MessageBubble({
  message,
  onQuestion,
  onExplainChoice,
  onStockExploreChoice,
  onSectorExploreChoice,
  actionsDisabled,
}: {
  message: Message;
  onQuestion: (question: string) => void;
  onExplainChoice: (choice: ExplainChoice) => void;
  onStockExploreChoice: (
    question: string,
    choiceId: StockExploreChoiceId,
  ) => void;
  onSectorExploreChoice: (question: string, choiceId: SectorExploreChoiceId) => void;
  actionsDisabled: boolean;
}) {
  const userMessage = message.role === "user";

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
        {!userMessage && message.retryQuestion && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              className={CHOICE_CHIP_CLASS}
              disabled={actionsDisabled}
              onClick={() => onQuestion(message.retryQuestion ?? "")}
              type="button"
            >
              {COPY.retry}
            </button>
          </div>
        )}
        {!userMessage && Boolean(message.suggestedQuestions?.length) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.suggestedQuestions?.map((question) => (
              <button
                className={CHOICE_CHIP_CLASS}
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
            <p className="w-full text-sm text-ink/70">{message.explainTurn.prompt}</p>
            {message.explainTurn.choices.map((choice) => (
              <button
                className={CHOICE_CHIP_CLASS}
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
            <p className="w-full text-sm text-ink/70">
              {message.stockExploreTurn.prompt}
            </p>
            {message.stockExploreTurn.choices.map((choice) => (
              <button
                className={`${CHOICE_CHIP_CLASS} disabled:opacity-50`}
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
        {!userMessage && message.sectorExploreTurn && (
          <div className="mt-2 flex flex-wrap gap-2">
            <p className="w-full text-sm text-ink/70">{message.sectorExploreTurn.prompt}</p>
            {message.sectorExploreTurn.choices.map((choice) => (
              <button
                className={`${CHOICE_CHIP_CLASS} disabled:opacity-50`}
                disabled={actionsDisabled}
                key={choice.id}
                onClick={() => onSectorExploreChoice(choice.label, choice.id)}
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

function ResponsePreparation({ status }: { status: string }) {
  const activeStepIndex = getPreparationStepIndex(status);

  return (
    <section
      aria-label="답변 준비 상태"
      className="rounded-2xl bg-bg px-4 py-3 text-sm text-ink/80"
    >
      <p className="font-semibold text-navy">💡 키웅이가 답변을 준비하고 있어요</p>
      <ol className="mt-3 space-y-2 border-l-2 border-navy/15 pl-3">
        {RESPONSE_PREPARATION_STEPS.map((step, index) => {
          const isComplete = index < activeStepIndex;
          const isActive = index === activeStepIndex;
          return (
            <li className="relative" key={step}>
              <span
                aria-hidden="true"
                className={`absolute -left-[19px] top-1.5 size-2.5 rounded-full ${
                  isComplete
                    ? "bg-mint"
                    : isActive
                      ? "animate-pulse bg-magenta"
                      : "bg-gray/60"
                }`}
              />
              <span className={isActive ? "font-semibold text-navy" : ""}>
                {isComplete ? "✓ " : ""}
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function F10ChatbotDemo({
  context,
  screenRect,
}: F10ChatbotDemoProps = {}) {
  const [screen, setScreen] = useState<Screen>(context?.screen ?? "stock");
  const [isOpen, setIsOpen] = useState(false);
  const [measuredScreen, setMeasuredScreen] =
    useState<PrototypeScreenRect | null>(null);
  // 호스트가 실측값을 주면 그것만 쓴다. 두 값을 섞으면 프레임과 어긋나는 원래 문제로 돌아간다.
  const hostMeasures = screenRect !== undefined;
  const prototypeScreen = hostMeasures ? screenRect : measuredScreen;
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  // \uc11c\ubc84 \ub80c\ub354\uc640 \uc5b4\uae0b\ub098\uc9c0 \uc54a\ub3c4\ub85d \uc800\uc7a5\ub41c \ub300\ud654\ub294 \ub9c8\uc6b4\ud2b8 \ub4a4\uc5d0 \ub418\uc0b4\ub9b0\ub2e4.
  useEffect(() => {
    const stored = readStoredMessages();
    if (stored.length > 0) setMessages(stored);
  }, []);
  useEffect(() => {
    writeStoredMessages(messages);
  }, [messages]);
  const [status, setStatus] = useState("\uc9c8\ubb38\uc744 \uae30\ub2e4\ub9ac\uace0 \uc788\uc5b4");
  const [isLoading, setIsLoading] = useState(false);
  const [isBuyHesitationBubbleVisible, setIsBuyHesitationBubbleVisible] =
    useState(false);
  const [floatingChatPosition, setFloatingChatPosition] =
    useState<FloatingChatPosition | null>(null);
  const [idleAvatarIndex, setIdleAvatarIndex] = useState<number | null>(null);
  const [dragAvatarIndex, setDragAvatarIndex] = useState<number | null>(null);
  const [isFloatingChatDragging, setIsFloatingChatDragging] = useState(false);
  // 삭제 타깃에 놓아 숨긴 상태. 되살리기는 홈 화면 버튼이 맡는다 (F10 SPEC §6.1).
  const [isChatDismissed, setIsChatDismissed] = useState(false);
  const [isOverDismissTargetNow, setIsOverDismissTargetNow] = useState(false);
  const [explainAction, setExplainAction] =
    useState<ExplainActionPayload | null>(null);
  const [stockExploreAction, setStockExploreAction] =
    useState<StockExploreActionPayload | null>(null);
  const [sectorExploreAction, setSectorExploreAction] =
    useState<SectorExploreActionPayload | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const chatSessionVersionRef = useRef(0);
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
  const dismissTarget = dismissTargetPosition(prototypeScreen);
  const dismissTargetScale = prototypeScreen?.scale ?? 1;
  const bubbleOpensLeft = resolvedFloatingChatPosition.x >=
    (prototypeScreen ? prototypeScreen.left + prototypeScreen.width / 2 : 195);
  const floatingAvatar = isFloatingChatDragging
    ? VILLAIN_AVATARS[dragAvatarIndex ?? 0]
    : HERO_AVATARS[idleAvatarIndex ?? 0];
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
    if (hostMeasures) return;

    const syncPrototypeScreen = () => {
      setMeasuredScreen(
        getPrototypeScreenRect(window.innerWidth, window.innerHeight),
      );
    };

    syncPrototypeScreen();
    window.addEventListener("resize", syncPrototypeScreen);
    return () => window.removeEventListener("resize", syncPrototypeScreen);
  }, [hostMeasures]);

  useEffect(() => {
    setIdleAvatarIndex(
      pickNextAvatarIndex(HERO_AVATARS.length, null),
    );

    const preloaders = [...HERO_AVATARS, ...VILLAIN_AVATARS].map((avatar) => {
      const image = new window.Image();
      image.src = avatar.src;
      return image;
    });

    return () => {
      for (const image of preloaders) image.src = "";
    };
  }, []);

  useEffect(() => {
    if (isFloatingChatDragging) return;

    const timer = window.setInterval(() => {
      setIdleAvatarIndex((currentIndex) =>
        pickNextAvatarIndex(HERO_AVATARS.length, currentIndex),
      );
    }, FLOATING_AVATAR_IDLE_ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [isFloatingChatDragging]);

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
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, messages]);

  // 선제 도움 말풍선은 플로팅 버튼의 같은 중심 좌표를 앵커로 쓴다 (F10 SPEC §7).
  // 숨겨진 상태에서 신호가 오면 붙일 곳이 없으므로 버튼을 기본 자리로 되살린다.
  useEffect(() => {
    if (!signal) return;
    setIsChatDismissed(false);
    setFloatingChatPosition(null);
  }, [signal, signalVersion]);

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
    if (!hostMeasures) {
      setMeasuredScreen(
        getPrototypeScreenRect(window.innerWidth, window.innerHeight),
      );
    }
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
    const followUp = PROACTIVE_FOLLOWUP_QUESTION[signal];
    if (followUp) void ask(followUp);
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
      overDismiss: false,
    };
  }

  function handleFloatingChatPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = floatingChatDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = clampFloatingChatPosition(
      { x: drag.origin.x + event.clientX - drag.startX, y: drag.origin.y + event.clientY - drag.startY },
      prototypeScreen,
    );
    if (
      !drag.moved &&
      hasFloatingAvatarDragStarted(
        drag.startX,
        drag.startY,
        event.clientX,
        event.clientY,
      )
    ) {
      drag.moved = true;
      setDragAvatarIndex((currentIndex) =>
        pickNextAvatarIndex(VILLAIN_AVATARS.length, currentIndex),
      );
      setIsFloatingChatDragging(true);
    }
    const overDismiss =
      drag.moved && isOverDismissTarget(next, dismissTarget, dismissTargetScale);
    drag.overDismiss = overDismiss;
    setIsOverDismissTargetNow(overDismiss);
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
    setIsOverDismissTargetNow(false);
    if (drag.moved) {
      setIdleAvatarIndex((currentIndex) =>
        pickNextAvatarIndex(HERO_AVATARS.length, currentIndex),
      );
      setIsFloatingChatDragging(false);
    }
    if (drag.overDismiss) {
      // 되살리기는 홈 화면 버튼이 맡는다 (F10 SPEC §6.1). 여기서는 숨기기만 한다.
      setIsChatDismissed(true);
      setFloatingChatPosition(null);
      setIsOpen(false);
    }
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

  /**
   * "여기까지 볼래요"는 서버 왕복 없이 시트를 닫고 원래 화면으로 돌아간다
   * (SPEC §3.4). 마지막 말풍선의 선택지도 걷어 다시 열었을 때 이어지지 않게 한다.
   */
  function endGuidedFlowsAndClose() {
    setExplainAction(null);
    setStockExploreAction(null);
    setSectorExploreAction(null);
    setMessages((current) => {
      const last = current.at(-1);
      if (!last || last.role !== "assistant") return current;
      const { explainTurn, stockExploreTurn, sectorExploreTurn, ...rest } = last;
      void explainTurn;
      void stockExploreTurn;
      void sectorExploreTurn;
      return [...current.slice(0, -1), rest];
    });
    closeChat();
  }

  function handleExplainChoice(choice: ExplainChoice) {
    if (isLoading) return;
    if (choice.id === "done") {
      endGuidedFlowsAndClose();
      return;
    }
    void ask(choice.label, choice.id);
  }

  function handleStockExploreChoice(
    question: string,
    choiceId: StockExploreChoiceId,
  ) {
    if (isLoading) return;
    if (choiceId === "done") {
      endGuidedFlowsAndClose();
      return;
    }
    void ask(question, undefined, choiceId);
  }

  function resetChat() {
    chatSessionVersionRef.current += 1;
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    clearStoredMessages();
    setMessages([]);
    setInput("");
    setStatus("질문을 기다리고 있어요");
    setExplainAction(null);
    setStockExploreAction(null);
    setSectorExploreAction(null);
    setIsLoading(false);
  }

  function handleSheetPointerDown(
    event: ReactPointerEvent<HTMLElement>,
  ) {
    if (!event.isPrimary || event.button !== 0) return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button, input, textarea")
    ) {
      return;
    }

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
    event: ReactPointerEvent<HTMLElement>,
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
    event: ReactPointerEvent<HTMLElement>,
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
    sectorExploreChoiceId?: SectorExploreChoiceId,
  ) {
    const chatSessionVersion = chatSessionVersionRef.current;
    const abortController = new AbortController();
    requestAbortRef.current?.abort();
    requestAbortRef.current = abortController;
    const explainTurn = explainAction?.turn;
    const stockExploreTurn = stockExploreAction?.turn;
    const sectorExploreTurn = sectorExploreAction?.turn;
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
    ]);
    openChat();
    setInput("");
    setStatus("질문을 보내는 중");
    setExplainAction(null);
    setStockExploreAction(null);
    setSectorExploreAction(null);
    setIsLoading(true);
    const startedAt = Date.now();
    let shownStepIndex = getPreparationStepIndex("질문을 보내는 중");
    let stepShownAt = startedAt;
    let bufferedText = "";
    let pendingExplainAction: ExplainActionPayload | null = null;
    let pendingStockExploreAction: StockExploreActionPayload | null = null;
    let pendingSectorExploreAction: SectorExploreActionPayload | null = null;
    let pendingStandardAction: StandardChatActionPayload | null = null;
    // 응답을 읽다 만 실패는 여기 남지 않는다. 그런 실패는 서버까지 닿지 못한 것과 똑같이 다룬다.
    let failure: ChatFailure | null = null;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          message: question,
          context: chatContext,
          // 지시어("이게"·"그거")를 풀 수 있도록 직전 서버 답변 한 건과 그때 다룬
          // 용어만 보낸다. 대화 이력 전체는 보내지 않는다.
          ...(previousMessage?.role === "assistant" && previousMessage.text
            ? { lastAnswer: previousMessage.text.slice(0, 800) }
            : {}),
          ...(previousMessage?.role === "assistant" &&
          previousMessage.explainTurn?.scriptId.startsWith("term:")
            ? { lastTopicId: previousMessage.explainTurn.scriptId }
            : {}),
          // 버튼을 눌렀으면 choiceId를 보내고, 직접 타이핑했으면 진행 중인 단계만 보내
          // 서버가 구어체("ㅇㅇ", "몰라"…)를 해석하게 한다.
          ...(explainTurn && explainTurn.stage !== "example"
            ? {
                explain: {
                  scriptId: explainTurn.scriptId,
                  stage: explainTurn.stage,
                  ...(explainChoiceId ? { choiceId: explainChoiceId } : {}),
                  ...(explainTurn.reaskCount
                    ? { reaskCount: explainTurn.reaskCount }
                    : {}),
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
          ...(sectorExploreTurn && sectorExploreChoiceId
            ? {
                sectorExplore: {
                  sectorId: sectorExploreTurn.sectorId,
                  choiceId: sectorExploreChoiceId,
                },
              }
            : {}),
        }),
      });

      if (!response.ok || !response.body) {
        // 상태 코드를 여기서 읽어 둔다. catch 는 fetch 가 던진 실패와 구분할 수단이 없다.
        failure = response.ok
          ? UNREACHABLE_CHAT_FAILURE
          : readChatFailure(response.status, response.headers);
        throw new Error("Chat request failed");
      }

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
            const candidateStepIndex = getPreparationStepIndex(value);
            const delay = nextStatusDisplayDelayMs(
              shownStepIndex,
              candidateStepIndex,
              Date.now() - stepShownAt,
            );
            if (delay > 0) {
              await new Promise<void>((resolve) => setTimeout(resolve, delay));
            }
            if (chatSessionVersion !== chatSessionVersionRef.current) return;
            setStatus(value);
            shownStepIndex = Math.max(shownStepIndex, candidateStepIndex);
            stepShownAt = Date.now();
          }
          if (type === "text" && typeof value === "string") {
            bufferedText += value;
          }
          if (type === "action" && value && typeof value === "object") {
            if (isExplainAction(value)) {
              pendingExplainAction = value;
              continue;
            }

            if (isStockExploreAction(value)) {
              pendingStockExploreAction = value;
              continue;
            }
            if (isSectorExploreAction(value)) {
              pendingSectorExploreAction = value;
              continue;
            }

            pendingStandardAction = value as StandardChatActionPayload;
          }
        }
      }

      await new Promise<void>((resolve) => {
        setTimeout(resolve, remainingPreparationMs(startedAt, Date.now()));
      });

      if (chatSessionVersion !== chatSessionVersionRef.current) return;

      setExplainAction(pendingExplainAction);
      setStockExploreAction(pendingStockExploreAction);
      setSectorExploreAction(pendingSectorExploreAction);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: bufferedText,
          ...(pendingExplainAction
            ? {
                explainTurn: pendingExplainAction.turn,
                ...(Array.isArray(pendingExplainAction.suggestedQuestions)
                  ? { suggestedQuestions: pendingExplainAction.suggestedQuestions }
                  : {}),
                ...(isAllowedUiAction(pendingExplainAction.uiAction)
                  ? { uiAction: pendingExplainAction.uiAction }
                  : {}),
              }
            : {}),
          ...(pendingStockExploreAction
            ? {
                stockExploreTurn: pendingStockExploreAction.turn,
                ...(Array.isArray(pendingStockExploreAction.suggestedQuestions)
                  ? { suggestedQuestions: pendingStockExploreAction.suggestedQuestions }
                  : {}),
                ...(isAllowedUiAction(pendingStockExploreAction.uiAction)
                  ? { uiAction: pendingStockExploreAction.uiAction }
                  : {}),
              }
            : {}),
          ...(pendingSectorExploreAction
            ? { sectorExploreTurn: pendingSectorExploreAction.turn }
            : {}),
          ...(pendingStandardAction
            ? {
                ...(Array.isArray(pendingStandardAction.suggestedQuestions)
                  ? { suggestedQuestions: pendingStandardAction.suggestedQuestions }
                  : {}),
                ...(isAllowedUiAction(pendingStandardAction.uiAction)
                  ? { uiAction: pendingStandardAction.uiAction }
                  : {}),
              }
            : {}),
        },
      ]);
      setStatus("답변을 준비했어요");
    } catch {
      if (abortController.signal.aborted || chatSessionVersion !== chatSessionVersionRef.current) {
        return;
      }
      const reason = failure ?? UNREACHABLE_CHAT_FAILURE;
      // 서버 로그의 `{"event":"f10_chat", …}` 를 같은 요청 ID 로 찾으라고 남긴다.
      // 질문 원문은 넣지 않는다 (SPEC §11).
      console.error("[f10] 챗봇 요청 실패", chatFailureLog(reason));
      setStatus("연결을 다시 확인해 주세요");
      await new Promise<void>((resolve) => {
        setTimeout(resolve, remainingPreparationMs(startedAt, Date.now()));
      });
      setMessages((current) => {
        return [
          ...current,
          {
            role: "assistant",
            text: chatFailureText(reason),
            ...(isRetryableChatFailure(reason) ? { retryQuestion: question } : {}),
          },
        ];
      });
    } finally {
      if (requestAbortRef.current === abortController) {
        requestAbortRef.current = null;
      }
      if (chatSessionVersion === chatSessionVersionRef.current) {
        setIsLoading(false);
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (input.trim() && !isLoading) void ask(input);
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

      {signal && !isChatDismissed && (signal !== "buyHesitation" || isBuyHesitationBubbleVisible) && (
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
                {PROACTIVE_BUBBLE_TOGGLE_COPY[signal].accept}
              </button>
              <button
                className="rounded-xl border border-navy/20 bg-white px-3 py-2 text-xs font-semibold text-navy"
                onClick={dismissProactiveHelp}
                type="button"
              >
                {PROACTIVE_BUBBLE_TOGGLE_COPY[signal].decline}
              </button>
            </div>
          </div>
        </aside>
      )}

      {isFloatingChatDragging && !isChatDismissed && (
        <div
          aria-hidden="true"
          // 버튼과 같은 z-index 이고 DOM 에서 먼저 그려진다 — 끌고 있는 버튼이 항상 위에 온다.
          className="pointer-events-none fixed z-10 grid place-items-center rounded-full border-[1.5px] text-white transition-all duration-150"
          style={{
            left: dismissTarget.x,
            top: dismissTarget.y,
            transform: "translate(-50%, -50%)",
            width:
              (isOverDismissTargetNow
                ? DISMISS_TARGET_ARMED_DIAMETER_PX
                : DISMISS_TARGET_DIAMETER_PX) * dismissTargetScale,
            height:
              (isOverDismissTargetNow
                ? DISMISS_TARGET_ARMED_DIAMETER_PX
                : DISMISS_TARGET_DIAMETER_PX) * dismissTargetScale,
            // 버튼이 마젠타라 활성색까지 마젠타면 겹쳤을 때 한 덩어리로 보인다.
            // 진한 회색(ink)으로 채워 위에 올라온 버튼과 대비를 준다.
            background: isOverDismissTargetNow
              ? "var(--color-ink)"
              : "rgb(26 34 51 / 0.55)",
            borderColor: isOverDismissTargetNow ? "#fff" : "rgb(255 255 255 / 0.55)",
            boxShadow: isOverDismissTargetNow
              ? "0 0 0 8px rgb(26 34 51 / 0.16), 0 12px 26px -6px rgb(26 34 51 / 0.5)"
              : "none",
            backdropFilter: "blur(6px)",
          }}
        >
          <svg
            fill="none"
            height={26 * dismissTargetScale}
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth={2.6}
            viewBox="0 0 24 24"
            width={26 * dismissTargetScale}
          >
            <path d="M7 7l10 10M17 7L7 17" />
          </svg>
        </div>
      )}

      <button
        aria-label={COPY.openChat}
        className="fixed z-10 grid size-14 touch-none place-items-center overflow-hidden rounded-full border border-magenta/30 bg-magenta p-0 shadow-lg cursor-grab active:cursor-grabbing transition-[transform,opacity] duration-150"
        hidden={isChatDismissed}
        onClick={handleFloatingChatClick}
        onPointerCancel={finishFloatingChatDrag}
        onPointerDown={handleFloatingChatPointerDown}
        onPointerMove={handleFloatingChatPointerMove}
        onPointerUp={finishFloatingChatDrag}
        style={{
          bottom: "auto",
          left: resolvedFloatingChatPosition.x,
          top: resolvedFloatingChatPosition.y,
          // 타깃 위에서는 작아지고 흐려져 "놓으면 사라진다"를 미리 보여준다.
          transform: `translate(-50%, -50%) scale(${isOverDismissTargetNow ? 0.72 : 1})`,
          opacity: isOverDismissTargetNow ? 0.55 : 1,
        }}
        type="button"
      >
        <img
          alt=""
          aria-hidden="true"
          className="pointer-events-none size-full select-none object-cover"
          draggable={false}
          height={56}
          src={floatingAvatar.src}
          width={56}
        />
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
            className="absolute inset-0 z-0 bg-navy/20 backdrop-blur-[1px]"
            onClick={closeChat}
            type="button"
          />

          <section
            aria-label="키웅이 챗봇"
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
            {/*
              닫기 드래그는 **헤더에서만** 받는다. 시트 전체에 걸면 대화 목록을 넘기려는
              손짓이 시트 드래그로 잡혀(포인터 캡처 + preventDefault) 스크롤이 아예 죽고,
              아래로 끌면 읽으려던 대화가 닫힌다. 대화가 길어질수록 못 읽는다.
            */}
            <header
              className="shrink-0 touch-none"
              onPointerCancel={(event) => finishSheetDrag(event, true)}
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={finishSheetDrag}
            >
              <div className="flex h-7 items-center justify-center">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-12 rounded-full bg-gray/60"
                />
              </div>

              <div className="flex justify-end border-b border-gray/40 px-5 pb-3">
                <button
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-navy"
                  onClick={resetChat}
                  type="button"
                >
                  {COPY.reset}
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-4">
              {messages.length === 0 && (
                <MessageBubble
                  message={{
                    role: "assistant",
                    text: COPY.greeting,
                    suggestedQuestions: GREETING_SUGGESTED_QUESTIONS,
                  }}
                  onQuestion={(question) => {
                    if (!isLoading) void ask(question);
                  }}
                  onExplainChoice={handleExplainChoice}
                  onStockExploreChoice={handleStockExploreChoice}
                  onSectorExploreChoice={(question, choiceId) => {
                    if (!isLoading) void ask(question, undefined, undefined, choiceId);
                  }}
                  actionsDisabled={isLoading}
                />
              )}
              {messages.map((message, index) => (
                <MessageBubble
                  key={index}
                  message={message}
                  onQuestion={(question) => {
                    if (!isLoading) void ask(question);
                  }}
                  onExplainChoice={handleExplainChoice}
                  onStockExploreChoice={handleStockExploreChoice}
                  onSectorExploreChoice={(question, choiceId) => {
                    if (!isLoading) void ask(question, undefined, undefined, choiceId);
                  }}
                  actionsDisabled={isLoading || index !== messages.length - 1}
                />
              ))}
              {isLoading && <ResponsePreparation status={status} />}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>

            {/*
              폰 프레임 개구부의 하단 코너는 화면 라운드보다 깊게 파여 있고 그 프레임이 이
              오버레이 위에 한 겹 더 깔린다. 바닥에 붙이면 입력창과 보내기 버튼의 아래 모서리가
              베젤에 덮이므로 `SHEET_BOTTOM_SAFE_PX` 만큼 띄운다. 브라우저의 안전영역
              (`env(safe-area-inset-bottom)`)은 바깥 창의 값이라 이 목업 폰과 무관하다.
            */}
            <div
              className="shrink-0 border-t border-gray/40 px-4 pt-3"
              style={{ paddingBottom: SHEET_BOTTOM_SAFE_PX }}
            >
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

