"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  parseChartPoints,
  type PrototypeChartPeriod,
  type PrototypeChartType,
} from "./chart-data";
import { buildTradeMarkers, symbolTrades, type TradeMarker } from "../../shared/engine/trade-markers";
import { readPrototypeTrades } from "../../shared/store/prototype-trades";
import type { FamilyMember } from "../../shared/types/trade";

type LoadState = "loading" | "ready" | "error";

/** 화면에 찍을 자리가 잡힌 마커. */
type PlacedMarker = TradeMarker & { x: number; y: number };

/** 뱃지 한 변. 원본 시안(서비스 개요 HTML)의 22×22 rx=6 을 따른다. */
const BADGE = 22;

/**
 * 가족 매매 지점 마커. F11 SPEC §6
 *
 * 라이브러리 기본 마커는 모양이 원·사각·화살표뿐이라 시안의 "삼각 포인터 + 둥근 뱃지
 * + 흰 B/S" 를 못 그린다. 대신 차트가 주는 좌표 변환만 빌려 SVG 를 차트 위에 얹는다.
 * 시안 마크업을 그대로 쓸 수 있고, 나중에 탭·툴팁을 붙일 때도 DOM 이벤트로 끝난다.
 *
 * 거래 원본은 app.html 이 `localStorage` 에 쌓는다. 이 차트는 app.html 안의 iframe 이라
 * 같은 오리진이고, 그래서 부모를 거치지 않고 그 키를 직접 읽는다. 별도 투자 스토어를
 * 두면 저장소가 갈려 카드와 차트 값이 어긋난다.
 */
function placeMarkers(
  markers: readonly TradeMarker[],
  chart: IChartApi,
  series: ISeriesApi<SeriesType, Time>,
): PlacedMarker[] {
  const timeScale = chart.timeScale();
  const placed: PlacedMarker[] = [];
  for (const marker of markers) {
    const x = timeScale.timeToCoordinate(marker.time as UTCTimestamp);
    const y = series.priceToCoordinate(marker.price);
    // 스크롤·줌으로 화면 밖에 나간 체결은 좌표가 없다. 그리지 않는다.
    if (x === null || y === null) continue;
    placed.push({ ...marker, x, y });
  }
  return placed;
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
  const [placed, setPlaced] = useState<PlacedMarker[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    // 종목·기간이 바뀌면 이전 종목의 마커가 남아 있으면 안 된다.
    setPlaced([]);

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

        chart.timeScale().fitContent();

        // 마커는 표시만 한다. 클릭 이동은 붙이지 않는다 — F11 SPEC §6 참고.
        const markers = buildTradeMarkers({
          trades: symbolTrades(readPrototypeTrades(), symbol),
          viewer,
          candleTimes: points.map((point) => point.time),
        });
        // 스크롤·줌·리사이즈로 축이 움직이면 좌표를 다시 잡는다.
        const reposition = () => setPlaced(placeMarkers(markers, chart, series));
        reposition();
        chart.timeScale().subscribeVisibleLogicalRangeChange(reposition);

        const observer = new ResizeObserver(([entry]) => {
          chart.applyOptions({ width: Math.max(1, Math.floor(entry.contentRect.width)) });
          reposition();
        });
        observer.observe(container);
        chartRef.current = chart;
        setState("ready");

        controller.signal.addEventListener("abort", () => {
          observer.disconnect();
          chart.timeScale().unsubscribeVisibleLogicalRangeChange(reposition);
        }, { once: true });
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
      {state === "ready" && placed.length > 0 && (
        <svg className="pointer-events-none absolute left-0 top-0 h-[238px] w-full">
          {placed.map((marker) => {
            const fill =
              marker.member === "child"
                ? "var(--color-trade-child)"
                : "var(--color-trade-parent)";
            // 매수는 뱃지가 체결가 아래, 매도는 위. 삼각 포인터 꼭짓점이 체결가를 가리킨다.
            const badgeY =
              marker.side === "buy" ? marker.y + 8 : marker.y - 8 - BADGE;
            const wing = marker.side === "buy" ? marker.y + 8 : marker.y - 8;
            return (
              <g key={marker.id}>
                <title>{marker.label}</title>
                <polygon
                  points={`${marker.x - 5},${wing} ${marker.x + 5},${wing} ${marker.x},${marker.y}`}
                  fill={fill}
                />
                <rect
                  x={marker.x - BADGE / 2}
                  y={badgeY}
                  width={BADGE}
                  height={BADGE}
                  rx={6}
                  fill={fill}
                />
                <text
                  x={marker.x}
                  y={badgeY + BADGE / 2}
                  fontSize={12}
                  fontWeight={700}
                  fill="#fff"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {marker.side === "buy" ? "B" : "S"}
                </text>
              </g>
            );
          })}
        </svg>
      )}
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
