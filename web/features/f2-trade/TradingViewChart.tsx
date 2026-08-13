"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  parseChartPoints,
  type PrototypeChartPeriod,
  type PrototypeChartType,
} from "./chart-data";
import { buildTradeMarkers, symbolTrades } from "../../shared/engine/trade-markers";
import { readPrototypeTrades } from "../../shared/store/prototype-trades";
import type { FamilyMember } from "../../shared/types/trade";

type LoadState = "loading" | "ready" | "error";

/** 마커를 누르면 최상위 React 가 그 거래의 피드 카드를 연다. F11 SPEC §6 */
const OPEN_TRADE_MESSAGE = "kiwoom:open-trade";

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
  period: PrototypeChartPeriod;
  chartType: PrototypeChartType;
  /** 열람 계정. 모르면 어느 마커에도 수량을 붙이지 않는다 (SPEC §6). */
  viewer?: FamilyMember | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");

    fetch(`/api/quote/${encodeURIComponent(symbol)}/chart?period=${period}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("chart request failed")))
      .then((payload: unknown) => {
        const points = parseChartPoints(payload);
        if (!points.length) throw new Error("empty chart");

        const container = containerRef.current;
        if (!container || controller.signal.aborted) return;

        chartRef.current?.remove();
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
          timeScale: { borderColor: gray, timeVisible: period === "minute", secondsVisible: false },
          localization: {
            locale: "ko-KR",
            priceFormatter: (price: number) => `${Math.round(price).toLocaleString("ko-KR")}원`,
            timeFormatter: (time: Time) => formatTime(time, period),
          },
          crosshair: { vertLine: { color: gray }, horzLine: { color: gray } },
        });
        let series: ISeriesApi<SeriesType, Time>;
        if (chartType === "line") {
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
        chartRef.current = chart;
        setState("ready");

        controller.signal.addEventListener("abort", () => observer.disconnect(), { once: true });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState("error");
      });

    return () => {
      controller.abort();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [chartType, period, symbol, viewer]);

  return (
    <main className="relative h-[264px] w-full overflow-hidden bg-white">
      <div ref={containerRef} className="h-[238px] w-full" role="img" aria-label={`${symbol} ${period === "minute" ? "분봉" : period === "daily" ? "일봉" : "주봉"} TradingView ${chartType === "line" ? "선" : "캔들"} 차트`} />
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
