"use client";

import { useEffect, useRef, useState } from "react";
import { useChatBehaviorStore } from "../../shared/store/chat-behavior-store";
import type { ChatContext, ChatUiAction } from "../../shared/types/chatbot";
import { F10ChatbotDemo } from "../f10-chatbot/F10ChatbotDemo";
import {
  isRecord,
  parseBehaviorEvent,
  parseChatContext,
} from "./lib/prototype-bridge";

const CHAT_CONTEXT_MESSAGE = "kiwoom:chat-context";
const CHAT_BEHAVIOR_MESSAGE = "kiwoom:chat-behavior";
const OPEN_CHAT_ACTION_MESSAGE = "kiwoom:open-chat-action";

// 가족 피드는 app.html 아카이브 수익률 탭이 소유한다. 여기 오버레이로 겹쳐 두지 않는다.
export function ConnectedPrototype() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatContextRef = useRef<ChatContext>({ screen: "home" });
  const [chatContext, setChatContext] = useState<ChatContext>({ screen: "home" });

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
        if (nextContext) {
          chatContextRef.current = nextContext;
          setChatContext(nextContext);
        }
        return;
      }

      if (event.data.type === CHAT_BEHAVIOR_MESSAGE) {
        const behaviorEvent = parseBehaviorEvent(
          event.data.event,
          Date.now(),
          chatContextRef.current,
        );
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
    </div>
  );
}
