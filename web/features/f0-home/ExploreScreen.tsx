"use client";

import { useEffect, useRef, useState } from "react";
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
const RAIL = styleFromCss(
  "position:relative;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overflow-anchor:none;display:flex;" +
    "flex-direction:column;align-items:center;gap:26px;padding:16px 0 20px;scroll-snap-type:y mandatory;" +
    "cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none",
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
  // 끄는 손과 **켜진 카드 판정**을 함께 이 훅에 맡긴다. 카드가 위아래로 넘어가는 세로
  // 레일이라 축은 'y'. 견주는 값은 `activeIndex` 가 아니라 `cardIndex` 다 — 목록이 줄어
  // 범위를 벗어난 `cardIndex` 가 남았을 때, 잰 값과 달라야 다음 스크롤에서 제자리를 찾는다.
  const rail = useRailDrag(setCardIndex, cardIndex, "y");

  // 유니버스가 오기 전에는 섹터 id 목록이 비어 있어 무엇이든 전체로 떨어진다. 도착하면
  // 같은 렌더에서 제 필터가 잡히고, 아래 effect 들이 그 값으로 한 번 더 돈다.
  const filter = knownFilter(sector, universe?.sectors.map((entry) => entry.id) ?? []);
  const path = explorePath(filter);
  const ready = universe !== null && wallet !== null;

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

  if (!universe || !wallet) return <PhoneFrame />;

  const list = exploreList(universe, { quotes, sparks }, filter, query, watchCodes);
  const chips = sectorChips(universe, filter);
  // 업종 구분 헤더는 업종끼리 묶인 줄에서만 뜻이 있다 — `오늘 많이 오른 순` 은 등락률로
  // 섞이므로 세우지 않는다. 그 판정은 `showSectorGroups` 가 소유한다.
  const showGroups = showSectorGroups(filter, list);
  const empty = emptyState(query);
  const activeIndex = Math.min(cardIndex, Math.max(0, list.length - 1));

  // 칩은 모두 같은 규칙이다 — 무엇을 보는지는 주소가 소유하므로 누르면 주소만 바꾼다.
  const pickChip = (id: string) => {
    setChipsOpen(false);
    onLeave(explorePath(id));
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

        <div style={CHIPS_ROW}>
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
          <div
            style={styleFromCss(
              "flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 32px;gap:9px",
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
            <div onPointerDown={rail.onPointerDown} onScroll={rail.onScroll} ref={rail.ref} style={RAIL}>
              {list.map((stock, index) => {
                const card = buildExploreCard(list, index, universe, activeIndex, showGroups);
                return (
                  <div key={card.code} style={styleFromCss(card.slideStyle)}>
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
