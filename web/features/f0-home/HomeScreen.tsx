"use client";

import { useState } from "react";
import { BottomNav } from "./BottomNav";
import { styleFromCss } from "./lib/css-style";
import { holdingPctColor, homeView, popItems, type HomeHolding } from "./lib/home-view";
import { PROTOTYPE_PHONE } from "./lib/phone-frame";
import { useAccount } from "./lib/use-account";
import { useSheetDrag } from "./lib/use-sheet-drag";
import { useUniverseLive } from "./lib/use-universe";
import { PhoneFrame } from "./PhoneFrame";

/**
 * 홈 화면. `ui-src/screens/home.html` 을 그대로 옮겨 왔다.
 *
 * 값 계산은 `lib/home-view.ts` 가 하고 여기는 붙이기만 한다. 홈은 지갑(`kw_proto_v1`)이
 * 아니라 **서버 계좌**(`/api/account`)를 본다 — 로그인한 사람의 실제 보유가 원본이다.
 */
const PAGE = styleFromCss(
  "position:absolute;left:0;top:0;right:0;bottom:0;padding-top:59px;display:flex;flex-direction:column;" +
    "background:linear-gradient(180deg,#F2EDFC 0%,#EFEAFA 55%,#EDE8F9 100%)",
);
const HEADER = styleFromCss("flex:none;display:flex;align-items:center;gap:11px;padding:10px 18px 12px");
const AVATAR = styleFromCss(
  "display:block;width:42px;height:42px;border-radius:999px;object-fit:cover;background:#fff;flex:none",
);
const SEASON = styleFromCss("font-size:12px;font-weight:700;color:#8E7BC7");
const GREETING = styleFromCss(
  "font-size:17.5px;font-weight:800;color:#01185A;letter-spacing:-0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
);
const MENU_BTN = styleFromCss(
  "flex:none;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer",
);
const MENU_SCRIM = styleFromCss("position:absolute;left:0;top:0;right:0;bottom:0;z-index:1");
const MENU = styleFromCss(
  "position:absolute;right:16px;top:104px;z-index:2;width:184px;border-radius:20px;padding:6px;background:#fff;" +
    "box-shadow:0 18px 34px -12px rgba(35,25,80,0.3),inset 0 0 0 1px rgba(35,25,80,0.06)",
);
const MENU_ITEM = styleFromCss(
  "display:flex;align-items:center;gap:10px;border-radius:14px;padding:13px 14px;font-size:15px;font-weight:700;color:#01185A;cursor:pointer",
);
const MENU_LOGOUT = styleFromCss(
  "display:flex;align-items:center;gap:10px;border-radius:14px;padding:13px 14px;font-size:15px;font-weight:700;" +
    "color:#D5327A;cursor:pointer;border-top:1px solid #F1F1F7",
);
const SCROLL = styleFromCss(
  "flex:1;overflow-y:auto;overflow-x:hidden;padding:2px 16px 0;display:flex;flex-direction:column;gap:12px",
);
const NOTIFY = styleFromCss(
  "text-align:center;border-radius:16px;padding:12px 14px;font-size:13px;font-weight:600;color:#5C6280;background:#F4F4FA;cursor:pointer",
);
const DAY_CHIP = styleFromCss(
  "display:inline-block;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:800;color:#5B23D6;background:#fff;" +
    "box-shadow:0 6px 12px -8px rgba(35,25,80,0.3)",
);
const ITEM_LINE = styleFromCss(
  "font-size:23px;font-weight:800;color:#01185A;letter-spacing:-0.02em;margin-top:10px",
);
const GOAL_IMG = styleFromCss(
  "display:block;width:228px;height:auto;margin:-6px auto 0;filter:drop-shadow(0 14px 22px rgba(35,25,80,0.18))",
);
const HOLD_CARD = styleFromCss(
  "background:#fff;border-radius:26px;padding:18px;box-shadow:0 12px 28px rgba(35,25,80,0.10);cursor:pointer;margin-top:auto",
);
const HOLD_TITLE = styleFromCss(
  "font-size:15.5px;font-weight:800;color:#01185A;white-space:nowrap",
);
const HOLD_ALL = styleFromCss("font-size:12.5px;font-weight:700;color:#A9AEC4;white-space:nowrap");
const EMPTY = styleFromCss(
  "text-align:center;border-radius:16px;padding:20px 13px;font-size:13.5px;font-weight:600;color:#8E93A8;line-height:1.6;" +
    "background:linear-gradient(157deg,#F4F4FA 0%,#EFEFF7 100%)",
);
const ROW = styleFromCss(
  "display:flex;align-items:center;gap:11px;border-radius:16px;padding:12px 13px;" +
    "background:linear-gradient(157deg,#F4F4FA 0%,#EFEFF7 100%)",
);
const ROW_TICK = styleFromCss(
  "flex:none;width:36px;height:36px;border-radius:999px;display:flex;align-items:center;justify-content:center;" +
    "font-size:13px;font-weight:800;color:#5B23D6;background:#fff;box-shadow:0 4px 8px -5px rgba(35,25,80,0.3)",
);
const ROW_NAME = styleFromCss(
  "font-size:14.5px;font-weight:700;color:#01185A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
);
const ROW_QTY = styleFromCss(
  "font-size:12px;font-weight:500;color:#A9AEC4;margin-top:2px;white-space:nowrap",
);
const ROW_VALUE = styleFromCss(
  "font-size:14px;font-weight:800;color:#01185A;font-variant-numeric:tabular-nums;white-space:nowrap",
);
const SHEET_SCRIM = styleFromCss("position:absolute;inset:0;z-index:7;background:rgba(15,10,40,0.42)");
/** 시트가 덮는 화면 비율. 쓸어내리는 거리 판정도 이 높이를 기준으로 한다. */
const SHEET_RATIO = 0.82;
const SHEET_HEIGHT = PROTOTYPE_PHONE.screenHeight * SHEET_RATIO;
const SHEET = styleFromCss(
  `position:absolute;left:0;right:0;bottom:0;height:${SHEET_RATIO * 100}%;z-index:8;background:#F5F2F8;` +
    "border-radius:28px 28px 0 0;" +
    "display:flex;flex-direction:column;box-shadow:0 -20px 40px -12px rgba(20,10,50,0.35);" +
    "animation:sheetUp 0.34s cubic-bezier(0.22,1,0.36,1)",
);
/**
 * 쓸어내려 닫는 손잡이. 목록(`overflow-y:auto`)에는 절대 걸지 않는다 — 시트 전체로 넓히면
 * 목록을 읽으려고 아래로 미는 손짓이 드래그로 잡혀 스크롤이 죽고 시트가 닫힌다.
 * 챗봇 시트도 같은 이유로 헤더에만 걸려 있다(`F10ChatbotDemo`).
 */
const SHEET_HANDLE = styleFromCss(
  "flex:none;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab",
);
const SHEET_GRIP = styleFromCss("width:38px;height:5px;border-radius:999px;background:#D9D8E6");
const SHEET_BACK = styleFromCss(
  "width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;" +
    "font-size:17px;font-weight:700;color:#01185A;cursor:pointer;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)",
);
const SHEET_ROW = styleFromCss(
  "display:flex;align-items:center;gap:11px;border-radius:16px;padding:14px;background:#fff;box-shadow:0 4px 12px -6px rgba(35,25,80,0.12)",
);
const SHEET_TICK = styleFromCss(
  "flex:none;width:40px;height:40px;border-radius:999px;display:flex;align-items:center;justify-content:center;" +
    "font-size:13px;font-weight:800;color:#5B23D6;background:#F4F4FA",
);

const pctStyle = (up: boolean, size: number) =>
  styleFromCss(
    `font-size:${size}px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:${holdingPctColor(up)}`,
  );

function HoldingRow({ holding, sheet }: { holding: HomeHolding; sheet?: boolean }) {
  return (
    <div style={sheet ? SHEET_ROW : ROW}>
      <div style={sheet ? SHEET_TICK : ROW_TICK}>{holding.tick}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={sheet ? { ...ROW_NAME, fontSize: 15 } : ROW_NAME}>{holding.name}</div>
        <div style={sheet ? { ...ROW_QTY, fontSize: 12.5 } : ROW_QTY}>{holding.qty}</div>
      </div>
      <div style={{ flex: "none", textAlign: "right" }}>
        <div style={sheet ? { ...ROW_VALUE, fontSize: 15 } : ROW_VALUE}>{holding.value}</div>
        <div style={pctStyle(holding.up, sheet ? 13 : 12.5)}>{holding.pct}</div>
      </div>
    </div>
  );
}

export function HomeScreen({ onLeave }: { onLeave: (path: string) => void }) {
  const user = useAccount();
  const { quotes } = useUniverseLive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [popped, setPopped] = useState(false);
  // 쓸어내려 닫는 배선은 `useSheetDrag` 가 갖는다 — 아카이브 카드 시트와 같은 구현이다.
  const sheet = useSheetDrag(SHEET_HEIGHT);

  const prices = Object.fromEntries(
    Object.entries(quotes).map(([code, quote]) => [code, quote.price]),
  );
  const view = homeView(user, prices);

  // 세션 쿠키를 지우는 유일한 화면 경로다. 지우면 `/` 가 다시 로그인 화면을 띄운다.
  const logout = () => {
    fetch("/api/auth/login", { method: "DELETE" }).finally(() => {
      window.location.href = "/";
    });
  };

  const popGoal = () => {
    setPopped(true);
    setTimeout(() => setPopped(false), 1500);
  };

  return (
    <PhoneFrame>
      <div style={PAGE}>
        <div style={HEADER}>
          <img alt="" height={42} src={view.info.avatarImg} style={AVATAR} width={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={SEASON}>{view.info.season}</div>
            <div style={GREETING}>{view.info.greeting}</div>
          </div>
          <div onClick={() => setMenuOpen((open) => !open)} style={MENU_BTN}>
            <svg aria-hidden="true" height="16" viewBox="0 0 22 16" width="22">
              <g stroke="#3B3F60" strokeLinecap="round" strokeWidth="2.2">
                <path d="M1.5 2h19" />
                <path d="M1.5 8h19" />
                <path d="M1.5 14h19" />
              </g>
            </svg>
          </div>
        </div>

        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={MENU_SCRIM} />
            <div style={MENU}>
              <div
                onClick={() => {
                  setMenuOpen(false);
                  setNotifyOpen(true);
                }}
                style={MENU_ITEM}
              >
                알림
              </div>
              <div onClick={logout} style={MENU_LOGOUT}>
                로그아웃
              </div>
            </div>
          </>
        )}

        <div style={SCROLL}>
          {notifyOpen && (
            <div onClick={() => setNotifyOpen(false)} style={NOTIFY}>
              새 알림이 없어요
            </div>
          )}

          <div style={{ textAlign: "center", padding: "6px 0 2px" }}>
            <div style={DAY_CHIP}>{view.dayCount}</div>
            <div style={ITEM_LINE}>{view.itemLine}</div>
            <div
              style={{
                fontSize: 19,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                marginTop: 4,
                color: view.rateColor,
              }}
            >
              {view.profitText}
              <span style={{ fontSize: 14, fontWeight: 700, color: "#8E93A8", marginLeft: 6 }}>
                {view.rateText}
              </span>
            </div>
          </div>

          <div onClick={popGoal} style={{ position: "relative", cursor: "pointer" }}>
            <img alt="" src={view.info.goalImg} style={GOAL_IMG} width={228} />
            {popItems(popped, view.goalCount).map((item, index) =>
              item.on ? (
                <img
                  alt=""
                  key={index}
                  src={view.info.img}
                  style={{
                    position: "absolute",
                    left: `${item.left}%`,
                    bottom: `${item.bottom}%`,
                    width: 44,
                    height: 44,
                    objectFit: "contain",
                    pointerEvents: "none",
                    opacity: 0,
                    transform: `rotate(${item.rotate}deg)`,
                    animation: "popItem 1.3s ease-out forwards",
                    animationDelay: `${item.delay}s`,
                  }}
                />
              ) : null,
            )}
          </div>

          <div onClick={sheet.openSheet} style={HOLD_CARD}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={HOLD_TITLE}>내 보유 종목</span>
              <span style={HOLD_ALL}>전체보기</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
              {view.noHoldings && (
                <div style={EMPTY}>
                  아직 가진 회사가 없어
                  <br />
                  모의투자 탭에서 하나 골라 보자
                </div>
              )}
              {view.holdings.slice(0, 3).map((holding) => (
                <HoldingRow holding={holding} key={holding.name} />
              ))}
            </div>
          </div>
        </div>

        <BottomNav active="home" onLeave={onLeave} />

        {sheet.open && (
          <>
            <div onClick={sheet.closeSheet} style={{ ...SHEET_SCRIM, ...sheet.scrimStyle }} />
            <div style={{ ...SHEET, ...sheet.sheetStyle(String(SHEET.animation)) }}>
              <div {...sheet.handleProps} style={SHEET_HANDLE}>
                <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px" }}>
                  <div style={SHEET_GRIP} />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 18px 8px",
                  }}
                >
                  <div data-sheet-static onClick={sheet.closeSheet} style={SHEET_BACK}>
                    ‹
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A" }}>내 보유 종목</div>
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
                  padding: "8px 16px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                {view.holdings.map((holding) => (
                  <HoldingRow holding={holding} key={holding.name} sheet />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
