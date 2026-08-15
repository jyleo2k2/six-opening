"use client";

import { useEffect, useRef, useState } from "react";
import {
  StockFooter,
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
const PRICE_LABEL = styleFromCss("font-size:13px;font-weight:500;color:#8E93A8");
const PRICE = styleFromCss(
  "font-size:27px;font-weight:800;color:#01185A;font-variant-numeric:tabular-nums;line-height:1.15;margin-top:4px;white-space:nowrap",
);

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

type ChartPeriod = "minute" | "daily" | "weekly";
type ChartType = "line" | "candlestick";
const TF_OPTIONS: { id: ChartPeriod; label: string }[] = [
  { id: "minute", label: "분" },
  { id: "daily", label: "일" },
  { id: "weekly", label: "주" },
];

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
  onLeave,
  onStartBuy,
}: {
  code: string;
  name: string;
  priceText: string;
  changeText: string;
  changeStyle: React.CSSProperties;
  locked: boolean;
  onBack: () => void;
  /** 하단 탭바가 쓴다. 뒤로가기(`onBack`)는 상세로 돌아가지만 탭은 앱의 다른 화면으로 나간다. */
  onLeave: (path: string) => void;
  onStartBuy: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [period, setPeriod] = useState<ChartPeriod>("daily");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [tfMenuOpen, setTfMenuOpen] = useState(false);
  // 캔들 설명은 캔들차트를 켰을 때만 말풍선으로 뜬다. 닫으면 다시 켤 때까지 숨는다.
  const [candleTipClosed, setCandleTipClosed] = useState(false);
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
    setTfMenuOpen(false);
    postOptions({ period: next });
  };
  const pickChartType = (next: ChartType) => {
    setChartType(next);
    postOptions({ chartType: next });
  };
  const tfLabel = TF_OPTIONS.find((option) => option.id === period)?.label ?? "일";

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
              <div onClick={() => pickChartType("line")} style={chipText(chartType === "line")}>
                선차트
              </div>
              <div onClick={() => pickChartType("candlestick")} style={chipText(chartType === "candlestick")}>
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
          {chartType === "candlestick" && !candleTipClosed && (
            <div style={CANDLE_TIP}>
              <div style={CANDLE_TIP_ARROW} />
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: "#B3286B", letterSpacing: "-0.01em" }}>
                    막대 하나가 하루예요
                  </div>
                  <div
                    style={styleFromCss(
                      "font-size:13px;font-weight:500;color:#B3286B;line-height:1.65;margin-top:7px;text-wrap:pretty",
                    )}
                  >
                    시작한 값보다 끝난 값이 높으면 <b style={{ color: "#E8322E" }}>빨간 막대</b>, 낮으면{" "}
                    <b style={{ color: "#1668DC" }}>파란 막대</b>예요. 위아래로 나온 선은 그날 가장 비쌌던
                    값과 가장 쌌던 값이에요.
                  </div>
                </div>
                <div
                  onClick={() => setCandleTipClosed(true)}
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
          <iframe
            height={264}
            loading="eager"
            ref={frameRef}
            src={`/tradingview-chart?symbol=${encodeURIComponent(code)}`}
            style={{ display: "block", marginTop: 14, border: 0, background: "#FFFFFF" }}
            title={`${name} TradingView 차트`}
            width={330}
          />
        </div>
      </div>
      <StockFooter locked={locked} onLeave={onLeave} onStartBuy={onStartBuy} />
    </div>
  );
}
