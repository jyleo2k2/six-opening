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

/**
 * 가족 구성원. 짧은 낱말(`형`·`동생`)은 `형태`·`형식` 같은 말에 섞여 오탐하므로
 * 홑으로 넣지 않고, **소유격이 붙은 꼴만** 함께 둔다 — `우리 형이 뭐 샀는지`가
 * 가족 데이터 보호를 지나쳐 범위 밖으로 새던 자리다.
 */
export const FAMILY_MEMBER_SLOT = [
  "엄마",
  "아빠",
  "부모님",
  "부모",
  "보호자",
  "가족",
  "누나",
  "언니",
  "오빠",
  "우리형",
  "내형",
  "우리동생",
  "내동생",
] as const;

/** 본인 아닌 사람. 본인 기록 판정에서 빼는 데 쓴다. */
const OTHER_PERSON_SLOT = [...FAMILY_MEMBER_SLOT, "친구", "남의", "다른사람", "애들"] as const;

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

/**
 * 판단을 요구하는 어미. 어간 바로 뒤에 붙을 때만 인정한다.
 *
 * `됌`은 아이가 자주 내는 종성 오타이고(`머사면됌?`), `거야`는 가정법으로 감싼
 * 요구(`네가 어른이면 뭐 살 거야?`)가 지나가던 자리다. 어간과 붙어 있을 때만
 * 보므로 `주식은 어떻게 사는 거야?`(`사`와 `거야` 사이에 `는`이 낀다)는 걸리지 않는다.
 */
const DECISION_TAILS = [
  "도돼",
  "도되",
  "도됨",
  "도됌",
  "도될까",
  "도괜찮",
  "야돼",
  "야되",
  "야됨",
  "야됌",
  "야될까",
  "야해",
  "야하",
  "야할",
  "면돼",
  "면되",
  "면됌",
  "면될까",
  "면안",
  "까",
  "래",
  "거야",
] as const;

/**
 * 어간 × 어미의 곱. `사도돼`·`사도됨`·`살까`·`팔래`가 한 규칙에서 나온다.
 * 어간과 어미가 **붙어 있을 때만** 잡으므로 "생각해 볼까" 같은 말은 걸리지 않는다.
 */
export const TRADE_DECISION_PATTERNS: readonly string[] = TRADE_STEMS.flatMap((stem) =>
  DECISION_TAILS.map((tail) => `${stem}${tail}`),
);

/**
 * 추천 요구의 표기 변형. 낱말 목록은 **바르게 쓴 한 가지 표기**만 알아본다.
 * 아이는 오타를 내고(`츄천`), 영어를 섞고(`recommend`·`buy`), 은어를 쓴다(`가즈아`).
 * 실측에서 `삼성전자 츄천해줘`·`삼성전자 buy 해도 돼?`는 거절이 아니라 **회사 소개**로
 * 답했다 — 차단 낱말을 못 알아본 자리를 종목 사실 경로가 채웠기 때문이다.
 */
const RECOMMEND_VARIANT_SLOT = [
  "츄천",
  "추쳔",
  "추전해",
  "recommend",
  "buy",
  "가즈아",
  "가즈앙",
] as const;

/** 살 것을 가리키는 말. 아래 고르기 요구와 곱한다. */
const BUY_TARGET_SLOT = ["살거", "살것", "살종목", "살주식", "사야할"] as const;

/** 대신 골라 달라는 요구. */
const PICK_REQUEST_SLOT = ["알려", "골라", "정해", "말해", "추천", "찍어", "가르쳐"] as const;

/**
 * 우열을 정해 달라는 말. `제일좋은종목` 처럼 통째로 적은 목록은 `둘 중에 뭐가 더
 * 조아?` 를 놓쳤다. 좋다는 뜻의 낱말에 `더`·`어느`가 붙은 꼴만 본다 — `무슨 좋은
 * 제품 만들어?` 같은 회사 사실 질문을 삼키지 않기 위해서다.
 */
const SUPERIORITY_SLOT = [
  "더좋",
  "더조아",
  "더조은",
  "더나은",
  "더나아",
  "어느게좋",
  "어느쪽이좋",
  "어느게나",
] as const;

/**
 * 표기를 바꾼 추천 요구(SPEC §6.1.5). 뜻을 묻는 질문은 승인 용어 설명이므로 뺀다 —
 * `buy가 무슨 뜻이야?` 까지 막으면 과차단이다.
 */
export function asksRecommendationVariant(message: string): boolean {
  if (includesAny(message, DEFINITION_MARKERS)) return false;
  return includesAny(message, RECOMMEND_VARIANT_SLOT);
}

/** 살 것을 대신 골라 달라는 요구. `살 거 알려주는 거야` 처럼 역할극에 감싸도 같다. */
export function asksBuyTargetSelection(message: string): boolean {
  return includesAny(message, BUY_TARGET_SLOT) && includesAny(message, PICK_REQUEST_SLOT);
}

/** 둘을 견주어 우열을 정해 달라는 요구. */
export function asksSuperiorityComparison(message: string): boolean {
  return includesAny(message, SUPERIORITY_SLOT);
}

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
 * 1인칭과 기록 낱말의 거리를 제한한 형태. 공백이 지워진 뒤에는 낱말 경계가
 * 없어서 `내`·`나` 를 그냥 담으면 `안내`·`하나` 에 걸린다. 이 파일의 다른 슬롯과
 * 달리 근접 정규식을 쓰는 이유다(`PERSONAL_DATA_QUESTION` 과 같은 idiom).
 */
const OWN_TRADE_RECORD_QUESTION =
  /(?:내|제|나|저)[가-힣0-9]{0,6}(?:뭐샀|뭘샀|샀|산거|산게|산건|산종목|산주식|매수한|거래|기록|고른이유)/;

/**
 * 같은 낱말이라도 **값**이 아니라 **원리·위치**를 묻는 질문은 조회가 아니다.
 * `routing.ts` 의 `isPersonalDataQuestion` 이 쓰는 가드와 같은 취지이며, 아래
 * 본인 기록·손익 술어도 같은 가드를 통과해야 한다. 이게 없으면 "내 평가손익이랑
 * 수익률은 왜 숫자가 다르지?" 같은 개념 질문이 숫자 조회로 넘어간다.
 */
const CONCEPT_OR_LOCATION_MARKERS = [
  "계산",
  "원리",
  "기준",
  "통계",
  "무슨뜻",
  "무슨의미",
  "의미야",
  "차이",
  "왜",
  "이유",
  "다르지",
  "다를수",
  "반올림",
  "소수점",
  "오류",
  "일부러",
  "조작",
  "어디",
  "어떻게봐",
  "보면돼",
  "하는법",
  "확인하는법",
] as const;

/** 자기가 남긴 기록을 되짚는 말. 위 가드의 `왜`·`이유`에서 되살린다. */
const OWN_RECALL_MARKERS = [
  "기억",
  "왜샀",
  "왜산",
  "왜골랐",
  "왜담았",
  "적었",
  "적어둔",
  "남겼",
  "남긴",
  "썼는지",
] as const;

/** 값이 아니라 원리·위치를 묻는 질문인지. 되짚기 표현이 있으면 아니다. */
function asksMechanismOrLocation(message: string): boolean {
  if (includesAny(message, OWN_RECALL_MARKERS)) return false;
  if (/\d+(?:\.\d+)?%/.test(message)) return true;
  return includesAny(message, CONCEPT_OR_LOCATION_MARKERS);
}

/** 회사 사실을 묻는 형태. 본인 기록 판정이 삼키지 않게 가른다. */
const COMPANY_FACT_MARKERS = [
  "뭐하는회사",
  "무슨회사",
  "어떤회사",
  "뭐만들",
  "무엇을만들",
  "어떻게돈을벌",
  "어떻게벌",
] as const;

/**
 * 본인의 거래 기록을 되짚는 질문(SPEC §1.1 5번). `내기록`·`최근에뭐샀` 같은
 * 구절 목록은 "나 뭐 샀었지?"·"내가 왜 이거 샀는지 기억나?" 를 놓쳤다.
 */
export function asksOwnTradeRecords(message: string): boolean {
  if (includesAny(message, OTHER_PERSON_SLOT)) return false;
  if (includesAny(message, COMPANY_FACT_MARKERS)) return false;
  if (asksMechanismOrLocation(message)) return false;
  return OWN_TRADE_RECORD_QUESTION.test(message);
}

/** 견주는 상대. 자기 낮춤 표현과 곱해 비교로 인한 위축을 본다. */
const COMPARED_TO_SLOT = [...FAMILY_MEMBER_SLOT, "친구", "애들", "남들", "다른사람", "꼴찌", "순위"] as const;

/** 자기를 낮추는 말. SPEC §6.1.2 "순위 비교·자기비하". */
const SELF_DEPRECATION_SLOT = [
  "꼴찌",
  "제일낮",
  "가장낮",
  "내가낮",
  "나만낮",
  // "내가 왜 엄마보다 낮아?" — 1인칭과 낮춤말 사이에 비교 대상이 낀다.
  "보다낮",
  "보다못",
  "보다뒤",
  "나만못",
  "못하는것같",
  "못하는거같",
  "뒤처",
  "밀려",
  "졌",
  "지고있",
] as const;

/**
 * 남과 견주며 자기를 낮추는 말(SPEC §6.1.2). 성향·수익률은 성적이 아니라는
 * 안내가 필요한 자리다. `나만꼴찌` 처럼 통째로 적은 목록은 "엄마보다 왜 내가
 * 꼴찌야?"·"내가 왜 엄마보다 낮아?" 를 놓쳤다.
 */
export function signalsSelfDeprecation(message: string): boolean {
  if (!includesAny(message, ["내가", "나는", "나만", "제가", "내", "나"])) return false;
  if (!includesAny(message, COMPARED_TO_SLOT)) return false;
  return includesAny(message, SELF_DEPRECATION_SLOT);
}

/** 삶 전반을 가리키는 말. 낮은 기분 표현과 곱해 위기 신호를 본다. */
const LIFE_CONTEXT_SLOT = ["사는게", "살기", "인생", "요즘", "아무것도", "다포기", "그냥다"] as const;

/** 낮은 기분 표현. 단독으로는 대상이 앱·게임일 수 있어 위 맥락과 곱한다. */
const LOW_MOOD_SLOT = [
  "재미없",
  "재미가없",
  "의욕없",
  "의욕이없",
  "하기싫",
  "하기가싫",
  "지쳐",
  "지친",
  "우울",
  "무기력",
  "힘이없",
] as const;

/**
 * 위기로 이어질 수 있는 낮은 기분 표현(SPEC §6.1.2 위기 가능 표현).
 * `죽고싶`·`다포기하고싶` 같은 명시 표현만 담은 목록은 "사는 게 재미없어"·
 * "요즘 아무것도 하기 싫어" 를 놓쳤다. 대상이 삶일 때만 잡아 "이 게임 재미없어"
 * 와 가른다.
 */
export function signalsLowMood(message: string): boolean {
  return includesAny(message, LIFE_CONTEXT_SLOT) && includesAny(message, LOW_MOOD_SLOT);
}

const REPEAT_SLOT = ["계속", "자꾸", "매번", "하루종일", "몇번씩", "틈만나면"] as const;
const CHECK_SLOT = ["확인", "들여다", "체크", "쳐다", "보게돼", "보게된", "들어가보"] as const;
/** 사용법·규칙을 묻는 형태. 아래 반복 확인 판정이 삼키지 않게 가른다. */
const HOWTO_MARKERS = ["어떻게", "어디서", "방법", "하는법", "의무", "필수", "규칙"] as const;

/**
 * 스스로 멈추지 못한다는 표현. 반복 확인이 **불안 신호인지 절차 질문인지**를
 * 가른다. "아카이브를 매번 확인하는 게 의무야?" 는 규칙 질문이고,
 * "계속 확인하게 돼" 는 정서 지원이 필요한 말이다.
 */
const INVOLUNTARY_MARKERS = ["게돼", "게된", "게되", "버리게", "멈출수없", "못참", "자꾸보"] as const;
const WORRY_MARKERS = ["불안", "무서", "초조", "걱정", "쫄"] as const;

/**
 * 불안해서 반복해 확인하는 신호(SPEC §6.1.2 "계속 확인하게 돼").
 * `계속들여다보` 처럼 활용까지 통째로 적은 목록은 SPEC 원문조차 놓쳤다.
 */
export function asksRepeatedChecking(message: string): boolean {
  if (includesAny(message, HOWTO_MARKERS)) return false;
  if (!includesAny(message, REPEAT_SLOT) || !includesAny(message, CHECK_SLOT)) return false;
  return includesAny(message, INVOLUNTARY_MARKERS) || includesAny(message, WORRY_MARKERS);
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
    asksTargetPriceDecision(message) ||
    // `살 거 알려줘` 는 대상이 분명한 매수 판단 요구다. 역할극(`우리 게임하자…`)에
    // 감싸면 `게임` 한 낱말 때문에 콘텐츠 거절로 새던 자리다.
    asksBuyTargetSelection(message)
  );
  // 표기 변형(`recommend`·`가즈아`)은 여기 넣지 않는다. `노래 추천해 줘` 처럼
  // 대상이 비금융이면 SPEC §6.1.4 대로 범위 밖 안내가 맞다.
}
