"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { BottomNav } from "./BottomNav";
import { styleFromCss } from "./lib/css-style";
import { homeView, popItems, trendColor, type HomeHolding } from "./lib/home-view";
import { PROTOTYPE_PHONE } from "./lib/phone-frame";
import { shouldOpenSheetByPull } from "./lib/sheet-drag";
import { useAccount } from "./lib/use-account";
import { useSheetDrag } from "./lib/use-sheet-drag";
import { useUniverseLive } from "./lib/use-universe";
import { PhoneFrame, usePhoneScreenRect } from "./PhoneFrame";

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
/**
 * 총자산은 화면 가운데가 아니라 **프로필 옆**이다. 가운데에 두면 바로 아래 수익금액과
 * 붙어 보여 둘 중 어느 쪽이 번 돈인지 읽는 사람이 구분하지 못한다. 이름을 앞에 달아
 * "누구의 무슨 돈"인지까지 한 줄로 말한다.
 */
const ASSET_LABEL = styleFromCss("font-size:17px;font-weight:700;color:#8E7BC7");
const ASSET_TOTAL = styleFromCss(
  "font-size:21px;font-weight:800;color:#01185A;letter-spacing:-0.02em;line-height:1.2;" +
    "font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
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
/**
 * 홈은 **스크롤하지 않는다.** 예전에는 이 자리가 스크롤이어서 보유 종목이 몇 개냐에 따라
 * 캐릭터 그림과 카드가 계정마다 다른 높이에 섰다. 그림 자리(`GOAL_BOX`)와 카드는 고정이고,
 * 카드에 안 들어가는 보유는 `전체보기` 시트가 맡는다.
 */
const BODY = styleFromCss(
  "flex:1;overflow:hidden;padding:2px 16px 12px;display:flex;flex-direction:column;gap:10px",
);
const NOTIFY = styleFromCss(
  "flex:none;text-align:center;border-radius:16px;padding:12px 14px;font-size:13px;font-weight:600;color:#5C6280;background:#F4F4FA;cursor:pointer",
);
const DAY_CHIP = styleFromCss(
  "display:inline-block;border-radius:999px;padding:6px 14px;font-size:13px;font-weight:800;color:#5B23D6;background:#fff;" +
    "box-shadow:0 6px 12px -8px rgba(35,25,80,0.3)",
);
const ITEM_LINE = styleFromCss(
  "font-size:23px;font-weight:800;color:#01185A;letter-spacing:-0.02em;margin-top:10px",
);
/**
 * 수익금액과 수익률은 **한 문장**이다. 크기나 색이 갈리면 괄호 안이 다른 종류의 숫자로
 * 읽힌다 — 둘 다 `rateColor` 를 그대로 쓴다.
 *
 * 크기는 이 자리에 있던 총자산과 같은 `23px` 다. 총자산이 헤더로 올라가면서 가운데의
 * 주인공이 수익으로 바뀌었으므로, 자리만 물려받고 크기를 줄이면 목표 문장보다 작아져
 * 무엇이 주인공인지 흐려진다.
 *
 * 바로 위 목표 문장과는 **붙여 둔다**. "○개 살 수 있어요" 와 그 근거인 수익은 한 덩어리로
 * 읽혀야 하는데, 사이가 뜨면 따로 선 두 문장이 된다.
 */
const PROFIT_LINE = styleFromCss(
  "font-size:23px;font-weight:800;letter-spacing:-0.02em;margin-top:2px;font-variant-numeric:tabular-nums",
);
/**
 * 캐릭터 그림 자리는 **높이가 고정**이다. 원본 그림의 비율이 서로 달라(아빠 368×655,
 * 아이·엄마 524×654) 가로만 맞추면 계정마다 다른 크기로 그려졌다. 고정 상자 안에서
 * `contain` 하면 세 계정이 같은 자리·같은 높이에 선다.
 */
const GOAL_BOX = styleFromCss(
  "flex:none;position:relative;height:240px;display:flex;align-items:center;justify-content:center;cursor:pointer",
);
const GOAL_IMG = styleFromCss(
  "display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;" +
    "filter:drop-shadow(0 14px 22px rgba(35,25,80,0.18))",
);
/** 남는 세로 공간은 여기가 다 먹는다 — 그림과 카드가 서로를 밀지 않게 하는 자리다. */
const SPACER = styleFromCss("flex:1;min-height:0");
const HOLD_CARD = styleFromCss(
  "flex:none;background:#fff;border-radius:26px;padding:10px 18px 18px;box-shadow:0 12px 28px rgba(35,25,80,0.10)",
);
/**
 * 카드를 위로 미는 손잡이. 시트가 쓰는 `SHEET_GRIP` 과 같은 모양이라 "이 막대를 밀면
 * 그게 올라온다" 가 눌러 보기 전에 읽힌다.
 *
 * 잡는 자리는 5px 막대가 아니라 그 위아래 여백까지다 — 막대만 손잡이면 손가락이 거의
 * 닿지 않는다. 손잡이를 카드 전체로 넓히지 않는 이유는 포인터를 잡으면 그 안의 click 이
 * 손잡이로 재타깃되기 때문이다: 카드가 손잡이면 종목 줄과 `전체보기` 가 죽는다.
 *
 * `touch-action:none` 은 세로 손짓을 브라우저에 뺏기지 않으려고 둔다. 뺏기면 끌던 중에
 * `pointercancel` 이 와서 손짓이 통째로 사라진다.
 */
const HOLD_GRIP_ZONE = styleFromCss(
  "display:flex;align-items:center;justify-content:center;padding:2px 0 12px;cursor:grab;touch-action:none",
);
const HOLD_GRIP = styleFromCss("width:44px;height:5px;border-radius:999px;background:#DCD8EC");
const HOLD_HEAD = styleFromCss(
  "display:flex;align-items:center;justify-content:space-between;gap:10px",
);
const HOLD_TITLE = styleFromCss(
  "font-size:15.5px;font-weight:800;color:#01185A;white-space:nowrap",
);
const HOLD_MORE = styleFromCss(
  "flex:none;font-size:13px;font-weight:700;color:#8E93A8;white-space:nowrap;cursor:pointer",
);
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
const ROW_TAP = styleFromCss("cursor:pointer");

/** 전체 보유 시트. 높이는 챗봇·아카이브 시트와 같은 기하 상수에서 낸다. */
const SHEET_RATIO = PROTOTYPE_PHONE.sheetRatio;
const SHEET_HEIGHT = PROTOTYPE_PHONE.screenHeight * SHEET_RATIO;
const SHEET_SCRIM = styleFromCss("position:absolute;inset:0;z-index:6;background:rgba(20,15,40,0.4)");
const SHEET = styleFromCss(
  "position:absolute;left:0;right:0;bottom:0;z-index:7;display:flex;flex-direction:column;" +
    "border-radius:28px 28px 0 0;padding:12px 18px 0;background:#fff;box-shadow:0 -18px 40px rgba(35,25,80,0.3)",
);
const SHEET_GRIP = styleFromCss("width:44px;height:5px;border-radius:999px;background:#DCD8EC;margin:0 auto 14px");
const SHEET_TITLE = styleFromCss(
  "font-size:24px;font-weight:900;color:#01185A;letter-spacing:-0.02em;padding:0 4px 14px",
);
const SHEET_LIST = styleFromCss(
  "flex:0 1 auto;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:9px",
);
/** 목록 아래 빈 자리. 여기를 눌러도 시트가 닫힌다 — 배경을 누른 것과 같은 손짓이다. */
const SHEET_REST = styleFromCss("flex:1;min-height:24px");

const pctStyle = (holding: HomeHolding, size: number) =>
  styleFromCss(
    `font-size:${size}px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:2px;color:${trendColor(holding.trend)}`,
  );

/**
 * 한 줄을 누르면 그 종목 상세로 간다. 코드를 못 찾은 줄(유니버스에 없는 데모 보유)은
 * 누를 수 없다 — 갈 곳 없는 손짓에 손가락 모양만 뜨는 것을 막는다.
 *
 * 누른 사건은 위로 올리지 않는다. 이 줄은 시트 안에도 그대로 서는데, 거기서 새는 손짓은
 * 시트 배경까지 닿아 상세로 넘어가면서 시트가 함께 닫힌다.
 */
function HoldingRow({
  holding,
  onOpen,
}: {
  holding: HomeHolding;
  onOpen: (code: string) => void;
}) {
  const code = holding.code;
  return (
    <div
      onClick={
        code
          ? (event) => {
              event.stopPropagation();
              onOpen(code);
            }
          : undefined
      }
      style={code ? { ...ROW, ...ROW_TAP } : ROW}
    >
      <div style={ROW_TICK}>{holding.tick}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={ROW_NAME}>{holding.name}</div>
        <div style={ROW_QTY}>{holding.qty}</div>
      </div>
      <div style={{ flex: "none", textAlign: "right" }}>
        <div style={ROW_VALUE}>{holding.value}</div>
        <div style={pctStyle(holding, 12.5)}>{holding.pct}</div>
      </div>
    </div>
  );
}

export function HomeScreen({ onLeave }: { onLeave: (path: string) => void }) {
  const user = useAccount();
  const { quotes, universe } = useUniverseLive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [popped, setPopped] = useState(false);
  const sheet = useSheetDrag(SHEET_HEIGHT);
  const scale = usePhoneScreenRect()?.scale ?? 1;
  // 카드를 위로 밀기 시작한 자리. 손을 뗄 때 얼마나 올렸는지로 시트를 열지 정한다.
  const pull = useRef<{ pointerId: number; y: number; at: number } | null>(null);

  const prices = Object.fromEntries(
    Object.entries(quotes).map(([code, quote]) => [code, quote.price]),
  );
  // 유니버스는 데모 보유에 종목코드를 붙이는 데만 쓴다 — 실제 계좌 보유는 코드를 갖고 온다.
  const view = homeView(user, prices, universe?.stocks ?? []);

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

  /** 가진 게 없으면 열지 않는다 — 빈 시트를 띄우고 다시 닫게 만들 이유가 없다. */
  const openHoldings = () => {
    if (view.holdings.length > 0) sheet.openSheet();
  };

  /**
   * 포인터를 **잡아 둔다.** 잡지 않으면 손가락이 손잡이 위로 벗어나는 순간 `pointerup` 이
   * 그 자리에 있는 다른 요소로 가고, 손잡이는 손을 뗀 사실을 영영 모른다 — 위로 미는
   * 손짓은 정의상 손잡이를 벗어나므로 이 배선 없이는 한 번도 열리지 않는다.
   */
  const grabCard = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pull.current = { pointerId: event.pointerId, y: event.clientY, at: event.timeStamp };
  };

  /** 끄는 동안 글자가 선택되거나 브라우저가 손짓을 가져가지 않게 막는다. */
  const dragCard = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pull.current?.pointerId === event.pointerId) event.preventDefault();
  };

  const releaseCard = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pull.current;
    pull.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!start || start.pointerId !== event.pointerId) return;
    const opened = shouldOpenSheetByPull(
      { startY: start.y, endY: event.clientY, elapsedMs: event.timeStamp - start.at },
      { scale },
    );
    if (opened) openHoldings();
  };

  return (
    <PhoneFrame>
      <div style={PAGE}>
        <div style={HEADER}>
          <img alt="" height={42} src={view.info.avatarImg} style={AVATAR} width={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={ASSET_LABEL}>{view.totalAssetsLabel}</div>
            <div style={ASSET_TOTAL}>{view.totalAssetsText}</div>
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

        <div style={BODY}>
          {notifyOpen && (
            <div onClick={() => setNotifyOpen(false)} style={NOTIFY}>
              새 알림이 없어요
            </div>
          )}

          <div style={{ flex: "none", textAlign: "center", padding: "6px 0 2px" }}>
            <div style={DAY_CHIP}>{view.dayCount}</div>
            <div style={ITEM_LINE}>{view.itemLine}</div>
            <div style={{ ...PROFIT_LINE, color: view.rateColor }}>
              {view.profitText} ({view.rateText})
            </div>
          </div>

          <div onClick={popGoal} style={GOAL_BOX}>
            <img alt="" src={view.info.goalImg} style={GOAL_IMG} />
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

          <div style={SPACER} />

          <div style={HOLD_CARD}>
            {view.holdings.length > 0 && (
              <div
                onPointerCancel={() => {
                  pull.current = null;
                }}
                onPointerDown={grabCard}
                onPointerMove={dragCard}
                onPointerUp={releaseCard}
                style={HOLD_GRIP_ZONE}
              >
                <div style={HOLD_GRIP} />
              </div>
            )}
            <div style={HOLD_HEAD}>
              <div style={HOLD_TITLE}>내 보유 종목</div>
              {view.holdings.length > 0 && (
                <div onClick={openHoldings} style={HOLD_MORE}>
                  전체보기
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
              {view.noHoldings && (
                <div style={EMPTY}>
                  아직 가진 회사가 없어
                  <br />
                  모의투자 탭에서 하나 골라 보자
                </div>
              )}
              {view.topHoldings.map((holding) => (
                <HoldingRow
                  holding={holding}
                  key={holding.name}
                  onOpen={(code) => onLeave(`/stock/${code}`)}
                />
              ))}
            </div>
          </div>
        </div>

        {sheet.open && (
          <>
            <div onClick={sheet.closeSheet} style={{ ...SHEET_SCRIM, ...sheet.scrimStyle }} />
            <div
              style={{
                ...SHEET,
                height: `${SHEET_RATIO * 100}%`,
                ...sheet.sheetStyle("sheetUp 0.34s cubic-bezier(0.22,1,0.36,1)"),
              }}
            >
              <div {...sheet.handleProps}>
                <div style={SHEET_GRIP} />
                <div style={SHEET_TITLE}>내 보유 종목</div>
              </div>
              <div style={SHEET_LIST}>
                {view.holdings.map((holding) => (
                  <HoldingRow
                    holding={holding}
                    key={holding.name}
                    onOpen={(code) => onLeave(`/stock/${code}`)}
                  />
                ))}
              </div>
              <div onClick={sheet.closeSheet} style={SHEET_REST} />
            </div>
          </>
        )}

        <BottomNav active="home" onLeave={onLeave} />
      </div>
    </PhoneFrame>
  );
}
