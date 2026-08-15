"use client";

import { useEffect, useState } from "react";
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
  exploreTitle,
  sectorChips,
} from "./lib/explore-cards";
import { useRailDrag } from "./lib/use-rail-drag";
import { useUniverseLive } from "./lib/use-universe";
import { useWallet, type WalletAccountId } from "./lib/use-wallet";

const PAGE = styleFromCss(
  // 프로토타입 exploreBgStyle 과 같은 값 — 홈과 같은 연회보라 한 색. 카드 영역과 경계를 만들지 않는다.
  "position:absolute;left:0;top:0;right:0;bottom:0;padding-top:59px;display:flex;flex-direction:column;overflow:hidden;background:#F4F0FF",
);
const HEADER = styleFromCss("flex:none;display:flex;align-items:center;gap:12px;padding:6px 18px 10px");
const BACK = styleFromCss(
  "width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;" +
    "font-size:17px;font-weight:700;color:#01185A;cursor:pointer;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)",
);
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
const TITLE_ROW = styleFromCss("flex:none;width:310px;margin:0 auto;padding:8px 0 2px");
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

/** 라우트의 섹터 구간이 아는 값이 아니면 기본(오늘 많이 오른 순)으로 되돌린다. */
const knownFilter = (sector: string | undefined, sectorIds: string[]) =>
  sector && (sector === "all" || sector === "watch" || sectorIds.includes(sector)) ? sector : "rank";

/**
 * 종목 탐색 화면. `ui-src/screens/explore.html` 을 그대로 옮겨 왔다.
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
  const { universe, quotes, sparks } = useUniverseLive();
  const [query, setQuery] = useState("");
  const [cardIndex, setCardIndex] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chipsOpen, setChipsOpen] = useState(false);
  // 카드가 켜졌는지는 아래 `onRailScroll` 이 정한다 — 여기서는 끄는 손만 받는다. 카드가
  // 위아래로 넘어가는 세로 레일이라 축은 'y'.
  const rail = useRailDrag(undefined, undefined, "y");

  const filter = knownFilter(sector, universe?.sectors.map((entry) => entry.id) ?? []);

  // 필터·검색이 바뀌면 처음 카드부터 다시 본다 — `componentDidUpdate` 의 scrollLeft 리셋과 같다.
  useEffect(() => {
    setCardIndex(0);
    if (rail.ref.current) rail.ref.current.scrollTop = 0;
  }, [filter, query]);

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

  const list = exploreList(universe, { quotes, sparks }, filter, query, wallet.watchlist);
  const chips = sectorChips(universe, filter);
  const title = exploreTitle(universe, filter, query, list.length, chipsOpen);
  const empty = emptyState(query);
  const activeIndex = Math.min(cardIndex, Math.max(0, list.length - 1));

  const pickChip = (id: string) => {
    setChipsOpen(false);
    onLeave(id === "rank" ? "/explore" : `/explore/${id}`);
  };
  const toggleSearch = () => {
    setSearchOpen((open) => !open);
    if (searchOpen) setQuery("");
  };

  // 카드 간격은 슬라이드 높이 + gap 이다. 상수로 두면 gap 을 바꿀 때 어긋나므로
  // 앞 두 슬라이드의 실제 거리를 잰다. 세로 레일이라 top 을 잰다. (`cardsScroll` 그대로)
  const onRailScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const first = el.firstElementChild as HTMLElement | null;
    const second = first?.nextElementSibling as HTMLElement | null;
    const step = first
      ? second
        ? second.getBoundingClientRect().top - first.getBoundingClientRect().top
        : first.getBoundingClientRect().height
      : 280;
    const index = Math.max(0, Math.min(list.length - 1, Math.round(el.scrollTop / step)));
    if (index !== cardIndex) setCardIndex(index);
  };

  return (
    <PhoneFrame>
      <div style={PAGE}>
        <div style={HEADER}>
          <div onClick={() => onLeave("/")} style={BACK}>
            ‹
          </div>
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

        {title !== "" && (
          <div style={TITLE_ROW}>
            <span style={styleFromCss("font-size:22px;font-weight:800;color:#141B22;letter-spacing:-0.03em;white-space:nowrap")}>
              {title}
            </span>
          </div>
        )}

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
            <div onPointerDown={rail.onPointerDown} onScroll={onRailScroll} ref={rail.ref} style={RAIL}>
              {list.map((stock, index) => {
                const card = buildExploreCard(list, index, universe, index === activeIndex, filter === "all");
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
