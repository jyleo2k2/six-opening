"use client";

import { useEffect, useRef, useState } from "react";
import { useChatBehaviorStore } from "../../shared/store/chat-behavior-store";
import type { ChatContext, ChatUiAction } from "../../shared/types/chatbot";
import { F10ChatbotDemo } from "../f10-chatbot/F10ChatbotDemo";
import {
  getPrototypeScreenRect,
  type PrototypeScreenRect,
} from "../f10-chatbot/lib/bottom-sheet";
import { phoneFrameRect, phoneScreenClipPath } from "./lib/phone-frame";
import { invalidateAccount } from "./lib/use-account";
import {
  schoolOverride,
  setSchoolOverride,
  type SchoolOverride,
  type WalletAccountId,
} from "./lib/use-wallet";
import { ArchiveScreen } from "./ArchiveScreen";
import { DetailScreen } from "./DetailScreen";
import { ExploreScreen } from "./ExploreScreen";
import { HomeScreen } from "./HomeScreen";
import { OrderScreen } from "./OrderScreen";
import { PortfolioScreen } from "./PortfolioScreen";
import { RankingScreen } from "./RankingScreen";
import {
  isRecord,
  parseBehaviorEvent,
  parseChatContext,
  parseScreenMessage,
  PROTOTYPE_SCREEN_ID,
  readPrototypeScreenRect,
} from "./lib/prototype-bridge";
import {
  actionFromRoute,
  pathFromRoute,
  routeFromAppScreen,
  routeFromChatContext,
  routeFromPath,
  type ScreenRoute,
} from "./screen-route";

const CHAT_CONTEXT_MESSAGE = "kiwoom:chat-context";
const CHAT_BEHAVIOR_MESSAGE = "kiwoom:chat-behavior";
const OPEN_CHAT_ACTION_MESSAGE = "kiwoom:open-chat-action";
const SCREEN_MESSAGE = "kiwoom:screen";
const OPEN_ROUTE_MESSAGE = "kiwoom:open-route";

/**
 * 이미 React 로 옮긴 화면. **iframe 을 살려 둔 채 그 위에 얹는다.**
 *
 * 예전에는 캐치올이 옮긴 화면과 이 컴포넌트 중 하나만 렌더해서, 화면을 오갈 때마다
 * iframe 이 언마운트되고 `app.html` 이 처음부터 다시 떴다. 그러면 `/api/account` 응답이
 * 오기 전까지 `renderVals-compute.js` 가 아이 계정 데모로 폴백해 **남의 계좌가 잠깐 보인다.**
 * 문서를 그대로 두면 그 왕복이 앱을 처음 열 때 한 번뿐이다.
 */
const MIGRATED_SCREENS = new Set<ScreenRoute["screen"]>([
  "archive",
  "home",
  "ranking",
  "portfolio",
  "stock",
  "explore",
  "order",
]);

const isMigrated = (route: ScreenRoute | null) =>
  route !== null && MIGRATED_SCREENS.has(route.screen);

/**
 * 시연용 스쿨락 칩. `app.html` 오른쪽 패널에 있던 세 칩만 가져왔다 — 설명 카드는 옮기지
 * 않는다. 시연에 필요한 것은 잠금 상태를 바꾸는 이 셋뿐이다.
 *
 * **화면 오버레이(z-5)와 폰 프레임(z-20)보다 위에 둔다.** 그 아래에 두면 `inset:0` 오버레이가
 * 클릭을 먼저 먹는다 — `app.html` 쪽 칩이 눌리지 않게 된 것이 정확히 그 이유였다.
 *
 * 색은 `ui-src` 의 `devChip` 과 같은 값을 쓴다. 폰 밖 시연용 크롬이라 디자인 시스템 토큰
 * 대상이 아니고, 원래 패널과 달라 보일 이유도 없다.
 */
function SchoolLockChips({
  value,
  onPick,
}: {
  value: SchoolOverride;
  onPick: (next: SchoolOverride) => void;
}) {
  const chip = (next: SchoolOverride, label: string) => {
    const on = value === next;
    return (
      <button
        key={next}
        onClick={() => onPick(next)}
        style={{
          padding: "7px 13px",
          borderRadius: 10,
          border: "none",
          fontSize: 12.5,
          fontWeight: on ? 800 : 600,
          cursor: "pointer",
          color: on ? "#fff" : "#6E7488",
          background: on ? "#01185A" : "#F1F2F8",
        }}
        type="button"
      >
        {label}
      </button>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        zIndex: 30,
        display: "flex",
        gap: 6,
        alignItems: "center",
        background: "#fff",
        borderRadius: 16,
        padding: "9px 12px",
        boxShadow: "0 4px 18px rgba(35,25,80,0.12)",
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#01185A", marginRight: 2 }}>
        시연 · 학교 시간
      </span>
      {chip("auto", "자동")}
      {chip("on", "학교 시간")}
      {chip("off", "하교 후")}
    </div>
  );
}

// 가족 피드는 app.html 아카이브 수익률 탭이 소유한다. 여기 오버레이로 겹쳐 두지 않는다.
export function ConnectedPrototype({
  route,
  account = "child",
}: { route?: ScreenRoute; account?: WalletAccountId } = {}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // 옮긴 화면은 첫 렌더부터 보여 준다 — iframe 로드를 기다리면 그동안 app.html 이 비친다.
  const [overlay, setOverlay] = useState<ScreenRoute | null>(
    isMigrated(route ?? null) ? (route ?? null) : null,
  );
  const overlayRef = useRef<ScreenRoute | null>(overlay);
  overlayRef.current = overlay;
  const chatContextRef = useRef<ChatContext>({ screen: "home" });
  const [chatContext, setChatContext] = useState<ChatContext>({ screen: "home" });
  // 옮긴 종목 화면이 올리는 맥락. 있으면 iframe 맥락보다 우선한다 — iframe 은 뒤에서
  // 자기 화면 맥락을 그대로 들고 있을 뿐이다.
  const [overlayContext, setOverlayContext] = useState<ChatContext | null>(null);
  const [screenRect, setScreenRect] = useState<PrototypeScreenRect | null>(null);
  /**
   * 스쿨락 강제 설정. **마운트 뒤에 읽는다** — 저장소는 서버에 없으므로 첫 렌더에서 읽으면
   * 서버와 클라이언트의 칩 상태가 갈린다. `null` 인 동안은 칩을 그리지 않는다.
   *
   * 이 상태가 바뀌면 옮겨 온 화면이 함께 다시 그려지고, 그때 `canTrade` 가 새 값을 읽는다.
   */
  const [school, setSchool] = useState<SchoolOverride | null>(null);
  useEffect(() => setSchool(schoolOverride()), []);

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

  // `app.html` 이 자기 배율을 다시 정하는 순간은 부모에 전해지지 않는다. 창 크기 변경만 듣고
  // 있으면 첫 측정이 빗나갔을 때 그 값이 다음 창 크기 변경까지 남아, 시트와 플로팅 버튼이
  // 폰 프레임에서 벗어난 자리에 그려진다. 화면 요소를 직접 지켜보는 것이 유일한 해결이다.
  const screenObserver = useRef<ResizeObserver | null>(null);
  const watchPrototypeScreen = () => {
    const screen = iframeRef.current?.contentDocument?.getElementById(
      PROTOTYPE_SCREEN_ID,
    );
    if (!screen) return;
    screenObserver.current?.disconnect();
    screenObserver.current = new ResizeObserver(measureScreen);
    screenObserver.current.observe(screen);
  };
  useEffect(() => () => screenObserver.current?.disconnect(), []);

  const postToPrototype = (message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, window.location.origin);
  };

  const openChatAction = (action: ChatUiAction) => {
    postToPrototype({ type: OPEN_CHAT_ACTION_MESSAGE, action });
  };

  // 주소 → 화면. 서버가 넘긴 첫 주소, 뒤로가기, 화면끼리의 이동이 모두 이 길을 쓴다.
  //
  // 옮긴 화면이면 iframe 위에 얹기만 한다. 아직 안 옮긴 화면이면 오버레이를 걷고 iframe 에
  // 지시를 보낸다 — 문서는 어느 쪽이든 그대로다.
  const openRoute = (next: ScreenRoute) => {
    if (isMigrated(next)) {
      setOverlay(next);
      writePath(next);
      return;
    }
    setOverlay(null);
    const action = actionFromRoute(next);
    if (action) openChatAction(action);
  };

  /** 옮긴 화면이 "여기로 가자" 하고 올려 보낸다. 주소 문자열만 안다. */
  const leaveToPath = (path: string) => {
    const next = routeFromPath(path);
    if (next) openRoute(next);
  };

  // iframe 이 뜬 뒤에야 지시를 받을 수 있다. 첫 주소는 onLoad 에서 한 번 적용한다.
  const appliedFirstRoute = useRef(false);
  const applyFirstRoute = () => {
    if (appliedFirstRoute.current) return;
    appliedFirstRoute.current = true;
    // 옮긴 화면은 이미 얹혀 있다. iframe 에는 아무 지시도 보내지 않는다.
    if (route && !isMigrated(route)) openRoute(route);
  };

  // 화면 → 주소. app.html 이 화면 전환마다 보내는 맥락으로 주소만 갈아끼운다.
  // 히스토리를 쌓지 않는다(replaceState) — 앱 안에 자체 뒤로가기 버튼이 있어서
  // pushState 로 쌓으면 두 개의 뒤로가기가 서로 어긋난다.
  const pushedPath = useRef<string | null>(null);
  const writePath = (next: ScreenRoute | null) => {
    if (!next) return;
    const path = pathFromRoute(next);
    if (path === window.location.pathname || path === pushedPath.current) return;
    pushedPath.current = path;
    window.history.replaceState(null, "", path);
  };
  // 원래 화면 이름(`kiwoom:screen`)이 정확하다. 챗봇 맥락은 그 메시지를 못 받았을 때의 폴백이다.
  const syncPathFromContext = (context: ChatContext) => {
    if (sawScreenMessage.current || overlayRef.current) return;
    writePath(routeFromChatContext(context));
  };
  const sawScreenMessage = useRef(false);

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

      // app.html 안의 링크가 옮긴 화면으로 보낸다 (`leaveToRoute`).
      if (event.data.type === OPEN_ROUTE_MESSAGE) {
        const path = event.data.path;
        // iframe 화면에서 넘어오는 길이다. 그 사이 매매나 주문 접수로 잔액이 바뀌었을 수
        // 있으니 세션 캐시를 비운다 — 안 비우면 이미 쓴 돈이 아직 남아 보인다.
        invalidateAccount();
        if (typeof path === "string") leaveToPath(path);
        return;
      }

      if (event.data.type === SCREEN_MESSAGE) {
        const message = parseScreenMessage(event.data);
        if (message) {
          sawScreenMessage.current = true;
          // 옮긴 화면을 보고 있으면 주소는 그 화면 것이다. iframe 은 뒤에서 자기 화면을
          // 그대로 들고 있을 뿐이라, 그 이름으로 주소를 덮으면 주소와 화면이 어긋난다.
          if (!overlayRef.current) writePath(routeFromAppScreen(message.screen, message.code));
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

  const frame = phoneFrameRect(screenRect);

  return (
    <div className="h-dvh min-h-[640px] overflow-hidden bg-bg text-ink">
      <iframe
        className="block h-full w-full border-0"
        onLoad={() => {
          measureScreen();
          watchPrototypeScreen();
          applyFirstRoute();
        }}
        ref={iframeRef}
        src="/ui/app.html?runtime=1"
        title="키움 가족 모의투자 리그"
      />
      {/*
        옮긴 화면은 iframe 을 **덮기만** 한다. 감추거나 떼지 않는다 — 떼면 app.html 이
        처음부터 다시 뜨고, `display:none` 으로 감추면 챗봇이 맞출 화면 사각형을 못 잰다.
        챗봇 오버레이(z-index 10)보다는 아래에 둔다.
      */}
      {overlay && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5 }}>
          {overlay.screen === "home" && <HomeScreen onLeave={leaveToPath} />}
          {overlay.screen === "archive" && (
            <ArchiveScreen account={account} onLeave={leaveToPath} view={overlay.view} />
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
              postToPrototype={postToPrototype}
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
              code={overlay.code}
              // 종목·방향이 바뀌면 단계·초안을 처음부터 시작한다 — app.html 이 진입 때
              // 초안을 새로 만들던 것과 같다.
              key={`${overlay.side}-${overlay.code}`}
              onChatContext={setOverlayContext}
              onLeave={leaveToPath}
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
          context={overlayContext ?? chatContext}
          onUiAction={openChatAction}
          screenRect={screenRect}
        />
      </div>
      {/*
        폰 프레임을 맨 위에 한 겹 더 깐다. 챗봇 시트처럼 화면 위로 올라오는 것들은 iframe
        **밖**에 있어서 프레임 이미지보다 위에 그려진다. 화면 사각형으로 자르고 있지만
        화면 라운드(40px)보다 프레임 개구부가 깊게 파여 있어 그 틈으로 베젤 위에 비친다.
        여기 한 겹이 있으면 무엇이 올라오든 베젤이 이긴다.
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
      {school !== null && (
        <SchoolLockChips
          onPick={(next) => {
            setSchoolOverride(next);
            setSchool(next);
          }}
          value={school}
        />
      )}
    </div>
  );
}
