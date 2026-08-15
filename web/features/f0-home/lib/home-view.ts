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
  holdings: {
    stock_code: string | null;
    stock_name: string | null;
    quantity: number;
    avg_price: number;
  }[];
};

export type HomeRole = "mom" | "dad" | "child";

export type HomeHolding = {
  tick: string;
  name: string;
  qty: string;
  value: string;
  pct: string;
  up: boolean;
  /** 실제 계좌에서 낸 평가차익. 데모 보유에는 없다. */
  profit?: number;
};

/**
 * 인사말·아바타·목표 아이템은 저장소에 없는 값이라 여기 고정 데모로 남는다.
 * 보유 종목과 수익은 실제 계좌 값으로 갈아 끼운다(`homeHoldings`).
 */
export const HOME_INFO: Record<
  HomeRole,
  {
    season: string;
    greeting: string;
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
    season: "보호자 계정",
    greeting: "찬영 어머님, 어서 오세요",
    avatarImg: "/ui/assets/profile-mom.png",
    day: "28일째",
    brand: "샤넬",
    unit: "향수",
    img: "/ui/assets/item-mom.png",
    goalImg: "/ui/assets/goal-mom.png",
    unitPrice: 210000,
    profit: 211000,
    holdings: [
      { tick: "삼성", name: "삼성전자", qty: "4주", value: "318,000원", pct: "+2.4%", up: true },
      { tick: "LG", name: "LG생활건강", qty: "1주", value: "412,000원", pct: "+5.1%", up: true },
      { tick: "아모", name: "아모레퍼시픽", qty: "2주", value: "246,000원", pct: "-1.2%", up: false },
    ],
  },
  dad: {
    season: "보호자 계정",
    greeting: "찬영 아버님, 어서 오세요",
    avatarImg: "/ui/assets/profile-dad.png",
    day: "28일째",
    brand: "나이키",
    unit: "신발",
    img: "/ui/assets/item-dad.png",
    goalImg: "/ui/assets/goal-dad.png",
    unitPrice: 219000,
    profit: 452000,
    holdings: [
      { tick: "현대", name: "현대차", qty: "2주", value: "486,000원", pct: "+3.8%", up: true },
      { tick: "NAV", name: "NAVER", qty: "1주", value: "198,000원", pct: "-0.6%", up: false },
      { tick: "카카", name: "카카오", qty: "5주", value: "215,000원", pct: "+1.9%", up: true },
      { tick: "SK", name: "SK하이닉스", qty: "1주", value: "178,000원", pct: "+6.2%", up: true },
    ],
  },
  child: {
    season: "아이 계정",
    greeting: "찬영아, 어서 와요!",
    avatarImg: "/ui/assets/profile-child.png",
    day: "14일째",
    brand: "",
    unit: "왁뿌볼",
    img: "/ui/assets/item-child.png",
    goalImg: "/ui/assets/goal-child.png",
    unitPrice: 12000,
    profit: 428600,
    holdings: [
      { tick: "삼성", name: "삼성전자", qty: "3주", value: "238,500원", pct: "+4.3%", up: true },
      { tick: "롯데", name: "롯데웰푸드", qty: "2주", value: "124,000원", pct: "+2.1%", up: true },
      { tick: "오리", name: "오리온", qty: "1주", value: "96,500원", pct: "-0.8%", up: false },
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
        qty:
          (h.quantity >= 1 ? Math.round(h.quantity * 100) / 100 : h.quantity.toFixed(2)) + "주",
        value: won(h.quantity * price),
        pct: (pc >= 0 ? "+" : "−") + Math.abs(pc).toFixed(1) + "%",
        up: pc >= 0,
        profit: (price - h.avg_price) * h.quantity,
      };
    });
}

export type HomeView = {
  role: HomeRole;
  info: (typeof HOME_INFO)[HomeRole];
  loaded: boolean;
  holdings: HomeHolding[];
  /** 목표 아이템을 몇 개 살 수 있나. 수익이 마이너스면 0. */
  goalCount: number;
  dayCount: string;
  itemLine: string;
  rateText: string;
  profitText: string;
  rateColor: string;
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
): HomeView {
  const role = homeRole(user);
  const info = HOME_INFO[role ?? "child"];
  const loaded = homeLoaded(user);
  const live = liveHoldings(user, prices);
  const holdings = loaded ? live : info.holdings;
  const profit = loaded ? live.reduce((sum, h) => sum + (h.profit ?? 0), 0) : info.profit;
  const goalCount = Math.max(0, Math.floor(profit / info.unitPrice));
  const total = holdings.reduce(
    (sum, h) => sum + (parseInt(h.value.replace(/[^0-9]/g, ""), 10) || 0),
    0,
  );
  const rate = total ? (profit / total) * 100 : 0;

  return {
    role: role ?? "child",
    info,
    loaded,
    holdings,
    goalCount,
    dayCount: "시즌 3 · " + info.day,
    itemLine:
      (info.brand ? info.brand + " " : "") + info.unit + " " + goalCount + "개 살 수 있어요",
    // 실제 계좌를 붙이면 손실도 나온다. 부호와 색을 함께 바꾼다.
    rateText: (rate >= 0 ? "+" : "−") + Math.abs(rate).toFixed(1) + "%",
    profitText: (profit >= 0 ? "+" : "−") + won(Math.abs(profit)),
    rateColor: rate >= 0 ? "#D5327A" : "#2E6BE6",
    noHoldings: loaded && live.length === 0,
  };
}

export const holdingPctColor = (up: boolean) => (up ? "#D5327A" : "#2E6BE6");

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
