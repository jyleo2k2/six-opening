/**
 * 캔들차트 안내 말풍선의 **문구와 닫힘 표시**.
 *
 * 문구가 기간마다 갈리는 이유는 막대 하나가 덮는 시간이 다르기 때문이다. 분봉의 막대는
 * 1분, 일봉은 하루, 주봉은 1주일인데 전에는 셋 다 "막대 하나가 하루예요" 라고 말해서
 * 분봉·주봉에서는 **틀린 설명**이었다. 꼬리 문장의 "그날 가장 비쌌던 값" 도 같은 이유로
 * 기간을 갈아 끼운다.
 *
 * 문구를 컴포넌트에서 빼내 여기에 두는 이유는 `trade-copy` 와 같다 — 아이가 읽는 말은
 * 화면 코드 사이에 흩어 두지 않고 한자리에서 고치고, 브라우저 없이 확인할 수 있어야 한다.
 *
 * ## 닫힘 표시를 여기에 같이 두는 이유
 *
 * X 를 누르면 **그 기간의 안내만** 다시 뜨지 않는다. 셋을 한꺼번에 접지 않는 것은 문구가
 * 서로 다른 것(1분·하루·1주일)을 가르치기 때문이다 — 분봉 안내를 닫았다고 주봉 막대가
 * 1주일이라는 말까지 못 보고 지나가면 안 된다.
 *
 * 어디에 담아 두는지는 `ConnectedPrototype` 이 정한다(메모리 상태). 브라우저 저장소를
 * 쓰지 않으므로 닫힘은 **로그인 세션의 수명**을 따른다: 화면을 오가도 남아 있고, 로그아웃과
 * 새 로그인에서 초기화된다. 여기에는 그 값을 읽고 바꾸는 순수 계산만 있다.
 */
import type { PrototypeChartPeriod } from "../../f2-trade/chart-data";

export type CandleTipCopy = {
  /** 말풍선 제목. 막대 하나가 덮는 시간이다. */
  title: string;
  /** 꼬리 문장에서 기간을 가리키는 조각 — "위아래로 나온 선은 {span} 가장 비쌌던 값…". */
  span: string;
};

/**
 * 기간별 문구. 일봉은 원래 화면에 있던 말 그대로다 — 맞는 말이라 고칠 이유가 없고,
 * 바뀌지 않았는지는 테스트가 글자 단위로 지킨다.
 */
export const CANDLE_TIP_COPY: Readonly<Record<PrototypeChartPeriod, CandleTipCopy>> = Object.freeze({
  minute: Object.freeze({ title: "막대 하나가 1분이에요", span: "1분간" }),
  daily: Object.freeze({ title: "막대 하나가 하루예요", span: "그날" }),
  weekly: Object.freeze({ title: "막대 하나가 1주일이에요", span: "1주일간" }),
});

export function candleTipCopy(period: PrototypeChartPeriod): CandleTipCopy {
  return CANDLE_TIP_COPY[period];
}

/** 지금까지 닫은 기간들. 담지 않은 기간은 아직 한 번도 닫지 않았다는 뜻이다. */
export type CandleTipDismissals = Readonly<Partial<Record<PrototypeChartPeriod, true>>>;

export const NO_CANDLE_TIPS_CLOSED: CandleTipDismissals = Object.freeze({});

export function isCandleTipClosed(closed: CandleTipDismissals, period: PrototypeChartPeriod) {
  return closed[period] === true;
}

/** 그 기간을 닫은 새 표시를 돌려준다. 받은 값을 고치지 않는다 — 상태는 갈아 끼우는 것이다. */
export function closeCandleTip(
  closed: CandleTipDismissals,
  period: PrototypeChartPeriod,
): CandleTipDismissals {
  if (isCandleTipClosed(closed, period)) return closed;
  return Object.freeze({ ...closed, [period]: true as const });
}
