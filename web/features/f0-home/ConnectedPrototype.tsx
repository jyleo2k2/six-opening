"use client";

import { useEffect, useRef, useState } from "react";
import { useChatBehaviorStore } from "../../shared/store/chat-behavior-store";
import type { ChatContext, ChatUiAction } from "../../shared/types/chatbot";
import { F10ChatbotDemo } from "../f10-chatbot/F10ChatbotDemo";
import { FeedScreen } from "../f11-feed";
import {
  isRecord,
  parseBehaviorEvent,
  parseChatContext,
} from "./lib/prototype-bridge";

const CHAT_CONTEXT_MESSAGE = "kiwoom:chat-context";
const CHAT_BEHAVIOR_MESSAGE = "kiwoom:chat-behavior";
const OPEN_STOCK_MESSAGE = "kiwoom:open-stock";
const OPEN_CHAT_ACTION_MESSAGE = "kiwoom:open-chat-action";

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

  const openChatAction = (action: ChatUiAction) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: OPEN_CHAT_ACTION_MESSAGE, action },
      window.location.origin,
    );
  };

  useEffect(() => {
    const receivePrototypeMessage = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== iframeRef.current?.contentWindow ||
        !isRecord(event.data)
      ) {
        return;
      }

      if (event.data.type === CHAT_CONTEXT_MESSAGE) {
        const nextContext = parseChatContext(event.data.context);
        if (nextContext) setChatContext(nextContext);
        return;
      }

      if (event.data.type === CHAT_BEHAVIOR_MESSAGE) {
        const behaviorEvent = parseBehaviorEvent(event.data.event, Date.now());
        if (behaviorEvent) {
          useChatBehaviorStore.getState().recordEvent(behaviorEvent);
        }
      }
    };

    window.addEventListener("message", receivePrototypeMessage);
    return () => window.removeEventListener("message", receivePrototypeMessage);
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
        <F10ChatbotDemo context={chatContext} onUiAction={openChatAction} />
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
