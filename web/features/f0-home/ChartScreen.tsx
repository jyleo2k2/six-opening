"use client";

import { useEffect, useRef, useState } from "react";
import {
  StockFooter,
  SUB_PAGE,
  SUB_SCROLL,
  SubScreenHeader,
  WatchButton,
} from "./lib/stock-chrome";
import { styleFromCss } from "./lib/css-style";
import { buildTradeLegend, type PinRole } from "./lib/chart-trade-legend";
import { candleTipCopy, isCandleTipClosed, type CandleTipDismissals } from "./lib/candle-tip";
import {
  AXIS_LEFT,
  buildChartView,
  NOW_LEFT,
  PLOT_H,
  PLOT_W,
  SVG_W,
  TIME_AXIS_TOP,
  type ChartViewTrade,
} from "./lib/chart-view";
import { defaultChartWindow, type ChartWindow } from "./lib/chart-window";
import { useChartGesture } from "./lib/use-chart-gesture";
import { parseChartPoints, type ChartPoint } from "../f2-trade/chart-data";

const UP = "#E8322E";
const DOWN = "#1668DC";
/** 눈금선. 선보다 훨씬 옅어야 값이 아니라 칸으로 읽힌다. */
const GRID = "#EFEDF5";

const CARD = styleFromCss(
  "background:#FFFFFF;border-radius:28px;padding:18px;box-shadow:0 2px 10px rgba(30,25,60,0.05)",
);
/** 가격 카드 머리 — 시안 그대로 종목명이 왼쪽, 업종 배지가 오른쪽 끝이다. */
const NAME_ROW = styleFromCss("display:flex;align-items:flex-start;justify-content:space-between;gap:10px");
const NAME_TEXT = styleFromCss(
  "flex:1;min-width:0;font-size:16px;font-weight:700;color:#141B3D;letter-spacing:-0.02em;" +
    "white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
);
const PRICE = styleFromCss(
  "font-size:32px;font-weight:800;color:#0D1330;font-variant-numeric:tabular-nums;line-height:1.1;" +
    "margin-top:6px;white-space:nowrap;letter-spacing:-0.035em",
);
/** 변동액이 먼저, 등락률은 세로선 뒤에 작게 붙는다 — 상세 화면과 같은 한 줄이다. */
const CHANGE_ROW = styleFromCss("display:flex;align-items:baseline;gap:8px;margin-top:6px");

/** 선·캔들 전환 — 알약이 아니라 글자만 굵어지는 텍스트 토글. */
const chipText = (on: boolean) =>
  styleFromCss(
    "flex:none;display:flex;align-items:center;height:38px;padding:0 10px;font-size:14px;cursor:pointer;white-space:nowrap;background:transparent;" +
      (on ? "font-weight:800;color:#141B3D" : "font-weight:500;color:#A5A9BC"),
  );
const TF_ROW = styleFromCss(
  "position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px",
);
const TF_BTN = (open: boolean) =>
  styleFromCss(
    "flex:none;display:flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:999px;font-size:14.5px;font-weight:700;color:#141B3D;cursor:pointer;white-space:nowrap;" +
      (open ? "background:#F0EEF6;box-shadow:inset 0 0 0 1.5px rgba(245,50,127,0.35)" : "background:#F1F2F8"),
  );
const TF_CARET = (open: boolean) =>
  styleFromCss(
    `display:block;flex:none;color:#6E7488;transition:transform 0.18s ease;transform:rotate(${open ? "180deg" : "0deg"})`,
  );
const TF_MENU = styleFromCss(
  "position:absolute;left:0;top:calc(100% + 8px);z-index:8;min-width:132px;background:#FFFFFF;border-radius:18px;padding:6px;" +
    "box-shadow:0 14px 30px -8px rgba(30,25,60,0.24),inset 0 0 0 1px #EFEDF5",
);
const TF_OPTION = (on: boolean) =>
  styleFromCss(
    "display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 13px;border-radius:13px;font-size:14.5px;cursor:pointer;white-space:nowrap;" +
      (on ? "font-weight:800;color:#141B3D;background:#FBF0F5" : "font-weight:600;color:#5C6280;background:transparent"),
  );
const TF_CHECK = (on: boolean) =>
  styleFromCss(on ? "font-size:13px;font-weight:800;color:#F5327F" : "visibility:hidden");
const CANDLE_TIP = styleFromCss(
  "position:relative;margin-top:14px;background:#FBE4F0;border-radius:22px;padding:15px 16px",
);
const CANDLE_TIP_ARROW = styleFromCss(
  "position:absolute;right:52px;top:-5px;width:12px;height:12px;transform:rotate(45deg);border-radius:3px;background:#FBE4F0;pointer-events:none",
);

/**
 * 차트가 앉는 자리. 안쪽 글자(가격 눈금·현재가 태그·최고/최저 이름표·핀)는 전부 여기에
 * `position:absolute` 로 얹히므로, 이 상자의 좌표계가 곧 SVG 의 좌표계여야 한다 —
 * 카드 안쪽 폭(화면 402 − 좌우 16 − 카드 18 = 334)이 SVG 폭과 정확히 같다.
 *
 * 끌어 옮기고 오므려 확대하는 손짓도 이 상자가 받는다(`useChartGesture`). `touch-action:none`
 * 이 있어야 손가락이 차트를 끌 때 브라우저가 페이지를 대신 스크롤하지 않고, `user-select`
 * 를 꺼야 옆으로 끄는 동안 가격 글자가 파랗게 잡히지 않는다.
 */
const CHART_WRAP = styleFromCss(
  "position:relative;margin-top:14px;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab",
);
/**
 * 오른쪽 가격 글자. SVG `<text>` 를 쓰지 않는 이유는 시안과 같다 — 값 구멍이 들어간
 * `<text>` 는 편집기가 span 을 끼워 넣어 글자가 사라진다.
 */
const AXIS_LABEL = styleFromCss(
  "position:absolute;font-size:10px;font-weight:500;color:#9096AE;white-space:nowrap;" +
    "font-variant-numeric:tabular-nums;pointer-events:none",
);
/**
 * 플롯 아래 시각 글자. 가격 글자와 같은 색·크기이되 봉 위에 가운데로 선다 — 어느 봉의
 * 시각인지가 자리로 읽혀야 해서 왼쪽 정렬로 두지 않는다.
 */
const TIME_LABEL = styleFromCss(
  "position:absolute;transform:translateX(-50%);font-size:10px;font-weight:500;color:#9096AE;white-space:nowrap;" +
    "font-variant-numeric:tabular-nums;pointer-events:none",
);
const NOW_TAG = styleFromCss(
  "position:absolute;display:flex;align-items:center;justify-content:center;height:20px;padding:0 6px;border-radius:5px;" +
    "font-size:10px;font-weight:700;color:#FFFFFF;white-space:nowrap;font-variant-numeric:tabular-nums;pointer-events:none",
);
const MARK_LABEL = styleFromCss(
  "position:absolute;transform:translateX(-50%);font-size:11.5px;font-weight:600;white-space:nowrap;pointer-events:none",
);
const PIN = styleFromCss(
  "position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;" +
    "pointer-events:none;filter:drop-shadow(0 2px 4px rgba(30,25,60,0.16))",
);
/** 파스텔 바탕에 짙은 남회색 글씨다 — 흰 글씨는 이 색 위에서 읽히지 않는다. */
const PIN_BODY = styleFromCss(
  "display:flex;align-items:center;justify-content:center;width:23px;height:23px;border-radius:8px;" +
    "font-size:12px;font-weight:800;color:#3A3F5C;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.7)",
);
const PIN_TAIL = styleFromCss(
  "width:0;height:0;margin-top:-1px;border-left:5px solid transparent;border-right:5px solid transparent",
);
const CHART_STATE = styleFromCss(
  "position:absolute;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;" +
    "background:#FFFFFF;font-size:13.5px;font-weight:500;color:#8E93A8",
);

/** 체결 범례 — 차트 아래 얇은 선을 긋고 한 줄씩 쌓는다. 체결이 없으면 아예 그리지 않는다. */
const LEGEND = styleFromCss(
  "display:flex;flex-direction:column;gap:7px;margin-top:12px;padding-top:12px;border-top:1px solid #F0EEF6",
);
const LEGEND_ROW = styleFromCss("display:flex;align-items:center;gap:7px");
/**
 * 점은 차트 위 핀을 그대로 축소한 모양이다. 색도 핀과 같은 토큰을 쓴다 — 범례가 있는
 * 이유가 "이 색 핀이 이 사람"이라서 색이 갈리면 안 된다. 글자색도 같이 토큰
 * (`--color-trade-ink`)에서 받는다 — 파스텔 바탕에 흰 글씨는 읽히지 않는다.
 */
const ROLE_COLOR: Record<PinRole, string> = {
  child: "var(--color-trade-child)",
  mom: "var(--color-trade-mom)",
  dad: "var(--color-trade-dad)",
};
const LEGEND_DOT = (role: PinRole) =>
  styleFromCss(
    "flex:none;display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:8px;" +
      `font-size:12px;font-weight:800;color:var(--color-trade-ink);background:${ROLE_COLOR[role]}`,
  );
const LEGEND_TEXT = styleFromCss(
  "display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:500;color:#5C6280;white-space:nowrap",
);
const LEGEND_WHO = styleFromCss("font-weight:600;color:#3A3F5C");
const LEGEND_BAR = styleFromCss("color:#D6D3E4");
const LEGEND_PRICE = styleFromCss("font-variant-numeric:tabular-nums");

type ChartPeriod = "minute" | "daily" | "weekly";
type ChartType = "line" | "candlestick";
const TF_OPTIONS: { id: ChartPeriod; label: string }[] = [
  { id: "minute", label: "분" },
  { id: "daily", label: "일" },
  { id: "weekly", label: "주" },
];

type LoadState = "loading" | "ready" | "error";

/**
 * 차트 화면. 시안(서비스 개요 HTML)의 "차트 화면" 카드를 그대로 옮겼다.
 *
 * 차트는 **이 컴포넌트가 직접 그린다.** 예전에는 `/tradingview-chart` iframe 안의
 * `lightweight-charts` 가 그렸는데, 그 렌더러는 세로 축선·시간축·세로 눈금선을 늘 함께
 * 그려서 시안(축선 없이 가로 눈금 다섯 줄 + 오른쪽 가격 글자)과 다른 화면이 나왔다.
 * 라이브러리 설정으로는 축을 없앨 수 없어 시안의 SVG 를 그대로 쓴다. 기하는 브라우저
 * 없이 확인할 수 있게 `lib/chart-view.ts` 순수 계산이 갖는다.
 *
 * 그래서 `kiwoom:chart-options`·`kiwoom:chart-ready` 두 메시지도 함께 사라졌다 —
 * 기간·차트종류는 이제 그냥 이 컴포넌트의 상태다.
 */
export function ChartScreen({
  code,
  name,
  sectorName,
  sectorStyle,
  price,
  priceText,
  changeText,
  changeStyle,
  diffText,
  diffStyle,
  changeUp,
  locked,
  onBack,
  onLeave,
  onStartBuy,
  watched,
  onToggleWatch,
  closedCandleTips,
  onCloseCandleTip,
}: {
  code: string;
  name: string;
  sectorName: string;
  sectorStyle: React.CSSProperties;
  /** 지금 가격. 현재가 태그와 마지막 봉의 종가가 이 값을 쓴다. */
  price: number;
  priceText: string;
  changeText: string;
  changeStyle: React.CSSProperties;
  diffText: string;
  diffStyle: React.CSSProperties;
  /** 선·기준선·최고/최저 이름표의 색을 정한다. */
  changeUp: boolean;
  locked: boolean;
  onBack: () => void;
  /** 하단 탭바가 쓴다. 뒤로가기(`onBack`)는 상세로 돌아가지만 탭은 앱의 다른 화면으로 나간다. */
  onLeave: (path: string) => void;
  onStartBuy: () => void;
  /**
   * 헤더 오른쪽 하트. 상태도 누름도 상세(`DetailScreen`)가 갖는다 — 두 화면의 하트가
   * 같은 `useWatchlist` 하나를 봐야 오갈 때 켜짐이 어긋나지 않는다.
   */
  watched: boolean;
  onToggleWatch: () => void;
  /**
   * 지금까지 X 로 닫은 캔들 안내. 화면을 오가도 남아야 해서 `ConnectedPrototype` 이 갖고
   * 상세를 거쳐 내려온다 — 여기에 지역 상태로 두면 종목을 떠날 때마다 안내가 되살아난다.
   */
  closedCandleTips: CandleTipDismissals;
  onCloseCandleTip: (period: ChartPeriod) => void;
}) {
  const [period, setPeriod] = useState<ChartPeriod>("daily");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [tfMenuOpen, setTfMenuOpen] = useState(false);
  const [points, setPoints] = useState<ChartPoint[] | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  /**
   * 이 종목의 가족 체결. `GET /api/trades` 가 유일한 출처다 (F11 SPEC §6.1).
   * 차트 위 B/S 핀과 아래 범례가 **같은 목록 하나**를 본다 — 예전에는 iframe 과 범례가
   * 같은 API 를 따로 불러 둘이 어긋날 자리가 있었다.
   */
  const [trades, setTrades] = useState<ChartViewTrade[]>([]);
  /**
   * 지금 보고 있는 구간. 손짓이 이 값을 옮기고 넓힌다.
   *
   * 종목·기간·차트종류가 바뀌면 기본 구간으로 되돌린다 — 담는 봉 개수가 셋마다 다르고
   * (`DEFAULT_CHART_BARS`), 다른 종목의 창을 물려받으면 보던 자리와 무관한 데서 시작한다.
   */
  // 이름을 `window` 로 줄이지 않는다 — 아래 폴링이 쓰는 전역 `window.setInterval` 을 가린다.
  const [chartWindow, setChartWindow] = useState<ChartWindow>(() =>
    defaultChartWindow(period, chartType),
  );
  useEffect(() => {
    setChartWindow(defaultChartWindow(period, chartType));
  }, [code, period, chartType]);

  /**
   * 봉 데이터. 종목·기간에만 달려 있고 선↔캔들 전환은 여기를 다시 타지 않는다.
   *
   * 실시간처럼 보이게 1초마다 전체를 다시 받는다. 겹치는 요청은 만들지 않는다 —
   * 이전 틱이 아직 안 끝났으면 다음 호출을 건너뛴다.
   */
  useEffect(() => {
    const controller = new AbortController();
    setPoints(null);
    setState("loading");

    let fetching = false;
    const load = () => {
      if (fetching) return;
      fetching = true;
      fetch(`/api/quote/${encodeURIComponent(code)}/chart?period=${period}`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error("chart request failed"))))
        .then((payload: unknown) => {
          const received = parseChartPoints(payload);
          if (!received.length) throw new Error("empty chart");
          setPoints(received);
          setState("ready");
        })
        .catch(() => {
          // 최초 로드 실패만 화면을 에러로 바꾼다. 이미 보여주고 있는 값이 있으면
          // 그 틱의 실패는 무시하고 다음 1초 뒤에 다시 시도한다.
          if (!controller.signal.aborted) {
            setState((current) => (current === "loading" ? "error" : current));
          }
        })
        .finally(() => {
          fetching = false;
        });
    };

    load();
    const timer = window.setInterval(load, 1000);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, [code, period]);

  // 로그인 전(401)이나 조회 실패는 빈 목록으로 둔다. 핀·범례 없는 차트는 정상이다.
  useEffect(() => {
    let cancelled = false;
    setTrades([]);
    fetch(`/api/trades?symbol=${encodeURIComponent(code)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { trades?: ChartViewTrade[] } | null) => {
        if (!cancelled && data) setTrades(data.trades ?? []);
      })
      .catch(() => {
        if (!cancelled) setTrades([]);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const pickPeriod = (next: ChartPeriod) => {
    setPeriod(next);
    setTfMenuOpen(false);
  };
  const tfLabel = TF_OPTIONS.find((option) => option.id === period)?.label ?? "일";
  const legend = buildTradeLegend(trades);
  const line = changeUp ? UP : DOWN;
  const chart = points
    ? buildChartView({ points, price, period, chartType, trades, window: chartWindow })
    : null;
  const gesture = useChartGesture({
    chartType,
    defaults: defaultChartWindow(period, chartType),
    onWindow: setChartWindow,
    plotWidth: PLOT_W,
    times: points?.map((point) => point.time) ?? [],
    window: chartWindow,
  });

  return (
    <div style={SUB_PAGE}>
      <SubScreenHeader
        onBack={onBack}
        right={<WatchButton onToggle={onToggleWatch} watched={watched} />}
        title={`${name} 차트`}
      />
      <div style={SUB_SCROLL}>
        <div style={CARD}>
          <div style={NAME_ROW}>
            <div style={NAME_TEXT}>{name}</div>
            <div style={sectorStyle}>{sectorName}</div>
          </div>
          <div style={PRICE}>{priceText}</div>
          <div style={CHANGE_ROW}>
            <span style={changeStyle}>{changeText}</span>
            <span style={diffStyle}>{diffText}</span>
          </div>
          <div style={TF_ROW}>
            <div onClick={() => setTfMenuOpen((open) => !open)} style={TF_BTN(tfMenuOpen)}>
              <span>{tfLabel}</span>
              <svg fill="none" height="12" style={TF_CARET(tfMenuOpen)} viewBox="0 0 12 12" width="12">
                <path
                  d="M2.5 4.5 L6 8 L9.5 4.5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <div onClick={() => setChartType("line")} style={chipText(chartType === "line")}>
                선차트
              </div>
              <div onClick={() => setChartType("candlestick")} style={chipText(chartType === "candlestick")}>
                캔들차트
              </div>
            </div>
            {tfMenuOpen && (
              <div style={TF_MENU}>
                {TF_OPTIONS.map((option) => (
                  <div key={option.id} onClick={() => pickPeriod(option.id)} style={TF_OPTION(option.id === period)}>
                    <span>{option.label}</span>
                    <span style={TF_CHECK(option.id === period)}>✓</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/*
            캔들 설명은 캔들차트를 켰을 때만 뜨고, 문구는 기간마다 다르다 — 막대 하나가
            덮는 시간이 분 1분·일 하루·주 1주일로 갈리기 때문이다. X 로 닫으면 그 기간만
            숨고 나머지 둘은 한 번씩 더 보여 준다(`lib/candle-tip.ts`).
          */}
          {chartType === "candlestick" && !isCandleTipClosed(closedCandleTips, period) && (
            <div style={CANDLE_TIP}>
              <div style={CANDLE_TIP_ARROW} />
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: "#B3286B", letterSpacing: "-0.01em" }}>
                    {candleTipCopy(period).title}
                  </div>
                  <div
                    style={styleFromCss(
                      "font-size:13px;font-weight:500;color:#B3286B;line-height:1.65;margin-top:7px;text-wrap:pretty",
                    )}
                  >
                    시작한 값보다 끝난 값이 높으면 <b style={{ color: UP }}>빨간 막대</b>, 낮으면{" "}
                    <b style={{ color: DOWN }}>파란 막대</b>예요. 위아래로 나온 선은{" "}
                    {candleTipCopy(period).span} 가장 비쌌던 값과 가장 쌌던 값이에요.
                  </div>
                </div>
                <div
                  onClick={() => onCloseCandleTip(period)}
                  style={{
                    flex: "none",
                    width: 22,
                    height: 22,
                    marginTop: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <svg fill="none" height="13" viewBox="0 0 13 13" width="13">
                    <path
                      d="M1.8 1.8 L11.2 11.2 M11.2 1.8 L1.8 11.2"
                      stroke="#B3286B"
                      strokeLinecap="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
          {/*
            시안의 차트. 세로 축선은 없다 — 가로 눈금 다섯 줄만 플롯 폭(278)까지 긋고, 가격은
            그 오른쪽 여백에 HTML 글자로 얹는다. 값을 어느 눈금과 맞춰 읽을지는 현재가 태그와
            최고·최저 이름표가 대신 짚어 준다.

            시간은 플롯 아래 글자로만 적는다(`timeAxis`). 세로 눈금선은 긋지 않는다 — 봉과
            핀이 이미 세로로 서 있어 선을 더하면 어느 것이 값이고 어느 것이 눈금인지 갈린다.
          */}
          <div ref={gesture.ref} style={CHART_WRAP}>
            <svg
              height={PLOT_H}
              style={{ display: "block", overflow: "visible" }}
              viewBox={`0 0 ${SVG_W} ${PLOT_H}`}
              width={SVG_W}
            >
              {chart && (
                <>
                  {chart.grid.map((gy, index) => (
                    <line key={index} stroke={GRID} strokeWidth={1} x1={0} x2={PLOT_W} y1={gy} y2={gy} />
                  ))}
                  {/* 기간 첫 값 — "여기서 시작해서 지금 여기"를 눈으로 잇는 기준선이다. */}
                  <line
                    opacity={0.55}
                    stroke={line}
                    strokeDasharray="3 4"
                    strokeWidth={1}
                    x1={0}
                    x2={PLOT_W}
                    y1={chart.baseY}
                    y2={chart.baseY}
                  />
                  {chart.candles.map((candle, index) => (
                    <g key={index}>
                      <line
                        stroke={candle.up ? UP : DOWN}
                        strokeWidth={1.2}
                        x1={candle.x}
                        x2={candle.x}
                        y1={candle.highY}
                        y2={candle.lowY}
                      />
                      <rect
                        fill={candle.up ? UP : DOWN}
                        height={candle.bodyH}
                        rx={1}
                        width={candle.bodyW}
                        x={candle.bodyX}
                        y={candle.bodyY}
                      />
                    </g>
                  ))}
                  {chart.linePoints && (
                    <polyline
                      fill="none"
                      points={chart.linePoints}
                      stroke={line}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  )}
                  {/* 핀에서 바닥까지 내리는 점선. 핀 하나가 어느 봉인지 못 박는다. */}
                  {chart.pins.map((pin) => (
                    <line
                      key={pin.id}
                      opacity={0.4}
                      stroke={pin.color}
                      strokeDasharray="2 3"
                      strokeWidth={1}
                      x1={pin.x}
                      x2={pin.x}
                      y1={pin.y}
                      y2={PLOT_H}
                    />
                  ))}
                  {chart.hi.visible && <circle cx={chart.hi.x} cy={chart.hi.y} fill={line} r={2} />}
                  {chart.lo.visible && <circle cx={chart.lo.x} cy={chart.lo.y} fill={line} r={2} />}
                </>
              )}
            </svg>
            {chart?.axis.map((tick) => (
              <div key={tick.y} style={{ ...AXIS_LABEL, left: AXIS_LEFT, top: tick.y - 7 }}>
                {tick.text}
              </div>
            ))}
            {chart?.timeAxis.map((tick) => (
              <div key={tick.x} style={{ ...TIME_LABEL, left: tick.x, top: TIME_AXIS_TOP }}>
                {tick.text}
              </div>
            ))}
            {/* 과거 구간을 보고 있을 때는 지금 가격표를 띄우지 않는다 — 그 구간의 값이 아니다. */}
            {chart?.nowVisible && (
              <div style={{ ...NOW_TAG, left: NOW_LEFT, top: chart.nowY - 10, background: line }}>
                {chart.nowText}
              </div>
            )}
            {chart?.hi.visible && (
              <div style={{ ...MARK_LABEL, left: chart.hi.labelX, top: chart.hi.labelY, color: line }}>
                {chart.hi.text}
              </div>
            )}
            {chart?.lo.visible && (
              <div style={{ ...MARK_LABEL, left: chart.lo.labelX, top: chart.lo.labelY, color: line }}>
                {chart.lo.text}
              </div>
            )}
            {chart?.pins.map((pin) => (
              <div key={pin.id} style={{ ...PIN, left: pin.x, top: pin.y - 7 }} title={pin.title}>
                <div style={{ ...PIN_BODY, background: pin.color }}>{pin.label}</div>
                <div style={{ ...PIN_TAIL, borderTop: `7px solid ${pin.color}` }} />
              </div>
            ))}
            {/*
              봉을 받아 놓고도 기하가 안 나오는 경우(봉이 하나뿐이라 x 를 나눌 수 없다)가
              있다. 그때 "불러오는 중" 을 계속 띄우면 영영 오지 않을 것을 기다리게 되므로
              받아 온 뒤의 실패는 실패라고 말한다.
            */}
            {!chart && (
              <div role="status" style={CHART_STATE}>
                {state === "loading" ? "차트를 불러오는 중이에요…" : "차트 데이터를 불러오지 못했어요."}
              </div>
            )}
          </div>
          {/*
            차트 위 B/S 핀이 각각 누구의 언제·얼마짜리 매매인지 풀어 쓴다. 핀은 선 위에
            앉으므로 체결가는 여기서만 정확한 숫자로 읽는다. 체결이 없으면 통째로 그리지
            않는다 — 빈 줄과 얇은 선만 남으면 기록이 있는데 못 불러온 것처럼 보인다.
          */}
          {legend.length > 0 && (
            <div style={LEGEND}>
              {legend.map((row) => (
                <div key={row.id} style={LEGEND_ROW}>
                  <div style={LEGEND_DOT(row.role)}>{row.label}</div>
                  <div style={LEGEND_TEXT}>
                    <span style={LEGEND_WHO}>{row.who}</span>
                    <span style={LEGEND_BAR}>|</span>
                    <span>{row.date}</span>
                    <span style={LEGEND_BAR}>|</span>
                    <span style={LEGEND_PRICE}>{row.price}</span>
                    <span style={LEGEND_BAR}>|</span>
                    <span>{row.side}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <StockFooter locked={locked} onLeave={onLeave} onStartBuy={onStartBuy} />
    </div>
  );
}
