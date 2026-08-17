"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChatContext } from "../../shared/types/chatbot";
import { accountTotalAsset, SEED } from "../../shared/store/prototype-account.js";
import { BottomNav } from "./BottomNav";
import { PhoneFrame } from "./PhoneFrame";
import { styleFromCss } from "./lib/css-style";
import {
  buildExploreCard,
  cardDots,
  emptyState,
  exploreList,
  RANK_CHIP,
  sectorChips,
  showSectorGroups,
  type ExploreStockRow,
} from "./lib/explore-cards";
import { exploreSpotFor, rememberExploreSpot } from "./lib/explore-memo";
import { PROTOTYPE_PHONE } from "./lib/phone-frame";
import {
  isHorizontalWheel,
  nextSectorFilter,
  SECTOR_SLIDE_MS,
  sectorDragOffset,
  sectorNeighbors,
  sectorPreviewList,
  sectorStepBetween,
  sectorSwipeOrder,
  sectorSwipeStep,
  sectorTrackStyle,
  shouldCommitSectorSwipe,
  wheelDragDelta,
  WHEEL_IDLE_MS,
  type SectorStep,
} from "./lib/sector-swipe";
import { useRailDrag } from "./lib/use-rail-drag";
import { useUniverseLive, type Universe } from "./lib/use-universe";
import { useWallet, type WalletAccountId } from "./lib/use-wallet";
import { useWatchlist } from "./lib/use-watchlist";

const PAGE = styleFromCss(
  // 배경은 두지 않는다 — 원본과 같이 `PhoneFrame` 의 화면 컨테이너 색(`SCREEN_BG`)을 그대로
  // 비쳐 보인다. 여기 색을 다시 박아 두던 시절에는 이 화면만 맞고 상세·주문은 딴 색이었다.
  "position:absolute;left:0;top:0;right:0;bottom:0;padding-top:59px;display:flex;flex-direction:column;overflow:hidden",
);
const HEADER = styleFromCss("flex:none;display:flex;align-items:center;gap:12px;padding:6px 18px 10px");
const TITLE = styleFromCss(
  "flex:1;text-align:center;font-size:19px;font-weight:800;color:#01185A;letter-spacing:-0.01em",
);
const SEARCH_BTN = styleFromCss(
  "flex:none;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;background:transparent",
);
const SEARCH_ROW = styleFromCss("flex:none;padding:0 16px 12px");
const SEARCH_INPUT_WRAP = styleFromCss(
  "display:flex;align-items:center;gap:9px;background:#EDECF3;border-radius:999px;padding:13px 18px",
);
const SEARCH_INPUT = styleFromCss(
  "flex:1;min-width:0;box-sizing:border-box;border:0;outline:none;background:transparent;" +
    "font-family:'Pretendard',sans-serif;font-size:14.5px;font-weight:600;color:#01185A",
);
const CHIPS_ROW = styleFromCss("flex:none;display:flex;align-items:flex-start;gap:4px;padding:2px 0 12px");
const CHIPS_TOGGLE = (open: boolean) =>
  styleFromCss(
    "flex:none;width:36px;height:40px;margin-right:8px;display:flex;align-items:center;justify-content:center;" +
      `cursor:pointer;transition:transform 0.2s ease;transform:rotate(${open ? "180deg" : "0deg"})`,
  );
// 헤더 오른쪽에 남은 버튼은 돋보기 하나라, 왼쪽도 같은 폭을 비워야 제목이 가운데에 선다.
// 왼쪽 38+12 = 오른쪽 12+38. 정렬 버튼이 있던 시절의 88 을 그대로 두면 제목이 왼쪽으로 밀린다.
const HEADER_SPACER = styleFromCss("flex:none;width:38px");
// 옆 섹터 칸이 무대 밖으로 나가는 것은 폰 화면(`PAGE`)이 이미 자르지만, 무대 안에서 한 번
// 더 자른다 — 트랙이 도트 열 밑을 지나간다.
const STAGE = styleFromCss(
  "position:relative;flex:1;min-height:0;overflow:hidden;background:transparent",
);
/**
 * 이전·현재·다음 섹터 칸을 담는 트랙. **가로 이동의 주인은 이 노드의 인라인 스타일**이고
 * React 는 손대지 않는다(`trackRef`) — 끄는 동안 상태를 바꾸면 카드 51장이 매 프레임 다시
 * 그려진다. 자리 되돌리기는 `filter` 가 바뀔 때 layout effect 가 한다.
 */
const TRACK = styleFromCss("position:absolute;left:0;top:0;right:0;bottom:0");
// 카드가 위아래로 넘어가는 세로 레일 한 칸. `scroll-snap-stop:always` 를 카드 쪽에서 이미 준다.
// `touch-action:pan-y` — 손가락 세로는 브라우저 기본 스크롤에 맡기고 **가로만** 우리가 받는다.
// `none` 이던 시절에는 브라우저가 세로도 넘겨주지 않아 손가락으로는 카드가 아예 안 넘어갔다.
const PANE_BOX =
  "position:absolute;left:0;top:0;right:0;bottom:0;overflow-x:hidden;overflow-anchor:none;" +
  "display:flex;flex-direction:column;align-items:center;touch-action:pan-y;" +
  "user-select:none;-webkit-user-select:none;";
/**
 * 섹터 한 칸의 스타일. `step` 이 0 이면 가운데 칸(손짓을 받고 스크롤한다)이고, `±1` 이면
 * 손가락을 따라 들어오는 옆 칸이다 — 옆 칸은 **실제 목록**이지만 넘어가 가운데가 되기
 * 전에는 스크롤하거나 카드를 열 수 없다.
 */
const paneStyle = (step: SectorStep | 0, empty: boolean) =>
  styleFromCss(
    PANE_BOX +
      (empty
        ? "justify-content:center;padding:0 32px;gap:9px;overflow-y:hidden"
        : "gap:26px;padding:16px 0 20px;scroll-snap-type:y mandatory;" +
          (step === 0 ? "overflow-y:auto;cursor:grab" : "overflow-y:hidden")) +
      (step === 0 ? "" : `;pointer-events:none;transform:translateX(${step * 100}%)`),
  );
const EMPTY_TITLE = styleFromCss("font-size:16px;font-weight:800;color:#01185A;text-align:center");
const EMPTY_HINT = styleFromCss(
  "font-size:13.5px;font-weight:500;color:#8E93A8;line-height:1.6;text-align:center;text-wrap:pretty",
);
const DOTS_COL = styleFromCss(
  "position:absolute;right:12px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;" +
    "align-items:center;gap:5px;pointer-events:none",
);
// "전체" 보기에서 업종이 바뀌는 첫 카드 위에 얹는 구분 헤더.
const GROUP_WRAP = styleFromCss(
  "position:absolute;left:0;right:0;top:0;height:60px;display:flex;flex-direction:column;justify-content:flex-end;pointer-events:none",
);
const GROUP_LINE = styleFromCss("position:absolute;left:0;right:0;top:0;height:1px;background:#E5E2EE");
const GROUP_NAME = styleFromCss("font-size:22px;font-weight:800;color:#141B22;letter-spacing:-0.03em;padding-bottom:14px");

/**
 * 섹터 한 칸의 카드 목록. **가운데 칸과 옆 칸이 같은 컴포넌트여야** 넘어간 뒤 화면이 그대로
 * 이어진다 — 옆 칸을 따로 그리면 안착하는 순간 카드가 미묘하게 튀고, 그것이 곧 "빈 화면이
 * 보였다 바뀐다"는 말이 된다.
 *
 * `rail`·`onOpen` 이 없으면 옆 칸이다: 스크롤하지 않고 카드를 열 수도 없다.
 */
function SectorPane({
  universe,
  list,
  empty,
  activeIndex,
  showGroups,
  step,
  paneKey,
  rail,
  onOpen,
}: {
  universe: Universe;
  list: ExploreStockRow[];
  empty: { title: string; hint: string };
  activeIndex: number;
  showGroups: boolean;
  /** 0 이면 가운데 칸, `±1` 이면 그만큼 옆 칸이다. */
  step: SectorStep | 0;
  /**
   * SVG 그러데이션 id 는 문서에서 유일해야 한다. 같은 종목이 두 칸에 함께 놓일 수 있어
   * (`전체` 와 `반도체` 는 삼성전자를 같이 갖는다) 칸 이름을 뒤에 붙인다.
   */
  paneKey: string;
  rail?: ReturnType<typeof useRailDrag>;
  onOpen?: (code: string) => void;
}) {
  if (list.length === 0) {
    // 빈 목록에도 같은 손짓을 붙인다 — 관심 기업이 0개인 자리에서 쓸어 나갈 수 없으면
    // 손가락만으로는 갇힌다.
    return (
      <div onPointerDown={rail?.onPointerDown} ref={rail?.ref} style={paneStyle(step, true)}>
        <div style={EMPTY_TITLE}>{empty.title}</div>
        <div style={EMPTY_HINT}>{empty.hint}</div>
      </div>
    );
  }
  return (
    <div
      onPointerDown={rail?.onPointerDown}
      onScroll={rail?.onScroll}
      ref={rail?.ref}
      style={paneStyle(step, false)}
    >
      {list.map((stock, index) => {
        const card = buildExploreCard(list, index, universe, activeIndex, showGroups);
        const gradId = card.gradId + paneKey;
        return (
          <div
            // 튜토리얼은 레일 전체가 아니라 **지금 보고 있는 카드**만 짚는다. 레일을 통째로
            // 뚫으면 카드가 놓인 배경까지 밝아져 카드가 묻힌다. 옆 칸은 짚지 않는다.
            id={onOpen && index === activeIndex ? "tut-explore-cards" : undefined}
            key={card.code}
            style={styleFromCss(card.slideStyle)}
          >
            {card.groupShow && (
              <div style={GROUP_WRAP}>
                {card.groupShowLine && <div style={GROUP_LINE} />}
                <div style={GROUP_NAME}>{card.groupName}</div>
              </div>
            )}
            <div onClick={() => onOpen?.(card.code)} style={styleFromCss(card.cardStyle)}>
              <div style={styleFromCss(card.artStyle)}>
                {!card.hasLogo && <span style={{ fontSize: 40 }}>{card.emoji}</span>}
              </div>
              <div style={styleFromCss(card.catStyle)}>{card.category}</div>
              <div style={styleFromCss(card.nameStyle)}>
                <div style={styleFromCss(card.nameTextStyle)}>{card.name}</div>
                <div style={styleFromCss(card.codeStyle)}>{card.codeText}</div>
              </div>
              <div style={styleFromCss(card.priceStyle)}>
                <span>{card.priceText}</span>
                <span style={styleFromCss(card.wonStyle)}>원</span>
              </div>
              <div style={styleFromCss(card.changeStyle)}>
                {card.changeText}
                <span style={styleFromCss(card.changePctStyle)}>{card.changePctText}</span>
              </div>
              <svg height={104} style={styleFromCss(card.chartStyle)} viewBox="0 0 310 104" width={310}>
                <defs>
                  <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor={card.lineColor} stopOpacity="0.16" />
                    <stop offset="1" stopColor={card.lineColor} stopOpacity="0.16" />
                  </linearGradient>
                </defs>
                <path d={card.sparkArea} fill={`url(#${gradId})`} />
                <polyline fill="none" points={card.sparkLine} stroke="#FFFFFF" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" strokeWidth="6" />
                <polyline fill="none" points={card.sparkLine} stroke={card.lineColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6" />
                <circle cx={card.endX} cy={card.endY} fill="#FFFFFF" fillOpacity="0.9" r="6.5" />
                <circle cx={card.endX} cy={card.endY} fill={card.lineColor} r="3.6" />
              </svg>
              <div style={styleFromCss(card.glintStyle)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 라우트의 섹터 구간이 아는 값이 아니면 전체로 되돌린다.
 *
 * `rank` 도 아는 값이다 — 칩 줄의 `오늘 많이 오른 순` 이 쓰는 카테고리이자, 챗봇의
 * "오늘 뭐가 많이 올랐어" 점프가 보내는 값이다(`f10-chatbot/lib/routing.ts`).
 */
const knownFilter = (sector: string | undefined, sectorIds: string[]) =>
  sector &&
  (sector === "all" || sector === RANK_CHIP || sector === "watch" || sectorIds.includes(sector))
    ? sector
    : "all";

/** 필터 → 주소. 칩과 자리 기억이 같은 문자열을 써야 돌아왔을 때 같은 목록으로 친다. */
const explorePath = (filter: string) => (filter === "all" ? "/explore" : `/explore/${filter}`);

/**
 * 종목 탐색 화면. `ui-src/screens/explore.html` 에서 옮겨 왔고 그 파일은 옮기면서 지웠다 —
 * 이제 이 화면의 디자인 원본은 `web/design-system/prototype/모의투자-화면-프로토타입.html`
 * 이고, 카드 연출이 그 원본과 같은 값인지는 `lib/explore-cards.test.ts` 가 대조한다.
 *
 * 섹터 선택은 주소(`/explore/{섹터}`)가 소유한다 — 칩을 누르면 주소를 바꾸고, 챗봇의
 * "게임 회사 보여줘" 같은 점프도 같은 주소로 들어온다. 검색어·카드 위치는 화면 임시값이다.
 */
export function ExploreScreen({
  sector,
  account,
  onLeave,
  onChatContext,
}: {
  sector?: string;
  account: WalletAccountId;
  onLeave: (path: string) => void;
  onChatContext: (context: ChatContext | null) => void;
}) {
  const { wallet } = useWallet();
  const { codes: watchCodes } = useWatchlist();
  const { universe, quotes, sparks } = useUniverseLive();
  const [query, setQuery] = useState("");
  const [cardIndex, setCardIndex] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chipsOpen, setChipsOpen] = useState(false);
  /**
   * 옆 칸이 아닌 섹터로 갈 때(칩 탭·챗봇 점프) 그쪽에 임시로 끼워 넣는 칸.
   *
   * 쓸어서 넘어갈 때는 그 칸이 이미 옆에 그려져 있으므로 값이 같고, 그림도 바뀌지 않는다 —
   * 그래서 두 길이 **같은 연출 하나**를 쓴다.
   */
  const [pending, setPending] = useState<{ filter: string; step: SectorStep } | null>(null);
  // 끄는 손과 **켜진 카드 판정**을 함께 이 훅에 맡긴다. 카드가 위아래로 넘어가는 세로
  // 레일이라 축은 'y'. 견주는 값은 `activeIndex` 가 아니라 `cardIndex` 다 — 목록이 줄어
  // 범위를 벗어난 `cardIndex` 가 남았을 때, 잰 값과 달라야 다음 스크롤에서 제자리를 찾는다.
  //
  // 가로로 쓸면 섹터를 넘긴다. 레일과 **같은 손짓**으로 받는 이유는 축을 한 번만 잠그기
  // 위해서다 — 포인터를 따로 받으면 카드가 넘어가면서 섹터까지 바뀐다.
  const rail = useRailDrag(setCardIndex, cardIndex, "y", {
    onMove: (dx) => dragTrack(dx),
    onEnd: (dx, velocity) => releaseTrack(dx, velocity),
    onCancel: () => applyTrack(0, true),
  });
  /** 세 칸 트랙. 가로 이동은 이 노드의 인라인 스타일이 소유한다(위 `TRACK` 주석). */
  const trackRef = useRef<HTMLDivElement>(null);
  /** 트랙을 담은 무대. 트랙패드 휠을 여기서 받는다(아래 effect). */
  const stageRef = useRef<HTMLDivElement>(null);

  // 유니버스가 오기 전에는 섹터 id 목록이 비어 있어 무엇이든 전체로 떨어진다. 도착하면
  // 같은 렌더에서 제 필터가 잡히고, 아래 effect 들이 그 값으로 한 번 더 돈다.
  const filter = knownFilter(sector, universe?.sectors.map((entry) => entry.id) ?? []);
  const path = explorePath(filter);
  // 쓸어 가는 차례와 지금 섹터의 양옆. 차례는 칩 줄과 같다(`sectorSwipeOrder`).
  const swipeOrder = universe ? sectorSwipeOrder(universe) : [];
  const neighbors = sectorNeighbors(swipeOrder, filter);

  /** 트랙이 미끄러지는 중인가. 그 사이에 들어온 손짓은 무시한다. */
  const sliding = useRef(false);

  /**
   * 트랙 자리를 쓴다. **React 를 거치지 않는다** — 끄는 동안 상태를 바꾸면 카드 51장이 매
   * 프레임 다시 그려진다. 세로 레일이 네이티브 스크롤이라 렌더 없이 부드러운 것과 같다.
   */
  const applyTrack = (offsetPx: number, animated: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    const style = sectorTrackStyle({ offsetPx, animated });
    el.style.transition = style.transition;
    el.style.transform = style.transform;
  };

  /**
   * 트랙이 실제로 그려진 폭과 배율. 폭은 한 칸을 넘기는 거리이자 문턱의 기준이고, 배율은
   * 창 좌표를 화면 안쪽 좌표로 고치는 데 쓴다 — `PhoneFrame` 이 화면 전체를 `scale()` 로
   * 줄여 놓았으므로 그대로 쓰면 손가락보다 트랙이 더 많이 움직인다(`lib/sheet-drag.ts`).
   */
  const trackBox = () => {
    const el = trackRef.current;
    if (!el || el.offsetWidth === 0) return { width: PROTOTYPE_PHONE.screenWidth, scale: 1 };
    return { width: el.offsetWidth, scale: el.getBoundingClientRect().width / el.offsetWidth };
  };

  /** 끄는 동안 트랙을 손가락만큼 옮긴다. 넘어갈 섹터가 없으면 눌러서 벽이 있다고 알린다. */
  function dragTrack(dx: number) {
    if (sliding.current) return;
    const box = trackBox();
    const atEdge = nextSectorFilter(swipeOrder, filter, sectorSwipeStep(dx)) === null;
    applyTrack(sectorDragOffset({ dx, ...box }, atEdge), false);
  }

  /** 손을 뗀 자리에서 옆 칸으로 넘기거나 제자리로 되돌린다. */
  function releaseTrack(dx: number, velocity: number) {
    if (sliding.current) return;
    const step = sectorSwipeStep(dx);
    const next = nextSectorFilter(swipeOrder, filter, step);
    if (next && shouldCommitSectorSwipe({ dx, velocity, ...trackBox() })) {
      sliding.current = true;
      setPending({ filter: next, step });
      return;
    }
    applyTrack(0, true);
  }

  /**
   * 트랙패드로 두 손가락을 가로로 미는 손짓. **포인터가 아니라 휠로 온다** — 마우스로는
   * 넘어가는데 트랙패드로는 안 넘어가던 이유가 이것이다. 포인터를 아무리 기다려도 오지 않는다.
   *
   * 손을 뗀 순간이 없으므로 가로 델타를 모으고, 잠시 멎으면(`WHEEL_IDLE_MS`) 그때를 손 뗀
   * 자리로 본다. 매 렌더 다시 붙이는 이유는 아래 두 함수가 **지금** 섹터·목록을 보고
   * 판단하기 때문이다 — 처음 붙인 것을 붙들고 있으면 첫 섹터에서 굳는다.
   */
  const wheel = useRef({ dx: 0, timer: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!isHorizontalWheel(event.deltaX, event.deltaY)) return;
      // 가로로 남는 스크롤은 브라우저의 뒤로 가기 손짓이 가져간다. 막지 않으면 섹터를
      // 넘기려다 앱에서 나가 버린다. 그래서 `passive:false` 로 붙인다.
      event.preventDefault();
      if (sliding.current) return;
      const state = wheel.current;
      state.dx += wheelDragDelta(event.deltaX, event.deltaMode);
      dragTrack(state.dx);
      window.clearTimeout(state.timer);
      state.timer = window.setTimeout(() => {
        const { dx } = state;
        state.dx = 0;
        // 넘길지는 **쓴 거리로만** 정한다(속도 0). 휠 한 번의 델타는 손가락 한 프레임보다
        // 훨씬 커서 속도로 재면 살짝 튕긴 것도 문턱을 넘는다.
        releaseTrack(dx, 0);
      }, WHEEL_IDLE_MS);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  });
  /**
   * 멎기를 기다리는 타이머는 **화면을 떠날 때만** 끊는다. 위 effect 의 뒷정리에서 끊으면,
   * 쓸고 있는 중에 시세 폴링(5초)이 한 번 그리기만 해도 기다리던 손짓이 사라져 트랙이
   * 밀린 채로 선다.
   */
  useEffect(() => () => window.clearTimeout(wheel.current.timer), []);

  /**
   * 옆 칸으로 미끄러뜨리고, 미끄러짐이 끝나는 자리에서 주소를 바꾼다.
   *
   * **`useLayoutEffect` 여야 한다** — 칩으로 멀리 뛸 때 그 칸은 이 커밋에서 처음 그려지므로,
   * 그려지기 전에 밀기 시작하면 빈 자리로 미끄러진다.
   */
  useLayoutEffect(() => {
    if (!pending) return;
    sliding.current = true;
    const el = trackRef.current;
    applyTrack(-pending.step * trackBox().width, true);

    /**
     * 주소를 바꾸는 시점은 **미끄러짐이 실제로 끝나는 순간**이다. 타이머만 믿으면 화면이
     * 바쁠 때(개발 서버 재컴파일·로고 로딩) 늦게 와서, 도착한 목록이 한 칸 옆으로 밀린 채
     * 잠깐 서 있는다. 전환 이벤트가 오지 않는 경우(탭이 가려졌거나 전환이 끊겼다)를 위해
     * 넉넉한 타이머를 함께 둔다.
     */
    let timer = 0;
    const arrive = () => {
      window.clearTimeout(timer);
      el?.removeEventListener("transitionend", onEnd);
      onLeave(explorePath(pending.filter));
    };
    // 카드가 눕는 전환(460ms)도 이 노드까지 올라온다 — 트랙 자신의 `transform` 만 본다.
    const onEnd = (event: TransitionEvent) => {
      if (event.target === el && event.propertyName === "transform") arrive();
    };
    timer = window.setTimeout(arrive, SECTOR_SLIDE_MS + 120);
    el?.addEventListener("transitionend", onEnd);
    return () => {
      window.clearTimeout(timer);
      el?.removeEventListener("transitionend", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  /**
   * 주소가 바뀌어 **옆 칸이 가운데 칸이 된** 순간. 트랙을 전환 없이 원점으로 돌린다 —
   * 화면에서 바뀌는 것이 없으므로(같은 목록이 같은 자리에 있다) 미끄러짐이 끝나자마자
   * 다음 손짓을 받을 수 있다. 기다리는 구간도, 비는 구간도 없다.
   *
   * layout effect 인 이유는 그리기 전에 돌려놓아야 하기 때문이다. 그리고 나서 돌리면 새
   * 목록이 한 프레임 옆으로 밀린 채 보인다.
   */
  const shownFilter = useRef(filter);
  useLayoutEffect(() => {
    if (shownFilter.current === filter) return;
    shownFilter.current = filter;
    sliding.current = false;
    applyTrack(0, false);
    setPending(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);
  /**
   * 카드 자리를 되살리고 적어 둘 준비. **유니버스만 있으면 된다.**
   *
   * 예전에는 지갑까지 기다렸는데, 지갑은 `/api/account` 와 `GET /api/orders` 를 둘 다
   * 받아야 서고 그 조회는 만기 예약 정산까지 겸한다 — 카드 목록과 아무 상관이 없는
   * 왕복을 기다린 셈이다.
   */
  const ready = universe !== null;

  /**
   * 필터·검색이 바뀌면 처음 카드부터 다시 본다 — `componentDidUpdate` 의 scrollLeft 리셋과 같다.
   *
   * **layout effect 여야 한다.** 섹터가 넘어간 뒤 가운데 칸은 같은 DOM 노드를 물려받으므로,
   * 그리기 전에 되돌리지 않으면 새 목록이 이전 섹터의 스크롤 자리에서 한 프레임 그려진다 —
   * 옆 칸은 늘 맨 위를 보여 주고 있었으니 그 순간 목록이 껑충 뛴다.
   */
  useLayoutEffect(() => {
    setCardIndex(0);
    if (rail.ref.current) rail.ref.current.scrollTop = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query]);

  // 종목을 보고 돌아온 길이면 떠날 때 자리로 되돌린다. **딱 한 번만** 한다 — 그 뒤의 필터
  // 변경은 새 목록이라 위 리셋이 맞다. 위 effect 보다 뒤에 있어야 같은 커밋에서 리셋을 이긴다.
  const restored = useRef(false);
  useEffect(() => {
    if (!ready || restored.current) return;
    restored.current = true;
    const spot = exploreSpotFor(path);
    if (!spot) return;
    setCardIndex(spot.cardIndex);
    if (rail.ref.current) rail.ref.current.scrollTop = spot.scrollTop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, path]);

  // 보고 있는 자리를 계속 적어 둔다 — 카드·탭바·챗봇 어느 길로 나가도 최신값이 남는다.
  // 카드가 스냅으로 한 장씩 서므로 `cardIndex` 가 바뀌는 순간이 곧 자리가 바뀌는 순간이다.
  useEffect(() => {
    if (!ready) return;
    rememberExploreSpot({ path, scrollTop: rail.ref.current?.scrollTop ?? 0, cardIndex });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, path, cardIndex]);

  // 챗봇 맥락. `app.html` 의 notifyChatContext 는 탐색을 'home' 으로 묶어 지갑 값만 실었다.
  const walletLoaded = wallet !== null;
  useEffect(() => {
    if (!walletLoaded || !wallet) return;
    const me = wallet.acc[account];
    if (!me) return;
    const context: ChatContext = { screen: "home" };
    const priceOf = (code: string) =>
      quotes[code]?.price ?? universe?.stocks.find((stock) => stock.code === code)?.price ?? 0;
    const total = accountTotalAsset(me, priceOf);
    if (Number.isFinite(total)) {
      context.pnlPercent = Math.round(((total - SEED) / SEED) * 10000) / 100;
    }
    if (Number.isFinite(me.cash) && me.cash >= 0) context.cash = Math.round(me.cash);
    context.holdingCount = me.holdings.filter((holding) => Number(holding.qty) > 0).length;
    onChatContext(context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletLoaded, account, universe, onChatContext]);
  useEffect(() => () => onChatContext(null), [onChatContext]);

  /**
   * **지갑을 기다리지 않는다.** 이 화면에서 지갑을 쓰는 곳은 위의 챗봇 맥락 하나뿐이고,
   * 카드 목록·칩·검색은 전부 유니버스와 시세로 그려진다. 지갑을 첫 페인트에 묶어 두면
   * `/api/account` + `GET /api/orders`(만기 예약 정산 포함)가 끝날 때까지 빈 폰이 보인다 —
   * 탐색으로 돌아올 때마다 그랬다. 맥락은 늦게 도착해도 그 effect 가 알아서 올린다.
   */
  if (!universe) return <PhoneFrame />;

  const list = exploreList(universe, { quotes, sparks }, filter, query, watchCodes);
  const chips = sectorChips(universe, filter);
  // 업종 구분 헤더는 업종끼리 묶인 줄에서만 뜻이 있다 — `오늘 많이 오른 순` 은 등락률로
  // 섞이므로 세우지 않는다. 그 판정은 `showSectorGroups` 가 소유한다.
  const showGroups = showSectorGroups(filter, list);
  const empty = emptyState(query);
  const activeIndex = Math.min(cardIndex, Math.max(0, list.length - 1));

  /**
   * 옆 칸 하나. 목록은 앞쪽 몇 장만 그리지만 **업종 헤더 판정은 자르기 전 목록으로 한다** —
   * 자른 목록으로 판정하면 앞 네 장이 한 업종일 때 헤더가 없다가, 넘어가 가운데 칸이 되는
   * 순간 헤더가 새로 생긴다.
   */
  const paneFor = (paneFilter: string | null, step: SectorStep) => {
    if (paneFilter === null) return null;
    const full = exploreList(universe, { quotes, sparks }, paneFilter, query, watchCodes);
    return {
      key: paneFilter,
      step,
      list: sectorPreviewList(full),
      showGroups: showSectorGroups(paneFilter, full),
    };
  };
  // 옆 칸은 지금 섹터의 양옆이고, 칩으로 멀리 뛸 때만 그쪽 한 칸이 목표 섹터로 바뀐다.
  const panes = [
    paneFor(pending?.step === -1 ? pending.filter : neighbors.prev, -1),
    paneFor(pending?.step === 1 ? pending.filter : neighbors.next, 1),
  ];

  // 칩은 모두 같은 규칙이다 — 무엇을 보는지는 주소가 소유하므로 누르면 주소만 바꾼다.
  // 넘어가는 연출은 쓸어 넘길 때와 같은 길을 태운다 — 같은 곳으로 가는 두 손짓이 다르게
  // 보이면 안 된다. 방향은 칩 줄 위의 두 자리로 정한다.
  const pickChip = (id: string) => {
    setChipsOpen(false);
    if (id === filter || sliding.current) return;
    const step = sectorStepBetween(swipeOrder, filter, id);
    if (!step) {
      onLeave(explorePath(id));
      return;
    }
    setPending({ filter: id, step });
  };
  const toggleSearch = () => {
    setSearchOpen((open) => !open);
    if (searchOpen) setQuery("");
  };

  return (
    <PhoneFrame>
      <div style={PAGE}>
        <div style={HEADER}>
          <div style={HEADER_SPACER} />
          <div style={TITLE}>어떤 회사를 살까요?</div>
          <div onClick={toggleSearch} style={SEARCH_BTN}>
            <svg fill="none" height="21" viewBox="0 0 21 21" width="21">
              <circle cx="9" cy="9" r="6.2" stroke="#01185A" strokeWidth="2" />
              <path d="M13.6 13.6 L18 18" stroke="#01185A" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {searchOpen && (
          <div style={SEARCH_ROW}>
            <div style={SEARCH_INPUT_WRAP}>
              <svg fill="none" height="17" style={{ flex: "none", display: "block" }} viewBox="0 0 17 17" width="17">
                <circle cx="7.3" cy="7.3" r="5.1" stroke="#8E93A8" strokeWidth="1.8" />
                <path d="M11.1 11.1 L15 15" stroke="#8E93A8" strokeLinecap="round" strokeWidth="1.8" />
              </svg>
              <input
                autoFocus
                onChange={(event) => setQuery(event.target.value)}
                placeholder="회사 이름으로 찾기"
                style={SEARCH_INPUT}
                value={query}
              />
            </div>
          </div>
        )}

        <div id="tut-explore-chips" style={CHIPS_ROW}>
          <div
            style={styleFromCss(
              "flex:1;min-width:0;overflow-y:hidden;overflow-anchor:none;" +
                (chipsOpen ? "overflow-x:hidden" : "overflow-x:auto"),
            )}
          >
            <div
              style={styleFromCss(
                chipsOpen
                  ? "display:flex;flex-wrap:wrap;gap:8px;padding:0 4px 0 16px"
                  : "display:flex;gap:8px;padding:0 12px 0 16px;width:max-content",
              )}
            >
              {chips.map((chip) => (
                <div key={chip.id} onClick={() => pickChip(chip.id)} style={styleFromCss(chip.style)}>
                  <span>{chip.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div onClick={() => setChipsOpen((open) => !open)} style={CHIPS_TOGGLE(chipsOpen)}>
            <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
              <path
                d="M4 7 L9 12 L14 7"
                stroke="#6E7488"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>

        <div ref={stageRef} style={STAGE}>
          {/* 이전·현재·다음 섹터가 나란히 놓인 트랙. 손가락을 따라 통째로 밀린다. */}
          <div ref={trackRef} style={TRACK}>
            {panes.map(
              (pane) =>
                pane && (
                  <SectorPane
                    activeIndex={0}
                    empty={empty}
                    key={pane.key}
                    list={pane.list}
                    paneKey={pane.key}
                    showGroups={pane.showGroups}
                    step={pane.step}
                    universe={universe}
                  />
                ),
            )}
            <SectorPane
              activeIndex={activeIndex}
              empty={empty}
              list={list}
              onOpen={(code) => {
                if (!rail.dragged()) onLeave(`/stock/${code}`);
              }}
              paneKey="now"
              rail={rail}
              showGroups={showGroups}
              step={0}
              universe={universe}
            />
          </div>
          {/* 도트는 트랙에 얹지 않는다 — 목록 안 자리를 가리키는 표시라 목록과 같이 나갈 것이 아니다. */}
          <div style={DOTS_COL}>
            {cardDots(list.length, activeIndex, "y").map((style, index) => (
              <div key={index} style={styleFromCss(style)} />
            ))}
          </div>
        </div>

        <BottomNav active="trade" onLeave={onLeave} />
      </div>
    </PhoneFrame>
  );
}
