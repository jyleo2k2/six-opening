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
  // `renderVals-return-2-explore.js` 의 exploreBgStyle 과 같은 값 — 페이지 전체가 하나의 밝은 배경.
  "position:absolute;left:0;top:0;right:0;bottom:0;padding-top:59px;display:flex;flex-direction:column;overflow:hidden;" +
    "background:radial-gradient(circle at 18% 7%,rgba(225,219,255,0.34) 0%,rgba(225,219,255,0) 32%)," +
    "radial-gradient(circle at 88% 92%,rgba(255,226,239,0.25) 0%,rgba(255,226,239,0) 30%)," +
    "linear-gradient(180deg,#FAF9FD 0%,#F5F3FB 52%,#FAF8FC 100%)",
);
const HEADER = styleFromCss("flex:none;display:flex;align-items:center;gap:12px;padding:6px 18px 10px");
const BACK = styleFromCss(
  "width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;" +
    "font-size:17px;font-weight:700;color:#01185A;cursor:pointer;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)",
);
const TITLE = styleFromCss(
  "flex:1;text-align:center;font-size:19px;font-weight:800;color:#01185A;letter-spacing:-0.01em",
);
const SEARCH_ROW = styleFromCss("flex:none;padding:0 16px 10px;display:flex;align-items:center;gap:8px");
const SEARCH_INPUT = styleFromCss(
  "flex:1;min-width:0;box-sizing:border-box;border:0;outline:none;background:#FFFFFF;border-radius:14px;padding:12px 14px;" +
    "font-family:'Pretendard',sans-serif;font-size:14.5px;font-weight:600;color:#01185A;box-shadow:0 1px 3px rgba(30,25,60,0.08)",
);
const SEARCH_CLEAR = styleFromCss(
  "flex:none;font-size:13px;font-weight:700;color:#8E93A8;padding:11px 13px;border-radius:14px;cursor:pointer;" +
    "background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)",
);
const TITLE_ROW = styleFromCss(
  "flex:none;display:flex;align-items:baseline;justify-content:space-between;padding:0 20px 8px",
);
const STAGE = styleFromCss(
  "position:relative;flex:1;min-height:0;display:flex;flex-direction:column;background:transparent",
);
const RAIL = styleFromCss(
  "position:relative;flex:1;overflow-x:auto;overflow-y:hidden;display:flex;align-items:center;gap:33px;padding:2px 46px 6px;" +
    "scroll-snap-type:x mandatory;cursor:grab;touch-action:pan-x;user-select:none;-webkit-user-select:none",
);
const DOTS_ROW = styleFromCss(
  "position:relative;flex:none;display:flex;align-items:center;justify-content:center;gap:5px;padding:0 0 14px",
);

/** 라우트의 섹터 구간이 아는 값이 아니면 기본(오늘 많이 오른 순)으로 되돌린다. */
const knownFilter = (sector: string | undefined, sectorIds: string[]) =>
  sector && (sector === "watch" || sectorIds.includes(sector)) ? sector : "rank";

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
  // 카드가 켜졌는지는 아래 `onRailScroll` 이 정한다 — 여기서는 끄는 손만 받는다.
  const rail = useRailDrag();

  const filter = knownFilter(sector, universe?.sectors.map((entry) => entry.id) ?? []);

  // 필터·검색이 바뀌면 처음 카드부터 다시 본다 — `componentDidUpdate` 의 scrollLeft 리셋과 같다.
  useEffect(() => {
    setCardIndex(0);
    if (rail.ref.current) rail.ref.current.scrollLeft = 0;
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
  const title = exploreTitle(universe, filter, query, list.length);
  const empty = emptyState(query);
  const activeIndex = Math.min(cardIndex, Math.max(0, list.length - 1));

  const pickChip = (id: string) => onLeave(id === "rank" ? "/explore" : `/explore/${id}`);

  // 카드 간격은 슬라이드 폭 + gap 이다. 상수로 두면 gap 을 바꿀 때 어긋나므로
  // 앞 두 슬라이드의 실제 거리를 잰다. (`cardsScroll` 그대로)
  const onRailScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const first = el.firstElementChild as HTMLElement | null;
    const second = first?.nextElementSibling as HTMLElement | null;
    const step = first
      ? second
        ? second.getBoundingClientRect().left - first.getBoundingClientRect().left
        : first.getBoundingClientRect().width
      : 280;
    const index = Math.max(0, Math.min(list.length - 1, Math.round(el.scrollLeft / step)));
    if (index !== cardIndex) setCardIndex(index);
  };

  return (
    <PhoneFrame>
      <div style={PAGE}>
        <div style={HEADER}>
          <div onClick={() => onLeave("/")} style={BACK}>
            ‹
          </div>
          <div style={TITLE}>어떤 회사를 살까?</div>
          <div style={{ width: 38 }} />
        </div>

        <div style={SEARCH_ROW}>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="회사 이름으로 찾기"
            style={SEARCH_INPUT}
            value={query}
          />
          {query.trim() !== "" && (
            <div onClick={() => setQuery("")} style={SEARCH_CLEAR}>
              지우기
            </div>
          )}
        </div>

        <div style={styleFromCss("flex:none;overflow-x:auto;padding:2px 0 12px")}>
          <div style={styleFromCss("display:flex;gap:8px;padding:0 16px;width:max-content")}>
            {chips.map((chip) => (
              <div key={chip.id} onClick={() => pickChip(chip.id)} style={styleFromCss(chip.style)}>
                <span>{chip.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={TITLE_ROW}>
          <span style={styleFromCss("font-size:13.5px;font-weight:600;color:#01185A;white-space:nowrap")}>
            {title}
          </span>
          <span style={styleFromCss("font-size:12.5px;font-weight:500;color:#A9AEC4;white-space:nowrap")}>
            손가락으로 슉 밀어봐 →
          </span>
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
            <div onPointerDown={rail.onPointerDown} onScroll={onRailScroll} ref={rail.ref} style={RAIL}>
              {list.map((stock, index) => {
                const card = buildExploreCard(stock, universe, index === activeIndex);
                return (
                  <div key={card.code} style={styleFromCss(card.slideStyle)}>
                    <div style={styleFromCss(card.auraMain)} />
                    <div style={styleFromCss(card.auraNeon)} />
                    <div style={styleFromCss(card.auraTrend)} />
                    <div
                      onClick={() => {
                        if (!rail.dragged()) onLeave(`/stock/${card.code}`);
                      }}
                      style={styleFromCss(card.cardStyle)}
                    >
                      <div style={styleFromCss(card.gridStyle)} />
                      <div style={styleFromCss(card.sheenStyle)} />
                      <svg
                        height={340}
                        style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
                        viewBox="0 0 310 340"
                        width={310}
                      >
                        <circle cx="196" cy="118" fill="#FFFFFF" fillOpacity="0.45" r="1.5" />
                        <circle cx="86" cy="206" fill={card.brand} fillOpacity="0.7" r="1.2" />
                        <circle cx="268" cy="176" fill="#FFFFFF" fillOpacity="0.3" r="1.1" />
                        <circle cx="146" cy="66" fill={card.brand} fillOpacity="0.6" r="1" />
                        <rect fill="none" height="328" rx="34" stroke="#FFFFFF" strokeOpacity="0.05" strokeWidth="13" width="298" x="6" y="6" />
                        <rect fill="none" height="328" rx="34" stroke="#8FB0E8" strokeOpacity="0.16" strokeWidth="5" width="298" x="6" y="6" />
                        <rect fill="none" height="328" rx="34" stroke={card.lineColor} strokeOpacity="0.35" strokeWidth="1.6" width="298" x="6" y="6" />
                        <path d="M236 6 H270 A34 34 0 0 1 304 40 V86 L291 74 V29 H249 Z" fill="#070C1C" fillOpacity="0.9" />
                        <path d="M249 29 H291 V74" fill="none" stroke={card.lineColor} strokeOpacity="0.5" strokeWidth="1.2" />
                        <path d="M254 13 l11 11 M267 13 l11 11 M280 15 l10 10" stroke={card.lineColor} strokeLinecap="round" strokeOpacity="0.85" strokeWidth="2.2" />
                        <path d="M6 266 V300 A34 34 0 0 0 40 334 H86 L74 322 H31 V278 Z" fill="#070C1C" fillOpacity="0.85" />
                        <path d="M16 300 l12 12 M16 286 l26 26" stroke={card.lineColor} strokeLinecap="round" strokeOpacity="0.6" strokeWidth="1.8" />
                        <path d="M286 318 l8 -8 M295 309 l6 -6" stroke={card.lineColor} strokeLinecap="round" strokeOpacity="0.7" strokeWidth="1.8" />
                        <path d="M6 128 V40 A34 34 0 0 1 40 6 H132" fill="none" stroke={card.lineColor} strokeLinecap="round" strokeWidth="4" style={{ filter: `drop-shadow(0 0 7px ${card.lineColor})` }} />
                        <path d="M236 6 H270 A34 34 0 0 1 304 40 V86" fill="none" stroke={card.lineColor} strokeLinecap="round" strokeWidth="2.6" style={{ filter: `drop-shadow(0 0 5px ${card.lineColor})` }} />
                        <path d="M304 150 V214" fill="none" stroke={card.lineColor} strokeLinecap="round" strokeWidth="3.4" style={{ filter: `drop-shadow(0 0 7px ${card.lineColor})` }} />
                        <path d="M304 258 V300 A34 34 0 0 1 270 334 H244" fill="none" stroke={card.lineColor} strokeLinecap="round" strokeOpacity="0.4" strokeWidth="1.8" />
                        <path d="M96 334 H40 A34 34 0 0 1 6 300 V268" fill="none" stroke={card.lineColor} strokeLinecap="round" strokeOpacity="0.55" strokeWidth="2.6" />
                        <path d="M6 190 V236" fill="none" stroke={card.lineColor} strokeLinecap="round" strokeOpacity="0.3" strokeWidth="1.6" />
                        <path d="M132 334 H186" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeOpacity="0.9" strokeWidth="3.4" style={{ filter: "drop-shadow(0 0 6px #FFFFFF)" }} />
                        <path d="M140 6 H186" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeOpacity="0.85" strokeWidth="2.2" />
                        <path d="M6 72 V104" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeOpacity="0.45" strokeWidth="2" />
                        <path d="M304 108 V138" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeOpacity="0.35" strokeWidth="1.8" />
                        <path d="M28 120 L39 129 H105 L116 120" fill="none" stroke={card.lineColor} strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" strokeWidth="2.2" style={{ filter: `drop-shadow(0 0 5px ${card.lineColor})` }} />
                        <path d="M50 133 H94" fill="none" stroke={card.lineColor} strokeLinecap="round" strokeOpacity="0.45" strokeWidth="1" />
                      </svg>
                      <div style={styleFromCss(card.artStyle)}>
                        {!card.hasLogo && <span style={{ fontSize: 40 }}>{card.emoji}</span>}
                      </div>
                      <div style={styleFromCss(card.catStyle)}>{card.category}</div>
                      <svg height={8} style={styleFromCss(card.catBarStyle)} viewBox="0 0 140 8" width={140}>
                        <path d="M2 7 L8 1 M11 7 L17 1 M20 7 L26 1 M29 7 L35 1" stroke={card.brand} strokeLinecap="round" strokeWidth="2.6" />
                        <path d="M42 4 H126" fill="none" stroke={card.brand} strokeOpacity="0.45" strokeWidth="1.4" />
                        <circle cx="133" cy="4" fill={card.brand} r="3.4" style={{ filter: `drop-shadow(0 0 4px ${card.brand})` }} />
                      </svg>
                      <div style={styleFromCss(card.nameStyle)}>{card.name}</div>
                      <div style={styleFromCss(card.descStyle)}>{card.desc}</div>
                      <div style={styleFromCss(card.priceStyle)}>{card.priceText}</div>
                      <div style={styleFromCss(card.changeStyle)}>{card.changeText}</div>
                      <svg height={104} style={styleFromCss(card.chartStyle)} viewBox="0 0 127 104" width={127}>
                        <defs>
                          <linearGradient id={card.gradId} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0" stopColor={card.lineColor} stopOpacity="0.42" />
                            <stop offset="1" stopColor={card.lineColor} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d={card.sparkArea} fill={`url(#${card.gradId})`} />
                        <polyline fill="none" points={card.sparkLine} stroke={card.lineColor} strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.13" strokeWidth="9" />
                        <polyline fill="none" points={card.sparkLine} stroke={card.lineColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" style={{ filter: `drop-shadow(0 0 5px ${card.lineColor})` }} />
                        <circle cx={card.endX} cy={card.endY} fill={card.lineColor} fillOpacity="0.24" r="10" />
                        <circle cx={card.endX} cy={card.endY} fill="#FFFFFF" r="4.2" style={{ filter: `drop-shadow(0 0 7px ${card.lineColor})` }} />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={DOTS_ROW}>
              {cardDots(list.length, activeIndex).map((style, index) => (
                <div key={index} style={styleFromCss(style)} />
              ))}
              <span
                style={styleFromCss(
                  "margin-left:8px;font-size:11.5px;font-weight:700;color:#A8A6C4;font-variant-numeric:tabular-nums;white-space:nowrap",
                )}
              >
                {list.length > 9 ? `${Math.min(activeIndex + 1, list.length)} / ${list.length}` : ""}
              </span>
            </div>
          </div>
        )}

        <BottomNav active="trade" onLeave={onLeave} />
      </div>
    </PhoneFrame>
  );
}
