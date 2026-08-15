"use client";

import { useEffect, useState } from "react";
import { useChatBehaviorStore } from "../../shared/store/chat-behavior-store";
import { BottomNav } from "./BottomNav";
import { styleFromCss } from "./lib/css-style";
import { parseBehaviorEvent } from "./lib/prototype-bridge";
import {
  accountSummary,
  holdingCards,
  pendingCards,
  type Account,
} from "./lib/portfolio-view";
import { canTrade, useWallet, type WalletAccountId } from "./lib/use-wallet";
import { PhoneFrame } from "./PhoneFrame";

/**
 * 계좌 화면. `ui-src/screens/portfolio.html` 을 그대로 옮겨 왔다.
 *
 * **기다리는 주문의 원본은 서버다**(`/api/orders`). 취소도 서버에 보내고 목록을 다시 읽는다 —
 * 예약이 잡아 둔 현금·수량을 푸는 것은 `cancel_order` 한 트랜잭션이라, 화면이 미리 지우면
 * 서버가 거절했을 때 없는 주문이 사라진 것처럼 보인다.
 */
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
const SCROLL = styleFromCss(
  "flex:1;overflow-y:auto;overflow-x:hidden;padding:2px 16px 0;display:flex;flex-direction:column;gap:11px",
);
const CARD = styleFromCss(
  "background:#FFFFFF;border-radius:28px;padding:18px 20px;box-shadow:0 2px 10px rgba(30,25,60,0.05)",
);
const CARD_LABEL = styleFromCss("font-size:13.5px;font-weight:500;color:#8E93A8");
const TOTAL = styleFromCss(
  "font-size:30px;font-weight:800;color:#01185A;font-variant-numeric:tabular-nums;margin-top:6px;line-height:1.15;white-space:nowrap",
);
const CASH_ROW = styleFromCss(
  "display:flex;justify-content:space-between;background:#F4F4FA;border-radius:16px;padding:12px 14px;margin-top:14px;" +
    "box-shadow:inset 0 0 0 1px #E4E6F1",
);
const CASH_VALUE = styleFromCss(
  "font-size:16px;font-weight:800;color:#01185A;font-variant-numeric:tabular-nums;white-space:nowrap",
);
const LOCK = styleFromCss(
  "display:flex;align-items:center;gap:11px;background:#FFF6FA;border-radius:20px;padding:14px 16px;" +
    "box-shadow:inset 0 0 0 1.5px rgba(245,50,127,0.22)",
);
const LOCK_TEXT = styleFromCss(
  "font-size:14px;font-weight:600;color:#D5327A;line-height:1.55;text-wrap:pretty",
);
const SECTION = styleFromCss(
  "background:#FFFFFF;border-radius:26px;padding:16px 18px;box-shadow:0 2px 10px rgba(30,25,60,0.05)",
);
const SECTION_TITLE = styleFromCss("font-size:15.5px;font-weight:800;color:#01185A");
const PENDING_ROW = styleFromCss(
  "display:flex;align-items:center;gap:11px;background:#F4F4FA;border-radius:18px;padding:12px 14px;" +
    "box-shadow:inset 0 0 0 1px #E4E6F1",
);
const PENDING_DESC = styleFromCss(
  "font-size:12.5px;font-weight:500;color:#8E93A8;margin-top:3px;font-variant-numeric:tabular-nums;white-space:nowrap",
);
const CANCEL = styleFromCss(
  "flex:none;font-size:13px;font-weight:600;color:#8E93A8;padding:9px 13px;border-radius:999px;cursor:pointer;" +
    "background:#FFFFFF;box-shadow:0 4px 9px -4px rgba(35,25,80,0.2)",
);
const HOLDING = styleFromCss(
  "background:#FFFFFF;border-radius:24px;padding:15px 17px;box-shadow:0 2px 10px rgba(30,25,60,0.05)",
);
const HOLDING_SUB = styleFromCss(
  "font-size:12.5px;font-weight:500;color:#8E93A8;margin-top:3px;font-variant-numeric:tabular-nums;white-space:nowrap",
);
const EMPTY = styleFromCss(
  "background:#FFFFFF;border-radius:26px;padding:34px 20px;text-align:center;box-shadow:0 2px 10px rgba(30,25,60,0.05)",
);

/** 카드 시세. `app.html` 은 `/api/universe` 스크립트를 쓰지만 React 는 JSON 쪽을 읽는다. */
function useQuotes() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/universe/data", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { quotes?: Record<string, { price?: number }> } | null) => {
          if (!alive || !data?.quotes) return;
          setPrices(
            Object.fromEntries(
              Object.entries(data.quotes).map(([code, q]) => [code, Number(q?.price) || 0]),
            ),
          );
        })
        .catch(() => {});
    load();
    // app.html 과 같은 주기로 갱신한다. 화면을 오갈 때 값이 튀지 않게.
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return prices;
}

export function PortfolioScreen({
  account,
  onLeave,
}: {
  account: WalletAccountId;
  onLeave: (path: string) => void;
}) {
  const { wallet, refresh } = useWallet();
  const prices = useQuotes();
  const recordEvent = useChatBehaviorStore((s) => s.recordEvent);

  // 저장소를 읽기 전에는 아무것도 그리지 않는다 — 시드 지갑이 한 프레임 스치면 안 된다.
  if (!wallet) return <PhoneFrame />;

  const me: Account = wallet.acc[account];
  const locked = !canTrade(account);
  const summary = accountSummary(me, prices);
  const holdings = holdingCards(me, prices, locked);
  const pending = pendingCards(me);

  const cancel = (order: (typeof pending)[number]["order"]) => {
    const side = order.side || "buy";
    if (order.id) {
      fetch(`/api/orders?id=${encodeURIComponent(order.id)}`, { method: "DELETE" })
        .catch(() => {})
        .then(refresh);
    }
    // 행동 신호는 `app.html` 이 보내던 것과 같은 모양으로 만든다 — 판정도 같은 함수를 쓴다.
    const behaviorEvent = parseBehaviorEvent(
      { kind: "order_confirmation_cancelled", stockId: `KRX:${order.code}`, side },
      Date.now(),
      { screen: "order", stockId: `KRX:${order.code}` },
    );
    if (behaviorEvent) recordEvent(behaviorEvent);
  };

  return (
    <PhoneFrame>
      <div style={PAGE}>
        <div style={HEADER}>
          <div onClick={() => onLeave("/")} style={BACK}>
            ‹
          </div>
          <div style={TITLE}>내 계좌</div>
          <div style={{ width: 38 }} />
        </div>

        <div style={SCROLL}>
          <div style={CARD}>
            <div style={CARD_LABEL}>{summary.meName}의 전체 자산</div>
            <div style={TOTAL}>{summary.totalAssetText}</div>
            <div style={{ display: "flex", gap: 9, marginTop: 9 }}>
              <span style={styleFromCss(summary.pnlStyle)}>{summary.pnlText}</span>
            </div>
            <div style={CASH_ROW}>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#8E93A8" }}>쓸 수 있는 돈</span>
              <span style={CASH_VALUE}>{summary.cashText}</span>
            </div>
          </div>

          {locked && (
            <div style={LOCK}>
              <span style={LOCK_TEXT}>지금은 학교에서 공부할 시간! 매매는 하교하고 하자</span>
            </div>
          )}

          {pending.length > 0 && (
            <div style={SECTION}>
              <div style={SECTION_TITLE}>기다리는 주문</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
                {pending.map((p, index) => (
                  <div key={p.order.id ?? index} style={PENDING_ROW}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#01185A" }}>{p.name}</div>
                      <div style={PENDING_DESC}>{p.desc}</div>
                    </div>
                    <div onClick={() => cancel(p.order)} style={CANCEL}>
                      취소
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {holdings.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {holdings.map((h) => (
                <div key={h.code} style={HOLDING}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={styleFromCss(h.badgeStyle)}>{h.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A" }}>{h.name}</div>
                      <div style={HOLDING_SUB}>
                        {h.qtyText} · 평균 {h.avgText}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: "#01185A",
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h.valueText}
                      </div>
                      <div style={styleFromCss(h.pnlStyle)}>{h.pnlText}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 9, marginTop: 13 }}>
                    <div
                      onClick={() => {
                        if (h.canBuy) onLeave(`/buy/${h.code}`);
                      }}
                      style={styleFromCss(h.buyStyle)}
                    >
                      사러 가기
                    </div>
                    <div
                      onClick={() => {
                        if (h.canSell) onLeave(`/sell/${h.code}`);
                      }}
                      style={styleFromCss(h.sellStyle)}
                    >
                      팔러 가기
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={EMPTY}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#01185A", marginTop: 12 }}>
                아직 가진 회사가 없어
              </div>
              <div
                style={{ fontSize: 13.5, fontWeight: 500, color: "#8E93A8", marginTop: 7, lineHeight: 1.6 }}
              >
                모의투자에서 마음에 드는 회사를 찾아봐
              </div>
            </div>
          )}
        </div>

        <BottomNav active={null} onLeave={onLeave} />
      </div>
    </PhoneFrame>
  );
}
