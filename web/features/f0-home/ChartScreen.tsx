"use client";

import { useEffect, useRef, useState } from "react";
import {
  BuyCtaFooter,
  SUB_PAGE,
  SUB_SCROLL,
  SubScreenHeader,
} from "./lib/stock-chrome";
import { styleFromCss } from "./lib/css-style";

const CHART_READY_MESSAGE = "kiwoom:chart-ready";
const CHART_OPTIONS_MESSAGE = "kiwoom:chart-options";

const CARD = styleFromCss(
  "background:#FFFFFF;border-radius:28px;padding:18px;box-shadow:0 2px 10px rgba(30,25,60,0.05)",
);
const EDU_CARD = styleFromCss(
  "background:#FFFFFF;border-radius:26px;padding:16px 18px;box-shadow:0 2px 10px rgba(30,25,60,0.05)",
);
const PRICE_LABEL = styleFromCss("font-size:13px;font-weight:500;color:#8E93A8");
const PRICE = styleFromCss(
  "font-size:27px;font-weight:800;color:#01185A;font-variant-numeric:tabular-nums;line-height:1.15;margin-top:4px;white-space:nowrap",
);

/** `app.html` 의 `chip()` 과 같은 값이다. */
const chip = (on: boolean) =>
  styleFromCss(
    on
      ? "flex:1;text-align:center;padding:13px 0;border-radius:999px;font-size:14.5px;font-weight:700;color:#fff;cursor:pointer;background:#F5327F"
      : "flex:1;text-align:center;padding:13px 0;border-radius:999px;font-size:14.5px;font-weight:600;color:#5C6280;cursor:pointer;background:#F1F2F8",
  );

type ChartPeriod = "minute" | "daily" | "weekly";
type ChartType = "line" | "candlestick";

/**
 * 차트 화면. `ui-src/screens/chart.html` 을 그대로 옮겨 왔다.
 *
 * 차트 iframe(`/tradingview-chart`)은 종목이 바뀔 때만 다시 연다. 기간·차트종류는
 * `kiwoom:chart-options` 메시지로 넘겨 문서를 다시 열지 않고 바꾼다 — `app.html` 의
 * `postChartOptions` 와 같은 계약이고, iframe 쪽 구현은 손대지 않았다.
 */
export function ChartScreen({
  code,
  name,
  priceText,
  changeText,
  changeStyle,
  locked,
  onBack,
  onStartBuy,
}: {
  code: string;
  name: string;
  priceText: string;
  changeText: string;
  changeStyle: React.CSSProperties;
  locked: boolean;
  onBack: () => void;
  onStartBuy: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [period, setPeriod] = useState<ChartPeriod>("daily");
  const [chartType, setChartType] = useState<ChartType>("line");
  const optionsRef = useRef({ period, chartType });
  optionsRef.current = { period, chartType };

  const postOptions = (overrides?: Partial<{ period: ChartPeriod; chartType: ChartType }>) => {
    frameRef.current?.contentWindow?.postMessage(
      { type: CHART_OPTIONS_MESSAGE, ...optionsRef.current, ...overrides },
      window.location.origin,
    );
  };

  // 새 문서가 준비를 알려오면 현재 선택을 되돌려 준다 (`app.html` 의 receiveChartReady).
  useEffect(() => {
    const receiveChartReady = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow ||
        (event.data as { type?: string } | null)?.type !== CHART_READY_MESSAGE
      ) {
        return;
      }
      postOptions();
    };
    window.addEventListener("message", receiveChartReady);
    return () => window.removeEventListener("message", receiveChartReady);
  }, []);

  const pickPeriod = (next: ChartPeriod) => {
    setPeriod(next);
    postOptions({ period: next });
  };
  const pickChartType = (next: ChartType) => {
    setChartType(next);
    postOptions({ chartType: next });
  };

  return (
    <div style={SUB_PAGE}>
      <SubScreenHeader onBack={onBack} title={`${name} 차트`} />
      <div style={SUB_SCROLL}>
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <div style={PRICE_LABEL}>지금 가격</div>
              <div style={PRICE}>{priceText}</div>
            </div>
            <span style={changeStyle}>{changeText}</span>
          </div>
          <div style={{ display: "flex", gap: 7, marginTop: 15 }}>
            <div onClick={() => pickChartType("line")} style={chip(chartType === "line")}>
              선차트
            </div>
            <div
              onClick={() => pickChartType("candlestick")}
              style={chip(chartType === "candlestick")}
            >
              캔들차트
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
            <div onClick={() => pickPeriod("minute")} style={chip(period === "minute")}>
              분봉
            </div>
            <div onClick={() => pickPeriod("daily")} style={chip(period === "daily")}>
              일봉
            </div>
            <div onClick={() => pickPeriod("weekly")} style={chip(period === "weekly")}>
              주봉
            </div>
          </div>
          <iframe
            height={264}
            loading="eager"
            ref={frameRef}
            src={`/tradingview-chart?symbol=${encodeURIComponent(code)}`}
            style={{ display: "block", marginTop: 16, border: 0, background: "#FFFFFF" }}
            title={`${name} TradingView 차트`}
            width={330}
          />
        </div>

        <div style={EDU_CARD}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15.5, fontWeight: 800, color: "#01185A", whiteSpace: "nowrap" }}>
              캔들이 뭐야?
            </span>
          </div>
          <div
            style={styleFromCss(
              "font-size:14px;font-weight:500;color:#5C6280;line-height:1.75;margin-top:9px;text-wrap:pretty",
            )}
          >
            막대 하나가 하루야. 그날 시작한 값보다 끝난 값이 높으면{" "}
            <b style={{ color: "#E8322E" }}>빨간 막대</b>, 낮으면{" "}
            <b style={{ color: "#1668DC" }}>파란 막대</b>가 돼. 위아래로 나온 선은 그날 가장
            비쌌던 값과 가장 쌌던 값이야.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <div style={styleFromCss("flex:1;background:#FFF4F4;border-radius:14px;padding:11px 13px")}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#E8322E" }}>빨간 막대</div>
              <div
                style={styleFromCss(
                  "font-size:12.5px;font-weight:500;color:#7E849B;margin-top:4px;line-height:1.5",
                )}
              >
                그날 값이 올랐어
              </div>
            </div>
            <div style={styleFromCss("flex:1;background:#F1F5FD;border-radius:14px;padding:11px 13px")}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1668DC" }}>파란 막대</div>
              <div
                style={styleFromCss(
                  "font-size:12.5px;font-weight:500;color:#7E849B;margin-top:4px;line-height:1.5",
                )}
              >
                그날 값이 내렸어
              </div>
            </div>
          </div>
        </div>
      </div>
      <BuyCtaFooter locked={locked} onStartBuy={onStartBuy} />
    </div>
  );
}
