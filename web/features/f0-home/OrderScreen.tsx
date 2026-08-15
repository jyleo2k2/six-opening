"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatContext } from "../../shared/types/chatbot";
import { useChatBehaviorStore } from "../../shared/store/chat-behavior-store";
import { accountTotalAsset, SEED } from "../../shared/store/prototype-account.js";
import { CHANGES, PLANS, REASONS, SELL_REASONS, choiceOf } from "../../shared/data/trade-copy.js";
import {
  isRegularMarketOpen,
  nextOpeningDate,
  reservedSellQty,
} from "../f2-trade/lib/scheduled-orders.js";
import { PhoneFrame } from "./PhoneFrame";
import { styleFromCss } from "./lib/css-style";
import { parseBehaviorEvent } from "./lib/prototype-bridge";
import { pendingCards, won } from "./lib/portfolio-view";
import { flushTabViews } from "./lib/tab-views";
import {
  applyBuyFill,
  applySellFill,
  blankBuyDraft,
  blankSellDraft,
  buyMath,
  buyStepOk,
  judgePlanMatch,
  lastBuyRecord,
  orderChatContext,
  sellMath,
  shuffledIndexes,
  type BuyDraft,
  type BuyRecordRow,
  type SellDraft,
} from "./lib/order-view";
import { useStockLive } from "./lib/use-universe";
import { canTrade, useWallet, type WalletAccountId } from "./lib/use-wallet";
import { useAccount } from "./lib/use-account";

/**
 * 매수·매도 화면. `ui-src/screens/buy.html`·`sell.html` 과 그 렌더 로직을 그대로 옮겨 왔다.
 *
 * `app.html` 과 같은 규칙으로 주문을 처리한다.
 * - 즉시 체결(정규장 시장가)만 지갑을 직접 바꾸고 `/api/trade` 로 저장한다.
 * - 지정가·장외 예약은 **`POST /api/orders` 접수가 곧 주문이다**(PR #250). 화면은 예약
 *   목록을 만들지도, 현금을 빼지도 않는다 — 접수가 실패하면 완료 화면 대신 거절 문구를
 *   보여 주고, 성공하면 `refresh()` 가 계좌·주문 목록을 서버에서 다시 읽는다.
 * - 매수 이유 버튼 순서는 진입마다 섞는다(F3 SPEC). 매도는 앞 5개만 섞는다.
 *
 * `ConnectedPrototype` 이 `key={side + code}` 로 마운트하므로 종목·방향이 바뀌면
 * 단계·초안이 처음부터 시작한다 — `app.html` 이 진입 때 초안을 새로 만들던 것과 같다.
 */

const UP = "#E8322E";
const DOWN = "#1668DC";

// `ui-src/logic/constants.js` 의 CTA_ON·CTA_OFF·SUB_CTA·glass 와 같은 값이다.
const GLASS = "background:#FFFFFF;box-shadow:0 2px 10px rgba(30,25,60,0.05)";
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
const SUB_CTA = styleFromCss(
  "flex:1;border-radius:999px;padding:19px;text-align:center;font-size:19px;font-weight:800;color:#01185A;letter-spacing:-0.01em;cursor:pointer;background:#EFEFF5",
);
const PAGE = styleFromCss(
  "position:absolute;left:0;top:0;right:0;bottom:0;padding-top:59px;display:flex;flex-direction:column",
);
const HEADER = styleFromCss("flex:none;display:flex;align-items:center;gap:12px;padding:6px 18px 10px");
const BACK = styleFromCss(
  "width:38px;height:38px;flex:none;border-radius:14px;display:flex;align-items:center;justify-content:center;" +
    "font-size:17px;font-weight:700;color:#01185A;cursor:pointer;background:#FFFFFF;box-shadow:0 1px 3px rgba(30,25,60,0.08)",
);
const TITLE = styleFromCss(
  "flex:1;text-align:center;font-size:19px;font-weight:800;color:#01185A;letter-spacing:-0.01em",
);
const STEP_PILL = styleFromCss(
  "min-width:58px;text-align:center;border-radius:999px;padding:8px 12px;font-size:14.5px;font-weight:700;font-variant-numeric:tabular-nums;color:#A9AEC4;background:#F1F2F8",
);
const SCROLL = styleFromCss(
  "flex:1;overflow-y:auto;overflow-x:hidden;padding:0 16px 0;display:flex;flex-direction:column;gap:12px",
);
const CARD = styleFromCss("background:#FFFFFF;border-radius:26px;padding:18px;box-shadow:0 2px 10px rgba(30,25,60,0.05)");
const CARD_TITLE = styleFromCss("font-size:16px;font-weight:800;color:#01185A");
const TOGGLE_ROW = styleFromCss(
  "background:#FFFFFF;border-radius:22px;padding:6px 8px;display:flex;gap:6px;box-shadow:0 2px 10px rgba(30,25,60,0.05)",
);
const WALLET_ROW = styleFromCss(
  "display:flex;align-items:center;gap:9px;background:#ECEDF7;border-radius:20px;padding:12px 15px;box-shadow:inset 0 0 0 1px #E4E6F1",
);
const WARN = styleFromCss(
  "display:flex;align-items:center;gap:9px;background:#FFF1F6;border-radius:18px;padding:13px 15px;box-shadow:inset 0 0 0 1.5px rgba(245,50,127,0.25)",
);
const WARN_TEXT = styleFromCss("font-size:13.5px;font-weight:600;color:#D5327A;line-height:1.55");
const PAD_KEY = styleFromCss(
  "text-align:center;padding:13px 0;border-radius:16px;font-size:17px;font-weight:800;color:#01185A;cursor:pointer;background:#F4F4FA;box-shadow:inset 0 0 0 1px #E4E6F1",
);
const NOTE_ROW = styleFromCss(
  "display:flex;align-items:flex-start;gap:9px;background:#ECEDF7;border-radius:16px;padding:12px 14px;margin-top:14px;box-shadow:inset 0 0 0 1px #E4E6F1",
);
const NOTE_TEXT = styleFromCss("font-size:13.5px;font-weight:500;color:#5C6280;line-height:1.6");
const SUMMARY = styleFromCss(
  "background:#FFFFFF;border-radius:20px;padding:15px 17px;margin-top:2px;box-shadow:0 1px 3px rgba(30,25,60,0.06)",
);
const SUMMARY_ROW = styleFromCss(
  "display:flex;justify-content:space-between;padding:5px 0;font-size:14px;font-weight:500;color:#8E93A8",
);
const SUMMARY_VALUE = styleFromCss(
  "font-weight:700;color:#01185A;font-variant-numeric:tabular-nums;white-space:nowrap",
);
// 2단계 "주문 정보" 남색 카드 — `ui-src` 의 새 디자인(PR #252)과 같은 값이다.
const DARK_SUMMARY = styleFromCss(
  "background:linear-gradient(180deg,#2A4478 0%,#132C63 42%,#001E5A 100%);border-radius:20px;padding:15px 17px;margin-top:2px;" +
    "box-shadow:0 6px 18px -8px rgba(0,30,90,0.4),inset 0 1px 0 rgba(255,255,255,0.22)",
);
const DARK_ROW = styleFromCss(
  "display:flex;justify-content:space-between;padding:5px 0;font-size:14px;font-weight:500;color:rgba(255,255,255,0.62)",
);
const DARK_VALUE = styleFromCss(
  "font-weight:700;color:#FFFFFF;font-variant-numeric:tabular-nums;white-space:nowrap",
);
// 구매·판매·대기 탭과 대기 목록 시트 — `renderVals-compute.js` 의 sheetTab·sheetStyle 과 같은 값이다.
const TAB_ROW = styleFromCss("flex:none;display:flex;gap:4px;background:#EFEEF6;border-radius:999px;padding:4px");
const SHEET_SCRIM = styleFromCss(
  "position:absolute;left:0;top:0;right:0;bottom:0;background:rgba(18,14,40,0.34);z-index:40",
);
const SHEET = styleFromCss(
  "position:absolute;left:0;right:0;bottom:0;z-index:41;max-height:70%;overflow-y:auto;background:#FFFFFF;" +
    "border-radius:28px 28px 0 0;padding:10px 18px 22px;box-shadow:0 -14px 34px -12px rgba(20,16,50,0.28)",
);
const SHEET_GRAB = styleFromCss("width:42px;height:4px;border-radius:999px;background:#E1E0EC;margin:0 auto 14px");
// 갖고 있지 않은 회사를 팔려 할 때 뜨는 안내 — 프로토타입의 sellBlockScrim·sellBlockCard 와 같은 값이다.
const BLOCK_SCRIM = styleFromCss(
  "position:absolute;left:0;top:0;right:0;bottom:0;z-index:20;display:flex;align-items:center;justify-content:center;" +
    "padding:0 32px;background:rgba(20,16,45,0.34);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)",
);
const BLOCK_CARD = styleFromCss(
  "display:flex;flex-direction:column;align-items:center;width:100%;box-sizing:border-box;background:#FFFFFF;" +
    "border-radius:30px;padding:26px 24px 24px;box-shadow:0 24px 48px -16px rgba(30,25,60,0.32)",
);
const BLOCK_TITLE = styleFromCss(
  "font-size:18px;font-weight:800;color:#01185A;margin-top:14px;text-align:center;letter-spacing:-0.01em",
);
const BLOCK_BODY = styleFromCss(
  "font-size:14.5px;font-weight:500;color:#7E849B;margin-top:9px;text-align:center;line-height:1.6;" +
    "text-wrap:pretty;white-space:pre-line",
);
const BLOCK_CTA = styleFromCss(
  "width:100%;box-sizing:border-box;margin-top:20px;border-radius:999px;padding:16px;text-align:center;" +
    "font-size:16.5px;font-weight:800;color:#FFFFFF;cursor:pointer;background:#F5327F;box-shadow:0 8px 18px -8px rgba(245,50,127,0.6)",
);
const SHEET_ROW = styleFromCss(
  "display:flex;align-items:center;gap:11px;background:#F4F4FA;border-radius:18px;padding:12px 14px;box-shadow:inset 0 0 0 1px #E4E6F1",
);
const SHEET_CANCEL = styleFromCss(
  "flex:none;font-size:13px;font-weight:600;color:#8E93A8;padding:9px 13px;border-radius:999px;cursor:pointer;" +
    "background:#FFFFFF;box-shadow:0 4px 9px -4px rgba(35,25,80,0.2)",
);

function sheetTabStyle(on: boolean) {
  return styleFromCss(
    "flex:1;display:flex;align-items:center;justify-content:center;height:38px;border-radius:999px;font-size:14px;" +
      `font-weight:${on ? 800 : 600};cursor:pointer;color:${on ? "#D5327A" : "#8E93A8"};background:${on ? "#FFFFFF" : "transparent"}` +
      (on ? ";box-shadow:0 2px 6px -2px rgba(35,25,80,0.22)" : ""),
  );
}
const MEMO_INPUT = styleFromCss(
  "width:100%;box-sizing:border-box;border:0;outline:none;background:#F4F4FA;border-radius:16px;padding:14px 15px;" +
    "font-family:'Pretendard',sans-serif;font-size:14px;font-weight:600;color:#01185A;box-shadow:inset 0 0 0 1px #E4E6F1",
);
const DONE_BOX = styleFromCss(
  "width:100%;background:#F4F4FA;border-radius:20px;padding:15px 17px;box-shadow:inset 0 0 0 1px #E4E6F1",
);
const MASCOT_BUBBLE = styleFromCss(
  "flex:1;background:#EDE9FB;border-radius:18px;border-bottom-left-radius:5px;padding:10px 14px;" +
    "box-shadow:0 2px 10px rgba(30,25,60,0.05),inset 0 0 0 1px rgba(1,24,90,0.06)",
);
const MASCOT_IMG = styleFromCss(
  "display:block;flex:none;margin:0 -3px -4px -3px;filter:drop-shadow(0 6px 10px rgba(35,25,80,0.16))",
);

function chipStyle(on: boolean) {
  return styleFromCss(
    on
      ? "flex:1;text-align:center;padding:13px 0;border-radius:999px;font-size:14.5px;font-weight:700;color:#fff;cursor:pointer;background:#F5327F"
      : "flex:1;text-align:center;padding:13px 0;border-radius:999px;font-size:14.5px;font-weight:600;color:#5C6280;cursor:pointer;background:#F1F2F8",
  );
}

function pickCardStyle(on: boolean, kind: "grid" | "row") {
  const base =
    kind === "grid"
      ? "display:flex;flex-direction:column;align-items:center;text-align:center;padding:16px 10px;border-radius:20px;cursor:pointer;min-height:64px;justify-content:center;"
      : "display:flex;align-items:center;gap:12px;padding:16px 18px;border-radius:22px;cursor:pointer;";
  return styleFromCss(base + (on ? "background:#FFF4F9;box-shadow:inset 0 0 0 2px #F5327F" : GLASS));
}

function ProgressBars({ step }: { step: number }) {
  return (
    <div style={{ flex: "none", display: "flex", gap: 5, padding: "0 20px 12px" }}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{ flex: 1, height: 4, borderRadius: 999, background: i <= step ? "#F5327F" : "#DDDFEC" }}
        />
      ))}
    </div>
  );
}

function NumPad({ keys, onTap }: { keys: string[]; onTap: (key: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }}>
      {keys.map((key) => (
        <div key={key} onClick={() => onTap(key)} style={PAD_KEY}>
          {key}
        </div>
      ))}
    </div>
  );
}

const ORDER_REJECTED = "주문을 넣지 못했어. 잠깐 뒤에 다시 해볼까?";

export function OrderScreen({
  code,
  side,
  account,
  onLeave,
  onChatContext,
}: {
  code: string;
  side: "buy" | "sell";
  account: WalletAccountId;
  onLeave: (path: string) => void;
  onChatContext: (context: ChatContext | null) => void;
}) {
  const { wallet, update, refresh } = useWallet();
  const live = useStockLive(code);
  const user = useAccount();
  const recordEvent = useChatBehaviorStore((s) => s.recordEvent);

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<BuyDraft>(blankBuyDraft);
  const [sellDraft, setSellDraftState] = useState<SellDraft | null>(null);
  // 갖고 있지 않은 회사를 팔려고 했을 때 뜨는 안내. 프로토타입의 `sellBlocked` 와 같다.
  const [sellBlocked, setSellBlocked] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const [sellPick, setSellPick] = useState<string>("all");
  const [sellQtyStr, setSellQtyStr] = useState("");
  const [reasonOrder] = useState(() => shuffledIndexes(6));
  const [sellReasonOrder] = useState(() => shuffledIndexes(5).concat([5]));
  const [orderError, setOrderError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    name: string;
    qty: number;
    amount?: number;
    proceeds?: number;
    limit: number | null;
    scheduled: boolean;
    scheduledFor: string | null;
    requestMode?: "qty" | "amount";
    badge?: boolean;
  } | null>(null);
  /**
   * 접수 왕복이 도는 동안 참이다. 서버 확정을 기다리게 되면서 **버튼이 한 박자 늦게**
   * 반응하므로, 표시가 없으면 안 눌린 줄 알고 한 번 더 눌러 주문이 두 번 들어간다.
   */
  const [submitting, setSubmitting] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  // 대기 목록 시트. `ui-src` 의 orderSheet 상태와 같다 — 매수·매도 어느 쪽에서든 연다.
  const [orderSheet, setOrderSheet] = useState(false);
  const retroAtRef = useRef(0);
  const retroMsRef = useRef(0);
  const flowIdRef = useRef(`${side}_${Date.now().toString(36)}`);

  const patchDraft = (patch: Partial<BuyDraft>) => setDraft((cur) => ({ ...cur, ...patch }));
  const patchSell = (patch: Partial<SellDraft>) =>
    setSellDraftState((cur) => (cur ? { ...cur, ...patch } : cur));

  const me = wallet?.acc[account] ?? null;
  const price = live.price;
  const stock = live.stock;

  // 매도 초안은 지갑을 읽은 뒤에야 만들 수 있다 — 팔 수 있는 수량(예약 제외)이 기본값이다.
  useEffect(() => {
    if (side !== "sell" || sellDraft || !me) return;
    const held = me.holdings.find((h) => h.code === code);
    const available = Math.max(0, (held?.qty ?? 0) - reservedSellQty(me.pending || [], code));
    setSellDraftState(blankSellDraft(available));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, sellDraft, me === null]);

  // 유니버스에 없는 코드는 탐색으로 보낸다 — 상세 화면과 같은 규칙.
  useEffect(() => {
    if (live.loaded && !live.stock) onLeave("/explore");
  }, [live.loaded, live.stock, onLeave]);

  // 챗봇 맥락. 값 계산은 `lib/order-view.ts` 의 `orderChatContext` 가 소유한다 — 화면이
  // 쓰는 `buyMath`·`sellMath` 를 그대로 거쳐야 화면과 챗봇이 같은 수량을 말한다.
  const stockName = stock?.name ?? "";
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  useEffect(() => {
    const current = walletRef.current?.acc[account];
    if (!stockName || !current) return;
    onChatContext(
      orderChatContext({
        account: current,
        code,
        draft,
        price,
        reservedQty: reservedSellQty(current.pending || [], code),
        seed: SEED,
        sellDraft,
        side,
        stockName,
        totalAsset: accountTotalAsset(current, (symbol: string) => live.prices[symbol] ?? 0),
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, side, stockName, account, wallet, price, draft, sellDraft, onChatContext]);
  useEffect(() => () => onChatContext(null), [onChatContext]);

  if (!wallet || !me || !stock || (side === "sell" && !sellDraft)) return <PhoneFrame />;

  const locked = !canTrade(account);
  const marketOpen = isRegularMarketOpen(new Date());
  const scheduledFor = nextOpeningDate(new Date());
  const userId = account === "child" ? "child_minji" : "parent_mom";
  const seq = wallet.seq ?? 1;
  // `app.html` 의 `dbSyncable()` — 서버 저장은 로그인 역할이 맞을 때만 뒤따른다.
  const syncable = Boolean(user) && user?.parent_child === account;

  const notifyBehavior = (value: Record<string, unknown>) => {
    const event = parseBehaviorEvent(value, Date.now(), { screen: "order", stockId: `KRX:${code}` });
    if (event) recordEvent(event);
  };

  /**
   * 즉시 체결. **접수가 곧 주문이다** — 예약(`postReserve`)과 같은 규칙으로 맞췄다.
   *
   * 예전에는 던지고 잊었다(best-effort). 그러면 화면에는 체결로 보이는데 DB 에는 없고,
   * 다음에 `/api/account` 가 지갑을 덮는 순간 **방금 산 주식이 사라진다.** 서버는 이미
   * 옳았다 — `apply_trade` 가 잔액·보유·기록을 한 트랜잭션에서 처리하고 실패하면 아무것도
   * 남기지 않는다. 기다리지 않은 쪽이 화면이었다.
   *
   * `syncable` 이 아니면 보내지 않고 거절한다. 이 화면은 `/api/account` 응답으로 지갑을
   * 세운 뒤에야 그려지므로(`if (!wallet) return <PhoneFrame/>`), 주문 버튼을 누를 수 있는
   * 시점에 `syncable` 이 거짓이면 응답을 기다리는 중이 아니라 **저장할 수 없는 계정**이다.
   */
  const postTrade = (body: Record<string, unknown>): Promise<boolean> => {
    if (!syncable) return Promise.resolve(false);
    return fetch("/api/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((response) => response.ok)
      .catch(() => false);
  };
  // 예약 접수. **접수가 곧 주문이다** — null 이면 주문은 없던 일이고 거절 문구를 보여 준다.
  const postReserve = (body: Record<string, unknown>): Promise<{ order_id?: string } | null> => {
    if (!syncable) return Promise.resolve(null);
    return fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
  };

  const badgeStyle = (size: number, radius: number, font: number) =>
    styleFromCss(
      `width:${size}px;height:${size}px;flex:none;border-radius:${radius}px;display:flex;align-items:center;justify-content:center;font-size:${font}px;background:#F4F4FA` +
        (stock.logoUrl
          ? `;background-image:url(${stock.logoUrl});background-position:center;background-size:contain;background-repeat:no-repeat`
          : ""),
    );
  const changeUp = live.change >= 0;
  // 전일 대비 원화 등락폭 — 현재가와 등락률에서 되짚어 계산한다(프로토타입과 같은 식).
  const rawDiff = (price * live.change) / (100 + live.change);
  const wonDiffText = `${changeUp ? "+" : "-"}${Math.round(
    Math.abs(Number.isFinite(rawDiff) ? rawDiff : 0),
  ).toLocaleString("ko-KR")}원`;
  const miniCard = (
    <div
      style={styleFromCss(
        "flex:none;background:#FFFFFF;border-radius:22px;padding:12px 15px;display:flex;align-items:center;gap:11px;box-shadow:0 2px 10px rgba(30,25,60,0.05)",
      )}
    >
      <div style={badgeStyle(38, 13, 18)}>{stock.logoUrl ? "" : stock.sectorName.charAt(0)}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#01185A", whiteSpace: "nowrap" }}>
          {stock.name}
        </div>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: "#8E93A8",
            fontVariantNumeric: "tabular-nums",
            marginTop: 2,
            whiteSpace: "nowrap",
          }}
        >
          {price.toLocaleString("ko-KR")}원
        </div>
      </div>
      <div style={{ flex: "none", display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={styleFromCss(
            "font-size:13.5px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;color:" +
              (changeUp ? UP : DOWN),
          )}
        >
          {`${changeUp ? "▲ " : "▼ "}${Math.abs(live.change).toFixed(2)}%`}
        </span>
        {/* 등락률 옆 원화 등락폭. `ui-src` 사본은 %를 두 번 보여주지만 김경렬 프로토타입
            (`design-system/prototype`)의 원안은 원화 + % 짝이다 — 원안을 따른다. */}
        <span
          style={styleFromCss(
            "font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;padding-left:7px;" +
              `border-left:1px solid ${changeUp ? UP : DOWN}59;color:` +
              (changeUp ? UP : DOWN),
          )}
        >
          {wonDiffText}
        </span>
      </div>
    </div>
  );
  const orderErrorCard = orderError && (
    <div style={WARN}>
      <span style={WARN_TEXT}>{orderError}</span>
    </div>
  );

  // ── 구매·판매·대기 탭과 대기 목록 시트 — `ui-src` 의 새 디자인(PR #252)을 옮겨 왔다 ──
  const ownedQty = me.holdings.find((h) => h.code === code)?.qty ?? 0;
  const sellableQty = Math.max(0, ownedQty - reservedSellQty(me.pending || [], code));
  const pickTabBuy = () => {
    if (locked) return;
    if (side !== "buy") {
      onLeave(`/buy/${code}`);
      return;
    }
    // 이미 구매 화면이면 초안을 처음으로 되돌린다 — `ui-src` 의 pickTabBuy 와 같다.
    setDraft(blankBuyDraft());
    setStep(1);
    setShowPad(false);
    setOrderSheet(false);
  };
  const pickTabSell = () => {
    // 팔 수 있는 수량이 없으면 넘어가지 않는다 — `ui-src` 의 goToSell 과 같은 문턱.
    //
    // 갖고 있지 않아서 막힌 것이면 **왜 막혔는지 말해 준다.** 프로토타입의 `sellBlocked`
    // 팝업이 그 자리인데 옮겨 오지 않아, 판매 탭이 눌러도 아무 반응이 없는 버튼이 돼 있었다.
    // 갖고 있는데 전부 예약에 묶여 막히는 경우는 원본에 없는 상황이라 문구를 지어내지 않고
    // 종전대로 조용히 막는다.
    if (locked) return;
    if (ownedQty < 0.01) {
      setSellBlocked(true);
      return;
    }
    if (sellableQty < 0.01) return;
    if (side !== "sell") {
      onLeave(`/sell/${code}`);
      return;
    }
    setSellDraftState(blankSellDraft(sellableQty));
    setSellPick("all");
    setSellQtyStr("");
    setStep(1);
    setShowPad(false);
    setOrderSheet(false);
  };
  // 1단계에서만 탭을 보여 준다 — 이후 단계에서는 흐름을 방해한다.
  const flowTabs = step === 1 && (
    <div style={TAB_ROW}>
      <div onClick={pickTabBuy} style={sheetTabStyle(side === "buy")}>
        구매
      </div>
      <div onClick={pickTabSell} style={sheetTabStyle(side === "sell")}>
        판매
      </div>
      <div onClick={() => setOrderSheet(true)} style={sheetTabStyle(false)}>
        대기
      </div>
    </div>
  );
  const pending = pendingCards(me);
  const cancelPending = (order: (typeof pending)[number]["order"]) => {
    // `PortfolioScreen` 의 취소와 같은 흐름 — 서버 주문을 지우고 계좌·주문 목록을 다시 읽는다.
    if (order.id) {
      fetch(`/api/orders?id=${encodeURIComponent(order.id)}`, { method: "DELETE" })
        .catch(() => {})
        .then(refresh);
    }
    notifyBehavior({
      kind: "order_confirmation_cancelled",
      stockId: `KRX:${order.code}`,
      side: order.side || "buy",
    });
  };
  // 스크림을 눌러도 닫힌다. 카드 안쪽 클릭은 스크림까지 올라가면 안 되므로 여기서 멈춘다
  // (프로토타입의 `stopTap`).
  const sellBlockModal = sellBlocked && (
    <div onClick={() => setSellBlocked(false)} style={BLOCK_SCRIM}>
      <div onClick={(event) => event.stopPropagation()} style={BLOCK_CARD}>
        <img
          alt="키웅이"
          src="/ui/assets/mascot-bear.png"
          style={{ display: "block", filter: "drop-shadow(0 10px 16px rgba(35,25,80,0.16))" }}
          width={96}
        />
        <div style={BLOCK_TITLE}>판매할 주식이 없어요</div>
        <div style={BLOCK_BODY}>{"이 회사를 아직 갖고 있지 않아요.\n먼저 사고 나면 팔 수 있어요."}</div>
        <div onClick={() => setSellBlocked(false)} style={BLOCK_CTA}>
          알겠어요
        </div>
      </div>
    </div>
  );
  const waitSheet = orderSheet && (
    <>
      <div onClick={() => setOrderSheet(false)} style={SHEET_SCRIM} />
      <div style={SHEET}>
        <div style={SHEET_GRAB} />
        <div style={{ fontSize: 15, fontWeight: 800, color: "#01185A", letterSpacing: "-0.01em", marginBottom: 10 }}>
          기다리는 주문
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {pending.map((p, index) => (
            <div key={p.order.id ?? index} style={SHEET_ROW}>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#01185A",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p.name}
              </div>
              <div style={{ flex: 2, minWidth: 0, fontSize: 12.5, fontWeight: 500, color: "#8E93A8", fontVariantNumeric: "tabular-nums" }}>
                {p.desc}
              </div>
              <div onClick={() => cancelPending(p.order)} style={SHEET_CANCEL}>
                취소
              </div>
            </div>
          ))}
          {pending.length === 0 && (
            <div style={{ fontSize: 14, fontWeight: 500, color: "#8E93A8", lineHeight: 1.6, padding: "10px 2px 6px" }}>
              아직 기다리는 주문이 없어요.
            </div>
          )}
        </div>
      </div>
    </>
  );
  const stepFooter = (ok: boolean, label: string, onNext: () => void) =>
    step < 3 ? (
      <div style={{ flex: "none", padding: "8px 16px 10px" }}>
        {/*
          접수를 기다리는 동안 라벨을 바꾸고 버튼을 끈다. 서버 확정을 기다리게 되면서
          버튼이 한 박자 늦게 반응하는데, 표시가 없으면 안 눌린 줄 알고 한 번 더 눌러
          같은 주문이 두 번 들어간다.
        */}
        <div
          onClick={onNext}
          style={ok && !(locked && step === 2) && !submitting ? CTA_ON : CTA_OFF}
        >
          <span style={{ textShadow: "0 1px 2px rgba(170,30,95,0.22)" }}>
            {submitting ? "주문 넣는 중…" : label}
          </span>
        </div>
      </div>
    ) : (
      <div style={{ flex: "none", padding: "8px 16px 10px", display: "flex", justifyContent: "center" }}>
        <div onClick={() => onLeave("/")} style={{ ...SUB_CTA, flex: "none", minWidth: 200 }}>
          홈으로
        </div>
      </div>
    );

  // ── 매수 ──────────────────────────────────────────────────────────────
  const renderBuy = () => {
    const math = buyMath(draft, price, me.cash);
    const nextOk = buyStepOk(step, draft, math);

    const pickOrderType = (orderType: "market" | "limit") => {
      if (draft.orderType === orderType) return;
      patchDraft({ orderType });
      notifyBehavior({
        kind: "order_method_selected",
        stockId: `KRX:${code}`,
        orderFlowId: flowIdRef.current,
        orderType,
      });
    };

    const finishBuy = (rec: BuyRecordRow, fill: boolean) => {
      update((current) => ({
        ...(fill
          ? { acc: { ...current.acc, [account]: applyBuyFill(current.acc[account], code, price, math.qty, math.amount) } }
          : {}),
        records: current.records.concat([rec]),
        seq: seq + 1,
      }));
      setDone({
        name: stock.name,
        qty: math.qty,
        amount: math.amount,
        limit: draft.orderType === "limit" ? math.limPrice : null,
        scheduled: !fill && draft.orderType !== "limit",
        scheduledFor: !fill && draft.orderType !== "limit" ? scheduledFor : null,
        requestMode: math.byQty ? "qty" : "amount",
      });
      setOrderError(null);
      setStep(3);
    };

    const placeBuy = () => {
      if (!nextOk || (locked && step === 2) || submitting) return;
      if (step < 2) {
        setStep(step + 1);
        setShowPad(false);
        setOrderError(null);
        return;
      }
      const isLimit = draft.orderType === "limit";
      const isScheduled = !isLimit && !marketOpen;
      const rec: BuyRecordRow & Record<string, unknown> = {
        order_id: `ord_${String(seq).padStart(4, "0")}`,
        user_id: userId,
        symbol: code,
        amount_krw: math.amount,
        qty: Math.round(math.qty * 10000) / 10000,
        order_type: isLimit ? "limit" : "market",
        limit_price: isLimit ? math.limPrice : null,
        order_status: isLimit ? "pending" : isScheduled ? "scheduled" : "filled",
        scheduled_for: isScheduled ? scheduledFor : null,
        reason_code: draft.reason,
        plan_code: draft.plan,
        plan_target_price: draft.targetPct ? Math.round(price * (1 + draft.targetPct / 100)) : null,
        memo: (draft.memo || "").trim() || null,
        ts: new Date().toISOString(),
      };
      if (isLimit || isScheduled) {
        // 미체결 주문은 서버 주문 잔고가 원본이다 — 화면은 예약을 만들지 않고 현금도 직접
        // 빼지 않는다. 접수가 끝나야 주문이 성립하므로 완료 화면도 그때 띄운다.
        setSubmitting(true);
        postReserve({
          side: "buy",
          stock_code: code,
          order_type: isLimit ? "limit" : "market",
          limit_price: isLimit ? math.limPrice : null,
          reserved_amount: math.amount,
          request_mode: math.byQty ? "quantity" : "amount",
          requested_quantity: math.byQty ? math.qty : null,
          scheduled_for: isScheduled ? scheduledFor : null,
          reason: draft.reason,
          plan_code: rec.plan_code,
          plan_target_price: rec.plan_target_price,
          memo: rec.memo,
        }).then((result) => {
          setSubmitting(false);
          if (!result?.order_id) {
            setOrderError(ORDER_REJECTED);
            return;
          }
          finishBuy(rec, false);
          // 접수가 잠근 현금은 서버가 안다. 계좌·주문 목록을 다시 읽어 화면을 맞춘다.
          refresh();
        });
        return;
      }
      // 즉시 체결도 서버가 확정한 뒤에 지갑을 바꾼다. 로컬을 먼저 바꾸면 저장에 실패한
      // 체결이 화면에만 남고, 다음 `/api/account` 가 그것을 지운다.
      setSubmitting(true);
      postTrade({
        side: "buy",
        stock_code: code,
        price,
        quantity: math.qty,
        reason: draft.reason,
        plan_code: rec.plan_code,
        plan_target_price: rec.plan_target_price,
        memo: rec.memo,
      }).then((saved) => {
        setSubmitting(false);
        if (!saved) {
          setOrderError(ORDER_REJECTED);
          return;
        }
        finishBuy(rec, true);
        // 상세·차트·뉴스에서 쌓인 유효 열람을 이 매수와 묶어 보낸다 (`app.html` 과 같은 시점).
        // 거절된 주문에는 붙이지 않는다 — 버퍼는 다음 체결까지 남는다.
        flushTabViews(code, syncable);
        notifyBehavior({ kind: "trade_filled", stockId: `KRX:${code}`, side: "buy" });
        // 서버가 잔액의 원본이다. 완료 화면을 띄운 뒤 뒤에서 맞춘다 — 기다리지 않는다.
        refresh();
      });
    };

    const goBack = () => {
      setOrderError(null);
      if (step === 2) notifyBehavior({ kind: "order_confirmation_cancelled", stockId: `KRX:${code}`, side: "buy" });
      if (step === 3) {
        onLeave("/portfolio");
        return;
      }
      if (step === 1) onLeave(`/stock/${code}`);
      else {
        setStep(step - 1);
        setShowPad(false);
      }
    };

    const qtyHint = math.byQty
      ? draft.shares > 0
        ? `${Math.round(draft.shares * math.execPrice).toLocaleString("ko-KR")}원이 들어가요`
        : "몇 주 살지 골라보세요"
      : math.amount > 0
        ? `${stock.name} 약 ${math.qty.toFixed(2)}주${draft.orderType === "limit" ? "를 살 수 있게 돼요" : "를 살 수 있어요"}`
        : "얼마를 넣을지 골라보세요";
    const buyMaxHint =
      math.execPrice > 0 && me.cash > 0
        ? `최대 ${Math.floor(me.cash / math.execPrice)}주까지 살 수 있어 · 지갑 ${won(me.cash)}`
        : "";
    const orderTypeText =
      draft.orderType === "limit"
        ? `${math.limPrice.toLocaleString("ko-KR")}원이 되면`
        : marketOpen
          ? "지금 가격에 바로"
          : `${scheduledFor} 장 시작 시가에`;

    const padTap = (key: string) => {
      if (math.byQty) {
        const cur = String(draft.shares || "");
        const v = key === "←" ? cur.slice(0, -1) : cur + key;
        patchDraft({ shares: Math.min(math.maxShares, parseInt(v || "0", 10) || 0), amountSource: "custom" });
        return;
      }
      const cur = String(draft.amount || "");
      const v = key === "←" ? cur.slice(0, -1) : cur + key;
      patchDraft({ amount: Math.min(math.availableCash, parseInt(v || "0", 10) || 0), amountSource: "custom" });
    };

    const step1 = (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={WALLET_ROW}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#5C6280", whiteSpace: "nowrap" }}>내 지갑</span>
          <span
            style={{
              flex: 1,
              textAlign: "right",
              fontSize: 16,
              fontWeight: 800,
              color: "#01185A",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {won(me.cash)}
          </span>
        </div>

        <div style={CARD}>
          <div style={CARD_TITLE}>얼마나 살까요?</div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <div
              onClick={() => {
                patchDraft({ buyBy: "amount" });
                setShowPad(false);
              }}
              style={chipStyle(!math.byQty)}
            >
              금액으로
            </div>
            <div
              onClick={() => {
                patchDraft({ buyBy: "qty" });
                setShowPad(false);
              }}
              style={chipStyle(math.byQty)}
            >
              주 수로
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3, margin: "16px 0 4px" }}>
            <span
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: "#01185A",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {(math.byQty ? draft.shares : draft.amount).toLocaleString("ko-KR")}
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#01185A" }}>{math.byQty ? "주" : "원"}</span>
          </div>
          <div style={{ textAlign: "center", fontSize: 14.5, fontWeight: 600, color: "#F5327F", marginTop: 10 }}>
            {qtyHint}
          </div>
          <div style={{ textAlign: "center", fontSize: 12.5, fontWeight: 500, color: "#A9AEC4", marginTop: 6, whiteSpace: "nowrap" }}>
            {buyMaxHint}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {math.byQty ? (
              <>
                {[1, 5, 10].map((v) => (
                  <div
                    key={v}
                    onClick={() => {
                      patchDraft({ shares: Math.min(math.maxShares, v), amountSource: "preset" });
                      setShowPad(false);
                    }}
                    style={chipStyle(draft.amountSource === "preset" && draft.shares === v)}
                  >
                    {v}주
                  </div>
                ))}
                <div
                  onClick={() => {
                    patchDraft({ shares: Math.min(math.maxShares, draft.shares), amountSource: "custom" });
                    setShowPad((cur) => !cur);
                  }}
                  style={chipStyle(draft.amountSource === "custom")}
                >
                  직접
                </div>
              </>
            ) : (
              <>
                {(
                  [
                    [10000, "1만원"],
                    [30000, "3만원"],
                    [50000, "5만원"],
                  ] as const
                ).map(([v, label]) => (
                  <div
                    key={v}
                    onClick={() => {
                      patchDraft({ amount: v, amountSource: "preset" });
                      setShowPad(false);
                    }}
                    style={chipStyle(draft.amountSource === "preset" && draft.amount === v)}
                  >
                    {label}
                  </div>
                ))}
                <div
                  onClick={() => {
                    patchDraft({ amount: Math.min(math.availableCash, draft.amount), amountSource: "custom" });
                    setShowPad((cur) => !cur);
                  }}
                  style={chipStyle(draft.amountSource === "custom")}
                >
                  직접
                </div>
              </>
            )}
          </div>
          {showPad && (
            <NumPad
              keys={
                math.byQty
                  ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "←", "0", "00"]
                  : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "←", "0", "000"]
              }
              onTap={padTap}
            />
          )}
        </div>

        <div style={TOGGLE_ROW}>
          <div onClick={() => pickOrderType("market")} style={chipStyle(draft.orderType === "market")}>
            지금 가격에 바로
          </div>
          <div onClick={() => pickOrderType("limit")} style={chipStyle(draft.orderType === "limit")}>
            내가 정한 가격에
          </div>
        </div>

        {draft.orderType === "limit" && (
          <div style={CARD}>
            <div style={CARD_TITLE}>얼마가 되면 살까요?</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3, margin: "14px 0 2px" }}>
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: "#F5327F",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                }}
              >
                {math.limPrice.toLocaleString("ko-KR")}
              </span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#F5327F" }}>원</span>
            </div>
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 500, color: "#7E849B", marginTop: 9, whiteSpace: "nowrap" }}>
              {draft.limitPct === 0
                ? "지금 가격 그대로예요"
                : `지금 ${price.toLocaleString("ko-KR")}원보다 ${Math.abs(draft.limitPct)}% 싸요`}
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 15 }}>
              {[-10, -5, -3, 0].map((pct) => (
                <div key={pct} onClick={() => patchDraft({ limitPct: pct })} style={chipStyle(draft.limitPct === pct)}>
                  {pct === 0 ? "지금값" : `${pct}%`}
                </div>
              ))}
            </div>
            <div style={NOTE_ROW}>
              <span style={NOTE_TEXT}>이 값이 될 때까지 기다렸다가 살게요. 기다리는 동안 그 돈은 잠깐 맡아둘게요.</span>
            </div>
          </div>
        )}

        {math.warn && (
          <div style={WARN}>
            <span style={WARN_TEXT}>{math.warn}</span>
          </div>
        )}
      </div>
    );

    const step2 = (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <img alt="키웅이" src="/ui/assets/mascot-bear.png" style={MASCOT_IMG} width={72} />
          <div style={MASCOT_BUBBLE}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A", lineHeight: 1.4 }}>
              왜 이 회사가 좋아 보였나요?
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#9B94C4", marginTop: 3 }}>
              정답은 없어요, 솔직한 게 최고예요!
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {reasonOrder.map((index) => {
            const reason = REASONS[index];
            return (
              <div
                key={reason.code}
                onClick={() => patchDraft({ reason: reason.code })}
                style={pickCardStyle(draft.reason === reason.code, "grid")}
              >
                <div style={{ fontSize: 14.5, fontWeight: 600, color: "#01185A", lineHeight: 1.45 }}>{reason.label}</div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 15.5, fontWeight: 800, color: "#01185A", marginTop: 9 }}>언제까지 가질 생각인가요?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {PLANS.map((plan) => (
            <div
              key={plan.code}
              onClick={() =>
                patchDraft({ plan: plan.code, targetPct: plan.code === "plan_target" ? draft.targetPct : null })
              }
              style={pickCardStyle(draft.plan === plan.code, "row")}
            >
              <span style={{ fontSize: 15.5, fontWeight: 600, color: "#01185A" }}>{plan.label}</span>
            </div>
          ))}
        </div>

        {draft.plan === "plan_target" && (
          <div style={SUMMARY}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#01185A" }}>목표 가격을 정해볼까?</div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {[5, 10, 20].map((pct) => (
                <div key={pct} onClick={() => patchDraft({ targetPct: pct })} style={chipStyle(draft.targetPct === pct)}>
                  +{pct}%
                </div>
              ))}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#5C6280",
                marginTop: 13,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {draft.targetPct
                ? `지금 ${price.toLocaleString("ko-KR")}원 → 목표 ${Math.round(price * (1 + draft.targetPct / 100)).toLocaleString("ko-KR")}원`
                : "몇 퍼센트 오르면 팔지 골라봐"}
            </div>
          </div>
        )}

        <div style={{ fontSize: 15.5, fontWeight: 800, color: "#01185A", marginTop: 9 }}>하고 싶은 말 남겨둘래요?</div>
        <input
          maxLength={50}
          onChange={(e) => patchDraft({ memo: e.target.value.slice(0, 50) })}
          placeholder="예: 월드투어 시작한대요"
          style={MEMO_INPUT}
          value={draft.memo}
        />
        <div
          style={{
            textAlign: "right",
            fontSize: 12.5,
            fontWeight: 500,
            color: "#A9AEC4",
            fontVariantNumeric: "tabular-nums",
            marginTop: -4,
          }}
        >
          {draft.memo.length} / 50
        </div>

        <div style={{ fontSize: 15.5, fontWeight: 800, color: "#01185A", marginTop: 9 }}>주문 정보</div>
        <div style={DARK_SUMMARY}>
          <div style={DARK_ROW}>
            <span>{stock.name}</span>
            <span style={DARK_VALUE}>{math.qty.toFixed(2)}주</span>
          </div>
          <div style={DARK_ROW}>
            <span>사는 방법</span>
            <span style={{ fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap" }}>{orderTypeText}</span>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.18)", margin: "9px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>주문 금액</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {won(math.amount)}
            </span>
          </div>
        </div>

        {orderErrorCard}
      </div>
    );

    const doneQtyText =
      done?.scheduled && done.requestMode === "amount"
        ? "시가 확인 뒤 결정"
        : done
          ? `${Math.round(done.qty * 100) / 100}주`
          : "";
    const step3 = done && (
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 6,
        }}
      >
        {/* 풍선·색종이. app.html 과 같은 마크업이고 kw* keyframes 는 `phone-frame.css` 가
            정의한다 — 유실돼 죽어 있던 연출을 이관하면서 복원했다. zIndex 를 마스코트·카드보다
            높여서 뒤로 지나가지 않고 앞으로 지나가게 한다. */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 100 }}>
          {["🎈", "🎈", "🎈", "🎉", "🎊"].map((emoji, i) => (
            <div
              key={i}
              style={styleFromCss(
                `position:absolute;left:${8 + i * 21}%;bottom:-40px;font-size:${26 + (i % 3) * 7}px;` +
                  `--kwx:${i % 2 ? "" : "-"}${10 + i * 6}px;` +
                  `animation:kwRise ${2.6 + i * 0.35}s ease-in ${i * 0.18}s forwards`,
              )}
            >
              {emoji}
            </div>
          ))}
          {Array.from({ length: 14 }, (_, i) => {
            const col = ["#F5327F", "#FFC53D", "#4FC3F7", "#7BE3A0", "#9B8CFF", "#FF8AD0"][i % 6];
            return (
              <div
                key={`c${i}`}
                style={styleFromCss(
                  `position:absolute;top:-20px;left:${4 + i * 6.8}%;width:${7 + (i % 3) * 3}px;height:${11 + (i % 4) * 3}px;` +
                    `border-radius:2px;background:${col};--kwx:${i % 2 ? "" : "-"}${14 + (i % 5) * 12}px;` +
                    `animation:kwFall ${2 + (i % 5) * 0.3}s linear ${i * 0.09}s forwards`,
                )}
              />
            );
          })}
        </div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
          <img
            alt="키웅이"
            src="/ui/assets/mascot-bear.png"
            style={{
              display: "block",
              animation: "kwPop 0.5s cubic-bezier(0.2,1.2,0.4,1) both",
              filter: "drop-shadow(0 12px 20px rgba(35,25,80,0.18))",
            }}
            width={128}
          />
          <div style={{ fontSize: 14, fontWeight: 700, color: "#F5327F", letterSpacing: "0.08em", marginTop: 14 }}>
            {done.limit ? "기다리는 주문에 넣었어요" : done.scheduled ? "다음 장 주문을 맡아뒀어요" :"주문 완료!"}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#01185A",
              marginTop: 6,
              textAlign: "center",
              letterSpacing: "-0.01em",
              lineHeight: 1.4,
              whiteSpace: "pre-line",
            }}
          >
            {done.limit
              ? `${done.limit.toLocaleString("ko-KR")}원이 되면\n${done.name} ${doneQtyText}를 살게요!`
              : done.scheduled
                ? `${done.scheduledFor} 장이 열리면\n${done.name}을 시가로 살게요!`
                : `${done.name} ${doneQtyText}를\n주문했어요!`}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#5C6280",
              marginTop: 12,
              textAlign: "center",
              lineHeight: 1.6,
              whiteSpace: "pre-line",
            }}
          >
            {done.limit
              ? "값이 목표에 닿을 때까지 키웅이가 지켜볼게요.\n그동안 그 돈은 잠깐 맡아둘게요!"
              : done.scheduled
                ? "주문 접수와 체결은 달라요.\n거래가 확인된 첫날의 시가로 체결하고, 휴장하거나 거래가 멈추면 돈을 그대로 맡아둘게요."
                : "왜 샀는지까지 남긴 건 정말 잘한 거예요.\n나중에 아카이브에서 오늘의 나를 다시 만나요!"}
          </div>
          <div style={{ ...DONE_BOX, marginTop: 22 }}>
            <div style={{ ...SUMMARY_ROW, padding: "4px 0" }}>
              <span>{done.name}</span>
              <span style={SUMMARY_VALUE}>{doneQtyText}</span>
            </div>
            <div style={{ ...SUMMARY_ROW, padding: "4px 0" }}>
              <span>주문 금액</span>
              <span style={SUMMARY_VALUE}>{won(done.amount ?? 0)}</span>
            </div>
            <div style={{ ...SUMMARY_ROW, padding: "4px 0" }}>
              <span>남은 지갑</span>
              <span style={SUMMARY_VALUE}>{won(me.cash)}</span>
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div style={PAGE}>
        <div style={HEADER}>
          <div onClick={goBack} style={BACK}>
            {step === 2 ? "‹" : "✕"}
          </div>
          <div style={TITLE}>살래(매수)</div>
          <div style={STEP_PILL}>
            <span style={{ color: "#F5327F" }}>{step}</span> / 3
          </div>
        </div>
        <ProgressBars step={step} />
        <div style={SCROLL}>
          {miniCard}
          {flowTabs}
          {step === 1 && step1}
          {step === 2 && step2}
          {step === 3 && step3}
        </div>
        {stepFooter(nextOk, step === 2 ? "주문하기" : "다음", placeBuy)}
        {waitSheet}
        {sellBlockModal}
      </div>
    );
  };

  // ── 매도 ──────────────────────────────────────────────────────────────
  const renderSell = () => {
    if (!sellDraft) return null;
    const held = me.holdings.find((h) => h.code === code) ?? null;
    const heldQty = held?.qty ?? 0;
    const heldAvg = held?.avg ?? 0;
    const heldPnl = held ? (price - heldAvg) * heldQty : 0;
    const heldPct = held && heldAvg > 0 ? ((price - heldAvg) / heldAvg) * 100 : 0;
    const reserved = reservedSellQty(me.pending || [], code);
    const math = sellMath(sellDraft, price, heldQty, reserved);
    const records = wallet.records as BuyRecordRow[];
    const buyRec = lastBuyRecord(records, code, userId);
    const heldDays = buyRec ? Math.max(0, Math.floor((Date.now() - new Date(buyRec.ts).getTime()) / 86400000)) : 0;
    const planMatch = judgePlanMatch(buyRec, price);
    const isFirstSell = buyRec
      ? !(wallet.sellRecords as { linked_buy_order_id?: string | null }[]).some(
          (r) => r.linked_buy_order_id === buyRec.order_id,
        )
      : true;
    const showJudge = isFirstSell && planMatch !== null;
    const sellOk =
      step === 1
        ? math.canConfirm
        : step === 2
          ? !!sellDraft.reason && (!showJudge || planMatch === true || !!sellDraft.change)
          : true;

    const finishSell = (rec: Record<string, unknown>, fill: boolean) => {
      update((current) => ({
        ...(fill
          ? { acc: { ...current.acc, [account]: applySellFill(current.acc[account], code, math.qty, math.proceeds) } }
          : {}),
        sellRecords: current.sellRecords.concat([rec]),
        seq: seq + 1,
      }));
      setDone({
        name: stock.name,
        qty: math.qty,
        proceeds: math.proceeds,
        limit: sellDraft.orderType === "limit" ? math.limPrice : null,
        scheduled: !fill && sellDraft.orderType !== "limit",
        scheduledFor: !fill && sellDraft.orderType !== "limit" ? scheduledFor : null,
        // 완료 화면에서도 배지를 다시 보여준다(PR #252) — 기록이 추가되면 isFirstSell 이
        // 뒤집히므로 판정은 지금 잡아 둔다.
        badge: showJudge && planMatch === true,
      });
      patchSell({ memo: "" });
      setMemoSaved(false);
      setOrderError(null);
      setStep(3);
    };

    const placeSell = () => {
      if (!sellOk || (locked && step === 2) || submitting) return;
      if (step === 1) {
        retroAtRef.current = Date.now();
        setOrderError(null);
        setStep(2);
        return;
      }
      retroMsRef.current = retroAtRef.current ? Date.now() - retroAtRef.current : 0;
      const isLimit = sellDraft.orderType === "limit";
      const isScheduled = !isLimit && !marketOpen;
      const rec = {
        order_id: `ord_${String(seq).padStart(4, "0")}`,
        user_id: userId,
        symbol: code,
        qty: Math.round(math.qty * 10000) / 10000,
        linked_buy_order_id: buyRec ? buyRec.order_id : null,
        order_type: isLimit ? "limit" : "market",
        limit_price: isLimit ? math.limPrice : null,
        order_status: isLimit ? "pending" : isScheduled ? "scheduled" : "filled",
        amount_krw: !isLimit && !isScheduled ? math.proceeds : null,
        scheduled_for: isScheduled ? scheduledFor : null,
        sell_reason_code: sellDraft.reason,
        plan_match: planMatch,
        change_reason_code: showJudge && planMatch === false ? sellDraft.change : null,
        retro_card_viewed_ms: retroMsRef.current || 0,
        pnl_pct_at_sell: Math.round(heldPct * 10) / 10,
        held_days: heldDays,
        avg: heldAvg,
        memo: null,
        ts: new Date().toISOString(),
      };
      if (isLimit || isScheduled) {
        // 미체결 매도도 서버가 원본이다. 매도는 보유에서 빼지 않고 수량만 잠근다.
        setSubmitting(true);
        postReserve({
          side: "sell",
          stock_code: code,
          order_type: isLimit ? "limit" : "market",
          limit_price: isLimit ? math.limPrice : null,
          request_mode: "quantity",
          requested_quantity: math.qty,
          scheduled_for: isScheduled ? scheduledFor : null,
          reason: sellDraft.reason,
          plan_match: rec.plan_match,
          plan_changed_reason: rec.change_reason_code,
        }).then((result) => {
          setSubmitting(false);
          if (!result?.order_id) {
            setOrderError(ORDER_REJECTED);
            return;
          }
          finishSell(rec, false);
          refresh();
        });
        return;
      }
      // 매수와 같다 — 서버가 확정한 뒤에 보유를 뺀다.
      setSubmitting(true);
      postTrade({
        side: "sell",
        stock_code: code,
        price,
        quantity: math.qty,
        reason: sellDraft.reason,
        plan_match: rec.plan_match,
        plan_changed_reason: rec.change_reason_code,
      }).then((saved) => {
        setSubmitting(false);
        if (!saved) {
          setOrderError(ORDER_REJECTED);
          return;
        }
        finishSell(rec, true);
        const behavior: Record<string, unknown> = { kind: "trade_filled", stockId: `KRX:${code}`, side: "sell" };
        if (held && Number.isFinite(heldAvg) && heldAvg > 0 && Number.isFinite(price)) {
          behavior.realizedPnlPct = ((price - heldAvg) / heldAvg) * 100;
        }
        notifyBehavior(behavior);
        refresh();
      });
    };

    const goBack = () => {
      setOrderError(null);
      if (step === 2) notifyBehavior({ kind: "order_confirmation_cancelled", stockId: `KRX:${code}`, side: "sell" });
      if (step === 3 || step === 1) {
        onLeave("/portfolio");
        return;
      }
      setStep(step - 1);
    };

    const padTap = (key: string) => {
      if (!math.byQty) {
        const cur = String(sellDraft.amountInput || "");
        const v = key === "←" ? cur.slice(0, -1) : cur + key;
        patchSell({ amountInput: Math.min(Math.round(math.maxQty * math.execPrice), parseInt(v || "0", 10) || 0) });
        return;
      }
      const cur = sellQtyStr;
      let v: string;
      if (key === "←") v = cur.slice(0, -1);
      else if (key === ".") v = cur.includes(".") ? cur : cur === "" ? "0." : `${cur}.`;
      else v = cur + key;
      setSellQtyStr(v);
      patchSell({ qty: parseFloat(v || "0") || 0 });
    };

    const sellChips = (
      math.byQty
        ? [
            { k: "all", label: "전부", apply: () => patchSell({ qty: math.maxQty }) },
            { k: "half", label: "절반", apply: () => patchSell({ qty: math.maxQty / 2 }) },
          ]
        : [
            {
              k: "a3",
              label: "3만원",
              apply: () => patchSell({ amountInput: Math.min(30000, Math.round(math.maxQty * math.execPrice)) }),
            },
            {
              k: "a5",
              label: "5만원",
              apply: () => patchSell({ amountInput: Math.min(50000, Math.round(math.maxQty * math.execPrice)) }),
            },
          ]
    ).map((chip) => (
      <div
        key={chip.k}
        onClick={() => {
          setSellPick(chip.k);
          setShowPad(false);
          setSellQtyStr("");
          chip.apply();
        }}
        style={chipStyle(sellPick === chip.k)}
      >
        {chip.label}
      </div>
    ));

    const step1 = (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={styleFromCss("background:#FFFFFF;border-radius:26px;padding:18px 20px;box-shadow:0 2px 10px rgba(30,25,60,0.05)")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={badgeStyle(52, 18, 25)}>{stock.logoUrl ? "" : stock.sectorName.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#01185A" }}>{stock.name}</div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: "#8E93A8", marginTop: 3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {heldQty.toFixed(2)}주 · 평균 {Math.round(heldAvg).toLocaleString("ko-KR")}원
              </div>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#8E93A8" }}>지금 값어치</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#01185A", fontVariantNumeric: "tabular-nums", marginTop: 5, whiteSpace: "nowrap" }}>
                {won(heldQty * price)}
              </div>
            </div>
            <div style={{ width: 1, background: "#EFEFF5", margin: "0 14px" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#8E93A8" }}>번 돈</div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  marginTop: 5,
                  whiteSpace: "nowrap",
                  color: heldPnl >= 0 ? UP : DOWN,
                }}
              >
                {`${heldPnl >= 0 ? "▲ +" : "▼ "}${Math.abs(Math.round(heldPnl)).toLocaleString("ko-KR")}원`}
              </div>
            </div>
          </div>
        </div>

        <div style={CARD}>
          <div style={CARD_TITLE}>얼마나 팔까요?</div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <div
              onClick={() => {
                patchSell({ sellBy: "qty" });
                setShowPad(false);
              }}
              style={chipStyle(math.byQty)}
            >
              주 수로
            </div>
            <div
              onClick={() => {
                patchSell({ sellBy: "amount" });
                setShowPad(false);
              }}
              style={chipStyle(!math.byQty)}
            >
              금액으로
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3, margin: "16px 0 4px" }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: "#01185A", fontVariantNumeric: "tabular-nums", lineHeight: 1, whiteSpace: "nowrap" }}>
              {math.byQty
                ? String(Math.round((sellDraft.qty || 0) * 100) / 100)
                : (sellDraft.amountInput || 0).toLocaleString("ko-KR")}
            </span>
            <span style={{ fontSize: 19, fontWeight: 800, color: "#01185A" }}>{math.byQty ? "주" : "원"}</span>
          </div>
          <div style={{ textAlign: "center", fontSize: 14.5, fontWeight: 600, color: "#F5327F", marginTop: 10, whiteSpace: "nowrap" }}>
            {math.qty > 0 ? `${won(math.proceeds)}을 받게 돼` : math.byQty ? "몇 주 팔지 골라봐" : "얼마어치 팔지 골라봐"}
          </div>
          <div style={{ textAlign: "center", fontSize: 12.5, fontWeight: 500, color: "#A9AEC4", marginTop: 6, whiteSpace: "nowrap" }}>
            {math.maxQty > 0
              ? `최대 ${Math.floor(math.maxQty * 100) / 100}주까지 팔 수 있어 · ${won(math.maxQty * math.execPrice)}`
              : ""}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {sellChips}
            <div
              onClick={() => {
                setSellPick("custom");
                setShowPad(true);
                setSellQtyStr("");
                patchSell(math.byQty ? { qty: 0 } : { amountInput: 0 });
              }}
              style={chipStyle(sellPick === "custom")}
            >
              직접
            </div>
          </div>
          {showPad && (
            <NumPad
              keys={
                math.byQty
                  ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "←"]
                  : ["1", "2", "3", "4", "5", "6", "7", "8", "9", "←", "0", "000"]
              }
              onTap={padTap}
            />
          )}
        </div>

        <div style={TOGGLE_ROW}>
          <div onClick={() => patchSell({ orderType: "market" })} style={chipStyle(sellDraft.orderType !== "limit")}>
            지금 가격에 바로
          </div>
          <div onClick={() => patchSell({ orderType: "limit" })} style={chipStyle(sellDraft.orderType === "limit")}>
            내가 정한 가격에
          </div>
        </div>

        {sellDraft.orderType === "limit" && (
          <div style={CARD}>
            <div style={CARD_TITLE}>얼마가 되면 팔까요?</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3, margin: "14px 0 2px" }}>
              <span style={{ fontSize: 30, fontWeight: 800, color: "#F5327F", fontVariantNumeric: "tabular-nums", lineHeight: 1, whiteSpace: "nowrap" }}>
                {math.limPrice.toLocaleString("ko-KR")}
              </span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#F5327F" }}>원</span>
            </div>
            <div style={{ textAlign: "center", fontSize: 14, fontWeight: 500, color: "#7E849B", marginTop: 9, whiteSpace: "nowrap" }}>
              {math.limPct === 0 ? "지금 값 그대로예요" : `지금보다 ${math.limPct}% 높은 값이에요`}
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 15 }}>
              {[0, 3, 5, 10].map((pct) => (
                <div key={pct} onClick={() => patchSell({ limitPct: pct })} style={chipStyle(math.limPct === pct)}>
                  {pct === 0 ? "지금값" : `+${pct}%`}
                </div>
              ))}
            </div>
            <div style={NOTE_ROW}>
              <span style={NOTE_TEXT}>이 값이 될 때까지 기다렸다가 팔게요. 기다리는 동안 그 주식은 잠깐 맡아둘게요.</span>
            </div>
          </div>
        )}

        {math.warn && (
          <div style={WARN}>
            <span style={WARN_TEXT}>{math.warn}</span>
          </div>
        )}
      </div>
    );

    const retroRows = buyRec
      ? [
          {
            label: "산 날",
            value: ((d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`)(new Date(buyRec.ts)),
          },
          { label: "산 만큼", value: `${Math.round(buyRec.qty * 100) / 100}주 · ${won(buyRec.amount_krw)}` },
          { label: "왜 샀는지", value: choiceOf(REASONS, buyRec.reason_code)?.label ?? "기록 없음" },
          { label: "언제까지", value: choiceOf(PLANS, buyRec.plan_code)?.label ?? "기록 없음" },
        ]
          .concat(buyRec.plan_target_price ? [{ label: "목표 가격", value: won(buyRec.plan_target_price) }] : [])
          .concat(buyRec.memo ? [{ label: "그때 한 말", value: buyRec.memo }] : [])
      : [];

    const step2 = (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <img alt="키웅이" src="/ui/assets/mascot-bear.png" style={MASCOT_IMG} width={72} />
          <div style={MASCOT_BUBBLE}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A", lineHeight: 1.4 }}>
              잠깐! 사던 날에는 이렇게 생각했어요.
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#9B94C4", marginTop: 3 }}>
              그때 마음과 지금 마음을 견줘 봐요
            </div>
          </div>
        </div>

        <div style={styleFromCss("background:#FDEFF5;border-radius:26px;padding:20px;box-shadow:0 2px 10px rgba(90,25,70,0.06)")}>
          <span
            style={styleFromCss(
              "display:inline-block;font-size:13px;font-weight:700;color:#F5327F;background:#FCE9F1;border-radius:999px;padding:6px 13px;white-space:nowrap",
            )}
          >
            {heldDays === 0 ? "오늘의 나" : `${heldDays}일 전의 나`}
          </span>
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#F5327F", lineHeight: 0.85 }}>“</span>
            <div style={{ flex: 1, fontSize: 20, fontWeight: 800, color: "#01185A", lineHeight: 1.5, letterSpacing: "-0.01em", whiteSpace: "pre-line" }}>
              {buyRec
                ? `${[choiceOf(REASONS, buyRec.reason_code)?.short, choiceOf(PLANS, buyRec.plan_code)?.short]
                    .filter(Boolean)
                    .join(",\n")} 샀어요.`
                : "기록이 없어요."}
              <span style={{ fontSize: 26, color: "#F5327F", lineHeight: 0.85, marginLeft: 3 }}>”</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            {retroRows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 12,
                  background: "rgba(255,255,255,0.72)",
                  borderRadius: 14,
                  padding: "11px 13px",
                }}
              >
                <span style={{ flex: "none", fontSize: 13, fontWeight: 600, color: "#A9739B", whiteSpace: "nowrap" }}>
                  {row.label}
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: "right", fontSize: 14, fontWeight: 700, color: "#01185A", lineHeight: 1.5 }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={styleFromCss("background:#FFFFFF;border-radius:22px;padding:17px 19px;box-shadow:0 2px 10px rgba(30,25,60,0.05)")}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "#8E93A8" }}>지금은</div>
          <div style={{ display: "flex", marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "#A9AEC4" }}>수익률</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#5C6280", fontVariantNumeric: "tabular-nums", marginTop: 4, whiteSpace: "nowrap" }}>
                {`${heldPct >= 0 ? "+" : ""}${heldPct.toFixed(1)}%`}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "#A9AEC4" }}>보유 기간</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#5C6280", marginTop: 4, whiteSpace: "nowrap" }}>
                {heldDays === 0 ? "오늘" : `${heldDays}일`}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "#A9AEC4" }}>남은 시즌</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#5C6280", marginTop: 4, whiteSpace: "nowrap" }}>1주</div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 15.5, fontWeight: 800, color: "#01185A", marginTop: 9 }}>왜 팔고 싶나요?</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {sellReasonOrder.map((index) => {
            const reason = SELL_REASONS[index];
            return (
              <div
                key={reason.code}
                onClick={() => patchSell({ reason: reason.code })}
                style={pickCardStyle(sellDraft.reason === reason.code, "grid")}
              >
                <div style={{ fontSize: 14.5, fontWeight: 600, color: "#01185A", lineHeight: 1.45 }}>{reason.label}</div>
              </div>
            );
          })}
        </div>

        {showJudge && planMatch === true && (
          <div
            style={styleFromCss(
              "display:flex;align-items:center;gap:12px;background:#FFF6E0;border-radius:20px;padding:15px 17px;box-shadow:0 1px 3px rgba(120,90,20,0.08)",
            )}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: "#01185A" }}>계획 실천 배지</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#8A6B1F", marginTop: 4, lineHeight: 1.5 }}>
                처음 세운 생각을 기억하고 실천했네요! 아카이브에 모아둘게요.
              </div>
            </div>
          </div>
        )}

        {showJudge && planMatch === false && (
          <>
            {/* 원본은 두 문장을 줄로 나눈다 — `\n` 이 살려면 `pre-line` 이 함께 있어야 한다. */}
            <div
              style={{
                fontSize: 15.5,
                fontWeight: 800,
                color: "#01185A",
                marginTop: 9,
                lineHeight: 1.4,
                textWrap: "pretty",
                whiteSpace: "pre-line",
              }}
            >
              {buyRec
                ? `처음에는 ${choiceOf(PLANS, buyRec.plan_code)?.short ?? ""} 가지려고 했었네요.\n무엇이 달라졌나요?`
                : "무엇이 달라졌나요?"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {CHANGES.map((change) => (
                <div
                  key={change.code}
                  onClick={() => patchSell({ change: change.code })}
                  style={pickCardStyle(sellDraft.change === change.code, "row")}
                >
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#01185A", lineHeight: 1.4 }}>{change.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={DARK_SUMMARY}>
          <div style={DARK_ROW}>
            <span>{stock.name}</span>
            <span style={DARK_VALUE}>{math.qty.toFixed(2)}주</span>
          </div>
          <div style={DARK_ROW}>
            <span>파는 방법</span>
            <span style={{ fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap" }}>
              {sellDraft.orderType === "limit" ? `${math.limPrice.toLocaleString("ko-KR")}원이 되면` : "지금 가격에 바로"}
            </span>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.18)", margin: "9px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>받게 되는 돈</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {won(math.proceeds)}
            </span>
          </div>
        </div>

        {orderErrorCard}
      </div>
    );

    const saveMemo = () => {
      if (memoSaved) return;
      const value = (sellDraft.memo || "").trim();
      update((current) => {
        const sellRecords = current.sellRecords.slice() as Record<string, unknown>[];
        if (sellRecords.length) {
          sellRecords[sellRecords.length - 1] = { ...sellRecords[sellRecords.length - 1], memo: value || null };
        }
        return { sellRecords };
      });
      setMemoSaved(true);
    };

    const sdQty = done ? `${Math.round(done.qty * 100) / 100}주` : "";
    const step3 = done && (
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 6,
        }}
      >
        {/* 풍선·색종이 — 매수 완료와 같은 연출이다. 원래 프로토타입에는 매도 완료에 이
            연출이 없었지만 사용자 요청으로 매수와 맞춘다. */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 100 }}>
          {["🎈", "🎈", "🎈", "🎉", "🎊"].map((emoji, i) => (
            <div
              key={i}
              style={styleFromCss(
                `position:absolute;left:${8 + i * 21}%;bottom:-40px;font-size:${26 + (i % 3) * 7}px;` +
                  `--kwx:${i % 2 ? "" : "-"}${10 + i * 6}px;` +
                  `animation:kwRise ${2.6 + i * 0.35}s ease-in ${i * 0.18}s forwards`,
              )}
            >
              {emoji}
            </div>
          ))}
          {Array.from({ length: 14 }, (_, i) => {
            const col = ["#F5327F", "#FFC53D", "#4FC3F7", "#7BE3A0", "#9B8CFF", "#FF8AD0"][i % 6];
            return (
              <div
                key={`c${i}`}
                style={styleFromCss(
                  `position:absolute;top:-20px;left:${4 + i * 6.8}%;width:${7 + (i % 3) * 3}px;height:${11 + (i % 4) * 3}px;` +
                    `border-radius:2px;background:${col};--kwx:${i % 2 ? "" : "-"}${14 + (i % 5) * 12}px;` +
                    `animation:kwFall ${2 + (i % 5) * 0.3}s linear ${i * 0.09}s forwards`,
                )}
              />
            );
          })}
        </div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <img
          alt="키웅이"
          src="/ui/assets/mascot-bear.png"
          style={{
            display: "block",
            animation: "kwPop 0.5s cubic-bezier(0.2,1.2,0.4,1) both",
            filter: "drop-shadow(0 12px 20px rgba(35,25,80,0.18))",
          }}
          width={150}
        />
        <div style={{ fontSize: 14, fontWeight: 700, color: "#8E93A8", letterSpacing: "0.08em", marginTop: 14 }}>
          {done.limit ? "기다리는 주문에 넣었어요" : done.scheduled ? "다음 장 주문을 맡아뒀어요" :"매도 완료"}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#01185A", marginTop: 6, textAlign: "center", letterSpacing: "-0.01em", lineHeight: 1.4, whiteSpace: "pre-line" }}>
          {done.limit
            ? `${done.limit.toLocaleString("ko-KR")}원이 되면\n${done.name} ${sdQty}를 팔게요`
            : done.scheduled
              ? `${done.scheduledFor} 장이 열리면\n${done.name} ${sdQty}를 시가로 팔게요`
              : `${done.name} ${sdQty}를\n팔았어요`}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#5C6280", marginTop: 12, textAlign: "center", lineHeight: 1.6, whiteSpace: "pre-line" }}>
          {done.limit
            ? "값이 목표에 닿을 때까지 키웅이가 지켜볼게요.\n그동안 그 주식은 잠깐 맡아둘게요."
            : done.scheduled
              ? "주문 접수와 체결은 달라요.\n거래가 확인된 첫날의 시가로 체결하고, 휴장하거나 거래가 멈추면 주식을 그대로 맡아둘게요."
              : "왜 팔았는지까지 남겨뒀어요.\n아카이브에서 산 날과 판 날을 같이 볼 수 있어요."}
        </div>

        {done.badge && (
          <div
            style={styleFromCss(
              "display:flex;align-items:center;gap:11px;background:#FFF8E4;border-radius:20px;padding:13px 16px;margin-top:16px;" +
                "width:100%;box-sizing:border-box;box-shadow:inset 0 0 0 1.5px rgba(190,150,50,0.28)",
            )}
          >
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "#8A6B1F", lineHeight: 1.5 }}>
              계획 실천 배지를 받았어요!
            </span>
          </div>
        )}

        <div style={{ ...DONE_BOX, marginTop: 20 }}>
          <div style={{ ...SUMMARY_ROW, padding: "4px 0" }}>
            <span>{done.name}</span>
            <span style={SUMMARY_VALUE}>{sdQty}</span>
          </div>
          <div style={{ ...SUMMARY_ROW, padding: "4px 0" }}>
            <span>{done.limit || done.scheduled ? "예상 금액" : "받은 돈"}</span>
            <span style={SUMMARY_VALUE}>{won(done.proceeds ?? 0)}</span>
          </div>
          <div style={{ ...SUMMARY_ROW, padding: "4px 0" }}>
            <span>남은 지갑</span>
            <span style={SUMMARY_VALUE}>{won(me.cash)}</span>
          </div>
        </div>

        <div style={{ width: "100%", marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#5C6280" }}>
            하고 싶은 말이 있으면 남겨주세요 <span style={{ color: "#A9AEC4", fontWeight: 500 }}>(나중에 다시 보여줄게요)</span>
          </div>
          <input
            maxLength={50}
            onChange={(e) => {
              patchSell({ memo: e.target.value.slice(0, 50) });
              setMemoSaved(false);
            }}
            placeholder="예: 목표까지 와서 팔았어요"
            style={{ ...MEMO_INPUT, marginTop: 9 }}
            value={sellDraft.memo}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, gap: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: "#A9AEC4", fontVariantNumeric: "tabular-nums" }}>
              {sellDraft.memo.length} / 50
            </span>
            <div
              onClick={saveMemo}
              style={styleFromCss(
                memoSaved
                  ? "font-size:14px;font-weight:700;color:#8E93A8;padding:11px 18px;border-radius:999px;white-space:nowrap;background:#F1F2F8"
                  : "font-size:14px;font-weight:700;color:#fff;padding:11px 20px;border-radius:999px;cursor:pointer;white-space:nowrap;background:#F5327F",
              )}
            >
              {memoSaved ? "저장됐어 ✓" : "저장하기"}
            </div>
          </div>
        </div>
        </div>
      </div>
    );

    return (
      <div style={PAGE}>
        <div style={HEADER}>
          <div onClick={goBack} style={BACK}>
            {step === 2 ? "‹" : "✕"}
          </div>
          <div style={TITLE}>팔래(매도)</div>
          <div style={STEP_PILL}>
            <span style={{ color: "#F5327F" }}>{step}</span> / 3
          </div>
        </div>
        <ProgressBars step={step} />
        <div style={SCROLL}>
          {flowTabs}
          {step === 1 && step1}
          {step === 2 && step2}
          {step === 3 && step3}
        </div>
        {stepFooter(sellOk, step === 2 ? "팔기" : "다음", placeSell)}
        {waitSheet}
        {sellBlockModal}
      </div>
    );
  };

  return <PhoneFrame>{side === "buy" ? renderBuy() : renderSell()}</PhoneFrame>;
}
