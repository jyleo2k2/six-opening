/**
 * 차트 화면 아래 체결 범례 — 차트 위 B/S 핀이 각각 누구의 언제·얼마짜리 매매인지 풀어 쓴다.
 * 프로토타입(`web/design-system/prototype`)의 `chartTradeLegend` 계산을 옮겼다.
 *
 * 값은 `GET /api/trades` 가 준 진짜 가족 체결이다(F11 SPEC §6.1). 기록이 없으면 범례를
 * 통째로 감춘다 — 없는 체결을 지어내지 않는다.
 *
 * 원본과 갈리는 곳이 하나 있다. **핀은 체결 시각에 찍힌다.** 원본은 핀 x 를 순번
 * 비율(`0.22 + 0.68 * …`)로 나눠 체결일과 무관한 자리에 찍었다. 우리 차트는 봉의
 * 시각에 붙이므로(`buildTradeMarkers`) 범례의 날짜와 핀 자리가 서로 맞는다.
 *
 * 점 색은 차트가 찍는 마커와 같아야 한다 — 범례가 있는 이유가 "이 색 핀이 이 사람"
 * 이라서, 색이 어긋나면 범례가 오히려 거짓말을 한다. 그래서 `member`(부모·자녀)가
 * 아니라 서버가 주는 `role`(자녀·엄마·아빠)을 그대로 넘긴다 (F11 SPEC §5.1).
 */
import type { TradeSide } from "../../../shared/types/trade";
import { won } from "./portfolio-view";

/**
 * 핀 색을 정하는 값. 차트 마커(`f2-trade/TradingViewChart.tsx`)와 같은 리터럴이다.
 * `shared/types/trade.ts` 로 올리는 정리는 오케스트레이터 몫이다 (F11 SPEC §5.1).
 */
export type PinRole = "child" | "mom" | "dad";

/** `GET /api/trades` 응답 한 줄 중 범례가 읽는 부분. */
export type LegendTrade = {
  id: string;
  /** 체결한 사람 이름. `profiles.name` 을 그대로 쓴다. */
  name: string;
  role: PinRole;
  side: TradeSide;
  /** 체결가. */
  price: number;
  /** ISO 8601 체결 시각. */
  tradedAt: string;
};

export type TradeLegendRow = {
  id: string;
  /** 핀과 같은 글자. 산 것은 B, 판 것은 S. */
  label: "B" | "S";
  who: string;
  /** `M/D`. 시각을 못 읽으면 빈 글자다. */
  date: string;
  price: string;
  side: "매수" | "매도";
  /** 점 색을 정한다. 차트 마커와 같은 기준이다. */
  role: PinRole;
};

/** 원본과 같이 마지막 넷만 남긴다. 상세 미니 차트는 셋이라 개수가 다르다. */
const SHOWN = 4;

/**
 * 체결일은 한국 시각으로 읽는다.
 *
 * `created_at` 은 UTC 로 저장되므로 실행 환경의 표준시를 따라가면 자정 근처 체결이
 * 하루 어긋난다. 차트 눈금(`TradingViewChart` 의 `formatTime`)도 같은 표준시를 쓴다.
 */
const DATE = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
});

function dateText(iso: string) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  // ko-KR 은 `8. 4.` 로 주므로 숫자만 뽑아 `8/4` 로 잇는다.
  const parts = DATE.formatToParts(at);
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return month && day ? `${month}/${day}` : "";
}

export function buildTradeLegend(trades: readonly LegendTrade[]): TradeLegendRow[] {
  return [...trades]
    .sort((left, right) => left.tradedAt.localeCompare(right.tradedAt))
    .slice(-SHOWN)
    .map((trade) => ({
      id: trade.id,
      label: trade.side === "buy" ? "B" : "S",
      who: trade.name,
      date: dateText(trade.tradedAt),
      price: won(trade.price),
      side: trade.side === "buy" ? "매수" : "매도",
      role: trade.role,
    }));
}
