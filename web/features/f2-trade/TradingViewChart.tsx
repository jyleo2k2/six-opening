"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  LineSeries,
  type ISeriesApi,
  type SeriesMarker,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  parseChartPoints,
  type ChartPoint,
  type PrototypeChartPeriod,
  type PrototypeChartType,
} from "./chart-data";
import { buildTradeMarkers, symbolTrades } from "../../shared/engine/trade-markers";
import { readPrototypeTrades } from "../../shared/store/prototype-trades";
import type { FamilyMember } from "../../shared/types/trade";

type LoadState = "loading" | "ready" | "error";

/** 마커를 누르면 최상위 React 가 그 거래의 피드 카드를 연다. F11 SPEC §6 */
const OPEN_TRADE_MESSAGE = "kiwoom:open-trade";
/** 차트가 떴다고 app.html 에 알린다. 답으로 현재 기간·차트종류가 온다. */
const CHART_READY_MESSAGE = "kiwoom:chart-ready";
const CHART_OPTIONS_MESSAGE = "kiwoom:chart-options";

const PERIODS: readonly PrototypeChartPeriod[] = ["minute", "daily", "weekly"];
const CHART_TYPES: readonly PrototypeChartType[] = ["line", "candlestick"];

/**
 * 가족 매매 지점을 차트에 얹는다. F11 SPEC §6
 *
 * 거래 원본은 app.html 이 `localStorage` 에 쌓는다. 이 차트는 app.html 안의 iframe 이라
 * 같은 오리진이고, 그래서 부모를 거치지 않고 그 키를 직접 읽는다. 별도 투자 스토어를
 * 두면 저장소가 갈려 카드와 차트 값이 어긋난다.
 */
function attachTradeMarkers(options: {
  series: ISeriesApi<SeriesType, Time>;
  symbol: string;
  viewer: FamilyMember | null;
  candleTimes: readonly number[];
  colors: { child: string; parent: string };
}) {
  const { series, symbol, viewer, candleTimes, colors } = options;
  const markers = buildTradeMarkers({
    trades: symbolTrades(readPrototypeTrades(), symbol),
    viewer,
    candleTimes,
  });
  if (!markers.length) return null;

  const drawn: SeriesMarker<Time>[] = markers.map((marker) => ({
    id: marker.id,
    time: marker.time as UTCTimestamp,
    price: marker.price,
    // 마커의 y 가 곧 체결가다. 봉 위아래로 밀지 않는다.
    position: "atPriceMiddle",
    shape: marker.side === "buy" ? "arrowUp" : "arrowDown",
    color: colors[marker.member],
    text: marker.label,
  }));
  return createSeriesMarkers(series, drawn);
}

function token(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function formatTime(time: Time, period: PrototypeChartPeriod) {
  if (typeof time !== "number") return String(time);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    ...(period === "minute" ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(time * 1000));
}

export function TradingViewChart({ symbol, period, chartType, viewer = null }: {
  symbol: string;
  /** 첫 렌더용 기본값. 이후 값은 app.html 이 메시지로 바꾼다. */
  period: PrototypeChartPeriod;
  /** 첫 렌더용 기본값. 이후 값은 app.html 이 메시지로 바꾼다. */
  chartType: PrototypeChartType;
  /** 열람 계정. 모르면 어느 마커에도 수량을 붙이지 않는다 (SPEC §6). */
  viewer?: FamilyMember | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState({ period, chartType });
  const [points, setPoints] = useState<ChartPoint[] | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const { period: shownPeriod, chartType: shownChartType } = shown;

  /**
   * 기간·차트종류를 부모(app.html)에게서 메시지로 받는다.
   *
   * 예전에는 두 값이 iframe `src` 의 쿼리에 있어서, 분봉·일봉·주봉이나 선·캔들을 누를 때마다
   * 이 문서가 통째로 다시 열렸다. 차트 번들을 다시 파싱하고 데이터도 다시 받았는데,
   * 선↔캔들은 그릴 데이터가 완전히 같아서 그 왕복이 전부 헛일이었다.
   */
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return;
      const message = event.data as {
        type?: unknown;
        period?: unknown;
        chartType?: unknown;
      } | null;
      if (!message || typeof message !== "object" || message.type !== CHART_OPTIONS_MESSAGE) return;

      setShown((current) => {
        const next = {
          period: PERIODS.includes(message.period as PrototypeChartPeriod)
            ? (message.period as PrototypeChartPeriod)
            : current.period,
          chartType: CHART_TYPES.includes(message.chartType as PrototypeChartType)
            ? (message.chartType as PrototypeChartType)
            : current.chartType,
        };
        return next.period === current.period && next.chartType === current.chartType
          ? current
          : next;
      });
    };

    window.addEventListener("message", receive);
    // 종목이 바뀌어 이 문서가 다시 열렸을 때도 부모의 현재 선택을 되받는다.
    window.parent.postMessage({ type: CHART_READY_MESSAGE }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  // 데이터는 종목·기간에만 달려 있다. 선↔캔들 전환은 여기를 다시 타지 않는다.
  useEffect(() => {
    const controller = new AbortController();
    setPoints(null);
    setState("loading");

    fetch(`/api/quote/${encodeURIComponent(symbol)}/chart?period=${shownPeriod}`, {
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("chart request failed")))
      .then((payload: unknown) => {
        const received = parseChartPoints(payload);
        if (!received.length) throw new Error("empty chart");
        setPoints(received);
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("error");
      });

    return () => controller.abort();
  }, [shownPeriod, symbol]);

  useEffect(() => {
    const container = containerRef.current;
    if (!points || !container) return;

    const up = token("--color-up", "#E8322E");
    const down = token("--color-down", "#1668DC");
    const ink = token("--color-ink", "#1A2233");
    const gray = token("--color-gray", "#BEBEBE");
    const bg = token("--color-bg", "#F6F7FA");
    const white = token("--color-white", "#FFFFFF");
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 238,
      layout: {
        background: { type: ColorType.Solid, color: white },
        textColor: ink,
        fontFamily: "Pretendard, Segoe UI, Malgun Gothic, sans-serif",
        attributionLogo: false,
      },
      grid: { vertLines: { color: bg }, horzLines: { color: bg } },
      rightPriceScale: { borderColor: gray },
      timeScale: { borderColor: gray, timeVisible: shownPeriod === "minute", secondsVisible: false },
      localization: {
        locale: "ko-KR",
        priceFormatter: (price: number) => `${Math.round(price).toLocaleString("ko-KR")}원`,
        timeFormatter: (time: Time) => formatTime(time, shownPeriod),
      },
      crosshair: { vertLine: { color: gray }, horzLine: { color: gray } },
    });
    let series: ISeriesApi<SeriesType, Time>;
    if (shownChartType === "line") {
      const positive = points.at(-1)!.close >= points[0].close;
      const line = chart.addSeries(LineSeries, {
        color: positive ? up : down,
        lineWidth: 3,
        priceLineVisible: true,
        lastValueVisible: true,
      });
      line.setData(points.map((point) => ({
        time: point.time as UTCTimestamp,
        value: point.close,
      })));
      series = line;
    } else {
      const candles = chart.addSeries(CandlestickSeries, {
        upColor: up,
        downColor: down,
        borderUpColor: up,
        borderDownColor: down,
        wickUpColor: up,
        wickDownColor: down,
        priceLineVisible: true,
        lastValueVisible: true,
      });
      candles.setData(points.map((point) => ({
        time: point.time as UTCTimestamp,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
      })));
      series = candles;
    }

    attachTradeMarkers({
      series,
      symbol,
      viewer,
      candleTimes: points.map((point) => point.time),
      colors: {
        child: token("--color-magenta", "#D70082"),
        parent: token("--color-navy", "#001E5A"),
      },
    });
    // 마커를 누르면 최상위 React 가 그 거래의 피드 카드를 열고 강조한다.
    chart.subscribeClick((param) => {
      const tradeId = param.hoveredObjectId;
      if (typeof tradeId !== "string") return;
      window.top?.postMessage(
        { type: OPEN_TRADE_MESSAGE, tradeId },
        window.location.origin,
      );
    });

    chart.timeScale().fitContent();

    const observer = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: Math.max(1, Math.floor(entry.contentRect.width)) });
    });
    observer.observe(container);
    setState("ready");

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [points, shownChartType, shownPeriod, symbol, viewer]);

  return (
    <main className="relative h-[264px] w-full overflow-hidden bg-white">
      <div ref={containerRef} className="h-[238px] w-full" role="img" aria-label={`${symbol} ${shownPeriod === "minute" ? "분봉" : shownPeriod === "daily" ? "일봉" : "주봉"} TradingView ${shownChartType === "line" ? "선" : "캔들"} 차트`} />
      {state !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center bg-white text-sm text-ink opacity-60" role="status">
          {state === "error" ? "차트 데이터를 불러오지 못했어요." : "차트를 불러오는 중이에요…"}
        </div>
      )}
      <a className="absolute bottom-0 left-1 text-[9px] text-ink opacity-50" href="https://www.tradingview.com/" target="_blank" rel="noreferrer">
        Charts by TradingView
      </a>
    </main>
  );
}
