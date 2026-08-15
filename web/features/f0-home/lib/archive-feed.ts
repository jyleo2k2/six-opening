import { CHANGES, choiceOf, PLANS, REASONS, SELL_REASONS } from "../../../shared/data/trade-copy.js";
import { won } from "./portfolio-view";
import { faceOf, type FamilyRow } from "./archive-profile-view";

/**
 * 수익률 탭 — 가족 달리기 트랙과 거래 피드. `ui-src/methods/buildArchive.js` 의
 * 수익률 절반을 그대로 옮겨 왔다.
 *
 * 피드 카드는 **본인 것과 남의 것이 다르게 보인다.** 남의 체결가·수량은 서버가 이미
 * `null` 로 지운 채 내려주므로(F11 SPEC 마스킹) 여기서 추론하지 않는다.
 */

const UP = "#E8322E";
const DOWN = "#1668DC";
export const ACCENT = "#D70082";

export const pctText = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + "%";

/** 트랙 왼쪽 40% 지점이 START. 왼쪽은 마이너스다. */
export const RUN_START = 40;
export const LANE_HEIGHT = 74;

export type Runner = {
  key: string;
  name: string;
  face: string;
  color: string;
  /** 아직 산 게 없으면 출발선에 회색으로 선다. */
  has: boolean;
  pct: number;
  /** 트랙 가로 위치(%) — 13~87 사이로 가둔다. */
  at: number;
  /** 마이너스면 통째로 좌우 반전해 왼쪽을 보게 한다. */
  minus: boolean;
  pctText: string;
  pctColor: string;
  showDash: boolean;
};

/**
 * 가족 수익률 달리기.
 *
 * `/api/family` 는 타인의 평가금액·원금을 주지 않으므로(자산 규모 마스킹) 비율만 받아 쓴다.
 * **`Number(null)` 은 0 이라 형변환을 하면 안 된다** — 아직 산 게 없는 구성원의 `null` 이
 * 0% 로 바뀌어 본전인 사람처럼 출발선에 서 버린다.
 */
export function runners(members: FamilyRow[]): Runner[] {
  const raw = members.map((member, index) => {
    const rate = member.returnRate;
    const has = Number.isFinite(rate as number);
    return {
      key: `db_${member.id}`,
      name: member.name,
      face: faceOf(member.role, member.name),
      color: ["#7FD2FF", "#FF8AD0", "#FFD84D"][index % 3],
      has,
      pct: has ? (rate as number) : 0,
    };
  });
  // 가장 많이 간 사람이 트랙 끝에 닿도록 잡되, 다들 0 에 가까우면 5% 를 기준으로 둔다.
  const max = Math.max(5, ...raw.map((r) => Math.abs(r.pct)));
  return raw.map((r) => {
    const position =
      r.pct >= 0 ? RUN_START + (r.pct / max) * 55 : RUN_START + (r.pct / max) * 35;
    return {
      ...r,
      at: r.has ? Math.max(13, Math.min(87, position)) : RUN_START,
      minus: r.has && r.pct < 0,
      pctText: r.has ? pctText(r.pct) : "아직",
      pctColor: !r.has ? "#B8BDD0" : r.pct >= 0 ? UP : DOWN,
      showDash: r.has && Math.abs(r.pct) > 0.05,
    };
  });
}

export type FamilyTrade = {
  id: string;
  userId: number | string;
  side: "buy" | "sell";
  symbol: string;
  stockName?: string | null;
  tradedAt: string;
  /** 남의 카드는 서버가 `null` 로 지운다. */
  price?: number | null;
  quantity?: number | null;
  reasonCode?: string | null;
  planCode?: string | null;
  planTargetPrice?: number | null;
  planMatch?: boolean | null;
  planChangedReason?: string | null;
  memo?: string | null;
};

export type FeedComment = {
  id: string | number;
  transactionId: string;
  author?: string;
  authorName?: string;
  body?: string;
  mine?: boolean;
};

export type FeedLike = { transactionId: string; liked?: boolean; count?: number };

export type FeedCard = {
  id: string;
  name: string;
  face: string;
  pose: string;
  time: string;
  dateLabel: string;
  stockName: string;
  /** 체결가를 못 보는 카드는 등락률 대신 매수·매도만 적는다. */
  bigPctText: string;
  positive: boolean;
  avgText: string;
  avgColor: string;
  oneLiner: string;
  text: string;
  liked: boolean;
  likeCount: number;
  comments: (FeedComment & { face: string; canDelete: boolean })[];
};

const POSES: Record<string, string> = {
  child: "/ui/assets/archive/pose-ki-calm.png",
  dad: "/ui/assets/archive/pose-yw-cheer.png",
  mom: "/ui/assets/archive/pose-yw-magnify.png",
};

const timeAgo = (ts: string, now: number) => {
  const minutes = Math.max(1, Math.round((now - new Date(ts).getTime()) / 60000));
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}시간 전`;
  return `${Math.round(minutes / 1440)}일 전`;
};

/**
 * 거래 피드 — 최신순 12건. 필터가 걸리면 그 구성원 것만 남는다.
 *
 * 매수는 보유 계획과 목표가를, 매도는 계획 준수 여부와 변경 이유를 덧붙인다(F2 SPEC §7.1).
 * 예전에는 `memo` 에 이유 코드를 그대로 넣어 카드에 `buy_news` 가 찍혔다 — 이제 진짜 메모가 온다.
 */
export function feedCards(
  trades: FamilyTrade[],
  members: FamilyRow[],
  prices: Record<string, number>,
  comments: Record<string, FeedComment[]>,
  likes: Record<string, FeedLike>,
  who: string,
  now = Date.now(),
): FeedCard[] {
  const byUser = new Map(members.map((m) => [String(m.id), m]));
  return trades
    .filter((t) => {
      const member = byUser.get(String(t.userId));
      return member && (who === "all" || `db_${member.id}` === who);
    })
    .slice()
    .sort((a, b) => String(b.tradedAt).localeCompare(String(a.tradedAt)))
    .slice(0, 12)
    .map((trade) => {
      const member = byUser.get(String(trade.userId)) as FamilyRow;
      const sell = trade.side === "sell";
      const now_price = prices[trade.symbol] ?? 0;
      const avg = trade.price === null || trade.price === undefined ? null : Number(trade.price);
      const pc = avg ? ((now_price - avg) / avg) * 100 : 0;
      const positive = pc >= 0;
      const date = new Date(trade.tradedAt);
      const reason = choiceOf(sell ? SELL_REASONS : REASONS, trade.reasonCode ?? null);
      const plan = !sell && trade.planCode ? choiceOf(PLANS, trade.planCode) : null;
      const change =
        sell && trade.planChangedReason ? choiceOf(CHANGES, trade.planChangedReason) : null;
      const planText = plan
        ? ` ${plan.short} 가지려고 했어.` +
          (trade.planTargetPrice ? ` 목표 ${won(trade.planTargetPrice)}.` : "")
        : (sell && trade.planMatch === true ? " 계획대로 팔았어." : "") +
          (change ? ` 계획을 바꿨어 — ${change.label}` : "");
      const like = likes[trade.id];
      const poseKey =
        member.role === "child" ? "child" : /아빠|부/.test(member.name || "") ? "dad" : "mom";

      return {
        id: trade.id,
        name: member.name,
        face: faceOf(member.role, member.name),
        pose: POSES[poseKey],
        time: timeAgo(trade.tradedAt, now),
        dateLabel: `${date.getMonth() + 1}월 ${date.getDate()}${avg ? "일 수익률" : "일 거래"}`,
        stockName: trade.stockName || trade.symbol,
        bigPctText: avg
          ? (positive ? "+" : "−") + Math.abs(pc).toFixed(2) + "%"
          : sell
            ? "매도"
            : "매수",
        positive,
        avgText: avg ? won(avg) : "비공개",
        avgColor: avg ? (positive ? UP : DOWN) : "#A9AEC4",
        oneLiner: reason ? reason.short : sell ? "팔았어" : "담았어",
        text:
          (sell ? "팔았어. " : "담았어. ") +
          (trade.memo || (reason ? `${reason.short} 결정했어.` : "")) +
          planText,
        liked: Boolean(like?.liked),
        likeCount: Number(like?.count ?? 0),
        comments: (comments[trade.id] ?? []).map((comment) => ({
          ...comment,
          face:
            comment.author === "child"
              ? faceOf("child", "")
              : faceOf("parent", comment.authorName ?? ""),
          canDelete: Boolean(comment.mine),
        })),
      };
    });
}

export type Holding = { code: string; qty: number; avg: number };

/** 수익률 탭 머리 카드 — 보고 있는 대상의 평가·원금·현금. 본인 계좌만 금액을 안다. */
export function returnSummary(cash: number, holdings: Holding[], prices: Record<string, number>) {
  let value = 0;
  let cost = 0;
  for (const h of holdings) {
    value += h.qty * (prices[h.code] ?? 0);
    cost += h.qty * h.avg;
  }
  const pnl = value - cost;
  const pct = cost > 0 ? (pnl / cost) * 100 : 0;
  return {
    positive: pnl >= 0,
    pctText: (pnl >= 0 ? "+" : "−") + Math.abs(pct).toFixed(2) + "%",
    totalText: won(cash + value),
    cashText: won(cash),
  };
}
