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

/**
 * 트랙 왼쪽 38% 지점이 START. 왼쪽은 마이너스다.
 *
 * 어두운 트랙으로 바뀌면서 좌우 여백이 줄었다 — 왼쪽엔 이름표가, 오른쪽엔 결승선 체크무늬가
 * 붙어서 주자가 26~76% 밖으로 나가면 그 아래로 깔린다.
 */
export const RUN_START = 38;
export const LANE_HEIGHT = 76;
const RUN_MIN = 26;
const RUN_MAX = 76;

/** 어두운 트랙 위에서 읽히는 등락 색. 흰 배경의 `UP`·`DOWN` 은 너무 어둡다. */
const TRACK_UP = "#FF8574";
const TRACK_DOWN = "#8AB6FF";

export type Runner = {
  key: string;
  name: string;
  face: string;
  color: string;
  /** 아직 산 게 없으면 출발선에 회색으로 선다. */
  has: boolean;
  pct: number;
  /** 1등부터. 아직 산 게 없는 사람은 등수를 매기지 않고 `null` 이다. */
  rank: number | null;
  /** 트랙 가로 위치(%) — 26~76 사이로 가둔다. */
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
  // 등수는 **산 적 있는 사람끼리만** 매긴다. 아직 안 산 사람의 `pct` 는 0 이라 같이 세면
  // 마이너스인 사람보다 앞선 등수를 받는다 — 출발선에 서 있는데 2등이라고 적힌다.
  const ranked = raw
    .filter((r) => r.has)
    .slice()
    .sort((a, b) => b.pct - a.pct)
    .map((r) => r.key);
  return raw.map((r) => {
    const position =
      r.pct >= 0 ? RUN_START + (r.pct / max) * (RUN_MAX - RUN_START) : RUN_START + (r.pct / max) * (RUN_START - RUN_MIN);
    return {
      ...r,
      rank: r.has ? ranked.indexOf(r.key) + 1 : null,
      at: r.has ? Math.max(RUN_MIN, Math.min(RUN_MAX, position)) : RUN_START,
      minus: r.has && r.pct < 0,
      pctText: r.has ? pctText(r.pct) : "아직",
      pctColor: !r.has ? "#B8BDD0" : r.pct >= 0 ? TRACK_UP : TRACK_DOWN,
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
  /** 왼쪽 색 판. 매수는 초록, 매도는 오르면 분홍·내리면 남색이다. */
  bigBg: string;
  /** 매수는 체결가(원), 매도는 지금 시세 대비 등락률. 자릿수가 달라 글자 크기도 다르다. */
  bigValue: string;
  bigSize: number;
  positive: boolean;
  /**
   * 오른쪽 회색 판 — `sideLabel` 위에 `sideValue`, 그 아래 `shortMent`.
   *
   * 매수는 계획(목표 금액 또는 가지고 갈 기간)을, 매도는 **이 거래 한 건의 주당 체결가**를
   * 적는다. 보유 전체의 평균 매입가(평단가)가 아니다 — 라벨을 카드가 직접 들고 있는 이유는
   * 방향마다 달라서다. 화면이 "평단가" 로 고정해 두면 매수는 총 거래금액처럼 읽힌다.
   */
  sideLabel: string;
  sideValue: string;
  sideColor: string;
  shortMent: string;
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
        dateLabel: `${date.getMonth() + 1}월 ${date.getDate()}일 ${sell ? "매도" : "매수"}`,
        stockName: trade.stockName || trade.symbol,
        // 매수 판에는 산 가격을, 매도 판에는 지금 시세와 견준 등락률을 크게 띄운다.
        // **실현 손익은 낼 수 없다** — `/api/family` 의 매도 행에는 살 때 가격이 없다.
        bigBg: sell ? (positive ? ACCENT : "#001E5A") : "#12874F",
        bigValue: avg
          ? sell
            ? (positive ? "+" : "−") + Math.abs(pc).toFixed(2) + "%"
            : won(avg)
          : "비공개",
        bigSize: avg && sell ? 25 : 19,
        positive,
        sideLabel: sell
          ? "판 가격"
          : trade.planTargetPrice
            ? "목표 금액"
            : plan
              ? "가지고 갈 기간"
              : "산 가격",
        sideValue: sell
          ? avg
            ? won(avg)
            : "비공개"
          : trade.planTargetPrice
            ? won(trade.planTargetPrice)
            : plan
              ? plan.short
              : avg
                ? won(avg)
                : "비공개",
        sideColor: sell && avg ? (positive ? UP : DOWN) : "#2C3245",
        shortMent: reason ? reason.short : sell ? "팔았어" : "담았어",
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

/**
 * 같은 `family_tag` 사람들의 자산 **합계**. `GET /api/family` 의 `total` 이다.
 * 누가 얼마인지는 오지 않는다 — 서버가 합계만 낸다.
 */
export type FamilyTotal = {
  assets: number;
  cost: number;
  profit: number;
  /** 아직 아무도 안 샀으면 `null` 이다. 0% 로 오지 않는다. */
  returnRate: number | null;
  memberCount: number;
};

/**
 * 첫 화면 제목 옆 지갑 — 가족 자산 합계를 `returnSummary` 와 **같은 모양**으로 편다.
 * 두 값이 같은 자리에 번갈아 들어가므로 화면이 갈라 쓰지 않게 한다.
 *
 * 합계가 없으면(비로그인·조회 실패) `null` 이고, 화면은 내 계좌 요약으로 되돌아간다.
 */
export function familySummary(total: FamilyTotal | null | undefined) {
  if (!total) return null;
  const pnl = total.profit;
  return {
    positive: pnl >= 0,
    totalText: won(total.assets),
    pnlText: (pnl > 0 ? "▲ " : pnl < 0 ? "▼ " : "") + won(Math.abs(pnl)),
    // 원금이 0이면 잰 것이 없다. `0.00%` 로 적으면 본전인 가족처럼 읽힌다.
    pctText:
      total.returnRate === null
        ? "아직"
        : (total.returnRate > 0 ? "+" : total.returnRate < 0 ? "−" : "") +
          Math.abs(total.returnRate).toFixed(2) + "%",
    pctColor: total.returnRate === null ? "#9CA1B4" : pnl > 0 ? UP : pnl < 0 ? DOWN : "#9CA1B4",
  };
}

export type Holding = { code: string; qty: number; avg: number };

/**
 * 수익률 탭 머리 카드 — 보고 있는 대상의 평가·원금·현금. 본인 계좌만 금액을 안다.
 *
 * `totalNumber` 는 단위를 뗀 숫자다. 카드가 `원` 을 따로 작게 붙이기 때문이다.
 * **출금가능금액은 예수금과 같은 값**이다 — 모의투자라 결제 대기 중인 돈이 없다.
 */
export function returnSummary(
  cash: number,
  holdings: Holding[],
  prices: Record<string, number>,
  now = new Date(),
) {
  let value = 0;
  let cost = 0;
  for (const h of holdings) {
    value += h.qty * (prices[h.code] ?? 0);
    cost += h.qty * h.avg;
  }
  const pnl = value - cost;
  const pct = cost > 0 ? (pnl / cost) * 100 : 0;
  const day = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    positive: pnl >= 0,
    pctText: (pnl > 0 ? "+" : pnl < 0 ? "−" : "") + Math.abs(pct).toFixed(2) + "%",
    pnlText: (pnl > 0 ? "▲ " : pnl < 0 ? "▼ " : "") + won(Math.abs(pnl)),
    // 손익이 0 이면 빨강도 파랑도 아니다. 아직 아무것도 안 산 계좌가 "본전"으로 붉게 뜨면 안 된다.
    pctColor: pnl > 0 ? UP : pnl < 0 ? DOWN : "#9CA1B4",
    totalNumber: Math.round(cash + value).toLocaleString("ko-KR"),
    totalText: won(cash + value),
    cashText: won(cash),
    withdrawText: won(cash),
    settleText: `결제기준 ${pad(now.getMonth() + 1)}.${pad(now.getDate())}(${day}) 15:30`,
  };
}
