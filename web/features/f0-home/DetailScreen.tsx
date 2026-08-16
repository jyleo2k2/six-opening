"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatContext } from "../../shared/types/chatbot";
import { accountTotalAsset, SEED } from "../../shared/store/prototype-account.js";
import { ChartScreen } from "./ChartScreen";
import { buildDetailChart, type DetailTrade } from "./lib/detail-chart";
import { lastExplorePath } from "./lib/explore-memo";
import { NewsScreen } from "./NewsScreen";
import { PhoneFrame } from "./PhoneFrame";
import { styleFromCss } from "./lib/css-style";
import { won } from "./lib/portfolio-view";
import {
  StockFooter,
  SUB_PAGE,
  SubScreenHeader,
} from "./lib/stock-chrome";
import { validNewsItem, type NewsItem } from "./lib/stock-news";
import { recordTabView } from "./lib/tab-views";
import { useStockLive } from "./lib/use-universe";
import { canTrade, useWallet, type WalletAccountId } from "./lib/use-wallet";

const UP = "#E8322E";
const DOWN = "#1668DC";

const SCROLL = styleFromCss(
  "flex:1;overflow-y:auto;overflow-x:hidden;padding:2px 16px 0;display:flex;flex-direction:column;gap:11px",
);
const PRICE_CARD = styleFromCss(
  "background:#FFFFFF;border-radius:30px;padding:18px 20px;box-shadow:0 2px 10px rgba(30,25,60,0.05)",
);
const CHART_WRAP = styleFromCss("position:relative;margin-top:14px");
const HI_LO_LABEL = styleFromCss(
  "position:absolute;transform:translate(-50%,0);font-size:11.5px;font-weight:600;white-space:nowrap;pointer-events:none",
);
const PIN = styleFromCss(
  "position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;" +
    "pointer-events:none;filter:drop-shadow(0 2px 4px rgba(30,25,60,0.16))",
);
// 원본은 파스텔 바탕에 짙은 남회색 글씨다 — 흰 글씨는 이 색 위에서 읽히지 않는다.
const PIN_BODY = styleFromCss(
  "display:flex;align-items:center;justify-content:center;width:23px;height:23px;border-radius:8px;" +
    "font-size:12px;font-weight:800;color:#3A3F5C;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.7)",
);
const PIN_TAIL = styleFromCss(
  "width:0;height:0;margin-top:-1px;border-left:5px solid transparent;border-right:5px solid transparent",
);
const CARD = styleFromCss(
  "background:#FFFFFF;border-radius:26px;padding:16px 18px;box-shadow:0 2px 10px rgba(30,25,60,0.05)",
);
const CARD_TITLE = styleFromCss(
  "font-size:17.5px;font-weight:800;color:#01185A;white-space:nowrap",
);
const CARD_BODY = styleFromCss(
  "font-size:16px;font-weight:500;color:#5C6280;line-height:1.75;margin-top:10px;text-wrap:pretty",
);
// 원본은 이 줄에 캡션 없이 버튼만 오른쪽에 둔다.
const CARD_FOOT = styleFromCss("display:flex;align-items:center;justify-content:flex-end;margin-top:14px");
const WATCH_BTN = styleFromCss(
  "width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;" +
    "background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)",
);
const MORE_BTN = styleFromCss(
  "font-size:13px;font-weight:700;color:#01185A;padding:9px 14px;border-radius:999px;cursor:pointer;white-space:nowrap;background:#F1F2F8",
);
// 매수 화면의 "내 지갑" 알약과 같은 값 — 종목에 들어오자마자 쓸 수 있는 돈을 본다.
const WALLET_PILL = styleFromCss(
  "display:flex;align-items:center;gap:9px;background:#ECEDF7;border-radius:20px;padding:12px 15px;box-shadow:inset 0 0 0 1px #E4E6F1",
);
const WALLET_LABEL = styleFromCss("font-size:14px;font-weight:600;color:#5C6280;white-space:nowrap");
const WALLET_CASH = styleFromCss(
  "flex:1;text-align:right;font-size:16px;font-weight:800;color:#01185A;font-variant-numeric:tabular-nums;white-space:nowrap",
);
// 가격 카드 머리 — 원본 그대로. 종목명이 왼쪽, 업종 배지가 오른쪽 끝, 그 아래 큰 가격,
// 그 아래 변동액과 등락률 한 줄이다.
const NAME_ROW = styleFromCss("display:flex;align-items:flex-start;justify-content:space-between;gap:10px");
const NAME_TEXT = styleFromCss(
  "flex:1;min-width:0;font-size:17px;font-weight:700;color:#141B3D;letter-spacing:-0.02em;" +
    "white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
);
const PRICE_TEXT = styleFromCss(
  "font-size:36px;font-weight:800;color:#0D1330;font-variant-numeric:tabular-nums;line-height:1.1;" +
    "margin-top:7px;white-space:nowrap;letter-spacing:-0.035em",
);
const CHANGE_ROW = styleFromCss("display:flex;align-items:baseline;gap:8px;margin-top:7px");
/** 업종 배지 — 업종마다 글자색과 옅은 배경 한 쌍. 원본 `detailCatStyle` 의 표와 같다. */
const SECTOR_BADGE: Record<string, [string, string]> = {
  semi: ["#2F6BE0", "#E6EEFD"],
  game: ["#6D3FD4", "#F0EAFE"],
  food: ["#C4571F", "#FDEDE2"],
  auto: ["#1F7A5F", "#E3F4EE"],
  enter: ["#C42A6D", "#FCE7F0"],
  beauty: ["#A93E9B", "#F7E9F6"],
  air: ["#1E8FCC", "#E4F3FC"],
  ship: ["#106E7E", "#DEF0F2"],
  defense: ["#4E5C78", "#EBEEF4"],
  energy: ["#A07207", "#FBF1DC"],
  retail: ["#7A5230", "#F2EBE2"],
  logi: ["#5C6B3D", "#EFF2E6"],
  bank: ["#2A3B6E", "#E8EAF2"],
};
const badgeFor = (sector: string) => {
  const [ink, bg] = SECTOR_BADGE[sector] ?? ["#4E5C78", "#EBEEF4"];
  return styleFromCss(
    "flex:none;display:inline-flex;align-items:center;height:28px;padding:0 13px;border-radius:999px;" +
      `font-size:12.5px;font-weight:700;white-space:nowrap;color:${ink};background:${bg}`,
  );
};

/** `app.html` 의 `topic()` — 이름 끝 받침에 맞는 조사(은/는). */
function josa(name: string) {
  const ch = name.charCodeAt(name.length - 1);
  if (ch >= 0xac00 && ch <= 0xd7a3) return (ch - 0xac00) % 28 !== 0 ? "은" : "는";
  return "는";
}

type NewsStatus = "loading" | "ready" | "empty" | "error";

/**
 * 종목 상세 화면. `ui-src/screens/detail.html` 을 그대로 옮겨 왔고,
 * 차트·뉴스는 상세에서만 열리는 하위 화면이라 여기서 함께 소유한다 — 주소는 셋 다
 * `/stock/{code}` 하나다(`screen-route` 의 기존 결정 그대로).
 *
 * `app.html` 이 하던 세 가지 기록을 그대로 잇는다.
 * - 챗봇 맥락: 지금 보는 종목·내 지갑 값을 부모(`ConnectedPrototype`)에 올린다.
 * - 상세 탭 유효 열람(10초): `lib/tab-views` 버퍼에 쌓는다. 매수 체결 때
 *   `OrderScreen` 이 서버로 보낸다 — 매수도 React 로 옮겨 와 버퍼와 방아쇠가 한 집에 산다.
 * - 행동 이벤트: 차트·뉴스 열람을 지갑 `events` 에 남긴다(아카이브 열람 수가 읽는다).
 */
export function DetailScreen({
  code,
  account,
  onLeave,
  onChatContext,
}: {
  code: string;
  account: WalletAccountId;
  onLeave: (path: string) => void;
  onChatContext: (context: ChatContext | null) => void;
}) {
  const { wallet, update } = useWallet();
  const live = useStockLive(code);
  const [view, setView] = useState<"detail" | "chart" | "news">("detail");
  const [newsStatus, setNewsStatus] = useState<NewsStatus>("loading");
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [activeNews, setActiveNews] = useState<NewsItem | null>(null);
  const [trades, setTrades] = useState<DetailTrade[]>([]);

  // 최근 매매 지점(B/S 핀)의 출처. `TradingViewChart` 의 가족 체결 마커와 같은 API다
  // (F11 SPEC §6.1) — 없는 체결을 지어내지 않는다.
  useEffect(() => {
    let cancelled = false;
    setTrades([]);
    fetch(`/api/trades?symbol=${encodeURIComponent(code)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { trades?: DetailTrade[] } | null) => {
        if (!cancelled && data) setTrades(data.trades ?? []);
      })
      .catch(() => {
        if (!cancelled) setTrades([]);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  // 종목 뉴스 요약 — `app.html` 이 상세 진입 때 부르던 `loadNews` 와 같은 경로·판정.
  const loadNews = (symbol: string) => {
    setNewsStatus("loading");
    fetch(`/api/news?stockId=${encodeURIComponent(`KRX:${symbol}`)}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("news lookup failed");
        return r.json();
      })
      .then((data: { item?: unknown } | null) => {
        const item = data?.item ?? null;
        if (item !== null && !validNewsItem(item, symbol)) throw new Error("invalid news contract");
        setNewsItem(item as NewsItem | null);
        setNewsStatus(item ? "ready" : "empty");
      })
      .catch(() => setNewsStatus("error"));
  };
  useEffect(() => {
    setNewsItem(null);
    setActiveNews(null);
    setView("detail");
    loadNews(code);
  }, [code]);

  // 유니버스에 없는 코드는 탐색으로 보낸다 — `app.html` 도 모르는 종목은 열지 않았다.
  useEffect(() => {
    if (live.loaded && !live.stock) onLeave("/explore");
  }, [live.loaded, live.stock, onLeave]);

  // 상세 탭 유효 열람. 화면(상세·차트·뉴스)마다 한 방문이고 10초 이상만 쌓는다.
  // 판정은 서버(`/api/tab-view`)가 다시 한다.
  useEffect(() => {
    const openedAt = new Date();
    return () => {
      const closedAt = new Date();
      if (closedAt.getTime() - openedAt.getTime() >= 10_000) {
        recordTabView(code, openedAt.toISOString(), closedAt.toISOString());
      }
    };
  }, [view, code]);

  // 챗봇 맥락. `app.html` 의 `notifyChatContext` 가 싣던 값과 같은 모양이다.
  const stockName = live.stock?.name ?? "";
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  useEffect(() => {
    const me = walletRef.current?.acc[account];
    if (!stockName || !me) return;
    const context: ChatContext = {
      screen: "stock",
      stockId: `KRX:${code}`,
      stockName,
    };
    const total = accountTotalAsset(me, (symbol: string) => live.prices[symbol] ?? 0);
    if (Number.isFinite(total)) {
      context.pnlPercent = Math.round(((total - SEED) / SEED) * 10000) / 100;
    }
    if (Number.isFinite(me.cash) && me.cash >= 0) context.cash = Math.round(me.cash);
    context.holdingCount = me.holdings.filter((holding) => Number(holding.qty) > 0).length;
    onChatContext(context);
    // live.price 로 갱신 주기를 좁힌다 — 시세가 실제로 움직일 때만 맥락을 다시 올린다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, stockName, account, wallet, live.price, onChatContext]);
  useEffect(() => () => onChatContext(null), [onChatContext]);

  // 행동 이벤트 — 지갑 `events` 에 남긴다. 기록자가 `app.html` 하나였을 때는 여기서
  // 직접 쓰면 iframe 메모리가 그 값을 모른 채 덮어썼으므로 메시지로 보냈다. iframe 을
  // 걷어낸 지금은 `update()` 가 유일한 기록자라 그 왕복이 필요 없다.
  // 모양은 `app.html` 이 쓰던 것 그대로다 — `kw_proto_v1` 을 읽는 쪽이 갈리면 안 된다.
  const recordViewEvent = (name: "chart_detail_opened" | "news_detail_opened") => {
    update((current) => ({
      events: [
        ...current.events,
        {
          event: name,
          symbol: code,
          user_id: account === "child" ? "child_minji" : "parent_mom",
          ts: new Date().toISOString(),
        },
      ],
    }));
  };

  if (!wallet || !live.stock) return <PhoneFrame />;

  const me = wallet.acc[account];
  const stock = live.stock;
  const locked = !canTrade(account);
  const changeUp = live.change >= 0;
  const priceText = `${live.price.toLocaleString("ko-KR")}원`;
  // 원본은 **얼마 올랐는지(원)가 먼저**, 몇 %인지는 세로선 뒤에 작게 붙는다.
  // 변동액은 등락률에서 되짚는다 — `price * change / (100 + change)`.
  const changeWon = Math.abs(Math.round((live.price * live.change) / (100 + live.change)));
  const changeText = `${changeUp ? "▲ " : "▼ "}${changeWon.toLocaleString("ko-KR")}원`;
  const diffText = `${live.change >= 0 ? "+" : ""}${live.change.toFixed(2)}%`;
  const changeStyle = styleFromCss(
    "font-size:18px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;color:" +
      (changeUp ? UP : DOWN),
  );
  const diffStyle = styleFromCss(
    "font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;" +
      `padding-left:9px;border-left:1px solid ${changeUp ? UP : DOWN}59;color:${changeUp ? UP : DOWN}`,
  );
  const watched = wallet.watchlist.includes(code);
  const startBuy = () => {
    if (!locked) onLeave(`/buy/${code}`);
  };
  const toggleWatch = () => {
    // 탐색의 관심 기업 필터가 같은 저장소를 읽는다. `update()` 가 곧 저장이다.
    update((current) => ({
      watchlist: watched
        ? current.watchlist.filter((entry) => entry !== code)
        : [...current.watchlist, code],
    }));
  };

  const openChart = () => {
    recordViewEvent("chart_detail_opened");
    setView("chart");
  };
  const openNews = () => {
    if (newsItem) {
      setActiveNews(newsItem);
      recordViewEvent("news_detail_opened");
      setView("news");
    } else if (newsStatus === "error") {
      loadNews(code);
    }
  };

  const newsSummary =
    newsItem?.headline ??
    (newsStatus === "error"
      ? "뉴스를 불러오지 못했어요. 다시 눌러 주세요."
      : newsStatus === "empty"
        ? "아직 검수를 통과한 새 소식이 없어요."
        : "검수를 통과한 새 소식을 찾고 있어요.");
  const newsMoreLabel = newsItem
    ? "뉴스 자세히 보기"
    : newsStatus === "error"
      ? "다시 불러오기"
      : newsStatus === "empty"
        ? "새 소식 없음"
        : "불러오는 중";
  const newsMoreActive = Boolean(newsItem) || newsStatus === "error";
  const newsMoreStyle = styleFromCss(
    "font-size:13px;font-weight:700;color:#01185A;padding:9px 14px;border-radius:999px;white-space:nowrap;" +
      "background:radial-gradient(ellipse 64% 56% at 50% -6%,rgba(255,255,255,1) 0%,rgba(255,255,255,0.5) 44%,rgba(255,255,255,0) 86%)," +
      "linear-gradient(180deg,#FCFCFE 0%,#F4F5FB 36%,#EBEDF7 70%,#E2E5F1 100%);" +
      "box-shadow:0 7px 12px -5px rgba(35,25,80,0.2),inset 0 -8px 13px -7px rgba(255,255,255,0.9),inset 0 1.5px 2px rgba(255,255,255,1);" +
      `cursor:${newsMoreActive ? "pointer" : "default"};opacity:${newsMoreActive ? "1" : "0.58"}`,
  );
  const badgeStyle = styleFromCss(
    "width:52px;height:52px;flex:none;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:25px;background:#F4F4FA" +
      (stock.logoUrl
        ? `;background-image:url(${stock.logoUrl});background-position:center;background-size:contain;background-repeat:no-repeat`
        : ""),
  );
  const chart = buildDetailChart({
    code,
    spark: live.spark,
    price: live.price,
    changePercent: live.change,
    trades,
  });

  const screen =
    view === "chart" ? (
      <ChartScreen
        changeStyle={changeStyle}
        code={code}
        locked={locked}
        name={stock.name}
        onBack={() => setView("detail")}
        onLeave={onLeave}
        onStartBuy={startBuy}
        priceText={priceText}
        changeText={changeText}
      />
    ) : view === "news" && activeNews ? (
      <NewsScreen
        code={code}
        item={activeNews}
        locked={locked}
        onBack={() => setView("detail")}
        onLeave={onLeave}
        onStartBuy={startBuy}
        stockName={stock.name}
      />
    ) : (
      <div style={SUB_PAGE}>
        <SubScreenHeader
          // 떠날 때 보던 목록으로 돌아간다 — 늘 `/explore` 로 보내면 고른 섹터가 풀린다.
          onBack={() => onLeave(lastExplorePath())}
          right={
            <div onClick={toggleWatch} style={WATCH_BTN}>
              <svg height={19} style={{ display: "block" }} viewBox="0 0 21 19" width={21}>
                <path
                  d="M10.5 17.5 2.6 9.9a4.6 4.6 0 1 1 7.9-4.4 4.6 4.6 0 1 1 7.9 4.4z"
                  fill={watched ? "#F5327F" : "none"}
                  stroke={watched ? "#F5327F" : "#B8BDD0"}
                  strokeLinejoin="round"
                  strokeWidth={1.6}
                />
              </svg>
            </div>
          }
          // 원본 헤더 제목은 종목 이름이 아니라 화면 이름이다 — 이름은 아래 카드가 말한다.
          title="종목 상세"
        />
        <div style={SCROLL}>
          <div style={WALLET_PILL}>
            <span style={WALLET_LABEL}>내 지갑</span>
            <span style={WALLET_CASH}>{won(me.cash)}</span>
          </div>
          <div style={PRICE_CARD}>
            <div style={NAME_ROW}>
              <div style={NAME_TEXT}>{stock.name}</div>
              <div style={badgeFor(stock.sector)}>{stock.sectorName}</div>
            </div>
            <div style={PRICE_TEXT}>{priceText}</div>
            <div style={CHANGE_ROW}>
              <span style={changeStyle}>{changeText}</span>
              <span style={diffStyle}>{diffText}</span>
            </div>
            <div style={CHART_WRAP}>
              <svg
                height={164}
                preserveAspectRatio="none"
                style={{ display: "block" }}
                viewBox="0 0 336 164"
                width={336}
              >
                {chart && (
                  <>
                    <polyline
                      fill="none"
                      points={chart.linePoints}
                      stroke={changeUp ? UP : DOWN}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.4}
                    />
                    {chart.pins.map((pin) => (
                      <line
                        key={pin.id}
                        stroke={pin.color}
                        strokeDasharray="2 3"
                        strokeOpacity={0.35}
                        x1={pin.x}
                        x2={pin.x}
                        y1={pin.y}
                        y2={164}
                      />
                    ))}
                    <circle cx={chart.hi.x} cy={chart.hi.y} fill={changeUp ? UP : DOWN} r={2.6} />
                    <circle cx={chart.lo.x} cy={chart.lo.y} fill={changeUp ? UP : DOWN} r={2.6} />
                  </>
                )}
              </svg>
              {chart?.hi.visible && (
                <div style={{ ...HI_LO_LABEL, left: chart.hi.x, top: chart.hi.labelY, color: changeUp ? UP : DOWN }}>
                  {chart.hi.text}
                </div>
              )}
              {chart?.lo.visible && (
                <div style={{ ...HI_LO_LABEL, left: chart.lo.x, top: chart.lo.labelY, color: changeUp ? UP : DOWN }}>
                  {chart.lo.text}
                </div>
              )}
              {chart?.pins.map((pin) => {
                const color = pin.color;
                return (
                  <div key={pin.id} style={{ ...PIN, left: pin.x, top: pin.y - 7 }} title={pin.title}>
                    <div style={{ ...PIN_BODY, background: color }}>{pin.label}</div>
                    <div style={{ ...PIN_TAIL, borderTop: `7px solid ${color}` }} />
                  </div>
                );
              })}
            </div>
            <div style={CARD_FOOT}>
              <div onClick={openChart} style={MORE_BTN}>
                차트 자세히 보기 ›
              </div>
            </div>
          </div>

          <div style={CARD}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={CARD_TITLE}>이 회사는 뭘 하나요?</span>
            </div>
            <div style={CARD_BODY}>{`${stock.name}${josa(stock.name)} ${stock.desc}.`}</div>
          </div>

          <div style={CARD}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={CARD_TITLE}>요즘 무슨 일이 있었나요?</span>
            </div>
            <div style={CARD_BODY}>{newsSummary}</div>
            <div style={styleFromCss("display:flex;align-items:center;justify-content:flex-end;margin-top:13px")}>
              <div onClick={openNews} style={newsMoreStyle}>
                {newsMoreLabel} ›
              </div>
            </div>
          </div>
        </div>
        <StockFooter locked={locked} onLeave={onLeave} onStartBuy={startBuy} />
      </div>
    );

  return <PhoneFrame>{screen}</PhoneFrame>;
}
