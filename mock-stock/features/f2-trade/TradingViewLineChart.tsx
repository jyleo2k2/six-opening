"use client";

import { useEffect, useRef } from "react";
import {
  ColorType,
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { FamilyMember, Trade } from "@/shared/types";

export type ChartPoint = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  price: number;
};

type ChartPeriod = "minute" | "daily" | "weekly";
export type ChartType = "line" | "candlestick";

const COLORS = {
  navy: "#001E5A",
  magenta: "#D70082",
  gray: "#BEBEBE",
  bg: "#F6F7FA",
  white: "#FFFFFF",
  up: "#E8322E",
  down: "#1668DC",
  ink: "#1A2233",
} as const;

function nearestTime(points: ChartPoint[], tradedAt: string) {
  const target = new Date(tradedAt).getTime() / 1000;
  if (!Number.isFinite(target) || points.length === 0) return undefined;
  return points.reduce((nearest, point) => Math.abs(point.time - target) < Math.abs(nearest - target) ? point.time : nearest, points[0].time);
}

function formatTime(time: Time, period: ChartPeriod) {
  if (typeof time !== "number") return String(time);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    ...(period === "minute" ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(time * 1000));
}

export function TradingViewChart({ points, livePrice, positive, period, chartType, trades, viewer, onSelectTrade }: {
  points: ChartPoint[];
  livePrice: number;
  positive: boolean;
  period: ChartPeriod;
  chartType: ChartType;
  trades: Trade[];
  viewer: FamilyMember;
  onSelectTrade: (trade: Trade) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line", Time> | ISeriesApi<"Candlestick", Time> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const lastTimeRef = useRef<UTCTimestamp | undefined>(undefined);
  const lastPointRef = useRef<ChartPoint | undefined>(undefined);
  const onSelectTradeRef = useRef(onSelectTrade);
  const tradesRef = useRef(trades);

  useEffect(() => { onSelectTradeRef.current = onSelectTrade; }, [onSelectTrade]);
  useEffect(() => { tradesRef.current = trades; }, [trades]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 160,
      layout: { background: { type: ColorType.Solid, color: COLORS.white }, textColor: COLORS.ink, fontFamily: "Pretendard, Segoe UI, Malgun Gothic, sans-serif" },
      grid: { vertLines: { color: COLORS.bg }, horzLines: { color: COLORS.bg } },
      rightPriceScale: { borderColor: COLORS.gray },
      timeScale: { borderColor: COLORS.gray, timeVisible: period === "minute", secondsVisible: false },
      localization: {
        locale: "ko-KR",
        priceFormatter: (price: number) => `${Math.round(price).toLocaleString("ko-KR")}원`,
        timeFormatter: (time: Time) => formatTime(time, period),
      },
      crosshair: { vertLine: { color: COLORS.gray }, horzLine: { color: COLORS.gray } },
    });
    const series = chartType === "line"
      ? chart.addSeries(LineSeries, { color: positive ? COLORS.up : COLORS.down, lineWidth: 3, priceLineVisible: true, lastValueVisible: true })
      : chart.addSeries(CandlestickSeries, {
        upColor: COLORS.up,
        downColor: COLORS.down,
        borderUpColor: COLORS.up,
        borderDownColor: COLORS.down,
        wickUpColor: COLORS.up,
        wickDownColor: COLORS.down,
        priceLineVisible: true,
        lastValueVisible: true,
      });
    const markers = createSeriesMarkers(series, []);
    const resizeObserver = new ResizeObserver(([entry]) => chart.applyOptions({ width: Math.floor(entry.contentRect.width), height: 160 }));
    const handleClick = (event: { hoveredObjectId?: unknown }) => {
      if (typeof event.hoveredObjectId !== "string") return;
      const selected = tradesRef.current.find((trade) => trade.id === event.hoveredObjectId);
      if (selected) onSelectTradeRef.current(selected);
    };
    chart.subscribeClick(handleClick);
    resizeObserver.observe(container);
    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = markers;
    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeClick(handleClick);
      markers.detach();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
    };
  }, [chartType, period]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series || points.length === 0) return;
    if (chartType === "line") {
      const data = points.map((point) => ({ time: point.time as UTCTimestamp, value: point.close }));
      (series as ISeriesApi<"Line", Time>).setData(data);
    } else {
      const data = points.map((point) => ({ time: point.time as UTCTimestamp, open: point.open, high: point.high, low: point.low, close: point.close }));
      (series as ISeriesApi<"Candlestick", Time>).setData(data);
    }
    lastTimeRef.current = points.at(-1)?.time as UTCTimestamp | undefined;
    lastPointRef.current = points.at(-1);
    chartRef.current?.timeScale().fitContent();
  }, [chartType, points, period]);

  useEffect(() => {
    const series = seriesRef.current;
    const lastTime = lastTimeRef.current;
    const lastPoint = lastPointRef.current;
    if (!series || !lastTime || !lastPoint || livePrice <= 0) return;
    if (chartType === "line") {
      (series as ISeriesApi<"Line", Time>).update({ time: lastTime, value: livePrice });
    } else {
      const updated = { ...lastPoint, high: Math.max(lastPoint.high, livePrice), low: Math.min(lastPoint.low, livePrice), close: livePrice, price: livePrice };
      lastPointRef.current = updated;
      (series as ISeriesApi<"Candlestick", Time>).update({ time: lastTime, open: updated.open, high: updated.high, low: updated.low, close: updated.close });
    }
  }, [chartType, livePrice]);

  useEffect(() => {
    if (chartType === "line") (seriesRef.current as ISeriesApi<"Line", Time> | null)?.applyOptions({ color: positive ? COLORS.up : COLORS.down });
  }, [chartType, positive]);

  useEffect(() => {
    const markers = trades.flatMap((trade): SeriesMarker<Time>[] => {
      const time = nearestTime(points, trade.tradedAt);
      if (time == null) return [];
      const own = trade.member === viewer;
      return [{
        id: trade.id,
        time: time as UTCTimestamp,
        color: trade.member === "child" ? COLORS.magenta : COLORS.navy,
        position: trade.side === "buy" ? "belowBar" : "aboveBar",
        shape: trade.side === "buy" ? "arrowUp" : "arrowDown",
        text: `${trade.member === "child" ? "민지" : "엄마"} ${trade.side === "buy" ? "매수" : "매도"}${own ? ` ${trade.quantity}주` : ""}`,
      }];
    }).sort((left, right) => Number(left.time) - Number(right.time));
    markersRef.current?.setMarkers(markers);
  }, [points, trades, viewer]);

  return (
    <div>
      <div ref={containerRef} className="h-40 w-full" role="img" aria-label={`최근 가격 흐름과 가족 매매 지점 ${chartType === "line" ? "선" : "캔들"} 차트`} />
      <a className="mt-1 block text-left text-[9px] text-ink opacity-50" href="https://www.tradingview.com/" target="_blank" rel="noreferrer">Charts by TradingView</a>
    </div>
  );
}
