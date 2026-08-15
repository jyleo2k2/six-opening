"use client";

import { useEffect, useRef, useState } from "react";
import { useChatBehaviorStore } from "../../shared/store/chat-behavior-store";
import type { ChatContext, ChatUiAction } from "../../shared/types/chatbot";
import { F10ChatbotDemo } from "../f10-chatbot/F10ChatbotDemo";
import {
  getPrototypeScreenRect,
  type PrototypeScreenRect,
} from "../f10-chatbot/lib/bottom-sheet";
import {
  isRecord,
  parseBehaviorEvent,
  parseChatContext,
  readPrototypeScreenRect,
} from "./lib/prototype-bridge";
import {
  actionFromRoute,
  pathFromRoute,
  routeFromChatContext,
  routeFromPath,
  type ScreenRoute,
} from "./screen-route";

const CHAT_CONTEXT_MESSAGE = "kiwoom:chat-context";
const CHAT_BEHAVIOR_MESSAGE = "kiwoom:chat-behavior";
const OPEN_CHAT_ACTION_MESSAGE = "kiwoom:open-chat-action";

// 가족 피드는 app.html 아카이브 수익률 탭이 소유한다. 여기 오버레이로 겹쳐 두지 않는다.
export function ConnectedPrototype({ route }: { route?: ScreenRoute } = {}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatContextRef = useRef<ChatContext>({ screen: "home" });
  const [chatContext, setChatContext] = useState<ChatContext>({ screen: "home" });
  const [screenRect, setScreenRect] = useState<PrototypeScreenRect | null>(null);

  // 챗봇 시트는 폰 프레임 안 화면에 딱 맞아야 한다. 배율은 app.html 이 자기 뷰포트로 정하므로
  // 여기서 다시 계산하지 않고 실제 요소를 잰다. 창이 바뀌면 app.html 의 배율 갱신이 먼저
  // 끝나야 하므로 다음 프레임에 읽는다.
  // 아직 로드 전이거나 어떤 이유로든 못 재면 창 크기로 근사한다. 프레임과 어긋날 수 있지만
  // 챗봇이 아예 안 열리는 것보다는 낫다 — 로드가 끝나면 onLoad 가 실측값으로 덮는다.
  const measureScreen = () =>
    setScreenRect(
      readPrototypeScreenRect(iframeRef.current) ??
        getPrototypeScreenRect(window.innerWidth, window.innerHeight),
    );

  useEffect(() => {
    let frameId = 0;
    const remeasure = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(measureScreen);
    };

    remeasure();
    window.addEventListener("resize", remeasure);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", remeasure);
    };
  }, []);

  const openChatAction = (action: ChatUiAction) => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: OPEN_CHAT_ACTION_MESSAGE, action },
      window.location.origin,
    );
  };

  // 주소 → 화면. 서버가 넘긴 첫 주소와 뒤로가기가 같은 길을 쓴다.
  // 홈은 지시가 없다(앱이 홈에서 시작한다).
  const openRoute = (next: ScreenRoute) => {
    const action = actionFromRoute(next);
    if (action) openChatAction(action);
  };

  // iframe 이 뜬 뒤에야 지시를 받을 수 있다. 첫 주소는 onLoad 에서 한 번 적용한다.
  const appliedFirstRoute = useRef(false);
  const applyFirstRoute = () => {
    if (appliedFirstRoute.current || !route) return;
    appliedFirstRoute.current = true;
    openRoute(route);
  };

  // 화면 → 주소. app.html 이 화면 전환마다 보내는 맥락으로 주소만 갈아끼운다.
  // 히스토리를 쌓지 않는다(replaceState) — 앱 안에 자체 뒤로가기 버튼이 있어서
  // pushState 로 쌓으면 두 개의 뒤로가기가 서로 어긋난다.
  const pushedPath = useRef<string | null>(null);
  const syncPathFromContext = (context: ChatContext) => {
    const next = routeFromChatContext(context);
    if (!next) return;
    const path = pathFromRoute(next);
    if (path === window.location.pathname || path === pushedPath.current) return;
    pushedPath.current = path;
    window.history.replaceState(null, "", path);
  };

  // 브라우저 뒤로·앞으로 가기.
  useEffect(() => {
    const onPopState = () => {
      const next = routeFromPath(window.location.pathname);
      pushedPath.current = window.location.pathname;
      if (next) openRoute(next);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
          syncPathFromContext(nextContext);
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
        onLoad={() => {
          measureScreen();
          applyFirstRoute();
        }}
        ref={iframeRef}
        src="/ui/app.html?runtime=1"
        title="키움 가족 모의투자 리그"
      />
      <div className="prototype-chat-overlay">
        <F10ChatbotDemo
          context={chatContext}
          onUiAction={openChatAction}
          screenRect={screenRect}
        />
      </div>
    </div>
  );
}
