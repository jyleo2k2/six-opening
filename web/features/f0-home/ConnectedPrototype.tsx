"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatContext, ChatUiAction } from "../../shared/types/chatbot";
import { F10ChatbotDemo } from "../f10-chatbot/F10ChatbotDemo";
import type { OrderPrefill } from "./lib/order-view";
import { PhoneFrame } from "./PhoneFrame";
import { phoneScreenClipPath, PHONE_SCREEN_RECT } from "./lib/phone-frame";
import type { PendingOrder } from "./lib/portfolio-view";
import type { WalletAccountId } from "./lib/use-wallet";
import { ArchiveScreen } from "./ArchiveScreen";
import { DetailScreen } from "./DetailScreen";
import {
  closeCandleTip,
  NO_CANDLE_TIPS_CLOSED,
  type CandleTipDismissals,
} from "./lib/candle-tip";
import type { PrototypeChartPeriod } from "../f2-trade/chart-data";
import { ExploreScreen } from "./ExploreScreen";
import { HomeScreen } from "./HomeScreen";
import { DEFAULT_RESTRICTION, type TradeRestriction } from "./lib/trade-restriction";
import { OrderScreen } from "./OrderScreen";
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

/** 아카이브 추천종목 시트가 있던 주차 카드 자리. 주문 화면 X 가 이 자리로 되짚는다. */
type ArchiveSheetOrigin = { sheetIndex: number };

/**
 * 옮겨 온 화면을 그리는 호스트.
 *
 * `PhoneFrame`을 이 호스트가 하나만 소유한다. 화면·챗봇·튜토리얼은 모두 그 프레임의
 * transform 안에 렌더되고, 베젤은 같은 stacking context의 마지막 이미지가 덮는다.
 */
export function ConnectedPrototype({
  route,
  account = "child",
}: { route?: ScreenRoute; account?: WalletAccountId } = {}) {
  const [overlay, setOverlay] = useState<ScreenRoute | null>(route ?? null);
  /** 종목·탐색·주문 화면이 올리는 맥락. 없으면 홈으로 본다. */
  const [overlayContext, setOverlayContext] = useState<ChatContext | null>(null);
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
  /**
   * 홈 배너를 `오늘 그만 보기`로 껐는지. 아카이브 안내·캔들 안내와 같은 이유로 여기서
   * 갖는다 — 홈은 오갈 때마다 다시 마운트돼 자기 상태를 잃는다. 로그아웃(`/`로 나가며
   * 전체 새로고침)과 새 로그인에서 초기화된다.
   */
  const [homeBannerHiddenForSession, setHomeBannerHiddenForSession] = useState(false);
  /**
   * 학교 시간 거래 제한(홈 메뉴의 설정 시트). **화면만 있는 목업이라 아무것도 막지 않는다** —
   * 이 값을 읽어 주문을 거절하는 코드는 어디에도 없다. 홈 배너 상태와 같은 이유로 여기서
   * 갖는다: 홈은 오갈 때마다 다시 마운트돼 자기 상태를 잃으므로, 부모가 정해 둔 값이
   * 다른 탭에 다녀오면 사라진다. 로그아웃·새 로그인에서 초기화된다.
   */
  const [tradeRestriction, setTradeRestriction] = useState<TradeRestriction>(DEFAULT_RESTRICTION);
  /**
   * 캔들 안내를 X 로 닫은 기간들. 아카이브 안내와 같은 이유로 여기 있다 — 상세 화면은
   * 종목을 떠나면 사라지므로 거기에 두면 닫아 놓은 안내가 다시 뜬다. 이 컴포넌트는 앱이
   * 살아 있는 동안 그대로이고 화면 이동은 `replaceState` 라 서버를 다시 타지 않으므로,
   * 닫힘은 **로그인 세션의 수명**을 따른다: 로그아웃(`/` 로 나가며 전체 새로고침)과 새
   * 로그인에서 초기화된다. 브라우저 저장소는 쓰지 않는다.
   */
  const [closedCandleTips, setClosedCandleTips] = useState<CandleTipDismissals>(NO_CANDLE_TIPS_CLOSED);
  const closeTip = (period: PrototypeChartPeriod) =>
    setClosedCandleTips((closed) => closeCandleTip(closed, period));
  const orderRequestId = useRef(0);
  /** 챗봇이 지정한 주문 단계. 주소로 표현할 수 없어 주문 화면에 한 번만 전달한다. */
  const [chatOrderRequest, setChatOrderRequest] = useState<ChatOrderRequest | null>(null);
  const orderPrefillId = useRef(0);
  /**
   * 고치러 가는 예약. 챗봇 단계 지시와 같은 이유로 주소가 아니라 여기서 들고 있다 —
   * 주문 화면은 `key={side-code}` 로만 다시 마운트돼서, 같은 회사의 예약을 고칠 때는
   * 화면이 그대로 남는다. 회차(`id`)가 새 요청임을 알려 준다.
   */
  const [orderPrefill, setOrderPrefill] = useState<OrderPrefill | null>(null);
  /** 추천종목 시트를 누르고 들어온 주문 화면에 물려 준다 — 주소로 표현할 수 없어 여기서 들고 있다. */
  const [archiveSheetOrigin, setArchiveSheetOrigin] = useState<ArchiveSheetOrigin | null>(null);
  /** 주문 화면 X 가 되짚어 달라는 아카이브 시트. `ArchiveScreen` 이 다시 마운트되며 한 번만 연다. */
  const [archiveSheetReopen, setArchiveSheetReopen] = useState<ArchiveSheetOrigin | null>(null);

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

  const openRoute = (
    next: ScreenRoute,
    orderRequest: ChatOrderRequest | null = null,
    prefill: OrderPrefill | null = null,
    sheetOrigin: ArchiveSheetOrigin | null = null,
    sheetReopen: ArchiveSheetOrigin | null = null,
  ) => {
    setOverlay(next);
    setStage(undefined);
    setChatOrderRequest(next.screen === "order" ? orderRequest : null);
    setOrderPrefill(next.screen === "order" ? prefill : null);
    setArchiveSheetOrigin(next.screen === "order" ? sheetOrigin : null);
    setArchiveSheetReopen(next.screen === "archive" ? sheetReopen : null);
    writePath(next);
  };

  /** 화면이 "여기로 가자" 하고 올려 보낸다. 주소 문자열만 안다. */
  const leaveToPath = (path: string) => {
    const next = routeFromPath(path);
    if (next) openRoute(next);
  };

  /** 추천종목 시트에서 종목을 눌러 주문 화면으로 나간다. 그 시트 자리를 함께 물려 준다. */
  const openOrderFromArchivePick = (path: string, sheetIndex: number) => {
    const next = routeFromPath(path);
    if (next) openRoute(next, null, null, { sheetIndex });
  };

  /** 주문 화면 1단계 X — 추천종목 시트를 누르고 들어왔을 때, 그 시트를 다시 열며 아카이브로 돌아간다. */
  const returnToArchivePicks = (sheetIndex: number) => {
    openRoute({ screen: "archive" }, null, null, null, { sheetIndex });
  };

  /**
   * 기다리는 주문을 고치러 간다. 예약을 푸는 것은 주문 화면이 이미 했고, 여기서는 그 값을
   * 들고 알맞은 매수·매도 화면으로 옮기기만 한다 — 다른 회사의 예약일 수 있다.
   */
  const reorderPending = (order: PendingOrder) => {
    const code = order.code;
    if (!code) return;
    const side = order.side === "sell" ? "sell" : "buy";
    openRoute({ screen: "order", code, side }, null, {
      id: ++orderPrefillId.current,
      code,
      side,
      order,
    });
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

  return (
    <div className="h-dvh min-h-[640px] overflow-hidden bg-bg text-ink">
      <PhoneFrame
        overlay={
          <>
            <div
              className="prototype-chat-overlay"
              style={{ clipPath: phoneScreenClipPath(PHONE_SCREEN_RECT) }}
            >
              <F10ChatbotDemo
                context={overlayContext ?? HOME_CONTEXT}
                onUiAction={openChatAction}
                screenRect={PHONE_SCREEN_RECT}
              />
            </div>
            {tutorialOn && overlay && (
              <TutorialOverlay
                onClose={() => setTutorialOn(false)}
                onGo={leaveToPath}
                onStage={setStage}
                screenRect={PHONE_SCREEN_RECT}
                // 매수·매도는 화면도 단계도 같아서 `side` 가 없으면 팔러 간 화면에 사는 설명이
                // 뜬다. 어느 종목인지는 튜토리얼이 지갑을 보고 스스로 정한다.
                place={{
                  screen: overlay.screen,
                  stage,
                  side: overlay.screen === "order" ? overlay.side : undefined,
                }}
              />
            )}
          </>
        }
      >
        {overlay && (
          <>
            {overlay.screen === "home" && (
              <HomeScreen
                bannerHiddenForSession={homeBannerHiddenForSession}
                embedded
                onHideBannerForSession={() => setHomeBannerHiddenForSession(true)}
                onChangeTradeRestriction={setTradeRestriction}
                onLeave={leaveToPath}
                onStartTutorial={() => setTutorialOn(true)}
                tradeRestriction={tradeRestriction}
              />
            )}
            {overlay.screen === "archive" && (
              <ArchiveScreen
                account={account}
                embedded
                infoOpen={archiveInfoOpen}
                onInfoOpenChange={setArchiveInfoOpen}
                onLeave={leaveToPath}
                onPickOrder={openOrderFromArchivePick}
                reopenSheet={archiveSheetReopen}
                view={overlay.view}
              />
            )}
            {overlay.screen === "ranking" && <RankingScreen embedded onLeave={leaveToPath} />}
            {overlay.screen === "stock" && (
              <DetailScreen
                account={account}
                closedCandleTips={closedCandleTips}
                code={overlay.code}
                embedded
                onChatContext={setOverlayContext}
                onCloseCandleTip={closeTip}
                onLeave={leaveToPath}
                onStage={setStage}
              />
            )}
            {overlay.screen === "explore" && (
              <ExploreScreen
                account={account}
                embedded
                onChatContext={setOverlayContext}
                onLeave={leaveToPath}
                sector={overlay.sector}
              />
            )}
            {overlay.screen === "order" && (
              <OrderScreen
                account={account}
                archiveSheetOrigin={archiveSheetOrigin}
                chatOrderRequest={chatOrderRequest}
                code={overlay.code}
                // 종목·방향이 바뀌면 단계·초안을 처음부터 시작한다.
                embedded
                key={`${overlay.side}-${overlay.code}`}
                onChatContext={setOverlayContext}
                onLeave={leaveToPath}
                onReorder={reorderPending}
                onReturnToArchivePicks={returnToArchivePicks}
                onStage={setStage}
                orderPrefill={orderPrefill}
                side={overlay.side}
                tutorialMode={tutorialOn}
                tutorialStage={tutorialOn ? stage : undefined}
              />
            )}
          </>
        )}
      </PhoneFrame>
    </div>
  );
}
