"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  parseChartPoints,
  type PrototypeChartPeriod,
  type PrototypeChartType,
} from "./chart-data";

type LoadState = "loading" | "ready" | "error";

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

export function TradingViewChart({ symbol, period, chartType }: {
  symbol: string;
  period: PrototypeChartPeriod;
  chartType: PrototypeChartType;
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
        if (chartType === "line") {
          const positive = points.at(-1)!.close >= points[0].close;
          const series = chart.addSeries(LineSeries, {
            color: positive ? up : down,
            lineWidth: 3,
            priceLineVisible: true,
            lastValueVisible: true,
          });
          series.setData(points.map((point) => ({
            time: point.time as UTCTimestamp,
            value: point.close,
          })));
        } else {
          const series = chart.addSeries(CandlestickSeries, {
            upColor: up,
            downColor: down,
            borderUpColor: up,
            borderDownColor: down,
            wickUpColor: up,
            wickDownColor: down,
            priceLineVisible: true,
            lastValueVisible: true,
          });
          series.setData(points.map((point) => ({
            time: point.time as UTCTimestamp,
            open: point.open,
            high: point.high,
            low: point.low,
            close: point.close,
          })));
        }
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
  }, [chartType, period, symbol]);

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
