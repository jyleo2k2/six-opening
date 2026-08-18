/**
 * 학교 시간 거래 제한의 화면 쪽 표현. 서버 응답
 * (`app/api/trade-restriction/rule.ts`)의 모양을 그대로 옮겨 담는다 —
 * `server-account.ts` 와 같은 방식이다.
 *
 * **지금 막혔는지는 여기서 계산하지 않는다.** 그 판정은 서버가 `blocked` 로 내려보낸다.
 * 화면이 따로 세면 브라우저 시계가 다른 나라에 맞춰져 있을 때 화면과 서버가 갈린다.
 */
export type TradeRestriction = {
  enabled: boolean;
  /** 1=월 … 7=일 (ISO 8601). */
  weekdays: number[];
  start_minute: number;
  end_minute: number;
  block_buy: boolean;
  block_sell: boolean;
};

export type RestrictionState = {
  rule: TradeRestriction;
  blocked: { buy: boolean; sell: boolean };
  /** 이 계정(자녀)에게 걸리는 규칙인지. 부모 계정에서는 거짓이다. */
  applies: boolean;
  /** 부모만 바꿀 수 있다. */
  editable: boolean;
};

export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

/** 시간을 고르는 단위. 학교 시간표는 30분보다 잘게 정할 일이 없다. */
export const STEP_MINUTES = 30;

/** 자정부터의 분을 `오전 9:00` 처럼 읽는 말로. 12시는 정오·자정으로 갈린다. */
export function timeLabel(minute: number): string {
  const hour24 = Math.floor(minute / 60) % 24;
  const rest = minute % 60;
  const noon = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${noon ? "오후" : "오전"} ${hour12}:${String(rest).padStart(2, "0")}`;
}

/**
 * 시작·종료를 한 칸 옮긴다. **창은 늘 최소 한 칸 열려 있다** — 시작이 종료를 넘어서면
 * 저장이 400 으로 거절되므로 아예 그 자리로 못 가게 여기서 잡는다.
 */
export function stepMinute(
  rule: TradeRestriction,
  edge: "start" | "end",
  direction: 1 | -1,
): TradeRestriction {
  const next = (edge === "start" ? rule.start_minute : rule.end_minute) + direction * STEP_MINUTES;
  if (edge === "start") {
    if (next < 0 || next >= rule.end_minute) return rule;
    return { ...rule, start_minute: next };
  }
  if (next > 24 * 60 || next <= rule.start_minute) return rule;
  return { ...rule, end_minute: next };
}

/** 요일 하나를 켜고 끈다. 목록은 늘 정렬해 둔다 — 서버가 그렇게 돌려주기 때문이다. */
export function toggleWeekday(rule: TradeRestriction, weekday: number): TradeRestriction {
  const on = rule.weekdays.includes(weekday);
  const weekdays = on
    ? rule.weekdays.filter((day) => day !== weekday)
    : [...rule.weekdays, weekday].sort((a, b) => a - b);
  return { ...rule, weekdays };
}

/**
 * 메뉴에 적는 한 줄. 무엇이 켜져 있는지 열어 보지 않고도 알아야 한다.
 * 요일을 하나도 안 고르거나 매수·매도를 둘 다 끄면 켜 놓아도 막는 것이 없다 — 그때는
 * 켜짐이라고 말하지 않는다.
 */
export function restrictionSummary(rule: TradeRestriction): string {
  const sides = [rule.block_buy ? "매수" : null, rule.block_sell ? "매도" : null].filter(Boolean);
  if (!rule.enabled || rule.weekdays.length === 0 || sides.length === 0) return "꺼짐";
  const days = rule.weekdays.map((day) => WEEKDAY_LABELS[day - 1]).join("·");
  return `${days} ${timeLabel(rule.start_minute)}~${timeLabel(rule.end_minute)}`;
}
