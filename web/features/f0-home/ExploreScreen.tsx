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
} from "./lib/explore-cards";
import { exploreSpotFor, rememberExploreSpot } from "./lib/explore-memo";
import { PROTOTYPE_PHONE } from "./lib/phone-frame";
import {
  nextSectorFilter,
  SECTOR_SLIDE_MS,
  sectorDragOffset,
  sectorRailStyle,
  sectorStepBetween,
  sectorSwipeOrder,
  sectorSwipeStep,
  shouldCommitSectorSwipe,
  type SectorSlide,
  type SectorStep,
} from "./lib/sector-swipe";
import { useRailDrag } from "./lib/use-rail-drag";
import { useUniverseLive } from "./lib/use-universe";
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
const STAGE = styleFromCss(
  "position:relative;flex:1;min-height:0;display:flex;flex-direction:column;background:transparent",
);
// 카드가 위아래로 넘어가는 세로 레일. `scroll-snap-stop:always` 를 카드 쪽에서 이미 준다.
// `touch-action:pan-y` — 손가락 세로는 브라우저 기본 스크롤에 맡기고 **가로만** 우리가 받는다.
// `none` 이던 시절에는 브라우저가 세로도 넘겨주지 않아 손가락으로는 카드가 아예 안 넘어갔다.
const RAIL_CSS =
  "position:relative;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overflow-anchor:none;display:flex;" +
  "flex-direction:column;align-items:center;gap:26px;padding:16px 0 20px;scroll-snap-type:y mandatory;" +
  "cursor:grab;touch-action:pan-y;user-select:none;-webkit-user-select:none";
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
   * 섹터 전환 중 레일이 밀려 있는 자리. `animated` 가 거짓이면 손가락을 그대로 따라간다.
   *
   * `width` 를 함께 담는 이유는 옅어지는 정도가 **한 폭에 대한 비율**이라서다. 그리는
   * 동안 DOM 을 다시 재지 않으려면 자리를 정한 순간의 폭이 자리와 같이 있어야 한다.
   */
  const [slide, setSlide] = useState<SectorSlide>({
    offsetPx: 0,
    animated: false,
    width: PROTOTYPE_PHONE.screenWidth,
  });
  /** 제자리로 되돌린다. 넘길 만큼 못 쓸었거나 손짓이 끊겼을 때다. */
  const restSlide = () => setSlide((prev) => ({ ...prev, offsetPx: 0, animated: true }));
  // 끄는 손과 **켜진 카드 판정**을 함께 이 훅에 맡긴다. 카드가 위아래로 넘어가는 세로
  // 레일이라 축은 'y'. 견주는 값은 `activeIndex` 가 아니라 `cardIndex` 다 — 목록이 줄어
  // 범위를 벗어난 `cardIndex` 가 남았을 때, 잰 값과 달라야 다음 스크롤에서 제자리를 찾는다.
  //
  // 가로로 쓸면 섹터를 넘긴다. 레일과 **같은 손짓**으로 받는 이유는 축을 한 번만 잠그기
  // 위해서다 — 포인터를 따로 받으면 카드가 넘어가면서 섹터까지 바뀐다.
  const rail = useRailDrag(setCardIndex, cardIndex, "y", {
    onMove: (dx) => dragSector(dx),
    onEnd: (dx, velocity) => releaseSector(dx, velocity),
    onCancel: () => restSlide(),
  });

  // 유니버스가 오기 전에는 섹터 id 목록이 비어 있어 무엇이든 전체로 떨어진다. 도착하면
  // 같은 렌더에서 제 필터가 잡히고, 아래 effect 들이 그 값으로 한 번 더 돈다.
  const filter = knownFilter(sector, universe?.sectors.map((entry) => entry.id) ?? []);
  const path = explorePath(filter);
  // 쓸어 가는 차례. 칩 줄과 같은 순서다(`sectorSwipeOrder`).
  const swipeOrder = universe ? sectorSwipeOrder(universe) : [];

  /** 섹터가 밀려 나가는 동안인가. 그 사이에 들어온 손짓은 무시한다. */
  const sliding = useRef(false);
  /** 밀어낸 끝에서 주소를 바꾸는 타이머. 화면을 떠나면 끊는다. */
  const slideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (slideTimer.current) clearTimeout(slideTimer.current);
    },
    [],
  );

  /**
   * 레일이 실제로 그려진 폭과 배율. 폭은 넘기는 문턱의 기준이고, 배율은 창 좌표를 화면
   * 안쪽 좌표로 고치는 데 쓴다 — `PhoneFrame` 이 화면 전체를 `scale()` 로 줄여 놓았으므로
   * 그대로 쓰면 손가락보다 레일이 더 많이 움직인다(`lib/sheet-drag.ts` 와 같은 이유다).
   *
   * 배율을 잰 사각형에서 되짚는 이유는 이 값이 **레일이 실제로 받은 배율**이기 때문이다.
   * 창 크기로 다시 계산하면 같은 값이어야 하는 두 식이 조용히 갈릴 수 있다.
   */
  const railBox = () => {
    const el = rail.ref.current;
    if (!el || el.offsetWidth === 0) return { width: PROTOTYPE_PHONE.screenWidth, scale: 1 };
    return { width: el.offsetWidth, scale: el.getBoundingClientRect().width / el.offsetWidth };
  };

  /** 끄는 동안 레일을 손가락만큼 옮긴다. 넘어갈 섹터가 없으면 눌러서 벽이 있다고 알린다. */
  function dragSector(dx: number) {
    if (sliding.current) return;
    const box = railBox();
    const atEdge = nextSectorFilter(swipeOrder, filter, sectorSwipeStep(dx)) === null;
    setSlide({
      offsetPx: sectorDragOffset({ dx, ...box }, atEdge),
      animated: false,
      width: box.width,
    });
  }

  /** 손을 뗀 자리에서 섹터를 넘기거나 제자리로 되돌린다. */
  function releaseSector(dx: number, velocity: number) {
    if (sliding.current) return;
    const box = railBox();
    const next = nextSectorFilter(swipeOrder, filter, sectorSwipeStep(dx));
    if (next && shouldCommitSectorSwipe({ dx, velocity, ...box })) {
      slideToSector(next, sectorSwipeStep(dx));
      return;
    }
    restSlide();
  }

  /**
   * 지금 목록을 쓸어 낸 쪽으로 밀어내고, 다 밀린 자리에서 주소를 바꾼다. **들어오는 연출은
   * 여기서 하지 않는다** — 새 목록은 주소가 바뀐 뒤에 오므로 아래 layout effect 가 잇는다.
   */
  function slideToSector(next: string, step: SectorStep) {
    const width = railBox().width;
    sliding.current = true;
    setSlide({ offsetPx: -step * width, animated: true, width });
    slideTimer.current = setTimeout(() => {
      slideTimer.current = null;
      onLeave(explorePath(next));
    }, SECTOR_SLIDE_MS);
  }

  /**
   * 새 섹터가 반대편에서 들어오는 연출. **`useLayoutEffect` 여야 한다** — 그리기 전에 자리를
   * 잡지 않으면 새 목록이 밀려 나간 쪽에 한 프레임 그려지고, 그러면 반대 방향으로 튄다.
   *
   * 칩을 눌러 들어와도, 챗봇이 "게임 회사 보여줘"로 뛰어들어와도 같은 길이다 — 방향은
   * 쓸어 온 방향이 아니라 **차례 위의 두 자리**로 정한다(`sectorStepBetween`).
   */
  const shownFilter = useRef(filter);
  useLayoutEffect(() => {
    if (shownFilter.current === filter) return;
    const step = sectorStepBetween(swipeOrder, shownFilter.current, filter);
    shownFilter.current = filter;
    // 유니버스가 늦게 와 첫 필터가 잡히는 것은 **넘어온 것이 아니다.** 그때는 레일이 아직
    // 없으므로(유니버스 전에는 프레임만 그린다) 자리만 맞추고 연출은 걸지 않는다 —
    // 그러지 않으면 `/explore/game` 을 주소로 바로 열 때마다 화면이 옆에서 밀려 들어온다.
    if (!step || !rail.ref.current) {
      sliding.current = false;
      setSlide((prev) => ({ ...prev, offsetPx: 0, animated: false }));
      return;
    }
    const width = railBox().width;
    setSlide({ offsetPx: step * width, animated: false, width });
    // 자리를 **한 번 그린 뒤에** 켠다. 한 프레임(rAF 한 번)만 두면 그 갱신이 같은 프레임의
    // 그리기에 합쳐질 수 있고, 그러면 시작 자리가 없던 셈이 되어 전환이 붙지 않는다.
    let settle = 0;
    const frame = requestAnimationFrame(() => {
      settle = requestAnimationFrame(() => restSlide());
    });
    const settled = setTimeout(() => {
      sliding.current = false;
    }, SECTOR_SLIDE_MS);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settle);
      clearTimeout(settled);
    };
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

  // 필터·검색이 바뀌면 처음 카드부터 다시 본다 — `componentDidUpdate` 의 scrollLeft 리셋과 같다.
  useEffect(() => {
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

  // 칩은 모두 같은 규칙이다 — 무엇을 보는지는 주소가 소유하므로 누르면 주소만 바꾼다.
  // 넘어가는 연출은 쓸어 넘길 때와 같은 길을 태운다(`slideToSector`) — 같은 곳으로 가는
  // 두 손짓이 다르게 보이면 안 된다. 방향은 칩 줄 위의 두 자리로 정한다.
  const pickChip = (id: string) => {
    setChipsOpen(false);
    if (id === filter || sliding.current) return;
    const step = sectorStepBetween(swipeOrder, filter, id);
    if (!step) {
      onLeave(explorePath(id));
      return;
    }
    slideToSector(id, step);
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

        {list.length === 0 ? (
          // 빈 목록에도 같은 손짓을 붙인다 — 관심 기업이 0개인 자리에서 쓸어 나갈 수 없으면
          // 손가락만으로는 갇힌다. 넘길 것이 없으니 세로 판정은 하지 않고 가로만 받는다.
          <div
            onPointerDown={rail.onPointerDown}
            ref={rail.ref}
            style={styleFromCss(
              "flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 32px;gap:9px;" +
                "touch-action:pan-y;user-select:none;-webkit-user-select:none;" +
                sectorRailStyle(slide),
            )}
          >
            <div style={styleFromCss("font-size:16px;font-weight:800;color:#01185A;text-align:center")}>
              {empty.title}
            </div>
            <div
              style={styleFromCss(
                "font-size:13.5px;font-weight:500;color:#8E93A8;line-height:1.6;text-align:center;text-wrap:pretty",
              )}
            >
              {empty.hint}
            </div>
          </div>
        ) : (
          <div style={STAGE}>
            <div
              onPointerDown={rail.onPointerDown}
              onScroll={rail.onScroll}
              ref={rail.ref}
              // 섹터가 넘어갈 때 레일 전체가 가로로 밀린다. 오른쪽 도트는 함께 밀지 않는다 —
              // 그것은 목록 안 자리를 가리키는 표시라 목록과 같이 나갈 것이 아니다.
              style={styleFromCss(RAIL_CSS + ";" + sectorRailStyle(slide))}
            >
              {list.map((stock, index) => {
                const card = buildExploreCard(list, index, universe, activeIndex, showGroups);
                return (
                  <div
                    // 튜토리얼은 레일 전체가 아니라 **지금 보고 있는 카드**만 짚는다.
                    // 레일을 통째로 뚫으면 카드가 놓인 배경까지 밝아져 카드가 묻힌다.
                    id={index === activeIndex ? "tut-explore-cards" : undefined}
                    key={card.code}
                    style={styleFromCss(card.slideStyle)}
                  >
                    {card.groupShow && (
                      <div style={GROUP_WRAP}>
                        {card.groupShowLine && <div style={GROUP_LINE} />}
                        <div style={GROUP_NAME}>{card.groupName}</div>
                      </div>
                    )}
                    <div
                      onClick={() => {
                        if (!rail.dragged()) onLeave(`/stock/${card.code}`);
                      }}
                      style={styleFromCss(card.cardStyle)}
                    >
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
                          <linearGradient id={card.gradId} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0" stopColor={card.lineColor} stopOpacity="0.16" />
                            <stop offset="1" stopColor={card.lineColor} stopOpacity="0.16" />
                          </linearGradient>
                        </defs>
                        <path d={card.sparkArea} fill={`url(#${card.gradId})`} />
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
            <div style={DOTS_COL}>
              {cardDots(list.length, activeIndex, "y").map((style, index) => (
                <div key={index} style={styleFromCss(style)} />
              ))}
            </div>
          </div>
        )}

        <BottomNav active="trade" onLeave={onLeave} />
      </div>
    </PhoneFrame>
  );
}
