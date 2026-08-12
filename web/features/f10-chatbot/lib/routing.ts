import { findChatbotKnowledge } from "../../../shared/data/chatbot-knowledge";
import { STOCKS } from "../../../shared/data/stocks";
import type {
  ChatContext,
  ExplainScript,
  ChatUiAction,
  ProactiveSignal,
  ReadOnlyChatToolName,
  StockFactTopic,
} from "../../../shared/types/chatbot";

export type { ChatContext, ProactiveSignal } from "../../../shared/types/chatbot";

export type ChatRoute =
  | "faq"
  | "context"
  | "tool"
  | "refusal"
  | "safety"
  | "outOfScope"
  | "fallback";

export type ChatIntent =
  | "financial_concept"
  | "service_help"
  | "stock_facts"
  | "own_records"
  | "own_profile"
  | "own_archive"
  | "safety"
  | "general_allowed";

export type ChatReply = {
  route: ChatRoute;
  intent: ChatIntent;
  text: string;
  steps: readonly string[];
  suggestedQuestions?: string[];
  uiAction?: ChatUiAction;
  tool?: ReadOnlyChatToolName;
  explainScript?: ExplainScript;
  stockFact?: {
    stockId: `KRX:${string}`;
    topic: StockFactTopic;
  };
};

type RecommendationKind =
  | "selection"
  | "prediction"
  | "timing"
  | "sizing"
  | "risk"
  | "recovery"
  | "social"
  | "event"
  | "metric";

type UnsafeKind =
  | "crisis"
  | "credential"
  | "personalInfo"
  | "familyData"
  | "proxyAction"
  | "frustration"
  | "familyPressure"
  | "comparison"
  | "anxiety"
  | "impulsiveTrade"
  | "ethicalDistress";

const SELECTION_PATTERNS = [
  "종목사",
  "무슨종목",
  "무슨주식",
  "뭐사",
  "뭘사",
  "뭐살지",
  "뭘살지",
  "뭐살건데",
  "뭘살건데",
  "골라",
  "고를",
  "고르면",
  "찍어",
  "뽑아",
  "대신결정",
  "어떤종목",
  "어느회사",
  "나라면",
  "어디에넣",
  "어디다넣",
  "어디에투자",
  "투자할래",
  "사라고",
  "사줘",
  "사주는기능",
  "살종목",
  "살만한",
  "사도돼",
  "사도되",
  "사도괜찮",
  "사야돼",
  "사야되",
  "사야됨",
  "사야해",
  "사야할까",
  "사야할지",
  "사면돼",
  "사면되",
  "사는것이괜찮",
  "사는게괜찮",
  "사면안",
  "살래",
  "사겠어",
  "매수해야",
  "매수할래",
  "더사",
  "안사야",
  "나은선택",
  "뭐가나아",
  "뭐가낫",
  "뭐가좋아",
  "어느게나아",
  "어느쪽을",
  "종목추천",
  "주식추천",
  "추천해",
  "추천좀",
  "추천ᄀ",
];
const PREDICTION_PATTERNS = [
  "오를까",
  "오르냐",
  "오를지",
  "오를거",
  "오를것",
  "오른대",
  "상승할지",
  "내릴까",
  "내려갈까",
  "떨어질까",
  "떨어지면어떡",
  "반등할",
  "반등확률",
  "떡상",
  "튀는종목",
  "튈종목",
  "수익낼수있을까",
  "수익날까",
  "수익나냐",
  "벌까",
  "벌가능성",
  "수익률전망",
  "예상해",
  "예측해",
  "예측가능",
  "전망해",
  "전망알려",
  "얼마까지오",
  "몇원될",
  "목표가알려",
  "목표가정해",
  "목표가찍",
  "목표가가얼마",
  "손절가알려",
  "손절가정해",
  "손절가찍",
];
const VAGUE_FORECAST_PATTERNS = ["어때", "어떨", "괜찮을까", "잘갈까"];
const FUTURE_PATTERNS = [
  "내일",
  "낼",
  "이번주",
  "다음주",
  "금요일",
  "오늘안",
  "다음달",
  "시즌끝",
  "미리",
];
const FUTURE_OUTCOME_PATTERNS = [
  "오를",
  "오르",
  "상승",
  "내릴",
  "내려",
  "떨어",
  "반등",
  "떡상",
  "튀",
  "수익",
  "벌",
  "이득",
  "가능성",
  "확률",
  "높아질",
  "인기있을",
];
const TIMING_PATTERNS = [
  "언제사",
  "언제팔",
  "지금사",
  "지금팔",
  "오늘팔",
  "바로사",
  "바로팔",
  "팔아야",
  "매수해",
  "매도해",
  "사는게좋",
  "파는게좋",
  "살까",
  "팔까",
  "보유할까",
  "계속들고",
  "다시안살",
  "다시사",
  "따라사",
  "따라살",
  "따라갈까",
  "존버",
  "털어야",
  "지금들어가",
  "따라들어가",
  "들어가도돼",
  "들어가도되",
  "들어갈까",
  "진입할까",
  "발표전에사",
  "사면늦",
  "언제누르면",
  "들고갈까",
  "가지고있어",
  "유지할까",
  "정리할까",
  "빼야",
  "매도할까",
  "매수할까",
  "팔아줘",
  "탑승할까",
];
const SIZING_PATTERNS = [
  "몇주사",
  "몇개사",
  "몇주담",
  "매수수량을정해",
  "매수수량정해",
  "수량을정해",
  "비중을정해",
  "비중얼마",
  "비중몇",
  "몇퍼센트",
  "몇프로",
  "몰빵",
  "전액넣",
  "얼마넣",
  "돈전부어느",
];
const RISK_AND_POPULARITY_PATTERNS = [
  "안망",
  "손해안보",
  "손해보지않",
  "안떨어지는",
  "가장안전",
  "제일안전",
  "더안전",
  "덜위험",
  "덜무서",
  "덜신경",
  "안정적인종목",
  "제일인기",
  "가장인기",
  "인기많은",
  "인기있는",
  "많이산종목",
  "많이담은",
  "제일많이사",
  "다들산",
  "제일많이오를",
  "가장많이오를",
  "제일크게오를",
  "제일벌",
  "수익좋은종목",
  "제일효율적",
  "제일나아",
  "좋은종목",
  "유망",
];
const LOSS_RECOVERY_PATTERNS = [
  "손실본거다시채우",
  "손해본거다시채우",
  "손실만회",
  "손실을만회",
  "손해만회",
  "손해를만회",
  "본전찾",
  "손실복구",
];
const SOCIAL_PATTERNS = [
  "친구",
  "엄마",
  "아빠",
  "부모님",
  "가족순위",
  "단톡방",
  "사람들",
  "유튜브주식고수",
  "유튜브",
  "커뮤니티",
  "커뮤",
  "카톡방",
  "형이",
  "누나가",
  "오빠가",
  "언니가",
];
const COMPETITION_PATTERNS = [
  "추월",
  "이기",
  "따라잡",
  "수익률높이",
  "안혼날",
  "자랑",
  "그대로따라",
];
const EVENT_PATTERNS = [
  "뉴스",
  "컴백",
  "업데이트",
  "국방예산",
  "국제정세",
  "신작",
  "발표전",
  "이익이늘면",
  "실적발표",
  "공시",
  "배당",
  "금리",
  "환율",
];
const EVENT_DECISION_PATTERNS = [
  "주가에바로영향",
  "주가영향",
  "사야",
  "사면",
  "오를",
  "이득",
  "수익",
  "들어가",
  "팔",
  "매수",
  "매도",
];
const METRIC_PATTERNS = [
  "per",
  "pbr",
  "eps",
  "roe",
  "지표",
  "통계상",
  "내데이터",
  "최근수치",
  "거래량",
  "차트보고",
];
const CREDENTIAL_PATTERNS = [
  "비밀번호",
  "비번",
  "패스워드",
  "로그인암호",
  "주문암호",
  "핀번호",
  "pin번호",
  "인증번호",
];
const PERSONAL_IDENTIFIER_PATTERNS = [
  "주민번호",
  "주민등록번호",
  "비밀번호",
  "전화번호",
  "휴대폰번호",
  "전번",
  "계좌번호",
  "통장번호",
  "생년월일",
  "학교이름",
  "학교명",
  "이메일",
  "sns아이디",
];
const CRISIS_PATTERNS = [
  "자해",
  "죽고싶",
  "죽어버리고싶",
  "살기싫",
  "사라지고싶",
  "없어지고싶",
  "해치고싶",
  "끝내고싶",
  "다포기하고싶",
  "전부포기하고",
  "모든걸포기하고싶",
  "그만살고싶",
  "내가없어졌으면",
  "모든게끝났으면",
];
const FAMILY_MEMBER_PATTERNS = ["엄마", "아빠", "부모님", "부모", "가족"];
const FAMILY_DATA_PATTERNS = [
  "수익률",
  "성향",
  "기록",
  "종목",
  "뭐샀",
  "뭘샀",
  "산이유",
  "거래내역",
  "투자내역",
  "보유",
];
const FAMILY_DATA_ACCESS_PATTERNS = [
  "알려",
  "몇인데",
  "보여",
  "볼수",
  "말해",
  "비교해",
  "뭐샀",
  "합칠",
  "찾아",
  "읽",
  "똑같이",
];
const PROXY_ACTION_PATTERNS = [
  "친구폰으로내주문",
  "친구가내계정으로주문",
  "대신주문",
  "주문대신",
  "대신눌러",
  "대신매수",
  "대신매도",
  "대신팔",
  "한도풀어",
  "기록잠가",
];
const IMPULSIVE_TRADE_PATTERNS = [
  "다팔아버릴까",
  "다팔고끝낼까",
  "전부팔아버릴까",
  "싹팔아버릴까",
  "모두팔아버릴까",
  "전량매도해버릴까",
];
const ETHICAL_DISTRESS_PATTERNS = [
  "전쟁으로이익",
  "전쟁으로돈",
  "윤리적으로",
  "죄책감",
  "도덕적으로",
  "돈버는기분이라찜찜",
];
const FAMILY_PRESSURE_PATTERNS = [
  "혼나",
  "혼날",
  "왜자꾸하래",
  "또하라해서",
  "말해야해",
  "계속평가해서",
  "빨리누르라고",
  "수익률얘기",
  "빨리정하라",
  "점수처럼비교",
  "순위로뭐라",
  "비교좀그만",
  "수익률로뭐라",
  "수익률이낮다고",
  "투자자체가싫어",
  "그냥지쳐",
  "수익률들이밀",
  "계속닦달",
  "부담",
  "압박됨",
  "속상",
  "숨막",
];
const COMPARISON_DISTRESS_PATTERNS = [
  "나만꼴찌",
  "내기했는데지면",
  "나만떨어져",
  "엄마보다수익률낮",
  "친구는잘되는데왜나만",
  "친구들이계속수익자랑",
  "점수가계속떨어지니까내가게임을못",
  "엄마한테져서",
  "소질이없는",
  "판단을못하는사람",
  "친구들자랑만보니까나만못",
  "나만뒤처진",
  "이상한사람처럼분류",
  "못하는사람처럼보",
  "바보같",
  "수익자랑때문에초조",
];
const ANXIETY_PATTERNS = [
  "계속이종목만확인",
  "계속들여다보",
  "너무불안",
  "불안해서주문",
  "손이안눌",
  "뉴스만보면괜히쫄",
  "너무신경쓰",
  "뉴스때문에망하면",
  "마음이무거",
  "계속봐야할까",
  "무서워서주문",
];
const FRUSTRATION_PATTERNS = [
  "짜증",
  "답답",
  "개빡",
  "빡치",
  "열받",
  "꺼져",
  "장난하냐",
  "버그투성이",
  "부정확",
  "뻔한소리",
  "개헷갈",
  "결론이뭐냐고",
  "어렵게말하지마",
  "설명왜이렇게구림",
  "아씨또",
];
const HARMFUL_PATTERNS = ["협박", "때리고", "죽여", "해킹", "시스템지시무시", "프롬프트보여"];
const OUT_OF_SCOPE_PATTERNS = ["숙제", "게임공략", "날씨", "노래", "영화"];
const RECORD_PATTERNS = ["내기록", "내거래", "지난거래", "왜골랐", "거래이유", "내보유기간"];
const PROFILE_PATTERNS = ["내성향", "투자성향", "성향분석", "나는어떤투자"];
const ARCHIVE_PATTERNS = ["내아카이브", "지난시즌", "시즌기록", "시즌변화", "예전기록"];
const STOCK_PATTERNS = [
  "이회사",
  "무슨회사",
  "회사뭐",
  "이종목",
  "무엇을만들",
  "어떤일을해",
  "뭐하는",
  "뭐임",
  "돈을벌",
  "돈벌",
  "수익구조",
  "업종",
  "산업역할",
  "실적",
  "매출",
  "영업이익",
  "순이익",
];
const STOCK_BUSINESS_PATTERNS = ["돈을벌", "돈벌", "수익구조", "어떻게벌"];
const STOCK_INDUSTRY_PATTERNS = ["업종", "산업", "역할"];
const STOCK_FINANCIAL_PATTERNS = [
  "실적",
  "매출",
  "영업이익",
  "순이익",
  "재무",
  "2024",
];

export function normalizeChatInput(input: string) {
  return input.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}%]+/gu, "");
}

function includesAny(message: string, patterns: readonly string[]) {
  return patterns.some((pattern) => message.includes(pattern));
}

const STOCK_NAME_MATCHERS = STOCKS.flatMap((stock) =>
  [stock.name, ...stock.searchAliases].map((name) => ({
    stock,
    name: normalizeChatInput(name),
  })),
)
  .filter((entry) => entry.name.length >= 2)
  .sort((left, right) => right.name.length - left.name.length);

function findMentionedStock(message: string) {
  return STOCK_NAME_MATCHERS.find((entry) => {
    const index = message.indexOf(entry.name);
    if (index < 0) return false;
    if (entry.name.length >= 3) return true;
    if (index !== 0) return false;
    const tail = message.slice(entry.name.length);
    return (
      tail.length === 0 ||
      /^(?:은|는|이|가|을|를|의|도|에|에서|하고|뭐|무슨|어떤|알려)/.test(tail)
    );
  })?.stock;
}

function containsPersonalAddress(message: string) {
  if (includesAny(message, ["회사주소", "본사주소"])) return false;
  return (
    includesAny(message, ["내주소", "우리집주소", "집주소"]) ||
    /주소(?:를|도|랑|은|가)?(?:말|쓰|입력|알려|적|맞혀|보내|까|남아)/.test(message)
  );
}

function findUnsafeKind(message: string): UnsafeKind | null {
  if (includesAny(message, CRISIS_PATTERNS)) return "crisis";
  if (includesAny(message, CREDENTIAL_PATTERNS)) return "credential";
  if (
    includesAny(message, PERSONAL_IDENTIFIER_PATTERNS) ||
    containsPersonalAddress(message)
  ) {
    return "personalInfo";
  }

  const familyComparisonHelp =
    includesAny(message, ["가족비교", "비교화면", "엄마랑비교", "아빠랑비교"]) &&
    includesAny(message, ["어떻게", "어디", "방법", "화면"]);
  const familyDataRequest =
    !familyComparisonHelp &&
    includesAny(message, FAMILY_MEMBER_PATTERNS) &&
    includesAny(message, FAMILY_DATA_PATTERNS) &&
    includesAny(message, FAMILY_DATA_ACCESS_PATTERNS);
  const ownDataSharing =
    (message.includes("내성향") &&
      message.includes("친구") &&
      includesAny(message, ["공개", "보여", "보임"])) ||
    (message.includes("손해") && message.includes("엄마") && message.includes("보여도"));
  if (familyDataRequest || ownDataSharing) return "familyData";

  const proxyAction =
    includesAny(message, PROXY_ACTION_PATTERNS) ||
    /(?:네가|키웅이가|내대신).{0,10}(?:주문|매수|매도|버튼).{0,8}(?:해줘|눌러)/.test(
      message,
    );
  if (proxyAction) return "proxyAction";

  const impulsiveTrade =
    includesAny(message, IMPULSIVE_TRADE_PATTERNS) ||
    /(?:다|전부|싹|모두|전량).{0,8}(?:팔|매도|정리).{0,8}(?:할까|버릴까|끝낼까|해버)/.test(
      message,
    );
  if (impulsiveTrade) return "impulsiveTrade";

  const ethicalDistress =
    includesAny(message, ETHICAL_DISTRESS_PATTERNS) ||
    (message.includes("전쟁") &&
      includesAny(message, ["이익", "돈벌", "수익"]) &&
      includesAny(message, ["찜찜", "불편", "마음", "맞나", "옳"]));
  if (ethicalDistress) return "ethicalDistress";

  const familyPressure =
    (includesAny(message, FAMILY_PRESSURE_PATTERNS) &&
      (includesAny(message, FAMILY_MEMBER_PATTERNS) ||
        includesAny(message, ["혼나", "왜자꾸하래", "압박", "부담"]))) ||
    (includesAny(message, FAMILY_MEMBER_PATTERNS) &&
      includesAny(message, [
        "짜증",
        "화나",
        "열받",
        "개빡",
        "스트레스",
        "지쳐",
        "재촉",
        "닦달",
        "평가",
      ]));
  if (familyPressure && !includesAny(message, SIZING_PATTERNS)) {
    return "familyPressure";
  }

  const comparisonDistress =
    includesAny(message, COMPARISON_DISTRESS_PATTERNS) ||
    (message.includes("나만") &&
      includesAny(message, ["못", "뒤처", "꼴찌", "떨어", "바보"])) ||
    (includesAny(message, ["친구", "친구들", "애들"]) &&
      includesAny(message, ["수익자랑", "자랑"]) &&
      includesAny(message, ["스트레스", "초조", "불안", "짜증"]));
  if (comparisonDistress) return "comparison";

  const anxiety =
    includesAny(message, ANXIETY_PATTERNS) ||
    (includesAny(message, ["주문", "종목", "뉴스", "투자화면"]) &&
      includesAny(message, ["불안", "무서", "초조", "쫄", "마음이무거", "자꾸확인"]));
  const explicitPrediction =
    includesAny(message, PREDICTION_PATTERNS) ||
    (includesAny(message, FUTURE_PATTERNS) &&
      includesAny(message, FUTURE_OUTCOME_PATTERNS));
  if (anxiety && !explicitPrediction) return "anxiety";
  if (includesAny(message, FRUSTRATION_PATTERNS)) return "frustration";
  return null;
}

function findRecommendationKind(message: string): RecommendationKind | null {
  const selection = includesAny(message, SELECTION_PATTERNS);
  const prediction =
    includesAny(message, PREDICTION_PATTERNS) ||
    /(?:목표가|손절가)(?:를|가)?(?:알려|정해|찍|얼마)/.test(message) ||
    (includesAny(message, FUTURE_PATTERNS) &&
      (includesAny(message, FUTURE_OUTCOME_PATTERNS) ||
        includesAny(message, VAGUE_FORECAST_PATTERNS)));
  const timing = includesAny(message, TIMING_PATTERNS);
  const risk = includesAny(message, RISK_AND_POPULARITY_PATTERNS);

  const amountAllocation = /\d+(?:만)?원.*(?:어디|얼마|전부|넣)/.test(message);
  const shareQuantity = /(?:\d+|한)주(?:만)?.*(?:사|담|매수)/.test(message);

  if (includesAny(message, LOSS_RECOVERY_PATTERNS)) return "recovery";
  if (includesAny(message, SIZING_PATTERNS) || amountAllocation || shareQuantity) {
    return "sizing";
  }
  if (
    includesAny(message, EVENT_PATTERNS) &&
    (includesAny(message, EVENT_DECISION_PATTERNS) || selection || prediction || timing)
  ) {
    return "event";
  }
  if (
    includesAny(message, SOCIAL_PATTERNS) &&
    (selection ||
      prediction ||
      timing ||
      includesAny(message, COMPETITION_PATTERNS) ||
      message.includes("처럼하면나도잘할"))
  ) {
    return "social";
  }
  if (includesAny(message, METRIC_PATTERNS) && (selection || prediction || timing)) {
    return "metric";
  }
  if (timing) return "timing";
  if (prediction) return "prediction";
  if (risk) return "risk";
  if (selection) return "selection";
  return null;
}

function findStockFactTopic(message: string): StockFactTopic {
  if (includesAny(message, STOCK_FINANCIAL_PATTERNS)) return "financial";
  if (includesAny(message, STOCK_BUSINESS_PATTERNS)) return "business";
  if (includesAny(message, STOCK_INDUSTRY_PATTERNS)) return "industry";
  return "company";
}

function reply(
  route: ChatRoute,
  intent: ChatIntent,
  text: string,
  steps: readonly string[] = [],
  extras: Partial<
    Pick<
      ChatReply,
      "suggestedQuestions" | "tool" | "uiAction" | "explainScript" | "stockFact"
    >
  > = {},
): ChatReply {
  return { route, intent, text, steps, ...extras };
}

function unsafeReply(kind: UnsafeKind, message: string): ChatReply {
  let credentialText =
    "비밀번호는 채팅에 쓰지 않아도 돼. 나는 비밀번호를 기억하거나 로그인·주문에 사용하지 않아.";
  if (includesAny(message, ["까먹", "잊었"])) {
    credentialText =
      "비밀번호는 채팅에 쓰지 말고 앱의 공식 로그인 화면에서 다시 설정해 줘. 나는 비밀번호를 확인하거나 알려줄 수 없어.";
  } else if (includesAny(message, ["sns", "친구수익"])) {
    credentialText =
      "SNS 아이디나 비밀번호는 채팅에 쓰지 않아도 돼. 나는 그 정보로 친구의 계정이나 수익 인증을 대신 찾아보지 않아.";
  } else if (includesAny(message, ["대신", "한도풀", "기록잠가"])) {
    credentialText =
      "비밀번호는 채팅에 쓰지 않아도 돼. 나는 비밀번호를 받아 주문하거나 한도·기록 권한을 바꾸지 않아.";
  } else if (/(?:비번|비밀번호)\d/.test(message)) {
    credentialText =
      "방금 적은 번호는 답변에서 다시 보여주지 않을게. 실제 비밀번호라면 앱의 공식 화면에서 바로 바꿔 줘.";
  } else if (message.includes("요구하면이상")) {
    credentialText =
      "맞아, 모의투자 채팅이 비밀번호를 요구하면 입력하지 말고 화면을 닫아 줘. 나는 비밀번호를 받거나 기억하지 않아.";
  } else if (message.includes("기록")) {
    credentialText =
      "거래 기록을 확인하려고 비밀번호나 계좌번호를 보낼 필요는 없어. 나는 로그인 정보 없이 네게 허용된 본인 기록만 확인해.";
  }

  let personalInfoText =
    "계좌번호나 집 주소 같은 개인정보는 채팅에 쓰지 않아도 돼. 앱의 공식 화면에서만 보호자와 함께 확인해 줘.";
  if (message.includes("친구한테보내")) {
    personalInfoText =
      "계좌번호는 친구에게 보내지 않는 게 안전해. 이미 보냈다면 믿을 수 있는 어른과 공식 금융사에 바로 알려 줘.";
  } else if (message.includes("숨겨")) {
    personalInfoText =
      "주소나 계좌번호는 채팅에 적지 말아 줘. 나는 개인정보를 숨기거나 가족의 공개 권한을 대신 바꾸지 않아.";
  } else if (
    message.includes("계좌번호") &&
    includesAny(message, FAMILY_MEMBER_PATTERNS)
  ) {
    personalInfoText =
      "가족의 계좌번호도 채팅에 적거나 대신 조회하면 안 돼. 서로 동의한 비교 정보는 가족 화면에서 직접 확인해 줘.";
  } else if (message.includes("순위")) {
    personalInfoText =
      "계좌번호를 알려줘도 순위나 점수를 바꿀 수 없어. 개인정보는 적지 말고 리그 규칙에서 계산 방식을 확인해 줘.";
  } else if (includesAny(message, ["실제계좌", "증권계좌"])) {
    personalInfoText =
      "계좌번호를 채팅에 입력해도 실제 계좌와 연결되지 않아. 실제 금융 정보는 앱의 공식 화면에서만 확인해 줘.";
  } else if (includesAny(message, ["선물", "굿즈", "보너스", "실물상품"])) {
    personalInfoText =
      "주소나 계좌번호를 채팅에 적어도 선물이나 모의투자금을 주지 않아. 공식 이벤트인지는 보호자와 앱 안내에서 확인해 줘.";
  } else if (message.includes("가족팀")) {
    personalInfoText =
      "주소나 학교 이름으로 가족 팀을 찾지 않아. 가족 초대는 보호자와 앱의 공식 화면에서 확인해 줘.";
  }

  let familyDataText =
    "나는 엄마나 아빠의 수익률·종목·기록을 대신 조회하지 않아. 서로 공개에 동의한 내용은 가족 비교 화면에서 직접 확인할 수 있어.";
  if (message.includes("손해") && message.includes("보여도")) {
    familyDataText =
      "손익 기록의 공개 범위는 가족 화면에서 확인할 수 있어. 이 채팅의 질문 원문은 엄마에게 대신 보내지 않아.";
  } else if (message.includes("친구") && includesAny(message, ["공개", "보여", "보임"])) {
    familyDataText =
      "네 성향 결과를 친구에게 자동으로 공개하지 않아. 공개 범위가 궁금하면 가족 비교 화면의 안내를 확인해 줘.";
  } else if (message.includes("누가더잘")) {
    familyDataText =
      "나는 부모님의 성향 데이터를 가져오거나 누가 더 잘하는지 점수를 매기지 않아. 성향은 실력이나 성적이 아니라 투자 스타일을 돌아보는 기록이야.";
  } else if (message.includes("똑같이")) {
    familyDataText =
      "나는 엄마의 보유 종목을 채팅에서 알려주거나 그대로 따라 사라고 하지 않아. 서로 공개한 기록은 가족 화면에서 직접 확인할 수 있어.";
  }

  let frustrationText =
    "내 답변이 도움이 되지 않아 답답했구나. 궁금한 부분 하나만 골라 주면 더 짧게 다시 설명할게.";
  if (message.includes("증권사직원인척")) {
    frustrationText =
      "답답하게 느꼈구나. 나는 증권사 직원이 아니라 금융 기초와 이 서비스 사용법을 설명하는 AI 도우미야.";
  } else if (includesAny(message, ["숫자", "금액", "계산"])) {
    frustrationText =
      "숫자가 맞지 않아 답답했구나. 화면의 수량과 가격부터 하나씩 다시 확인할 수 있어.";
  } else if (includesAny(message, ["주문", "취소", "한도"])) {
    frustrationText =
      "주문이 뜻대로 되지 않아 답답했구나. 매매를 재촉하지 않고 어디에서 막혔는지 한 단계씩 확인할 수 있어.";
  }

  const anxietyText = includesAny(message, ["뉴스", "마음이무거"])
    ? "뉴스를 계속 봐서 마음이 불편하거나 무거웠구나. 지금은 투자 화면과 뉴스에서 잠시 벗어나도 돼."
    : "계속 확인하거나 주문을 눌러야 할 것 같아 불안했구나. 지금은 주문하지 않고 화면을 잠시 닫아도 돼.";

  const alternatives: Record<
    UnsafeKind,
    { text: string; steps: readonly string[]; questions: string[] }
  > = {
    crisis: {
      text: "지금 혼자 견디지 않아도 돼. 먼저 네가 지금 안전한지 알려 줘. 급하게 위험하면 가까운 어른이나 112·119에 바로 도움을 요청해 줘.",
      steps: ["안전 확인"],
      questions: ["지금은 안전해", "도움이 필요해"],
    },
    credential: {
      text: credentialText,
      steps: ["인증정보 보호 안내"],
      questions: ["키웅이가 뭘 도와줘?", "주문 전에 뭘 확인해?"],
    },
    personalInfo: {
      text: personalInfoText,
      steps: ["개인정보 보호 안내"],
      questions: ["키웅이가 뭘 도와줘?", "모의투자 리그 규칙 알려줘"],
    },
    familyData: {
      text: familyDataText,
      steps: ["가족 데이터 보호 안내"],
      questions: ["가족 비교는 어떻게 봐?", "내 거래 기록 보여줘"],
    },
    proxyAction: {
      text: "나는 다른 사람 대신 주문하거나 주문 버튼을 누를 수 없어. 로그인 정보를 나누지 말고 네 화면에서 주문 내용을 직접 확인해 줘.",
      steps: ["대리 행동 차단"],
      questions: ["매수 어떻게 해?", "주문 전에 뭘 확인해?"],
    },
    frustration: {
      text: frustrationText,
      steps: ["서비스 불편 지원"],
      questions: includesAny(message, ["숫자", "금액", "계산"])
        ? ["예상 금액이 뭐야?", "수익률이 뭐야?"]
        : includesAny(message, ["주문", "취소", "한도"])
          ? ["주문 전에 뭘 확인해?", "매수 어떻게 해?"]
          : ["키웅이가 뭘 도와줘?", "PER이 뭐야?"],
    },
    familyPressure: {
      text: "부모님 반응이 걱정되거나 누군가 계속 재촉해서 부담스러웠구나. 수익률과 순위는 네 실력이나 성적표가 아니며, 지금은 화면을 닫고 믿을 수 있는 어른에게 부담된다고 말해도 돼.",
      steps: ["가족 압박 지원"],
      questions: ["수익률이 뭐야?", "내 거래 기록 보여줘"],
    },
    comparison: {
      text: "다른 사람의 수익이나 순위와 비교돼 속상했구나. 한 번의 결과나 성향 숫자는 네 실력이나 사람의 가치를 정하는 점수가 아니야.",
      steps: ["비교 스트레스 지원"],
      questions: ["내 성향 결과 알려줘", "내 거래 기록 보여줘"],
    },
    anxiety: {
      text: anxietyText,
      steps: ["불안 지원"],
      questions: ["변동성이 뭐야?", "내 거래 기록 보여줘"],
    },
    impulsiveTrade: {
      text: "화가 난 상태에서 전부 팔지, 계속 가질지를 내가 정해 줄 수는 없어. 지금은 주문을 누르지 말고 화면을 닫은 뒤 네가 처음 남긴 이유를 나중에 다시 봐도 돼.",
      steps: ["충동 매매 중단"],
      questions: ["내 거래 기록 보여줘", "매도는 무슨 뜻이야?"],
    },
    ethicalDistress: {
      text: "전쟁과 투자 이야기가 불편하게 느껴졌구나. 무엇이 마음에 걸리는지 네 기준을 기록할 수 있지만, 내가 옳고 그름이나 매매 결론을 대신 정하지는 않아.",
      steps: ["윤리 고민 지원"],
      questions: ["투자 근거는 뭐야?", "위험이 뭐야?"],
    },
  };
  const alternative = alternatives[kind];
  return reply("safety", "safety", alternative.text, alternative.steps, {
    suggestedQuestions: alternative.questions,
  });
}

function recommendationReply(
  kind: RecommendationKind,
  message: string,
  context: ChatContext,
) {
  const mentionedStock = findMentionedStock(message);
  const contextStock =
    context.screen === "stock" || context.screen === "order"
      ? STOCKS.find((stock) => stock.id === context.stockId)
      : undefined;
  const stock = mentionedStock ?? contextStock;
  const companyQuestions = stock
    ? [`${stock.name}, 어떤 회사야?`, `${stock.name}, 어떻게 돈을 벌어?`]
    : ["종목 검색은 어떻게 해?", "분산투자가 뭐야?"];
  const alternatives: Record<
    RecommendationKind,
    { text: string; steps: readonly string[]; questions: string[] }
  > = {
    selection: {
      text: "특정 종목을 고르거나 대신 결정해 줄 수는 없어. 대신 회사가 하는 일과 돈을 버는 방식은 함께 볼 수 있어. 🐻",
      steps: ["종목 선택 차단", "회사 사실 대안"],
      questions: companyQuestions,
    },
    prediction: {
      text: "미래 가격이나 수익을 미리 계산해 줄 수는 없어. 대신 회사가 하는 일과 가격이 움직이는 뜻은 함께 볼 수 있어. 🐻",
      steps: ["가격 예측 차단", "변동성 대안"],
      questions: stock
        ? [`${stock.name}, 어떻게 돈을 벌어?`, "변동성이 뭐야?"]
        : ["차트가 뭐야?", "변동성이 뭐야?"],
    },
    timing: {
      text: "언제 사고팔거나 계속 보유할지는 대신 정해 줄 수 없어. 대신 네가 남긴 거래 이유와 주문 전 확인 항목은 같이 볼 수 있어. 🐻",
      steps: ["매매 시점 차단", "본인 기록 대안"],
      questions: ["내 거래 기록 보여줘", "주문 전에 뭘 확인해?"],
    },
    sizing: {
      text: includesAny(message, SOCIAL_PATTERNS)
        ? "다른 사람을 이기거나 혼나지 않기 위한 매수 수량은 정해 줄 수 없어. 대신 화면의 예상 금액과 주문 내용을 차분히 확인할 수 있어. 🐻"
        : "몇 주를 사거나 돈을 얼마나 넣을지는 대신 정해 줄 수 없어. 대신 화면의 예상 금액과 주문 확인 방법은 알려줄 수 있어. 🐻",
      steps: ["매수 수량 차단", "주문 계산 대안"],
      questions: ["예상 금액이 뭐야?", "주문 전에 뭘 확인해?"],
    },
    risk: {
      text: "손해가 없거나 가장 안전하고 인기 있는 종목을 정해 줄 수는 없어. 대신 투자 위험과 나눠 담는 방법은 설명할 수 있어. 🐻",
      steps: ["안전 종목 차단", "위험 교육 대안"],
      questions: ["위험이 뭐야?", "분산투자가 뭐야?"],
    },
    recovery: {
      text: "손실을 만회할 종목이나 거래를 정해 줄 수는 없어. 대신 네 거래 기록과 현재 손익의 뜻은 함께 볼 수 있어. 🐻",
      steps: ["손실 만회 거래 차단", "본인 기록 대안"],
      questions: ["내 거래 기록 보여줘", "평가손익이 뭐야?"],
    },
    social: {
      text: "가족이나 친구의 선택과 수익만 보고 네 거래를 정해 줄 수는 없어. 대신 네가 고른 이유와 거래 기록은 함께 돌아볼 수 있어. 🐻",
      steps: ["추종 거래 차단", "투자 근거 대안"],
      questions: ["내 거래 기록 보여줘", "투자 근거는 뭐야?"],
    },
    event: {
      text: "뉴스나 한 가지 사건만으로 미래 가격이나 매매 판단을 정해 줄 수는 없어. 대신 회사의 수익 구조와 가격 변동의 뜻은 함께 볼 수 있어. 🐻",
      steps: ["사건 기반 예측 차단", "회사 사실 대안"],
      questions: stock
        ? [`${stock.name}, 어떻게 돈을 벌어?`, "변동성이 뭐야?"]
        : ["차트가 뭐야?", "변동성이 뭐야?"],
    },
    metric: {
      text: "지표나 통계만으로 종목을 고르거나 미래 가격을 정할 수는 없어. 대신 각 숫자가 무엇을 보여주는지는 설명할 수 있어. 🐻",
      steps: ["지표 기반 선택 차단", "금융 개념 대안"],
      questions:
        message.includes("per") || message.includes("pbr")
          ? ["PER이 뭐야?", "PBR이 뭐야?"]
          : ["변동성이 뭐야?", "위험이 뭐야?"],
    },
  };
  const alternative = alternatives[kind];
  return reply("refusal", "safety", alternative.text, alternative.steps, {
    suggestedQuestions: alternative.questions,
  });
}

function formatWon(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function getContextReply(message: string, context: ChatContext): ChatReply | null {
  if (
    context.screen === "order" &&
    context.quantity !== undefined &&
    context.unitPrice !== undefined &&
    includesAny(message, ["예상금액", "얼마", "계산", "몇주", "수량"])
  ) {
    const total = context.quantity * context.unitPrice;
    return reply(
      "context",
      "service_help",
      `지금 화면의 ${context.quantity}주와 1주 ${formatWon(context.unitPrice)}을 곱하면 예상 금액은 ${formatWon(total)}이야. 실제 주문 전에는 화면의 최종 금액을 한 번 더 확인해 줘.`,
      ["현재 주문 수량 확인", "표시 가격으로 계산"],
      { uiAction: { type: "open_screen", target: "order" } },
    );
  }

  return null;
}

export function routeMessage(input: string, context: ChatContext): ChatReply {
  const message = normalizeChatInput(input);

  if (["지금은안전해", "안전한곳에있어"].includes(message)) {
    return reply(
      "safety",
      "safety",
      "알려줘서 고마워. 지금은 투자 화면을 닫고 쉬면서, 계속 힘들면 믿을 수 있는 어른에게 지금 마음을 말해 줘.",
      ["안전 상태 확인"],
    );
  }

  if (["도움이필요해", "지금위험해", "안전하지않아"].includes(message)) {
    return reply(
      "safety",
      "safety",
      "지금 혼자 있지 말고 가까운 보호자·교사처럼 믿을 수 있는 어른에게 바로 알려 줘. 급하게 다칠 위험이 있으면 112나 119에 도움을 요청해 줘.",
      ["긴급 도움 안내"],
    );
  }

  const unsafeKind = findUnsafeKind(message);
  if (unsafeKind) return unsafeReply(unsafeKind, message);

  if (includesAny(message, HARMFUL_PATTERNS)) {
    return reply(
      "safety",
      "safety",
      "그 요청은 여기서 도와줄 수 없어. 투자 화면이나 금융 기초가 궁금하면 다시 물어봐 줘.",
      ["안전 안내"],
    );
  }

  const recommendationKind = findRecommendationKind(message);
  if (recommendationKind) {
    return recommendationReply(recommendationKind, message, context);
  }

  if (includesAny(message, OUT_OF_SCOPE_PATTERNS)) {
    return reply(
      "outOfScope",
      "safety",
      "나는 이 서비스의 사용법과 투자 기초 이야기만 도와줄 수 있어. 화면이나 금융 용어가 궁금하면 물어봐 줘. 🐻",
      ["도메인 안내"],
    );
  }

  const contextReply = getContextReply(message, context);
  if (contextReply) return contextReply;

  if (includesAny(message, RECORD_PATTERNS)) {
    return reply("tool", "own_records", "", ["본인 투자 기록 조회"], {
      tool: "own_trade_records",
    });
  }
  if (includesAny(message, PROFILE_PATTERNS)) {
    return reply("tool", "own_profile", "", ["본인 성향 결과 조회"], {
      tool: "own_behavior_profile",
    });
  }
  if (includesAny(message, ARCHIVE_PATTERNS)) {
    return reply("tool", "own_archive", "", ["본인 시즌 기록 조회"], {
      tool: "own_archive",
    });
  }
  const knowledge = findChatbotKnowledge(message);
  if (knowledge) {
    return reply(
      "faq",
      knowledge.kind === "glossary" ? "financial_concept" : "service_help",
      knowledge.answer,
      [knowledge.kind === "glossary" ? "용어 사전 확인" : "사용법 FAQ 확인"],
      {
        ...(knowledge.actionTarget
          ? { uiAction: { type: "open_screen", target: knowledge.actionTarget } }
          : {}),
        ...(knowledge.explainScript ? { explainScript: knowledge.explainScript } : {}),
      },
    );
  }

  const mentionedStock = findMentionedStock(message);
  const contextStock =
    context.screen === "stock" || context.screen === "order"
      ? STOCKS.find((stock) => stock.id === context.stockId)
      : undefined;
  const stock = mentionedStock ?? contextStock;
  if (stock && (mentionedStock || includesAny(message, STOCK_PATTERNS))) {
    return reply("tool", "stock_facts", "", ["승인 종목 사실 조회"], {
      tool: "approved_stock_facts",
      stockFact: {
        stockId: stock.id,
        topic: findStockFactTopic(message),
      },
    });
  }

  return reply(
    "fallback",
    "general_allowed",
    "나는 투자 기초와 서비스 사용법을 도와줄 수 있어. 예를 들어 ‘PER이 뭐야?’, ‘주문 전에 뭘 확인해?’처럼 물어봐 줘. 🐻",
    ["허용 질문 확인"],
  );
}

export const PROACTIVE_SCRIPTS: Record<
  ProactiveSignal,
  { label: string; text: string }
> = {
  switch: {
    label: "매수·매도 취소 반복",
    text: "확인 화면을 여러 번 바꿔 봤네. 매수와 매도의 차이를 같이 볼까?",
  },
  dwell: {
    label: "주문·상세 화면 5분 초과 체류",
    text: "이 화면을 오래 살펴보고 있네. 어디에서 막혔는지 같이 찾아볼까?",
  },
  lossRevisit: {
    label: "손실 실현 종목 반복 조회",
    text: "방금 본 종목을 다시 살펴보고 있네. 어떤 점이 신경 쓰이는지 같이 찾아볼까?",
  },
};
