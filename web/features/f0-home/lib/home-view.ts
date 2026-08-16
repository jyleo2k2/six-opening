import { won } from "./portfolio-view";

/**
 * 홈 화면이 그릴 값. `ui-src/methods/renderVals-compute.js` 의 홈 블록과
 * `renderVals-return-1-home.js` 를 그대로 옮겨 왔다.
 *
 * 계산을 화면에서 떼어 두는 이유는 브라우저 없이 확인하기 위해서다 — 목표 개수와
 * 수익률이 틀리면 "○개 살 수 있어요" 가 근거 없는 숫자가 되는데 화면만 봐서는 모른다.
 */

/** `/api/account` 응답 중 홈이 쓰는 부분. */
export type AccountUser = {
  user_id: number;
  parent_child: string;
  guardian_role: string | null;
  /** 헤더의 "○○ 총자산" 에 쓰는 이름. 서버가 안 주면 역할별 데모 이름을 쓴다. */
  name?: string | null;
  /** 총 현금(미체결 주문이 잠근 몫 포함). 총자산 = 이 값 + 보유 평가금액(`route.ts` 규칙과 같다). */
  balance?: number | null;
  holdings: {
    stock_code: string | null;
    stock_name: string | null;
    quantity: number;
    avg_price: number;
  }[];
};

export type HomeRole = "mom" | "dad" | "child";

/**
 * 등락 방향. 색이 세 갈래라 `up: boolean` 으로는 모자란다 — 0.0% 는 오른 것도 내린 것도
 * 아니어서 회색이다. 판정은 **화면에 찍히는 반올림값**으로 한다(`pctTrend`).
 */
export type Trend = -1 | 0 | 1;

export type HomeHolding = {
  tick: string;
  name: string;
  qty: string;
  value: string;
  pct: string;
  trend: Trend;
  /**
   * 종목 상세로 갈 때 쓰는 코드. 실제 계좌 보유는 항상 있고, 데모 보유는 유니버스에서
   * 이름을 찾았을 때만 붙는다(`withStockCodes`). 없으면 그 줄은 눌리지 않는다.
   */
  code?: string;
  /** 실제 계좌에서 낸 평가차익. 데모 보유에는 없다. */
  profit?: number;
};

/** 이름으로 코드를 찾을 때 쓰는 유니버스 종목의 최소 모양(`use-universe` 의 `UniverseStock`). */
export type StockCodeRef = { code: string; name: string };

/**
 * 이름·아바타·목표 아이템은 저장소에 없는 값이라 여기 고정 데모로 남는다.
 * 보유 종목과 수익은 실제 계좌 값으로 갈아 끼운다(`homeHoldings`).
 *
 * `unitPrice` 는 "○개 살 수 있어요" 의 나눗셈 밑이다. 실제 판매가와 다르면 그 문장이
 * 근거 없는 숫자가 되므로 여기 값이 곧 기준가다 — 향수 14만원·신발 8만원.
 */
export const HOME_INFO: Record<
  HomeRole,
  {
    /** 헤더 "○○ 총자산" 에 쓰는 데모 이름. 서버 계좌 이름이 있으면 그쪽이 이긴다. */
    name: string;
    avatarImg: string;
    day: string;
    brand: string;
    unit: string;
    img: string;
    goalImg: string;
    unitPrice: number;
    profit: number;
    holdings: HomeHolding[];
  }
> = {
  mom: {
    name: "찬영 어머님",
    avatarImg: "/ui/assets/profile-mom.png",
    day: "28일째",
    brand: "샤넬",
    unit: "향수",
    img: "/ui/assets/item-mom.png",
    goalImg: "/ui/assets/goal-mom.png",
    unitPrice: 140000,
    profit: 211000,
    holdings: [
      { tick: "삼성", name: "삼성전자", qty: "4주", value: "318,000원", pct: "+2.4%", trend: 1 },
      { tick: "LG", name: "LG생활건강", qty: "1주", value: "412,000원", pct: "+5.1%", trend: 1 },
      { tick: "아모", name: "아모레퍼시픽", qty: "2주", value: "246,000원", pct: "-1.2%", trend: -1 },
    ],
  },
  dad: {
    name: "찬영 아버님",
    avatarImg: "/ui/assets/profile-dad.png",
    day: "28일째",
    brand: "나이키",
    unit: "신발",
    img: "/ui/assets/item-dad.png",
    goalImg: "/ui/assets/goal-dad.png",
    unitPrice: 80000,
    profit: 452000,
    holdings: [
      { tick: "현대", name: "현대차", qty: "2주", value: "486,000원", pct: "+3.8%", trend: 1 },
      { tick: "NAV", name: "NAVER", qty: "1주", value: "198,000원", pct: "-0.6%", trend: -1 },
      { tick: "카카", name: "카카오", qty: "5주", value: "215,000원", pct: "+1.9%", trend: 1 },
      { tick: "SK", name: "SK하이닉스", qty: "1주", value: "178,000원", pct: "+6.2%", trend: 1 },
    ],
  },
  child: {
    name: "김찬영",
    avatarImg: "/ui/assets/profile-child.png",
    day: "28일째",
    brand: "",
    unit: "왁뿌볼",
    img: "/ui/assets/item-child.png",
    goalImg: "/ui/assets/goal-child.png",
    unitPrice: 12000,
    profit: 428600,
    holdings: [
      { tick: "삼성", name: "삼성전자", qty: "3주", value: "238,500원", pct: "+4.3%", trend: 1 },
      { tick: "롯데", name: "롯데웰푸드", qty: "2주", value: "124,000원", pct: "+2.1%", trend: 1 },
      { tick: "오리", name: "오리온", qty: "1주", value: "96,500원", pct: "-0.8%", trend: -1 },
    ],
  },
};

/**
 * 로그인 계정에 따라 아빠/엄마/아이 홈을 통째로 다르게 그린다.
 * 아직 계좌를 못 불러왔으면 빈 화면 대신 아이 계정 데모로 보여 준다.
 */
export function homeRole(user: AccountUser | null): HomeRole | null {
  if (!user) return null;
  if (user.parent_child === "child") return "child";
  return user.guardian_role === "mom" || user.guardian_role === "dad"
    ? user.guardian_role
    : null;
}

/** 실제 계좌를 읽었는지. 읽은 뒤에는 보유가 없어도 데모로 되돌아가지 않는다. */
export function homeLoaded(user: AccountUser | null): boolean {
  return homeRole(user) !== null && Array.isArray(user?.holdings);
}

/**
 * 로그인 사용자의 실제 Supabase 보유종목. 평가금액·수익률은 아카이브 수익률 탭과
 * 같은 계산(현재가·평단가 기준)이다. 시세를 못 받은 종목은 평단가를 현재가로 본다.
 */
export function liveHoldings(
  user: AccountUser | null,
  prices: Record<string, number>,
): HomeHolding[] {
  if (!homeLoaded(user)) return [];
  return (user?.holdings ?? [])
    .filter((h) => h.stock_code)
    .map((h) => {
      const price = prices[h.stock_code as string] || h.avg_price;
      const pc = h.avg_price > 0 ? ((price - h.avg_price) / h.avg_price) * 100 : 0;
      return {
        tick: (h.stock_name || h.stock_code || "").slice(0, 2),
        name: h.stock_name || (h.stock_code as string),
        code: h.stock_code as string,
        qty:
          (h.quantity >= 1 ? Math.round(h.quantity * 100) / 100 : h.quantity.toFixed(2)) + "주",
        value: won(h.quantity * price),
        pct: (pc >= 0 ? "+" : "−") + Math.abs(pc).toFixed(1) + "%",
        trend: pctTrend(pc),
        profit: (price - h.avg_price) * h.quantity,
      };
    });
}

/**
 * 데모 보유(`HOME_INFO`)에 종목코드를 붙인다. 데모 값은 화면 문구라 코드가 없는데,
 * 코드를 여기 적어 두면 유니버스와 조용히 어긋난다 — 이름이 정확히 같은 종목을 찾아
 * 그때만 붙이고 못 찾으면 그대로 둔다(그 줄은 상세로 갈 수 없다).
 */
export function withStockCodes(
  holdings: HomeHolding[],
  stocks: StockCodeRef[],
): HomeHolding[] {
  if (stocks.length === 0) return holdings;
  return holdings.map((holding) => {
    const found = stocks.find((stock) => stock.name === holding.name);
    return found ? { ...holding, code: found.code } : holding;
  });
}

/**
 * 홈 카드에 세워 두는 보유 줄 수. 이보다 많으면 `전체보기` 시트에서만 나머지를 본다 —
 * 카드가 보유 개수만큼 길어지면 그 위의 캐릭터 그림 자리가 계정마다 달라진다.
 */
export const HOME_HOLDING_LIMIT = 3;

export type HomeView = {
  role: HomeRole;
  info: (typeof HOME_INFO)[HomeRole];
  loaded: boolean;
  /** 전체 보유. `전체보기` 시트가 이걸 그대로 그린다. */
  holdings: HomeHolding[];
  /** 홈 카드에 보이는 앞 세 줄. */
  topHoldings: HomeHolding[];
  /** 목표 아이템을 몇 개 살 수 있나. 수익이 마이너스면 0. */
  goalCount: number;
  dayCount: string;
  itemLine: string;
  rateText: string;
  profitText: string;
  rateColor: string;
  /** 헤더 프로필 옆 "○○ 총자산". 총자산 금액이 수익금액처럼 읽히지 않게 이름을 붙인다. */
  totalAssetsLabel: string;
  /** 현금(`balance`) + 보유 평가금액. 계좌를 못 읽었으면 보유 평가금액만(현금 없이) 보여준다. */
  totalAssetsText: string;
  /** 계좌를 읽었는데 보유가 하나도 없을 때만 참. */
  noHoldings: boolean;
};

/**
 * 수익도 실제 보유에서 낸다. 데모 상수(`info.profit`)를 실제 평가금액으로 나누면
 * 목표 개수와 수익률이 서로 다른 근거를 갖게 된다.
 */
export function homeView(
  user: AccountUser | null,
  prices: Record<string, number>,
  stocks: StockCodeRef[] = [],
): HomeView {
  const role = homeRole(user);
  const info = HOME_INFO[role ?? "child"];
  const loaded = homeLoaded(user);
  const live = liveHoldings(user, prices);
  const holdings = loaded ? live : withStockCodes(info.holdings, stocks);
  const profit = loaded ? live.reduce((sum, h) => sum + (h.profit ?? 0), 0) : info.profit;
  const goalCount = Math.max(0, Math.floor(profit / info.unitPrice));
  const total = holdings.reduce(
    (sum, h) => sum + (parseInt(h.value.replace(/[^0-9]/g, ""), 10) || 0),
    0,
  );
  const rate = total ? (profit / total) * 100 : 0;
  // 계좌를 못 읽은 동안은 현금을 모른다 — 0으로 두어 보유 평가금액만 보여준다.
  const cash = loaded ? user?.balance ?? 0 : 0;

  return {
    role: role ?? "child",
    info,
    loaded,
    holdings,
    topHoldings: holdings.slice(0, HOME_HOLDING_LIMIT),
    goalCount,
    dayCount: "시즌 3 · " + info.day,
    itemLine:
      (info.brand ? info.brand + " " : "") + info.unit + " " + goalCount + "개 살 수 있어요",
    // 실제 계좌를 붙이면 손실도 나온다. 부호와 색을 함께 바꾼다.
    rateText: (rate >= 0 ? "+" : "−") + Math.abs(rate).toFixed(1) + "%",
    profitText: (profit >= 0 ? "+" : "−") + won(Math.abs(profit)),
    rateColor: trendColor(pctTrend(rate)),
    totalAssetsLabel: ((loaded && user?.name) || info.name) + " 총자산",
    totalAssetsText: won(cash + total),
    noHoldings: loaded && live.length === 0,
  };
}

/**
 * 화면에 찍히는 값으로 방향을 정한다. 실제 등락이 +0.04% 여도 화면은 `+0.0%` 라
 * 적는데, 원값으로 색을 고르면 0.0% 가 핑크로 뜬다 — 숫자와 색이 다른 말을 한다.
 */
export function pctTrend(pct: number): Trend {
  const shown = Math.round(pct * 10) / 10;
  return shown > 0 ? 1 : shown < 0 ? -1 : 0;
}

/** 오르면 핑크, 내리면 남색, 그대로면 회색. 총 수익률과 보유 줄이 같은 규칙을 쓴다. */
export const trendColor = (trend: Trend) =>
  trend > 0 ? "#D5327A" : trend < 0 ? "#2E6BE6" : "#8E93A8";

/**
 * 목표 그림을 누르면 아이템이 튀어오른다. 자리·각도는 좌표 난수가 아니라 순번 기반이라
 * 다시 눌러도 같은 자리에서 뜬다 — `app.html` 과 같은 seed 식이다.
 */
export function popItems(open: boolean, goalCount: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const on = open && i < Math.min(goalCount, 6);
    const seed = (i + 1) * 47;
    return {
      on,
      left: (15 + ((seed * 7) % 70)).toFixed(1),
      bottom: (12 + ((seed * 13) % 55)).toFixed(1),
      rotate: (-35 + ((seed * 5) % 70)).toFixed(1),
      delay: i * 0.1,
    };
  });
}
