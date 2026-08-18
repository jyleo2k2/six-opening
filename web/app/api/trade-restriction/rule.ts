/**
 * 학교 시간 거래 제한 규칙 — 부모가 정하고 자녀 계정에만 걸린다.
 *
 * 판정은 **서버에서만** 한다. 화면은 `GET /api/trade-restriction` 이 준 `blocked` 를
 * 그대로 쓰고 스스로 시각을 다시 계산하지 않는다 — 두 곳이 각자 계산하면 브라우저 시계가
 * 다른 나라에 맞춰져 있을 때 화면은 열려 있는데 주문만 거절당한다.
 */

/** 1=월 … 7=일 (ISO 8601 요일). */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type TradeRestriction = {
  enabled: boolean;
  /** 제한이 걸리는 요일. 빈 배열이면 어느 날도 걸리지 않는다. */
  weekdays: number[];
  /** 자정부터 흐른 분. 09:00 이면 540 이다. */
  start_minute: number;
  end_minute: number;
  block_buy: boolean;
  block_sell: boolean;
};

/**
 * 아직 아무것도 정하지 않은 가족의 값. **꺼짐이 기본이다** — 부모가 켜기 전에는
 * 지금까지와 똑같이 아이가 언제든 주문할 수 있어야 한다.
 */
export const DEFAULT_RESTRICTION: TradeRestriction = {
  enabled: false,
  weekdays: [1, 2, 3, 4, 5],
  start_minute: 9 * 60,
  end_minute: 15 * 60,
  block_buy: true,
  block_sell: true,
};

const MINUTES_PER_DAY = 24 * 60;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 지금이 KST 로 몇 요일 몇 분인지. 서버가 어느 시간대에 떠 있든 한국 시각으로 읽는다. */
export function kstMoment(now: Date): { weekday: number; minute: number } {
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  // getUTCDay 는 0=일 이다. ISO 요일(1=월 … 7=일)로 옮긴다.
  const weekday = kst.getUTCDay() === 0 ? 7 : kst.getUTCDay();
  return { weekday, minute: kst.getUTCHours() * 60 + kst.getUTCMinutes() };
}

/** 지금이 제한 창 안인지. 시작 분은 포함하고 종료 분은 제외한다. */
export function isRestrictedNow(rule: TradeRestriction, now: Date): boolean {
  if (!rule.enabled) return false;
  const { weekday, minute } = kstMoment(now);
  if (!rule.weekdays.includes(weekday)) return false;
  return minute >= rule.start_minute && minute < rule.end_minute;
}

/** 지금 막히는 쪽. 제한 창 밖이면 둘 다 열려 있다. */
export function blockedSides(rule: TradeRestriction, now: Date): { buy: boolean; sell: boolean } {
  if (!isRestrictedNow(rule, now)) return { buy: false, sell: false };
  return { buy: rule.block_buy, sell: rule.block_sell };
}

const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

const minute = (value: unknown): number | null =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY
    ? value
    : null;

/**
 * 저장 요청을 규칙으로 옮긴다. 하나라도 어긋나면 `null` 이고 라우트가 400 으로 거절한다 —
 * 이 값은 아이의 주문을 막는 데 쓰이므로 반쯤 맞는 값을 짐작해서 저장하지 않는다.
 */
export function parseRestriction(payload: unknown): TradeRestriction | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;

  const weekdays = Array.isArray(raw.weekdays)
    ? raw.weekdays.filter((day): day is number => Number.isInteger(day) && (day as number) >= 1 && (day as number) <= 7)
    : null;
  if (!weekdays || weekdays.length !== (Array.isArray(raw.weekdays) ? raw.weekdays.length : -1)) return null;

  const start = minute(raw.start_minute);
  const end = minute(raw.end_minute);
  if (start === null || end === null || start >= end) return null;

  return {
    enabled: bool(raw.enabled, false),
    weekdays: Array.from(new Set(weekdays)).sort((a, b) => a - b),
    start_minute: start,
    end_minute: end,
    block_buy: bool(raw.block_buy, true),
    block_sell: bool(raw.block_sell, true),
  };
}
