"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { BottomNav } from "./BottomNav";
import { styleFromCss } from "./lib/css-style";
import { basisTimeText, homeView, popItems, trendColor, type HomeHolding } from "./lib/home-view";
import { PROTOTYPE_PHONE } from "./lib/phone-frame";
import { shouldOpenSheetByPull } from "./lib/sheet-drag";
import { accountReadAt, useAccount } from "./lib/use-account";
import { useSheetDrag } from "./lib/use-sheet-drag";
import { restrictionSummary, type TradeRestriction } from "./lib/trade-restriction";
import { useUniverseLive } from "./lib/use-universe";
import { ScreenFrame, usePhoneScreenRect } from "./PhoneFrame";
import { TradeRestrictionSheet } from "./TradeRestrictionSheet";

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
/**
 * 총자산 줄은 통째로 누를 수 있다 — 오른쪽 `>` 를 누르면 아래로 돌아가며 지갑이 열린다.
 * 셰브런만 손잡이로 두면 9px 짜리 과녁을 손가락으로 맞혀야 한다.
 */
const ASSET_ROW = styleFromCss("display:flex;align-items:center;gap:7px;cursor:pointer");
/**
 * 펼친 지갑은 헤더 **위에 겹치는** 패널이다. 헤더 안에서 자리를 차지하게 두면 펼칠 때마다
 * 캐릭터 그림과 보유 카드가 아래로 밀린다 — 계정마다 다르던 그 자리를 고정한 게 직전
 * 작업이었다. 여기서 되돌릴 이유가 없다.
 */
const WALLET_PANEL = styleFromCss(
  "position:absolute;left:0;top:100%;z-index:3;min-width:236px;margin-top:9px;border-radius:18px;padding:13px 15px;" +
    "background:#fff;box-shadow:0 18px 34px -12px rgba(35,25,80,0.3),inset 0 0 0 1px rgba(35,25,80,0.06);cursor:default",
);
const WALLET_ROW = styleFromCss(
  "display:flex;align-items:center;justify-content:space-between;gap:16px",
);
const WALLET_LABEL = styleFromCss(
  "font-size:14px;font-weight:600;color:#5C6280;white-space:nowrap",
);
const WALLET_VALUE = styleFromCss(
  "font-size:17px;font-weight:800;color:#01185A;font-variant-numeric:tabular-nums;white-space:nowrap",
);
/** 이 숫자가 언제 것인지. 계좌를 아직 못 읽었으면 적을 시각이 없어 줄째로 빠진다. */
const WALLET_BASIS = styleFromCss(
  "font-size:11.5px;font-weight:500;color:#A9AEC4;margin-top:9px;white-space:nowrap;text-align:right",
);
const MENU_BTN = styleFromCss(
  "flex:none;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer",
);
/** 햄버거와 같은 손잡이 크기. 원본 튜토리얼 버튼의 분홍을 그대로 쓴다. */
const HELP_BTN = styleFromCss(
  "flex:none;width:30px;height:30px;border-radius:999px;display:flex;align-items:center;justify-content:center;" +
    "font-size:16px;font-weight:800;color:#fff;cursor:pointer;" +
    "background:linear-gradient(180deg,#FFA0C6 0%,#F663A1 62%,#EE4A8E 100%);" +
    "box-shadow:0 6px 12px -5px rgba(214,54,124,0.5),inset 0 1.5px 2px rgba(255,255,255,0.45)",
);
const MENU_SCRIM = styleFromCss("position:absolute;left:0;top:0;right:0;bottom:0;z-index:1");
const MENU = styleFromCss(
  "position:absolute;right:16px;top:104px;z-index:2;width:184px;border-radius:20px;padding:6px;background:#fff;" +
    "box-shadow:0 18px 34px -12px rgba(35,25,80,0.3),inset 0 0 0 1px rgba(35,25,80,0.06)",
);
const MENU_ITEM = styleFromCss(
  "display:flex;align-items:center;gap:10px;border-radius:14px;padding:13px 14px;font-size:15px;font-weight:700;color:#01185A;cursor:pointer",
);
/** 메뉴 줄 밑에 붙는 지금 설정. `꺼짐` 인지 몇 시부터인지를 열어 보지 않고 안다. */
const MENU_NOTE = styleFromCss("font-size:11.5px;font-weight:600;color:#8E94AE;margin-top:3px");
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
 *
 * 수익률에 따라 무드 그림(보합 722×722, 손실 542×722)으로도 갈아 끼우는데, 그것들 역시
 * 비율이 또 다르다. 상자가 고정이라 그림이 바뀌어도 아래 카드가 밀리지 않는다.
 *
 * 캐릭터 크기 맞추기는 `width`·`height` 가 아니라 **`transform: scale`** 로 건다.
 * `contain` 이 캔버스를 맞추고 난 뒤에 걸려야 하는 보정이라 `max-width:100%` 에 걸려
 * 조용히 되돌려지면 안 되고, 배치에 영향을 주지 않아야 아래 카드가 그대로 선다.
 * 넘치는 것은 투명 여백뿐이다 — 배율을 다 걸어도 캐릭터는 상자 안에 있다.
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
 * 잡는 자리는 막대가 아니라 **막대 줄 + 제목 줄**이다. 막대와 그 위아래 여백만 잡는 자리로
 * 두면 19px 인데 `PhoneFrame` 이 `scale()` 로 줄여 그리므로 폰에서는 13~16px 로 내려간다 —
 * 마우스 커서는 맞출 수 있어도 손가락은 거의 못 맞춘다. 제목 줄까지 넣으면 그림은 그대로인
 * 채로 잡는 자리가 두 배가 된다. 그래서 잡는 상자(`HOLD_GRAB_ZONE`)와 막대를 가운데 세우는
 * 그림 상자(`HOLD_GRIP_ZONE`)를 나눠 둔다.
 *
 * 카드 전체로 넓히지는 않는다 — 포인터를 잡으면 그 안의 click 이 손잡이로 재타깃돼 죽기
 * 때문이다: 카드가 손잡이면 종목 줄이 죽는다. 잡는 자리 안에서 눌러야 하는 `전체보기` 에는
 * 시트 손잡이가 쓰는 것과 같은 `data-sheet-static` 을 달아 `grabCard` 가 비켜 가게 한다.
 *
 * `touch-action:none` 은 세로 손짓을 브라우저에 뺏기지 않으려고 둔다. 뺏기면 끌던 중에
 * `pointercancel` 이 와서 손짓이 통째로 사라진다.
 */
const HOLD_GRAB_ZONE = styleFromCss(
  "cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none",
);
const HOLD_GRIP_ZONE = styleFromCss(
  "display:flex;align-items:center;justify-content:center;padding:2px 0 12px",
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
/**
 * 줄 앞의 로고. 종목코드로 유니버스 로고를 찾은 줄만 그린다 — 못 찾으면 `ROW_TICK` 의
 * 두 글자가 그대로 선다. 흰 동그라미 안에 여백을 남기려 지름보다 작게 담고, 로고마다
 * 가로세로 비가 달라 `contain` 으로 맞춘다.
 */
const ROW_LOGO = styleFromCss("width:26px;height:26px;object-fit:contain");
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

/**
 * 홈 진입 배너. **화면 맨 아래에 붙는다.** 가로는 화면 폭에 꽉 차고 세로는 그림 비율
 * (390:408)이 정한다 — 아래 손잡이 줄까지 더해 화면 절반쯤이 된다. 높이를 px 로 못
 * 박지 않는다: 그림을 갈아 끼우면 그 값이 조용히 틀려진다.
 *
 * 뒤는 어둡게 깔아 배너를 도드라지게 한다.
 *
 * **`z-index` 는 챗봇(4)보다 높고 베젤(10)보다 낮아야 한다.** `#kw-screen` 은
 * `z-index:auto` 라 쌓임 맥락을 만들지 않으므로, 여기 적은 값은 `.phone-stage__content`
 * 안에서 챗봇 레이어·프레임 이미지와 직접 겨룬다.
 *
 * - 베젤을 넘기면 배너가 폰 테두리 **위에** 그려진다. 그러면 화면의 `overflow:hidden`
 *   (반경 40)에만 잘려서, 그보다 깊게 파인 개구부 아래 코너(반경 62)를 흰 띠가 네모나게
 *   덮는다.
 * - 4 로 두면 **챗봇에 가린다.** `.phone-stage__overlay` 도 4 인데 DOM 에서 화면보다
 *   뒤에 있어 같은 값이면 그쪽이 이긴다(그 안의 `z-index:10` 은 그 레이어가 만든 쌓임
 *   맥락에 갇혀 밖으로 나오지 못한다).
 */
const BANNER_SCRIM = styleFromCss(
  "position:absolute;inset:0;z-index:6;background:rgba(12,9,26,0.62);" +
    "display:flex;align-items:flex-end;justify-content:center",
);
const BANNER_SHEET = styleFromCss("width:100%;line-height:0");
/**
 * 그림의 **위쪽 두 모서리는 이미 잘려 투명하다**(`home-banner-first-step.png`). 원본에는
 * 그 자리에 흰 아크가 남아 있어 짙은 딤 위에 흰 뿔로 튀었다 — CSS `border-radius` 로
 * 덮지 않는 이유는, 그림이 폭에 맞춰 늘어나므로 고정 radius 가 원본 아크와 어긋나 흰
 * 실선이 남기 때문이다. 자른 것은 자산 쪽이 원본이다.
 *
 * **파일 이름에 그림 내용을 담는다.** `public/` 은 `max-age=86400` 으로 나가므로 같은
 * 이름으로 그림만 갈아 끼우면 하루 동안 브라우저가 옛 그림을 계속 보여 준다 — 바꾼
 * 사람만 새 그림을 보고 나머지는 그대로인 채로 리뷰가 오간다. 그림을 바꿀 때는 이름도
 * 함께 바꾼다.
 */
const BANNER_IMG = styleFromCss("display:block;width:100%;height:auto;cursor:pointer");
/**
 * 손잡이 줄은 그림이 아니라 **여기서 그린다.** 시안의 흰 띠는 글자가 박혀 있어 누를 수
 * 있는 자리를 그림 비율로 어림해야 했고, 문구를 고치려면 그림을 다시 받아야 했다.
 */
const BANNER_ACTIONS = styleFromCss(
  "display:flex;align-items:stretch;background:#fff;line-height:normal;padding-bottom:10px",
);
const BANNER_ACTION_BTN = styleFromCss(
  "flex:1;display:flex;align-items:center;justify-content:center;height:48px;" +
    "background:transparent;border:none;padding:0;margin:0;cursor:pointer;" +
    "font-family:inherit;font-size:14.5px;font-weight:700;color:#8E93A8",
);
/** 두 손잡이를 가르는 선. 흰 띠 안에서만 서므로 위아래로 여백을 남긴다. */
const BANNER_DIVIDER = styleFromCss("flex:none;width:1px;margin:12px 0;background:#ECECF3");

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
  logoUrl,
  onOpen,
}: {
  holding: HomeHolding;
  /** 유니버스에서 찾은 로고 주소. 없으면 `null` 이라 두 글자 약칭이 그대로 선다. */
  logoUrl: string | null;
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
      <div style={ROW_TICK}>
        {logoUrl ? <img alt="" src={logoUrl} style={ROW_LOGO} /> : holding.tick}
      </div>
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

export function HomeScreen({
  onLeave,
  onStartTutorial,
  embedded = false,
  bannerHiddenForSession = false,
  onHideBannerForSession,
  tradeRestriction,
  onChangeTradeRestriction,
}: {
  onLeave: (path: string) => void;
  /** 튜토리얼 `?`. 오버레이는 `ConnectedPrototype` 이 갖는다 — 화면 하나에 매이면 안 된다. */
  onStartTutorial?: () => void;
  /** ConnectedPrototype의 하나뿐인 PhoneFrame 안에 그릴 때 true. */
  embedded?: boolean;
  /**
   * `오늘 그만 보기` 로 배너를 껐는지. 홈 화면은 오갈 때마다 다시 마운트돼 자기 상태를
   * 잃으므로, 로그인 세션이 끝날 때까지 유지해야 하는 이 값은 `ConnectedPrototype` 이
   * 들고 있다가 물려준다.
   */
  bannerHiddenForSession?: boolean;
  onHideBannerForSession?: () => void;
  /**
   * 학교 시간 거래 제한(목업). 배너의 `오늘 그만 보기` 와 같은 이유로 `ConnectedPrototype`
   * 이 들고 있다가 물려준다 — 홈은 오갈 때마다 다시 마운트돼 자기 상태를 잃는다.
   */
  tradeRestriction: TradeRestriction;
  onChangeTradeRestriction: (rule: TradeRestriction) => void;
}) {
  const user = useAccount();
  const { quotes, universe } = useUniverseLive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [restrictionOpen, setRestrictionOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [popped, setPopped] = useState(false);
  // 이번에 들어와서 닫았는지. 홈을 나갔다 다시 들어오면 새로 마운트되며 초기화된다 —
  // "다시 들어오면 배너가 다시 뜬다"는 그 초기화 하나로 이미 이뤄진다.
  const [bannerClosed, setBannerClosed] = useState(false);
  const showBanner = !bannerHiddenForSession && !bannerClosed;
  const sheet = useSheetDrag(SHEET_HEIGHT);
  const scale = usePhoneScreenRect()?.scale ?? 1;
  // 카드를 위로 밀기 시작한 자리. 손을 뗄 때 얼마나 올렸는지로 시트를 열지 정한다.
  const pull = useRef<{ pointerId: number; y: number; at: number } | null>(null);

  const prices = Object.fromEntries(
    Object.entries(quotes).map(([code, quote]) => [code, quote.price]),
  );
  // 유니버스는 데모 보유에 종목코드를 붙이는 데만 쓴다 — 실제 계좌 보유는 코드를 갖고 온다.
  const view = homeView(user, prices, universe?.stocks ?? []);
  // 보유 줄 앞의 로고. 탐색 카드(`explore-cards`)·종목 상세와 같은 원본을 같은 방식으로
  // 읽는다 — 유니버스가 주는 경로는 옛 `app.html` 기준 상대경로라 `/ui/` 를 붙인다.
  const logoOf = (holding: HomeHolding) => {
    const path = holding.code ? universe?.logos?.[holding.code] : undefined;
    return path ? `/ui/${path}` : null;
  };
  // 지갑 밑의 결제기준. 계좌 응답이 세워질 때 함께 다시 그려지므로 여기서 읽으면 최신이다.
  const readAt = accountReadAt();

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
    // 잡는 자리 안에 눌러야 하는 것(`전체보기`)이 있다. 포인터를 잡으면 그 click 이
    // 손잡이로 재타깃돼 죽으므로 시트 손잡이와 같은 표식이 붙은 곳에서는 비켜 간다.
    if (event.target instanceof HTMLElement && event.target.closest("[data-sheet-static]")) return;
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
    <ScreenFrame embedded={embedded}>
      <div style={PAGE}>
        <div style={HEADER}>
          <img alt="" height={42} src={view.info.avatarImg} style={AVATAR} width={42} />
          <div
            id="tut-home-total"
            style={{ flex: 1, minWidth: 0, position: "relative", zIndex: walletOpen ? 3 : undefined }}
          >
            <div style={ASSET_LABEL}>{view.totalAssetsLabel}</div>
            <div
              onClick={() => {
                setMenuOpen(false);
                setWalletOpen((open) => !open);
              }}
              style={ASSET_ROW}
            >
              <div style={ASSET_TOTAL}>{view.totalAssetsText}</div>
              <svg
                aria-hidden="true"
                height="15"
                style={{
                  flex: "none",
                  transform: walletOpen ? "rotate(90deg)" : "none",
                  transition: "transform 0.18s ease",
                }}
                viewBox="0 0 9 15"
                width="9"
              >
                <path
                  d="M1.6 1.6 L7 7.5 L1.6 13.4"
                  fill="none"
                  stroke="#01185A"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.2"
                />
              </svg>
            </div>
            {walletOpen && (
              <div onClick={(event) => event.stopPropagation()} style={WALLET_PANEL}>
                <div style={WALLET_ROW}>
                  <span style={WALLET_LABEL}>내 지갑</span>
                  <span style={WALLET_VALUE}>{view.walletText}</span>
                </div>
                {readAt !== null && <div style={WALLET_BASIS}>결제기준 {basisTimeText(readAt)}</div>}
              </div>
            )}
          </div>
          {/*
            튜토리얼 `?` 는 햄버거 **왼쪽**이다. 우하단은 키웅이가 쓰고 드래그로 움직이니
            거기 두면 서로 가린다. 튜토리얼이 켜져 있는 동안은 감춘다 — 오버레이가 이미
            화면을 덮고 있어서 다시 눌러야 할 이유가 없다.
          */}
          {onStartTutorial && (
            <div onClick={onStartTutorial} style={HELP_BTN} title="튜토리얼">
              ?
            </div>
          )}
          <div
            onClick={() => {
              setWalletOpen(false);
              setMenuOpen((open) => !open);
            }}
            style={MENU_BTN}
          >
            <svg aria-hidden="true" height="16" viewBox="0 0 22 16" width="22">
              <g stroke="#3B3F60" strokeLinecap="round" strokeWidth="2.2">
                <path d="M1.5 2h19" />
                <path d="M1.5 8h19" />
                <path d="M1.5 14h19" />
              </g>
            </svg>
          </div>
        </div>

        {/* 펼친 지갑 뒤. 다른 곳을 누르면 접힌다 — 메뉴가 닫히는 길과 같다. */}
        {walletOpen && <div onClick={() => setWalletOpen(false)} style={MENU_SCRIM} />}

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
              {/* 제한을 정하는 자리는 **부모 계정에만** 있다. 아이 화면에는 이 줄이 없다. */}
              {user?.parent_child === "parent" && (
                <div
                  onClick={() => {
                    setMenuOpen(false);
                    setRestrictionOpen(true);
                  }}
                  style={{ ...MENU_ITEM, display: "block" }}
                >
                  학교 시간 거래 제한
                  <div style={MENU_NOTE}>{restrictionSummary(tradeRestriction)}</div>
                </div>
              )}
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

          <div id="tut-home-goal" style={{ flex: "none", textAlign: "center", padding: "6px 0 2px" }}>
            <div style={DAY_CHIP}>{view.dayCount}</div>
            <div style={ITEM_LINE}>{view.itemLine}</div>
            <div style={{ ...PROFIT_LINE, color: view.rateColor }}>
              {view.profitText} ({view.rateText})
            </div>
          </div>

          <div onClick={popGoal} style={GOAL_BOX}>
            <img
              alt=""
              src={view.moodImg}
              style={{ ...GOAL_IMG, transform: `scale(${view.moodScale})` }}
            />
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
            <div
              {...(view.holdings.length > 0
                ? {
                    onPointerCancel: () => {
                      pull.current = null;
                    },
                    onPointerDown: grabCard,
                    onPointerMove: dragCard,
                    onPointerUp: releaseCard,
                    style: HOLD_GRAB_ZONE,
                  }
                : null)}
            >
              {view.holdings.length > 0 && (
                <div style={HOLD_GRIP_ZONE}>
                  <div style={HOLD_GRIP} />
                </div>
              )}
              <div style={HOLD_HEAD}>
                <div style={HOLD_TITLE}>내 보유 종목</div>
                {view.holdings.length > 0 && (
                  <div data-sheet-static onClick={openHoldings} style={HOLD_MORE}>
                    전체보기
                  </div>
                )}
              </div>
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
                  logoUrl={logoOf(holding)}
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
                    logoUrl={logoOf(holding)}
                    onOpen={(code) => onLeave(`/stock/${code}`)}
                  />
                ))}
              </div>
              <div onClick={sheet.closeSheet} style={SHEET_REST} />
            </div>
          </>
        )}

        {restrictionOpen && (
          <TradeRestrictionSheet
            onClose={() => setRestrictionOpen(false)}
            onSave={onChangeTradeRestriction}
            rule={tradeRestriction}
          />
        )}

        <BottomNav active="home" onLeave={onLeave} />

        {showBanner && (
          <div style={BANNER_SCRIM}>
            <div style={BANNER_SHEET}>
              {/*
                그림을 눌러도 배너가 닫히고 홈이 그대로 드러난다 — `닫기` 와 같은 손짓이라
                `오늘 그만 보기` 처럼 세션 동안 숨기지는 않는다. 갈 곳이 없는 그림에
                손가락 모양만 뜨지 않도록 커서도 함께 바꾼다.
              */}
              <img
                alt="우리 아이 투자 첫걸음 — 참가신청 7월 20일~8월 28일, 대회기간 8월 3일~8월 28일"
                onClick={() => setBannerClosed(true)}
                src="/ui/assets/home-banner-first-step.png"
                style={BANNER_IMG}
              />
              <div style={BANNER_ACTIONS}>
                <button
                  onClick={() => {
                    onHideBannerForSession?.();
                    setBannerClosed(true);
                  }}
                  style={BANNER_ACTION_BTN}
                  type="button"
                >
                  오늘 그만 보기
                </button>
                <div style={BANNER_DIVIDER} />
                <button
                  onClick={() => setBannerClosed(true)}
                  style={BANNER_ACTION_BTN}
                  type="button"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScreenFrame>
  );
}
