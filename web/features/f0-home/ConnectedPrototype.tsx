"use client";

import { useEffect, useRef, useState } from "react";
import {
  CHAT_SCREENS,
  type ChatContext,
  type ChatScreen,
} from "../../shared/types/chatbot";
import { F10ChatbotDemo } from "../f10-chatbot/F10ChatbotDemo";
import { FeedScreen } from "../f11-feed";

const CHAT_CONTEXT_MESSAGE = "kiwoom:chat-context";
const OPEN_STOCK_MESSAGE = "kiwoom:open-stock";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseChatContext(value: unknown): ChatContext | null {
  if (!isRecord(value) || typeof value.screen !== "string") return null;
  if (!CHAT_SCREENS.includes(value.screen as ChatScreen)) return null;

  const screen = value.screen as ChatScreen;
  if (screen !== "stock" && screen !== "order") return { screen };
  if (
    typeof value.stockId !== "string" ||
    !/^KRX:\d{6}$/.test(value.stockId) ||
    typeof value.stockName !== "string" ||
    !value.stockName.trim() ||
    value.stockName.length > 60
  ) {
    return null;
  }

  return {
    screen,
    stockId: value.stockId as `KRX:${string}`,
    stockName: value.stockName.trim(),
  };
}

export function ConnectedPrototype() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [chatContext, setChatContext] = useState<ChatContext>({ screen: "home" });
  const [feedOpen, setFeedOpen] = useState(false);

  // 피드에서 종목을 고르면 iframe 안 app.html 을 그 종목 상세로 옮긴다.
  const openChart = (symbol: string) => {
    setFeedOpen(false);
    iframeRef.current?.contentWindow?.postMessage(
      { type: OPEN_STOCK_MESSAGE, symbol },
      window.location.origin,
    );
  };

  useEffect(() => {
    const receiveChatContext = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== iframeRef.current?.contentWindow ||
        !isRecord(event.data) ||
        event.data.type !== CHAT_CONTEXT_MESSAGE
      ) {
        return;
      }

      const nextContext = parseChatContext(event.data.context);
      if (nextContext) setChatContext(nextContext);
    };

    window.addEventListener("message", receiveChatContext);
    return () => window.removeEventListener("message", receiveChatContext);
  }, []);

  return (
    <div className="h-dvh min-h-[640px] overflow-hidden bg-bg text-ink">
      <iframe
        className="block h-full w-full border-0"
        ref={iframeRef}
        src="/ui/app.html?runtime=1"
        title="키움 가족 모의투자 리그"
      />
      <div className="prototype-chat-overlay">
        <F10ChatbotDemo context={chatContext} />
      </div>

      <button
        className="prototype-feed-button"
        onClick={() => setFeedOpen(true)}
        type="button"
      >
        가족 기록
      </button>

      {feedOpen && (
        <div className="prototype-feed-overlay">
          <FeedScreen onClose={() => setFeedOpen(false)} onOpenChart={openChart} />
        </div>
      )}
    </div>
  );
}
