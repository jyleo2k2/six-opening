"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatContext, ChatUiAction } from "../../shared/types/chatbot";
import { F10ChatbotDemo } from "../f10-chatbot/F10ChatbotDemo";
import {
  getPrototypeScreenRect,
  type PrototypeScreenRect,
} from "../f10-chatbot/lib/bottom-sheet";
import { phoneFrameRect, phoneScreenClipPath } from "./lib/phone-frame";
import type { WalletAccountId } from "./lib/use-wallet";
import { ArchiveScreen } from "./ArchiveScreen";
import { DetailScreen } from "./DetailScreen";
import { ExploreScreen } from "./ExploreScreen";
import { HomeScreen } from "./HomeScreen";
import { OrderScreen } from "./OrderScreen";
import { PortfolioScreen } from "./PortfolioScreen";
import { RankingScreen } from "./RankingScreen";
import {
  pathFromRoute,
  routeFromChatAction,
  routeFromPath,
  type ChatOrderRequest,
  type ScreenRoute,
} from "./screen-route";
import { TutorialOverlay } from "./TutorialOverlay";
import type { TutorialStage } from "./lib/tutorial-steps";

/** 화면이 맥락을 올리기 전의 기본값. 상세·탐색·주문만 자기 맥락을 올린다. */
const HOME_CONTEXT: ChatContext = { screen: "home" };

/**
 * 옮겨 온 화면을 그리는 호스트.
 *
 * 예전에는 `/ui/app.html` iframe 을 깔고 그 위에 React 화면을 얹었다. 사용자 화면이 전부
 * React 로 넘어온 뒤에도 문서를 살려 둔 이유는 **폰 화면 사각형의 실측 기준**이었기
 * 때문인데, 실측해 보니 `app.html` 의 배율식과 `getPrototypeScreenRect` 가 항등이라
 * (여백이 대칭이다 — 24+402+24=450, 23+874+23=920) 잴 이유가 없었다. 그래서 걷어냈다.
 */
export function ConnectedPrototype({
  route,
  account = "child",
}: { route?: ScreenRoute; account?: WalletAccountId } = {}) {
  const [overlay, setOverlay] = useState<ScreenRoute | null>(route ?? null);
  /** 종목·탐색·주문 화면이 올리는 맥락. 없으면 홈으로 본다. */
  const [overlayContext, setOverlayContext] = useState<ChatContext | null>(null);
  const [screenRect, setScreenRect] = useState<PrototypeScreenRect | null>(null);
  /**
   * 튜토리얼. 오버레이를 화면 컴포넌트가 아니라 여기서 갖는 이유는 **화면을 건너다녀야**
   * 하기 때문이다 — 홈에서 켜고 탐색으로 넘어가도 설명이 따라와야 한다.
   *
   * `stage` 는 주문 1/2/3 단계와 상세→뉴스처럼 **주소가 안 바뀌는 자리**다. 화면이
   * `onStage` 로 올려 준다. 화면을 옮길 때 비우는 이유는, 남겨 두면 다음 화면이 자기
   * 자리를 올리기 전 한 프레임 동안 `order-2` 같은 지난 자리로 설명을 고르기 때문이다.
   */
  const [tutorialOn, setTutorialOn] = useState(false);
  const [stage, setStage] = useState<TutorialStage | undefined>(undefined);
  /** 아카이브 안내는 화면 이동 뒤에도 유지하고, 로그인 페이지로 나가면 새로 시작한다. */
  const [archiveInfoOpen, setArchiveInfoOpen] = useState(true);
  const orderRequestId = useRef(0);
  /** 챗봇이 지정한 주문 단계. 주소로 표현할 수 없어 주문 화면에 한 번만 전달한다. */
  const [chatOrderRequest, setChatOrderRequest] = useState<ChatOrderRequest | null>(null);

  // 챗봇 시트와 폰 프레임은 화면 사각형에 딱 맞아야 한다. 기하의 원본은 `PROTOTYPE_PHONE`
  // 상수 하나이고, 옮겨 온 화면(`PhoneFrame`)도 같은 함수로 자기 자리를 잡는다.
  useEffect(() => {
    let frameId = 0;
    const measure = () =>
      setScreenRect(getPrototypeScreenRect(window.innerWidth, window.innerHeight));
    const remeasure = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("resize", remeasure);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", remeasure);
    };
  }, []);

  // 화면 이동은 여기 하나로 모인다. 히스토리를 쌓지 않는다(replaceState) — 앱 안에 자체
  // 뒤로가기 버튼이 있어서 pushState 로 쌓으면 두 개의 뒤로가기가 서로 어긋난다.
  const pushedPath = useRef<string | null>(null);
  const writePath = (next: ScreenRoute | null) => {
    if (!next) return;
    const path = pathFromRoute(next);
    if (path === window.location.pathname || path === pushedPath.current) return;
    pushedPath.current = path;
    window.history.replaceState(null, "", path);
  };

  const openRoute = (next: ScreenRoute, orderRequest: ChatOrderRequest | null = null) => {
    setOverlay(next);
    setStage(undefined);
    setChatOrderRequest(next.screen === "order" ? orderRequest : null);
    writePath(next);
  };

  /** 화면이 "여기로 가자" 하고 올려 보낸다. 주소 문자열만 안다. */
  const leaveToPath = (path: string) => {
    const next = routeFromPath(path);
    if (next) openRoute(next);
  };

  const openChatAction = (action: ChatUiAction) => {
    const next = routeFromChatAction(action, overlay);
    const orderRequest = next.screen === "order"
      ? { id: ++orderRequestId.current, step: action.orderStep }
      : null;
    openRoute(next, orderRequest);
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

  const frame = phoneFrameRect(screenRect);

  return (
    <div className="h-dvh min-h-[640px] overflow-hidden bg-bg text-ink">
      {overlay && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5 }}>
          {overlay.screen === "home" && (
            <HomeScreen onLeave={leaveToPath} onStartTutorial={() => setTutorialOn(true)} />
          )}
          {overlay.screen === "archive" && (
            <ArchiveScreen
              account={account}
              infoOpen={archiveInfoOpen}
              onInfoOpenChange={setArchiveInfoOpen}
              onLeave={leaveToPath}
              view={overlay.view}
            />
          )}
          {overlay.screen === "ranking" && <RankingScreen onLeave={leaveToPath} />}
          {overlay.screen === "portfolio" && (
            <PortfolioScreen account={account} onLeave={leaveToPath} />
          )}
          {overlay.screen === "stock" && (
            <DetailScreen
              account={account}
              code={overlay.code}
              onChatContext={setOverlayContext}
              onLeave={leaveToPath}
              onStage={setStage}
            />
          )}
          {overlay.screen === "explore" && (
            <ExploreScreen
              account={account}
              onChatContext={setOverlayContext}
              onLeave={leaveToPath}
              sector={overlay.sector}
            />
          )}
          {overlay.screen === "order" && (
            <OrderScreen
              account={account}
              chatOrderRequest={chatOrderRequest}
              code={overlay.code}
              // 종목·방향이 바뀌면 단계·초안을 처음부터 시작한다.
              key={`${overlay.side}-${overlay.code}`}
              onChatContext={setOverlayContext}
              onLeave={leaveToPath}
              onStage={setStage}
              side={overlay.side}
            />
          )}
        </div>
      )}
      <div
        className="prototype-chat-overlay"
        style={{ clipPath: phoneScreenClipPath(screenRect) }}
      >
        <F10ChatbotDemo
          context={overlayContext ?? HOME_CONTEXT}
          onUiAction={openChatAction}
          screenRect={screenRect}
        />
      </div>
      {/*
        튜토리얼은 챗봇 오버레이 위, 프레임 아래다. 역할이 갈린다 — 코치마크는 지금 이
        버튼이 뭘 하는지 짚어 주고, 깊은 설명은 키웅이가 맡는다.
      */}
      {tutorialOn && overlay && (
        <TutorialOverlay
          onClose={() => setTutorialOn(false)}
          onGo={leaveToPath}
          // 매수·매도는 화면도 단계도 같아서 `side` 가 없으면 팔러 간 화면에 사는 설명이
          // 뜬다. 어느 종목인지는 튜토리얼이 지갑을 보고 스스로 정한다.
          place={{
            screen: overlay.screen,
            stage,
            side: overlay.screen === "order" ? overlay.side : undefined,
          }}
        />
      )}
      {/*
        폰 프레임을 맨 위에 한 겹 더 깐다. 챗봇 시트처럼 화면 위로 올라오는 것들은
        `PhoneFrame` **밖**에 있어서 프레임 이미지보다 위에 그려진다. 화면 사각형으로
        자르고 있지만 화면 라운드(40px)보다 프레임 개구부가 깊게 파여 있어 그 틈으로
        베젤 위에 비친다. 여기 한 겹이 있으면 무엇이 올라오든 베젤이 이긴다.
      */}
      {frame && (
        <img
          alt=""
          src="/ui/assets/iphone-frame.png"
          style={{
            position: "fixed",
            left: frame.left,
            top: frame.top,
            width: frame.width,
            height: frame.height,
            zIndex: 20,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
