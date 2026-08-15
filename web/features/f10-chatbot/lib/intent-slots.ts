/**
 * 차단 판정(SPEC §6.1.1 추천·예측, §6.1.2 보호)을 **낱말 슬롯의 곱**으로 본다.
 *
 * `routing.ts` 의 `*_PATTERNS` 는 그 곱을 사람이 미리 문자열로 펼쳐 적은 목록이라
 * 빠진 칸이 그대로 구멍이 된다. 실측에서 드러난 자리가 그 증거다.
 *
 * - `엄마 수익률 알려 줘` 는 막히는데 `엄마 수익률 얼마야?` 는 수익률 뜻으로 샜다.
 *   조회 동사 목록에 `얼마` 가 없었다.
 * - `목표가를 정해 줘` 는 막히는데 `목표가 좀 정해줘` 는 손절 뜻으로 샜다.
 *   판정 정규식이 `목표가` 와 `정해` 의 **인접**만 봤다.
 * - `유튜브에서 방산주가 오른다는데 지금 사도 돼?` 는 막히는데 `…사도 됨?` 은
 *   영상 콘텐츠 거절로 샜다. 선택 목록에 `사도돼`·`사도되` 만 있었다.
 *
 * 슬롯을 곱으로 두면 위 칸들이 목록 추가 없이 채워진다. 낱말을 늘릴 때는
 * `intent-slots.test.ts` 의 교차곱 검사가 함께 늘어난다.
 *
 * 입력은 `normalizeChatInput` 을 이미 통과한 문자열이다 — 공백·문장 부호가 없고
 * 소문자다. 이 파일은 `routing.ts` 를 import 하지 않는다(순환 방지).
 */

function includesAny(message: string, patterns: readonly string[]) {
  return patterns.some((pattern) => message.includes(pattern));
}

/** 가족 구성원. 짧은 낱말(`형`·`동생`)은 다른 말에 섞여 오탐하므로 넣지 않는다. */
export const FAMILY_MEMBER_SLOT = [
  "엄마",
  "아빠",
  "부모님",
  "부모",
  "보호자",
  "가족",
] as const;

/** 가족의 무엇을 보려는지. `이유`·`손익`처럼 기록을 가리키는 말을 포함한다. */
export const FAMILY_DATA_SLOT = [
  "수익률",
  "성향",
  "기록",
  "종목",
  "뭐샀",
  "뭘샀",
  "산이유",
  "거래이유",
  "이유",
  "거래내역",
  "투자내역",
  "보유",
  "산거",
  "산게",
  "산건",
  "산종목",
  "산주식",
  "손익",
  "얼마벌",
  "얼마잃",
  "계좌",
] as const;

/**
 * 조회를 요구하는 말. `알려`·`보여` 같은 명령형뿐 아니라 `얼마`·`뭐야` 처럼
 * 값을 묻는 의문형도 같은 요구다 — 아이는 대체로 뒤쪽으로 묻는다.
 */
export const DATA_REQUEST_SLOT = [
  "알려",
  "보여",
  "말해",
  "비교해",
  "볼수",
  "볼래",
  "보고싶",
  "찾아",
  "읽",
  "합칠",
  "똑같이",
  "뭐샀",
  "얼마",
  "몇인데",
  "몇이",
  "뭐야",
  "뭐임",
  "뭔데",
  "어때",
  "궁금",
  "가르쳐",
  "알수있",
] as const;

/** 뜻을 묻는 형태. 값·결정 요구와 가르는 데 쓴다. */
const DEFINITION_MARKERS = ["무슨뜻", "뜻이", "뜻은", "의미가", "이란", "이라는", "라는게"] as const;

export const TARGET_PRICE_SLOT = [
  "목표가",
  "목표주가",
  "목표가격",
  "손절가",
  "손절선",
  "손절라인",
  "익절가",
] as const;

/** 가격을 대신 정해 달라는 요구. `얼마`는 값 요구라 여기에 함께 둔다. */
export const PRICE_DECISION_SLOT = [
  "정해",
  "정할",
  "잡아",
  "잡을",
  "잡지",
  "찍어",
  "찍지",
  "설정",
  "골라",
  "추천",
  "매겨",
  "알려",
  "얼마",
] as const;

/** 실제 매매 판단을 요구하는 어간. 아래 어미와 곱해 쓴다. */
const TRADE_STEMS = ["사", "살", "샀", "팔", "판", "매수", "매도", "담", "넣"] as const;

/** 판단을 요구하는 어미. 어간 바로 뒤에 붙을 때만 인정한다. */
const DECISION_TAILS = [
  "도돼",
  "도되",
  "도됨",
  "도될까",
  "도괜찮",
  "야돼",
  "야되",
  "야됨",
  "야될까",
  "야해",
  "야하",
  "야할",
  "면돼",
  "면되",
  "면될까",
  "면안",
  "까",
  "래",
] as const;

/**
 * 어간 × 어미의 곱. `사도돼`·`사도됨`·`살까`·`팔래`가 한 규칙에서 나온다.
 * 어간과 어미가 **붙어 있을 때만** 잡으므로 "생각해 볼까" 같은 말은 걸리지 않는다.
 */
export const TRADE_DECISION_PATTERNS: readonly string[] = TRADE_STEMS.flatMap((stem) =>
  DECISION_TAILS.map((tail) => `${stem}${tail}`),
);

/** 최상급·인기 표현. 그 자체로는 투자 질문이 아니다. */
const POPULARITY_SLOT = ["제일", "가장", "많이", "인기", "다들", "남들", "애들"] as const;

/** 1인칭. 같은 표현이라도 주어가 나면 본인 기록 조회다. */
const FIRST_PERSON_SLOT = ["내가", "제가", "나는", "내종목", "나의"] as const;

/** 이미 산 것을 가리키는 말. 인기 표현과 함께 있을 때 추종 매수 요구가 된다. */
const PAST_TRADE_SLOT = ["산거", "산게", "산건", "산종목", "산주식", "샀", "담은", "매수한"] as const;

/** 투자 대상을 직접 가리키는 말. */
export const INVESTMENT_TARGET_SLOT = [
  "종목",
  "주식",
  "주가",
  "방산주",
  "게임주",
  "유통주",
  "자동차주",
  "반도체주",
  "매수",
  "매도",
  "보유",
  "포트폴리오",
  "손절",
  "목표가",
  "투자할",
  "가진돈",
  "돈전부",
  "넣을래",
  "어디에넣",
] as const;

/**
 * 가족의 기록·수익률·성향을 대신 봐 달라는 요구(SPEC §6.1.2 · §6.1.8 W1-061·W4-062).
 * 가족어 × 데이터어 × 조회요구의 곱이다.
 */
export function asksFamilyData(message: string): boolean {
  return (
    includesAny(message, FAMILY_MEMBER_SLOT) &&
    includesAny(message, FAMILY_DATA_SLOT) &&
    includesAny(message, DATA_REQUEST_SLOT)
  );
}

/**
 * 목표가·손절가를 대신 정해 달라는 요구(SPEC §1.3 · §6.1.1).
 * 뜻을 묻는 질문(`목표가가 무슨 뜻이야?`)은 승인 용어 설명이므로 제외한다.
 */
export function asksTargetPriceDecision(message: string): boolean {
  if (!includesAny(message, TARGET_PRICE_SLOT)) return false;
  const asksDefinition =
    includesAny(message, DEFINITION_MARKERS) &&
    !includesAny(message, ["정해", "잡아", "찍어", "설정", "골라", "매겨"]);
  if (asksDefinition) return false;
  return includesAny(message, PRICE_DECISION_SLOT);
}

/** 살지 말지·팔지 말지를 대신 정해 달라는 요구. */
export function asksTradeDecision(message: string): boolean {
  return includesAny(message, TRADE_DECISION_PATTERNS);
}

/**
 * 남들이 많이 산 것을 따라 사려는 요구(SPEC §6.1.1 "많이 산 주식").
 * `내가 제일 많이 산 종목 뭐야?` 는 본인 기록 조회라 1인칭이 붙으면 비켜 준다.
 */
export function asksPopularityFollowing(message: string): boolean {
  if (asksOwnPastTrades(message)) return false;
  return includesAny(message, POPULARITY_SLOT) && includesAny(message, PAST_TRADE_SLOT);
}

/** 1인칭으로 자기가 산 것을 묻는 말. 추종 요구와 가른다. */
export function asksOwnPastTrades(message: string): boolean {
  return includesAny(message, FIRST_PERSON_SLOT) && includesAny(message, PAST_TRADE_SLOT);
}

/**
 * 질문이 투자 대상을 겨누는지. SPEC §6.1.4 는 비금융 대상을 고르는 요청은
 * 범위 밖, 실제 투자 판단을 요구하면 추천 차단이 우선이라고 정한다.
 * `노래 추천해 줘`(대상 없음)와 `방산 지금 사도 됨?`(대상 있음)을 가른다.
 */
export function targetsInvestmentDecision(message: string): boolean {
  return (
    includesAny(message, INVESTMENT_TARGET_SLOT) ||
    asksTradeDecision(message) ||
    asksPopularityFollowing(message) ||
    asksTargetPriceDecision(message)
  );
}
