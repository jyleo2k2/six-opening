import { CHANGES, choiceOf, PLANS, REASONS, SELL_REASONS } from "../../../shared/data/trade-copy.js";
import { basisTimeText } from "./home-view";
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
  /** DB 에 값이 없는 옛 행만 `null` 이다. 가족 것도 가리지 않는다. */
  price?: number | null;
  quantity?: number | null;
  /** 지금 그 사람이 이 종목을 들고 있는 평단가. 매도 카드의 실현 손익이 이걸로 난다. */
  avgPrice?: number | null;
  reasonCode?: string | null;
  planCode?: string | null;
  planTargetPrice?: number | null;
  planMatch?: boolean | null;
  planChangedReason?: string | null;
  memo?: string | null;
  /**
   * 피드에 올린 글. **이것이 있어야 피드에 뜬다** — 서버가 `feed_body` 가 빈 거래를
   * 아예 안 내려보낸다(`/api/family`). 카드 본문이 이 글이다.
   */
  feedBody?: string | null;
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
  /** 올린 사람. 내 카드에만 `내리기` 가 붙으므로 화면이 이 값으로 가른다. */
  userId: string;
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
  /**
   * 손익 한 줄 — `▲ 31,500원 (+2.79%)`. 매도는 **실현**(판 가격 − 평단가), 매수는 **평가**
   * (지금 시세 − 산 가격)다. 둘 다 그 거래 수량만큼이라 계좌 전체 손익이 아니다.
   *
   * 낼 수 없으면 빈 문자열이다 — 체결가나 수량이 없는 옛 행, 시세를 못 받은 종목이 그렇다.
   * 0원으로 적으면 본전인 거래와 못 잰 거래가 같아 보인다.
   */
  pnlText: string;
  pnlColor: string;
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

/** 한 화면에 깔리는 카드 수. 시안이 4장이고, 가족 셋이 고루 보이려면 그보다 조금 넉넉해야 한다. */
export const FEED_LIMIT = 6;
/**
 * `전체` 로 볼 때 한 사람이 차지할 수 있는 최대 장수.
 *
 * 이걸 안 두면 그날 많이 거래한 사람이 여섯 장을 통째로 가져가, **가족 피드인데 한 사람
 * 것만 보인다.** 실제로 아이가 오전에 다섯 번 사자 아빠 카드가 한 장도 안 남았다.
 */
export const FEED_PER_MEMBER = 2;

/**
 * 거래 피드 — 서버에서 받아 누적한 페이지에서 **최신 여섯 장**을 고른다. `전체` 는 구성원
 * 마다 최신 두 장까지만 넣고, 구성원 칩을 누르면 그 사람 것으로 여섯 장을 채운다.
 *
 * 서버 페이지(50건)보다 이 여섯이 훨씬 작다. 그런데도 더 읽어 올 이유가 있다 — 서버가
 * `holdings` 로 거른 뒤라 한 페이지가 여섯 장을 못 채울 수 있다. 화면은 **여섯 장이 찰
 * 때까지만** 다음 페이지를 부른다(`ArchiveScreen` 의 `loadMoreOnScroll`).
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
  const perMember = new Map<string, number>();
  return trades
    .filter((t) => {
      const member = byUser.get(String(t.userId));
      return member && (who === "all" || `db_${member.id}` === who);
    })
    .slice()
    .sort((a, b) => String(b.tradedAt).localeCompare(String(a.tradedAt)))
    // 정렬 뒤에 세야 **최신 두 장**이 남는다. 정렬 전에 자르면 아무 두 장이나 남는다.
    .filter((t) => {
      if (who !== "all") return true;
      const key = String(t.userId);
      const used = perMember.get(key) ?? 0;
      if (used >= FEED_PER_MEMBER) return false;
      perMember.set(key, used + 1);
      return true;
    })
    .slice(0, FEED_LIMIT)
    .map((trade) => {
      const member = byUser.get(String(trade.userId)) as FamilyRow;
      const sell = trade.side === "sell";
      const nowPrice = prices[trade.symbol] ?? 0;
      const num = (v: number | null | undefined) => (v === null || v === undefined ? null : Number(v));
      const tradePrice = num(trade.price);
      const bookAvg = num(trade.avgPrice);
      const qty = num(trade.quantity);
      /**
       * 손익을 재는 두 값. **매도는 평단가와 판 가격을**, 매수는 산 가격과 지금 시세를 견준다.
       *
       * 매도 쪽이 **실현** 손익이다 — 예전에는 살 때 가격이 없어 매도 카드도 "지금 시세 대비"
       * 를 띄웠는데, 이미 판 주식의 오늘 시세는 그 사람이 번 돈과 아무 상관이 없다.
       * 이제 `/api/family` 가 평단가를 함께 준다.
       */
      const base = sell ? bookAvg : tradePrice;
      const mark = sell ? tradePrice : nowPrice;
      // 0원은 못 잰 것이지 본전이 아니다. 나누는 쪽이 0이면 비율 자체가 없다.
      const measurable = base !== null && base > 0 && mark !== null && mark > 0;
      const pc = measurable ? ((mark - base) / base) * 100 : 0;
      const positive = pc >= 0;
      const pnl = measurable && qty !== null ? (mark - base) * qty : null;
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
        userId: String(trade.userId),
        name: member.name,
        face: faceOf(member.role, member.name),
        pose: POSES[poseKey],
        time: timeAgo(trade.tradedAt, now),
        dateLabel: `${date.getMonth() + 1}월 ${date.getDate()}일 ${sell ? "매도" : "매수"}`,
        stockName: trade.stockName || trade.symbol,
        // 매수 판에는 산 가격을, 매도 판에는 **실현 수익률**을 크게 띄운다.
        bigBg: sell ? (positive ? ACCENT : "#001E5A") : "#12874F",
        bigValue: sell
          ? measurable
            ? (positive ? "+" : "−") + Math.abs(pc).toFixed(2) + "%"
            : "비공개"
          : tradePrice
            ? won(tradePrice)
            : "비공개",
        bigSize: sell && measurable ? 25 : 19,
        positive,
        // 매도 카드가 견준 밑값을 그대로 적는다 — 큰 판의 수익률이 무엇에 견준 값인지
        // 여기 말고는 알 곳이 없다. 매수는 계획(목표 금액 또는 가지고 갈 기간)이 온다.
        sideLabel: sell
          ? "평단가"
          : trade.planTargetPrice
            ? "목표 금액"
            : plan
              ? "가지고 갈 기간"
              : "산 가격",
        sideValue: sell
          ? bookAvg
            ? won(bookAvg)
            : "비공개"
          : trade.planTargetPrice
            ? won(trade.planTargetPrice)
            : plan
              ? plan.short
              : tradePrice
                ? won(tradePrice)
                : "비공개",
        // 손익 색은 아래 `pnlColor` 가 따로 든다. 밑값까지 빨강·파랑으로 칠하면 평단가가
        // 오르내린 것처럼 읽힌다.
        sideColor: "#2C3245",
        pnlText:
          pnl === null
            ? ""
            : `${pnl > 0 ? "▲ " : pnl < 0 ? "▼ " : ""}${won(Math.abs(pnl))} (${
                (pc > 0 ? "+" : pc < 0 ? "−" : "") + Math.abs(pc).toFixed(2)
              }%)`,
        pnlColor: pnl === null || pnl === 0 ? "#9CA1B4" : pnl > 0 ? UP : DOWN,
        shortMent: reason ? reason.short : sell ? "팔았어" : "담았어",
        /**
         * 본문은 **피드에 올린 글로 시작하고**, 그 뒤에 계획 문장이 붙는다.
         *
         * 예전에는 메모(없으면 고른 이유)를 그 자리에 넣었다. 이제는 `feed_body` 하나가
         * 원본이다 — 거래가 저절로 피드가 되지 않으므로 여기 설 글은 사람이 쓴 것뿐이고,
         * 옮겨 오기 전 기록에는 그때 보이던 문장을 그대로 담아 뒀다(2026-08-17 마이그레이션).
         * 옛 응답이 섞여 들어올 때만 메모·이유로 되돌아간다.
         *
         * 빈 조각이 이어 붙어 생기는 앞뒤 공백은 여기서 턴다 — 카드가 한 칸 들여 쓴 것처럼 보였다.
         */
        text: `${
          trade.feedBody || trade.memo || (reason ? `${reason.short} 결정했어.` : "")
        }${planText}`.trim(),
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
  /** 가족 예수금 합계. 투자 현황의 `투자 가능 금액` 이 이 값이다. */
  cash?: number;
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
    // `returnSummary` 와 같은 두 짝을 낸다 — 가족 시트는 단위를 뗀 숫자에 `원` 을 따로
    // 작게 붙이고, 좁은 자리는 단위까지 붙은 한 덩어리를 쓴다.
    totalNumber: Math.round(total.assets).toLocaleString("ko-KR"),
    totalText: won(total.assets),
    // 구버전 응답에는 `cash` 가 없다. 그때는 화면이 값을 비우는 것보다 없다고 아는 게 낫다.
    cashText: typeof total.cash === "number" ? won(total.cash) : null,
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
 * 예수금에는 예약 주문이 잠근 현금도 들어가고, 출금 가능 금액에서는 그만큼 뺀다.
 *
 * `settleText` 의 `now` 는 **서버 계좌를 읽은 시각**이어야 한다(`use-account` 의
 * `accountReadAt`). 렌더 시각을 넣으면 상세를 열 때마다 시각만 새로 찍혀, 잔액은
 * 그대로인데 방금 갱신된 것처럼 읽힌다 — 홈 지갑의 `결제기준` 과 같은 이유다.
 */
export function returnSummary(
  cash: number,
  holdings: Holding[],
  prices: Record<string, number>,
  now = new Date(),
  reservedCash = 0,
) {
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
    pctText: (pnl > 0 ? "+" : pnl < 0 ? "−" : "") + Math.abs(pct).toFixed(2) + "%",
    pnlText: (pnl > 0 ? "▲ " : pnl < 0 ? "▼ " : "") + won(Math.abs(pnl)),
    // 손익이 0 이면 빨강도 파랑도 아니다. 아직 아무것도 안 산 계좌가 "본전"으로 붉게 뜨면 안 된다.
    pctColor: pnl > 0 ? UP : pnl < 0 ? DOWN : "#9CA1B4",
    totalNumber: Math.round(cash + reservedCash + value).toLocaleString("ko-KR"),
    totalText: won(cash + reservedCash + value),
    cashText: won(cash + reservedCash),
    withdrawText: won(cash),
    settleText: `결제기준 ${basisTimeText(now.getTime())}`,
  };
}
