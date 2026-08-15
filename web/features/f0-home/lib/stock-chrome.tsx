"use client";

import type { CSSProperties, ReactNode } from "react";
import { styleFromCss } from "./css-style";

/**
 * 상세·차트·뉴스 세 화면이 함께 쓰는 틀. `ui-src` 의 세 화면이 같은 마크업을
 * 반복하던 것을 한 벌로 모았다 — 헤더(뒤로가기·제목)와 하단 매수 CTA·학교시간 잠금.
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
const FOOTER = styleFromCss("flex:none;padding:14px 16px 26px");
const LOCK = styleFromCss(
  "display:flex;align-items:center;gap:11px;background:#FFF6FA;border-radius:20px;padding:14px 16px;margin-bottom:11px;" +
    "box-shadow:inset 0 0 0 1.5px rgba(245,50,127,0.22)",
);
const LOCK_TEXT = styleFromCss(
  "font-size:14px;font-weight:600;color:#D5327A;line-height:1.55;text-wrap:pretty",
);
// `logic/constants.js` 의 CTA_ON·CTA_OFF 와 같은 값이다.
const CTA_ON = styleFromCss(
  "position:relative;border-radius:999px;padding:19px;text-align:center;font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.01em;cursor:pointer;" +
    "background:radial-gradient(ellipse 56% 48% at 46% -8%,rgba(255,251,248,0.94) 0%,rgba(255,238,245,0.42) 38%,rgba(255,255,255,0.06) 70%,rgba(255,255,255,0) 92%)," +
    "radial-gradient(ellipse 94% 48% at 50% 120%,rgba(255,202,226,0.6) 0%,rgba(255,202,226,0) 78%)," +
    "linear-gradient(180deg,#FFA0C6 0%,#FC7DAF 34%,#F663A1 66%,#EE4A8E 100%);" +
    "box-shadow:5px 16px 26px -9px rgba(214,54,124,0.4),8px 34px 48px -20px rgba(214,54,124,0.24),inset 0 -24px 32px -16px rgba(255,255,255,0.42),inset 0 4px 6px rgba(255,255,255,0.5)",
);
const CTA_OFF = styleFromCss(
  "position:relative;border-radius:999px;padding:19px;text-align:center;font-size:19px;font-weight:800;color:#FFFFFF;letter-spacing:-0.01em;cursor:not-allowed;background:#C6C9D8",
);

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

export function BuyCtaFooter({ locked, onStartBuy }: { locked: boolean; onStartBuy: () => void }) {
  return (
    <div style={FOOTER}>
      {locked && (
        <div style={LOCK}>
          <span style={LOCK_TEXT}>지금은 학교에서 공부할 시간! 매매는 하교하고 하자</span>
        </div>
      )}
      <div onClick={onStartBuy} style={locked ? CTA_OFF : CTA_ON}>
        <span style={{ textShadow: "0 1px 2px rgba(170,30,95,0.22)" } as CSSProperties}>
          사볼래! (매수)
        </span>
      </div>
    </div>
  );
}
