"use client";

import type { CSSProperties, ReactNode } from "react";
import { BottomNav } from "../BottomNav";
import { styleFromCss } from "./css-style";
import { CTA_OFF_CSS, CTA_ON_CSS, DETAIL_BUY_CSS } from "./prototype-theme";

/**
 * 상세·차트·뉴스 세 화면이 함께 쓰는 틀. `ui-src` 의 세 화면이 같은 마크업을
 * 반복하던 것을 한 벌로 모았다 — 헤더(뒤로가기·제목)와 하단 매수 CTA·학교시간 잠금·탭바.
 */
export const SUB_PAGE = styleFromCss(
  "position:absolute;left:0;top:0;right:0;bottom:0;padding-top:59px;display:flex;flex-direction:column",
);
export const SUB_SCROLL = styleFromCss(
  "flex:1;overflow-y:auto;overflow-x:hidden;padding:2px 16px 0;display:flex;flex-direction:column;gap:12px",
);
const HEADER = styleFromCss("flex:none;display:flex;align-items:center;gap:12px;padding:6px 18px 10px");
const BACK = styleFromCss(
  "width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;" +
    "font-size:17px;font-weight:700;color:#01185A;cursor:pointer;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)",
);
const TITLE = styleFromCss(
  "flex:1;text-align:center;font-size:19px;font-weight:800;color:#01185A;letter-spacing:-0.01em",
);
// 하트는 뒤로가기와 같은 크기의 상자다. 헤더 양 끝이 서로 다르면 가운데 제목이 밀린다 —
// 하트가 없는 화면이 `SubScreenHeader` 에서 폭 38px 짜리 빈 칸을 두는 것도 같은 이유다.
const WATCH_BTN = styleFromCss(
  "width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;" +
    "background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)",
);
const WATCH_ON = "#F5327F";
const WATCH_OFF = "#B8BDD0";
// 원본 상세·차트의 푸터 여백이다 (`padding:14px 16px 12px`). 탭바(`BottomNav`)는 원본
// `navStyleX` 와 같이 `margin:0 12px 12px` 로 **위 여백이 없으므로**, CTA ↔ 알약 사이는 이
// 12px 하나가 만든다. 한때 `12px 16px 6px` 로 줄여 둔 적이 있는데, 그 근거였던 "탭바가 위
// 여백 6px 을 갖는다"는 사실이 아니어서 CTA 가 원본보다 6px 아래에 붙어 있었다.
//
// 원본 뉴스 화면만 바닥이 26px 인데, 그 화면에는 탭바가 없어서다. 여기서는 세 화면 모두
// 탭바를 두므로 26px 을 따라가지 않는다.
const FOOTER = styleFromCss("flex:none;padding:14px 16px 12px");
const LOCK = styleFromCss(
  "display:flex;align-items:center;gap:11px;background:#FFF6FA;border-radius:20px;padding:14px 16px;margin-bottom:11px;" +
    "box-shadow:inset 0 0 0 1.5px rgba(245,50,127,0.22)",
);
const LOCK_TEXT = styleFromCss(
  "font-size:14px;font-weight:600;color:#D5327A;line-height:1.55;text-wrap:pretty",
);
// 원본에는 분홍 CTA 가 둘이고 화면마다 쓰는 것이 다르다. 값은 `prototype-theme` 이 갖는다.
const DETAIL_CTA = styleFromCss(DETAIL_BUY_CSS);
const CTA_ON = styleFromCss(CTA_ON_CSS);
const CTA_OFF = styleFromCss(CTA_OFF_CSS);

export function SubScreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  return (
    <div style={HEADER}>
      <div onClick={onBack} style={BACK}>
        ‹
      </div>
      <div style={TITLE}>{title}</div>
      {right ?? <div style={{ width: 38 }} />}
    </div>
  );
}

/**
 * 관심 종목 하트. 헤더 오른쪽 끝에 선다.
 *
 * **상세와 차트가 같은 것 하나를 쓴다.** 차트 화면에도 하트가 생기면서 두 곳이 되었는데,
 * 각자 그리면 색·크기·그림자가 조용히 갈린다(`watch-button.test.ts` 가 그것을 막는다).
 *
 * 켜고 끄는 판단은 하지 않는다 — 원본은 `/api/watchlist` 이고 서버가 돌려준 목록이 와야
 * 하트가 바뀐다(`use-watchlist`). 그래서 이 컴포넌트는 지금 상태와 누름만 받는다.
 */
export function WatchButton({ watched, onToggle }: { watched: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={WATCH_BTN}>
      <svg height={19} style={{ display: "block" }} viewBox="0 0 21 19" width={21}>
        <path
          d="M10.5 17.5 2.6 9.9a4.6 4.6 0 1 1 7.9-4.4 4.6 4.6 0 1 1 7.9 4.4z"
          fill={watched ? WATCH_ON : "none"}
          stroke={watched ? WATCH_ON : WATCH_OFF}
          strokeLinejoin="round"
          strokeWidth={1.6}
        />
      </svg>
    </div>
  );
}

/**
 * 종목 화면의 아래 한 벌 — 주문 CTA 와 하단 탭바.
 *
 * 둘을 한 곳에서 묶는 이유는 여백이 서로에게 달려 있어서다. CTA 만 두던 시절의 바닥
 * 여백(26px)을 남긴 채 탭바를 붙이면 상세만 CTA 가 떠 보이고, 반대로 CTA 여백을 줄여 놓고
 * 탭바를 빠뜨리면 버튼이 바닥에 붙는다. 세 화면(상세·차트·뉴스)이 같은 자리를 쓰므로
 * 짝을 여기서 한 번만 정한다.
 *
 * 탭은 `모의투자` 를 켠다 — 종목 화면은 모의투자 탭 안쪽 자리다. 다만 그 탭의 첫 화면
 * (`/explore`)은 아니므로 `atTabRoot={false}` 로 켜진 탭도 눌리게 둔다.
 *
 * 버튼만은 세 화면이 같지 않다. 원본에서 상세·차트는 전용 `detailBuyStyle` 에 "주문하기",
 * 뉴스는 범용 `CTA_ON` 에 "살래(매수)" 다. 틀을 합치되 그 차이는 `cta` 로 남긴다 — 셋을
 * 한 버튼으로 뭉쳤던 것이 상세의 버튼이 진해진 원인이었다.
 */
export function StockFooter({
  locked,
  onStartBuy,
  onLeave,
  cta = "detail",
}: {
  locked: boolean;
  onStartBuy: () => void;
  onLeave: (path: string) => void;
  /** 기본은 상세·차트가 쓰는 전용 버튼. 뉴스만 범용 CTA 로 바꾼다. */
  cta?: "detail" | "news";
}) {
  // 상세·차트 버튼은 잠금일 때도 색이 그대로다. 원본이 손잡이를 죽이는 대신 위에 배너를
  // 띄우고 누름만 막는 쪽을 골랐다 — 누름은 화면의 `startBuy` 가 이미 막고 있다.
  const news = cta === "news";
  return (
    <>
      <div style={FOOTER}>
        {locked && (
          <div style={LOCK}>
            <span style={LOCK_TEXT}>지금은 학교에서 공부할 시간! 매매는 하교하고 해요</span>
          </div>
        )}
        <div
          id="tut-detail-buy"
          onClick={onStartBuy}
          style={news ? (locked ? CTA_OFF : CTA_ON) : DETAIL_CTA}
        >
          <span style={{ textShadow: "0 1px 2px rgba(170,30,95,0.22)" } as CSSProperties}>
            {news ? "살래(매수)" : "주문하기"}
          </span>
        </div>
      </div>
      <BottomNav active="trade" atTabRoot={false} onLeave={onLeave} />
    </>
  );
}
