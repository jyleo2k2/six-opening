"use client";

import type { FamilyMember, Trade } from "../types/trade";

/**
 * app.html(iframe) 이 쌓은 거래 기록을 F11 피드가 쓰는 `Trade`로 옮긴다.
 *
 * 화면 정본은 iframe 안의 app.html 이고 그것이 자체 `localStorage` 키 `kw_proto_v1`에
 * 잔고·매수·매도를 저장한다. iframe 은 같은 오리진이라 부모 React 가 그 키를 그대로
 * 읽을 수 있다 — postMessage 규약을 새로 만들 필요가 없다.
 *
 * 별도의 zustand 투자 스토어를 두면 저장소가 둘로 갈려 피드와 화면이 어긋난다.
 */

const STORAGE_KEY = "kw_proto_v1";

/** app.html 의 reason_code · sell_reason_code 라벨. 코드는 app.html 의 REASONS/SELL_REASONS 와 같다. */
const REASON_LABEL: Record<string, string> = {
  buy_news: "뉴스에서 봐서",
  buy_chart: "그래프가 좋아 보여서",
  buy_familiar: "내가 아는 회사라서",
  buy_ranking: "인기 순위에서 봐서",
  buy_social: "친구·가족이 말해줘서",
  buy_intuition: "그냥 느낌이 좋아서",
  sell_target_hit: "목표한 만큼 와서",
  sell_plan_time: "정한 날짜가 돼서",
  sell_rebalance: "더 좋아 보이는 회사를 찾아서",
  sell_fear_drop: "더 떨어질까 봐",
  sell_anxiety: "그냥 불안해서",
  sell_liquidity: "다른 데 쓸 돈이 필요해서",
};

type PrototypeRecord = {
  order_id?: unknown;
  user_id?: unknown;
  symbol?: unknown;
  amount_krw?: unknown;
  qty?: unknown;
  limit_price?: unknown;
  order_status?: unknown;
  reason_code?: unknown;
  sell_reason_code?: unknown;
  confidence_raw?: unknown;
  memo?: unknown;
  ts?: unknown;
};

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** app.html 의 확신도 슬라이더는 0~100 연속값이다. F3 계약의 4단계로 내린다. */
function toConfidence(value: unknown): Trade["confidence"] {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return undefined;
  if (raw <= 37) return 25;
  if (raw <= 62) return 50;
  if (raw <= 87) return 75;
  return 100;
}

function toTrade(record: PrototypeRecord, side: Trade["side"]): Trade | null {
  const symbol = String(record.symbol ?? "");
  const id = String(record.order_id ?? "");
  if (!/^\d{6}$/.test(symbol) || !id) return null;
  // 미체결 지정가는 피드에 올리지 않는다 — 실시간 따라하기 방지 (SPEC §6).
  if (record.order_status === "pending") return null;

  const quantity = toNumber(record.qty);
  const amount = toNumber(record.amount_krw);
  const price = quantity > 0 ? Math.round(amount / quantity) : toNumber(record.limit_price);
  const code = String((side === "buy" ? record.reason_code : record.sell_reason_code) ?? "");

  return {
    id,
    member: record.user_id === "parent_mom" ? "parent" : ("child" as FamilyMember),
    symbol,
    side,
    quantity,
    price,
    reason: REASON_LABEL[code] ?? code,
    confidence: toConfidence(record.confidence_raw),
    memo: typeof record.memo === "string" ? record.memo : "",
    tradedAt: String(record.ts ?? new Date().toISOString()),
  };
}

/** 서버 렌더 중에는 localStorage 가 없으므로 빈 배열이다. */
export function readPrototypeTrades(): Trade[] {
  if (typeof window === "undefined") return [];
  let saved: { records?: unknown; sellRecords?: unknown } | null = null;
  try {
    saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    return [];
  }
  if (!saved) return [];

  const buys = Array.isArray(saved.records) ? (saved.records as PrototypeRecord[]) : [];
  const sells = Array.isArray(saved.sellRecords) ? (saved.sellRecords as PrototypeRecord[]) : [];

  return [
    ...buys.map((record) => toTrade(record, "buy")),
    ...sells.map((record) => toTrade(record, "sell")),
  ].filter((trade): trade is Trade => trade !== null);
}
