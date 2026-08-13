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
  type ChartPoint,
  type PrototypeChartPeriod,
  type PrototypeChartType,
} from "./chart-data";
import { buildTradeMarkers, symbolTrades, type TradeMarker } from "../../shared/engine/trade-markers";
import { readPrototypeTrades } from "../../shared/store/prototype-trades";
import { FAMILY_SEED_TRADES } from "../../shared/store/family-trade-seed";
import type { FamilyMember, Trade } from "../../shared/types/trade";

type LoadState = "loading" | "ready" | "error";

/** 차트가 떴다고 app.html 에 알린다. 답으로 현재 기간·차트종류가 온다. */
const CHART_READY_MESSAGE = "kiwoom:chart-ready";
const CHART_OPTIONS_MESSAGE = "kiwoom:chart-options";

const PERIODS: readonly PrototypeChartPeriod[] = ["minute", "daily", "weekly"];
const CHART_TYPES: readonly PrototypeChartType[] = ["line", "candlestick"];

/** 화면에 찍을 자리가 잡힌 마커. */
type PlacedMarker = TradeMarker & { x: number; y: number };

/** 뱃지 한 변. 원본 시안(서비스 개요 HTML)의 22×22 rx=6 을 따른다. */
const BADGE = 22;

/** 체결가를 가리키는 꼬리 높이. 뱃지 변에 맞닿는다. */
const TAIL = 7;

/**
 * 처음 보여줄 봉 개수.
 *
 * `fitContent()` 는 받아온 봉을 전부 330px 폭에 밀어 넣어서 일봉 1년치·주봉 3년치가
 * 실오라기처럼 뭉개진다. 기간별로 최근 구간만 잘라 띄우면 봉 하나가 8px 안팎이 되어
 * 캔들 몸통과 꼬리가 구분된다. 사용자는 그대로 왼쪽으로 스크롤해 과거를 볼 수 있다.
 */
const INITIAL_BARS: Record<PrototypeChartPeriod, number> = {
  minute: 30,
  daily: 36,
  weekly: 30,
};

/** 최근 구간만 띄운다. 봉이 그보다 적으면 전체를 채운다. */
function showRecentBars(chart: IChartApi, total: number, period: PrototypeChartPeriod) {
  const span = INITIAL_BARS[period];
  if (total <= span) {
    chart.timeScale().fitContent();
    return;
  }
  chart.timeScale().setVisibleLogicalRange({ from: total - span, to: total - 1 });
}

/**
 * 이 종목의 가족 전원 체결. F11 SPEC §6
 *
 * 본인 거래는 app.html 이 `localStorage` 에 쌓고, 엄마의 데모 거래는 코드 상수다.
 * 이 차트는 app.html 안의 iframe 이라 같은 오리진이고, 그래서 부모를 거치지 않고
 * 그 키를 직접 읽는다 — 별도 투자 스토어를 두면 저장소가 갈려 카드와 차트 값이
 * 어긋난다.
 *
 * 피드는 두 출처를 합쳐 보여주는데 차트가 `localStorage` 만 읽으면 엄마 마커가
 * 구조적으로 빠진다. "가족 전원 체결 지점" 이라는 규칙과 어긋나므로 같은 두
 * 출처를 여기서도 합친다.
 */
function familyTradesFor(symbol: string) {
  const merged: Trade[] = [...readPrototypeTrades(), ...FAMILY_SEED_TRADES];
  return symbolTrades(merged, symbol);
}

/**
 * 마커를 찍을 화면 좌표를 잡는다.
 *
 * 라이브러리 기본 마커는 모양이 원·사각·화살표뿐이라 시안의 "꼬리 붙은 둥근 뱃지
 * + 흰 B/S" 를 못 그린다. 대신 차트가 주는 좌표 변환만 빌려 SVG 를 차트 위에 얹는다.
 * 시안 마크업을 그대로 쓸 수 있고, 나중에 탭·툴팁을 붙일 때도 DOM 이벤트로 끝난다.
 */
function placeMarkers(
  markers: readonly TradeMarker[],
  chart: IChartApi,
  series: ISeriesApi<SeriesType, Time>,
  paneWidth: number,
): PlacedMarker[] {
  const timeScale = chart.timeScale();
  // 뱃지는 x 를 가운데로 잡으므로 양 끝에서 반 칸을 물린다. 오늘 산 종목은 마지막
  // 봉에 붙는데, 클램프가 없으면 뱃지 오른쪽 절반이 가격축 숫자 위를 덮는다.
  const half = BADGE / 2;
  const placed: PlacedMarker[] = [];
  for (const marker of markers) {
    const x = timeScale.timeToCoordinate(marker.time as UTCTimestamp);
    const y = series.priceToCoordinate(marker.price);
    // 스크롤·줌으로 화면 밖에 나간 체결은 좌표가 없다. 그리지 않는다.
    if (x === null || y === null) continue;
    placed.push({
      ...marker,
      x: paneWidth > BADGE ? Math.min(Math.max(x, half), paneWidth - half) : x,
      y,
    });
  }
  return placed;
}

/** 좌표가 그대로면 상태를 갈아끼우지 않는다 — 매 프레임 다시 그리지 않기 위해서다. */
function samePlacement(left: readonly PlacedMarker[], right: readonly PlacedMarker[]) {
  if (left.length !== right.length) return false;
  return left.every((marker, index) => {
    const other = right[index];
    return (
      marker.id === other.id &&
      Math.round(marker.x) === Math.round(other.x) &&
      Math.round(marker.y) === Math.round(other.y)
    );
  });
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
  const [placed, setPlaced] = useState<PlacedMarker[]>([]);
  /** 이 종목에서 찾은 체결 수. `placed` 와 갈리면 좌표를 못 잡았다는 뜻이다. */
  const [found, setFound] = useState(0);
  const { period: shownPeriod, chartType: shownChartType } = shown;

  /**
   * 기간·차트종류를 부모(app.html)에게서 메시지로 받는다.
   *
   * 예전에는 두 값이 iframe `src` 의 쿼리에 있어서, 분봉·일봉·주봉이나 선·캔들을 누를 때마다
   * 이 문서가 통째로 다시 열렸다. 차트 번들을 다시 파싱하고 데이터도 다시 받았는데,
   * 선↔캔들은 그릴 데이터가 완전히 같아서 그 왕복이 전부 헛일이었다.
   */
  useEffect(() => {
    let answered = false;

    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return;
      const message = event.data as {
        type?: unknown;
        period?: unknown;
        chartType?: unknown;
      } | null;
      if (!message || typeof message !== "object" || message.type !== CHART_OPTIONS_MESSAGE) return;
      answered = true;

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
    // 부모가 아직 수신 준비 전일 수 있어서, 답이 올 때까지 짧게 몇 번 더 알린다.
    const announce = () => window.parent.postMessage({ type: CHART_READY_MESSAGE }, window.location.origin);
    announce();
    const retry = window.setInterval(() => {
      if (answered) window.clearInterval(retry);
      else announce();
    }, 400);
    const giveUp = window.setTimeout(() => window.clearInterval(retry), 4000);

    return () => {
      window.clearInterval(retry);
      window.clearTimeout(giveUp);
      window.removeEventListener("message", receive);
    };
  }, []);

  // 데이터는 종목·기간에만 달려 있다. 선↔캔들 전환은 여기를 다시 타지 않는다.
  useEffect(() => {
    const controller = new AbortController();
    setPoints(null);
    setState("loading");
    // 종목·기간이 바뀌면 이전 종목의 마커가 남아 있으면 안 된다.
    setPlaced([]);
    setFound(0);

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
      // 폭 0 으로 만들면 시간축이 계산되지 않아 timeToCoordinate 가 계속 null 을 준다.
      width: Math.max(1, container.clientWidth),
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
      const line = chart.addSeries(LineSeries, {
        color: up,
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

    // 마커는 표시만 한다. 클릭 이동은 붙이지 않는다 — F11 SPEC §6 참고.
    const markers = buildTradeMarkers({
      trades: familyTradesFor(symbol),
      viewer,
      candleTimes: points.map((point) => point.time),
    });
    setFound(markers.length);

    showRecentBars(chart, points.length, shownPeriod);

    /**
     * 좌표를 매 프레임 다시 읽는다.
     *
     * 이벤트만으로는 못 잡는다. `subscribeVisibleLogicalRangeChange` 는 **시간축**이
     * 움직일 때만 오고, 가격축을 확대·축소하거나 자동 스케일이 자리를 다시 잡을 때는
     * 아무 신호가 없다. 그러면 마커가 옛 y 에 그대로 남아 캔들과 어긋난다. 첫 배치도
     * 마찬가지여서, 축이 아직 폭을 못 잡은 사이에 읽으면 `timeToCoordinate` 가 `null`
     * 을 주고 마커가 통째로 사라진다.
     *
     * 좌표가 그대로면 상태를 갱신하지 않으므로 다시 그리지 않는다.
     */
    let frame = 0;
    const follow = () => {
      const next = placeMarkers(markers, chart, series, chart.paneSize().width);
      setPlaced((current) => (samePlacement(current, next) ? current : next));
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);

    const observer = new ResizeObserver(([entry]) => {
      chart.applyOptions({ width: Math.max(1, Math.floor(entry.contentRect.width)) });
    });
    observer.observe(container);
    setState("ready");

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      chart.remove();
    };
  }, [points, shownChartType, shownPeriod, symbol, viewer]);

  return (
    <main className="relative h-[264px] w-full overflow-hidden bg-white">
      {/*
        `data-trade-markers` 는 진단용이다. 마커가 안 보일 때 "이 종목에 체결이 없다"와
        "체결은 찾았는데 좌표를 못 잡았다"를 화면을 안 고치고 구분한다.
        예: found=2 placed=0 이면 좌표 계산이 실패한 것이다.
      */}
      <div
        ref={containerRef}
        className="h-[238px] w-full"
        role="img"
        data-trade-markers={`${found}/${placed.length}${
          placed[0] ? ` @${Math.round(placed[0].x)},${Math.round(placed[0].y)}` : ""
        }`}
        aria-label={`${symbol} ${shownPeriod === "minute" ? "분봉" : shownPeriod === "daily" ? "일봉" : "주봉"} TradingView ${shownChartType === "line" ? "선" : "캔들"} 차트`}
      />
      {/*
        z-[60] 이 있어야 보인다. lightweight-charts 는 자기 캔버스에 z-index 를 최대 50
        까지 준다. 이 SVG 가 `auto` 로 남으면 좌표를 제대로 잡고도 캔버스 밑에 깔려
        화면에 안 나온다.
      */}
      {state === "ready" && placed.length > 0 && (
        <svg className="pointer-events-none absolute left-0 top-0 z-[60] h-[238px] w-full">
          {placed.map((marker) => {
            const fill =
              marker.member === "child"
                ? "var(--color-trade-child)"
                : "var(--color-trade-parent)";
            // 말풍선 꼬리처럼 뱃지 변에 붙는다. 꼭짓점이 체결가를 가리키고
            // 밑변은 뱃지 모서리와 정확히 맞닿는다 — 같은 fill 이라 이음매가 안 보인다.
            // 밑변 너비(10)가 rx=6 으로 둥글린 모서리 사이 평평한 구간 안에 들어간다.
            const badgeY =
              marker.side === "buy" ? marker.y + TAIL : marker.y - TAIL - BADGE;
            const base = marker.side === "buy" ? marker.y + TAIL : marker.y - TAIL;
            return (
              <g key={marker.id}>
                <title>{marker.label}</title>
                <polygon
                  points={`${marker.x - 5},${base} ${marker.x + 5},${base} ${marker.x},${marker.y}`}
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
