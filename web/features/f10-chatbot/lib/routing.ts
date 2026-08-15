import {
  CHATBOT_KNOWLEDGE,
  CHAT_PRIVACY_ANSWER,
  TRADE_VISIBILITY_ANSWER,
  findChatbotKnowledge,
  findChatbotQuestionForm,
} from "../../../shared/data/chatbot-knowledge";
import { STOCKS } from "../../../shared/data/stocks";
import { SECTORS, type SectorKey } from "../../../shared/data/sectors";
import type {
  ChatContext,
  ExplainScript,
  ChatUiAction,
  ProactiveSignal,
  ReadOnlyChatToolName,
  StockFactTopic,
} from "../../../shared/types/chatbot";
import { toPoliteKorean } from "./polite";
import {
  TRADE_DECISION_PATTERNS,
  asksFamilyData,
  asksOwnPastTrades,
  asksOwnTradeRecords,
  asksPopularityFollowing,
  asksRepeatedChecking,
  asksTargetPriceDecision,
  signalsLowMood,
  targetsInvestmentDecision,
} from "./intent-slots";

export type { ChatContext, ProactiveSignal } from "../../../shared/types/chatbot";

const EARLY_SCREEN_TERM_IDS = new Set([
  "goal-price",
  "buy-day-record",
  "profile-definition",
  "season-record",
]);

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
  | "sector_facts"
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
  sectorFact?: { sectorId: SectorKey };
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

type RuleKind =
  | "limit"
  | "cost"
  | "participation"
  | "recordRetention"
  | "season"
  | "ranking"
  | "visibility"
  | "virtualMoney"
  | "execution"
  | "socialSource";

type OfftopicKind =
  | "schoolwork"
  | "schoolLife"
  | "dailyLife"
  | "game"
  | "videoSocial"
  | "entertainment"
  | "career"
  | "coding";

export type TermKind =
  | "marketBasics"
  | "profitLoss"
  | "valuation"
  | "orderConcept"
  | "industryConcept"
  | "causality"
  | "profileStatistics"
  | "reasonTag"
  | "riskStrategy";

type CompanyFactKind =
  | "game"
  | "logistics"
  | "semiconductor"
  | "defense"
  | "food"
  | "energy"
  | "entertainment"
  | "retail"
  | "finance"
  | "automotive"
  | "shipbuilding"
  | "airline"
  | "cosmetics"
  | "generalRevenue"
  | "factCheck"
  | "universe";

type MetaKind =
  | "identity"
  | "persona"
  | "reliability"
  | "neutrality"
  | "system"
  | "realtime"
  | "forecastBoundary"
  | "autonomy";

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
  "친구가사라",
  // §6.0.2 재표현 우회. "추천은 말고" 처럼 앞에 완화 수식어를 붙여도 대신 골라
  // 달라는 요구는 그대로다. 화자를 키웅이로 바꾼 형태만 좁게 받는다.
  "네가산다면",
  "니가산다면",
  "너라면",
  "네가고른다면",
  // 종목 간 우열 — "둘 중에 어느 쪽이 더 나아 보이는지만"
  "어느쪽이더",
  "더나아보",
  "더나은쪽",
  // 투자 매력도 단정 — "10점 만점에 몇 점인지만". 본인 성향 점수 질문("성향
  // 몇 점이야?")과 겹치지 않도록 만점·매기기 형태로만 좁힌다.
  "만점에몇",
  "점수로매겨",
  "점수로매기",
  "몇점짜리",
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
  "요즘뭐가올라",
  "요즘어떤게올라",
  "요즘오르는종목",
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
  // "이 회사 앞으로 어떨 것 같은지 느낌만" — 완화 수식어를 붙여도 미래 전망 요구다.
  // 답변 범위를 묻는 메타("왜 앞으로 잘된다는 말은 안 해?")는 findMetaKind 의
  // asksWhyNoForecast 가 그대로 가져간다.
  "앞으로",
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
  // "언제쯤이 좋을지 힌트만 줘" — 시점을 대신 정해 달라는 요구다. 시즌·체결
  // 규칙의 "언제"("시즌 언제 끝나?")까지 삼키지 않도록 좋다·사다·팔다와 붙은
  // 형태로만 좁힌다.
  "언제쯤이좋",
  "언제가좋",
  "언제쯤사",
  "언제쯤팔",
  "타이밍",
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
/**
 * 손해 없는·안전한·더 좋은 종목을 골라 달라는 요구. 1인칭이 붙어도 요구가
 * 달라지지 않으므로("내가 안 망할 종목") 언제나 차단한다.
 */
const SAFETY_SEEKING_PATTERNS = [
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

/**
 * 남들이 많이 산 것을 따라 사려는 요구(SPEC §6.1.1). 위 안전 요구와 달리
 * **1인칭이 붙으면 뜻이 뒤집힌다** — "내가 제일 많이 산 종목 뭐야?" 는 추종이
 * 아니라 본인 기록 조회다. 그래서 두 목록을 나눠 둔다.
 * "많이 사면 수수료 많이 나와?" 같은 비용 질문까지 삼키지 않도록 종목을
 * 가리키는 형태로만 좁힌다.
 */
const POPULARITY_FOLLOWING_PATTERNS = [
  "제일인기",
  "가장인기",
  "인기많은",
  "인기있는",
  "많이산종목",
  "많이담은",
  "제일많이사",
  "다들산",
  "뭐많이사",
  "많이산주식",
  "많이사는종목",
  "많이사는주식",
  "다들많이사",
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
  // "다 포기하고 싶어" 와 같은 계열. `다` 를 붙여 "게임 그만두고 싶어" 는 걸리지 않게 한다.
  "다그만두고싶",
  "그만살고싶",
  "내가없어졌으면",
  "모든게끝났으면",
];
const FAMILY_MEMBER_PATTERNS = ["엄마", "아빠", "부모님", "부모", "보호자", "가족"];
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
  "\uCE5C\uAD6C\uD3F0\uC73C\uB85C\uC8FC\uBB38",
  "\uCE5C\uAD6C\uD3F0\uC73C\uB85C\uB9E4\uC218",
  "\uCE5C\uAD6C\uD3F0\uC73C\uB85C\uB9E4\uB3C4",
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
  // 서비스 낱말과 섞여 들어오는 정서 신호. SPEC §6.1.2 는 불편을 먼저 인정하게 한다.
  "너무힘든",
  "너무힘들",
  "많이힘든",
  "많이힘들",
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
const LIMIT_RULE_PATTERNS = [
  "주문한도",
  "매수한도",
  "단일종목한도",
  "내한도프리셋",
  "프리셋한도",
  "한도초과",
  "주문가능금액",
  "주문금액이왜막",
  "주문금액왜막",
  "얼마까지살수",
  "얼마까지넣을수",
  // 시드는 1,000만원이다. 아이가 예전 금액이나 줄임말로 물어도 같은 안내로 보낸다.
  "100만원다못",
  "100만원보다많이는주문못",
  "백만원다못",
  "1000만원다못",
  "1000만원보다많이는주문못",
  "천만원다못",
  "한번에백주못사",
  "한종목에내돈전부",
  "한종목에돈다넣",
  "한종목에100만원전부",
  "한종목에백만원전부",
  "한종목에1000만원전부",
  "한종목에천만원전부",
  "현금남았는데왜추가매수",
  "돈남았는데왜더못사",
];
const LIMIT_RULE_QUESTION_PATTERNS = [
  "왜",
  "얼마",
  "계산",
  "차감",
  "줄어",
  "막",
  "못",
  "남",
  "같",
  "퍼센트",
  "정한",
  "정했",
  "나눠",
  "쪼개",
  "로그",
  "초과",
  "최대",
  "풀",
];
const COST_RULE_PATTERNS = ["수수료", "세금", "거래비용", "주문비용"];
const COST_RULE_QUESTION_PATTERNS = [
  "왜",
  "빠",
  "나가",
  "떼",
  "0원",
  "금액",
  "주문",
  "손익",
  "수익률",
  "순위",
  "계산",
  "공식",
  "비용",
  "실제",
  "모의투자",
  "모투",
  "같",
  "달라",
  "포함",
  "차감",
  "내야",
  "보여",
  "반영",
  "또나가",
];
const PARTICIPATION_RULE_PATTERNS = [
  "리그참여",
  "리그가입",
  "참여안해도",
  "참여해야",
  "참여가의무",
  "구경만하고",
  "구경모드",
  "무조건해야",
];
const RECORD_RETENTION_PATTERNS = [
  "기록까지봐야",
  "아카이브꼭",
  "기록은남",
  "기록도남",
  "기록없어",
  "기록은없어",
  "기록도없어",
  "기록사라",
  "기록보존",
  "거래이유는남",
  "투자이야기는이어",
  "적은메모남",
  "다시처음부터",
  "보유종목은자동으로정리",
  "보유종목자동정리",
  "들고있는종목은자동으로정리",
];
const SEASON_RULE_PATTERNS = [
  "시즌",
  "3주차",
  "4주",
  "마지막주",
  "마지막거래일",
  "거래횟수",
  "주문횟수",
];
const SEASON_RULE_QUESTION_PATTERNS = [
  "끝",
  "종료일",
  "어디",
  "남",
  "며칠",
  "몇번",
  "횟수",
  "제한",
  "규칙",
  "룰",
  "거래",
  "주문",
  "멈추",
  "팔아야",
  "정리",
  "괜찮",
  "바꾸",
  "책임",
  "가능",
];
const RANKING_RULE_PATTERNS = [
  "순위",
  "가족순위",
  "리그순위",
  "리그점수",
  "가족점수",
  "수익률1등",
  "동점",
  "동률",
  "점수업데이트",
  "행동부문",
  "시상",
  "리워드",
  "상품",
];
const RANKING_RULE_QUESTION_PATTERNS = [
  "언제",
  "정해",
  "계산",
  "거래횟수",
  "알고리즘",
  "업데이트",
  "갱신",
  "바뀌",
  "뭐줘",
  "뭘줘",
  "받",
  "확정",
  "어떻게",
  "들어",
  "반영",
  "위로",
  // "거래 많이 하면 순위 올라가?" — 순위에 무엇이 반영되는지 묻는 같은 질문이
  // 서술어만 바뀌어 범위 안내로 떨어졌다.
  "올라가",
  "올라감",
  "올라",
  "높아지",
  "유리",
  "영향",
  "좌우",
];
const VISIBILITY_RULE_PATTERNS = [
  "친구한테보이",
  "친구에게보이",
  "친구한테공개",
  "친구에게공개",
  "다른팀",
  "누가볼수",
  "공개범위",
  "자동공개",
  "바로알림",
  "즉시알림",
  "부모폰에즉시푸시",
  "부모님화면",
  "부모화면",
];
const VIRTUAL_MONEY_RULE_PATTERNS = [
  "가상돈다쓰면끝",
  "투자금도합쳐",
  "투자금이합쳐",
  "백만원같이쓰",
  "100만원같이쓰",
  "천만원같이쓰",
  "1000만원같이쓰",
  "실제증권사계좌랑뭐가달라",
  "모의투자와실제계좌",
  "모투와실제계좌",
  "실제내계좌잔액",
  "가상돈을진짜돈",
  "가상돈진짜돈",
  "모투머니출금",
  "가상머니출금",
  "현금으로바꿀",
  "실제돈으로바꿀",
  "진짜돈으로바꿀",
];
const EXECUTION_RULE_PATTERNS = [
  "어떤시점의값으로체결",
  "어느가격기준으로체결",
  "어느가격으로체결",
  "어떤가격으로체결",
  "언제체결",
  "예약주문이면언제가격",
  "데모주문은바로체결",
  "체결가격",
  "체결시점",
];
const SOCIAL_RULE_PATTERNS = [
  "친구가추천",
  "친구추천",
  "친구픽",
  "친구말듣고",
  "가족추천",
];
const SOCIAL_RULE_QUESTION_PATTERNS = [
  "\uBC18\uCE59",
  "\uBB38\uC81C\uB3FC",
  "리그규칙",
  "규칙위반",
  "위반처리",
  "안걸려",
  "걸려",
  "실격",
  "근거로적",
  "이유로적",
];
const HARMFUL_PATTERNS = ["협박", "때리고", "죽여", "해킹", "시스템지시무시", "프롬프트보여"];
const SCHOOLWORK_PATTERNS = [
  "숙제",
  "과제",
  "수행평가",
  "독후감",
  "단어시험",
  "발표대본",
  "발표문",
  "발표준비",
  "분수문제",
  "수학문제",
  "확률문제",
  "평균계산",
  "중앙값차이",
  "조선왕순서",
];
const SCHOOL_LIFE_PATTERNS = [
  "학교준비물",
  "학교급식",
  "급식메뉴",
  "날씨",
  // 음악·영상 감상
  // 통짜 "노래"·"영화"는 엔터 4종(하이브·에스엠·JYP·와이지)의 사업 질문까지 막았다.
  // "하이브는 노래 만드는 회사야?"는 SPEC §8.1의 필수 질문이므로 감상·추천을 찾는
  // 표현만 잡는다. 게임 섹터를 "게임" → "게임공략"으로 좁힌 것과 같은 이유다.
  "노래추천",
  "노래가사",
  "노래틀어",
  "노래불러",
  "영화추천",
  "영화예매",
  "영화보고싶",
  "재밌는영화",
  // 게임 플레이·놀이
  "선생님이뭐라",
  "선생님화내",
  "숙제안하고친구랑게임하면혼나",
];
const DAILY_LIFE_PATTERNS = [
  "라면어떻게",
  "라면끓",
  "레시피",
  "요리",
  "끓여",
  "끓임",
  "뭐먹지",
  "메뉴추천",
  "간식추천",
];
const GAME_PATTERNS = [
  "게임",
  "끝말잇기",
  "마크에서",
  "마크공략",
  "마인크래프트",
  "다이아빨리캐",
  "롤에서",
  "롤티어",
  "브롤스타즈",
  "레드스톤",
  "함대키우",
  "시뮬레이션게임",
  "이스포츠",
  "e스포츠",
  "캐릭터",
  "캐릭뭐",
  "캐릭추천",
  "게임닉네임",
];
const VIDEO_SOCIAL_PATTERNS = [
  "유튜브",
  "틱톡",
  "인스타",
  "쇼츠",
  "sns",
  "영상",
  "구독자",
  "조회수",
  "팔로워",
  "영상분석",
  "영상내용",
  "레시피영상",
  "수익인증영상",
];
const ENTERTAINMENT_PATTERNS = [
  "노래",
  "신곡",
  "웹툰",
  "아이돌",
  "예능",
  "영화",
  "드라마",
  "넷플릭스",
  "춤이름",
  "신곡안무",
  "전투기이름",
];
const CAREER_PATTERNS = [
  "취업하려면",
  "취업준비",
  "인턴하려면",
  "인턴준비",
  "입사하려면",
  "진로",
  "직업추천",
];
const CODING_PATTERNS = [
  "파이썬으로",
  "코드짜",
  "코드작성",
  "코딩으로",
  "프로그래밍으로",
];
const RECORD_PATTERNS = [
  "내기록",
  "내거래",
  "지난거래",
  "왜골랐",
  "거래이유",
  "내보유기간",
  "최근에뭐샀",
  "왜샀다고적",
  "예전에적은생각",
];
/**
 * 본인 계좌의 보유 현황을 묻는 표현. 용어 사전보다 먼저 잡아야 한다 —
 * `수량`·`몇 주`·`평균`이 사전 트리거라 그냥 두면 "지금 몇 주 갖고 있어?"가
 * 보유 조회가 아니라 "수량은 사고팔 주식의 개수예요" 라는 낱말 뜻으로 답한다.
 */
const HOLDING_PATTERNS = [
  "갖고있",
  "가지고있",
  "들고있",
  "보유중",
  "보유수량",
  "보유종목",
  "내보유",
  "평단",
  "평균단가",
  "내평균매수",
  "얼마나샀",
  "얼마에샀",
  "몇주샀",
  "몇주남",
  "내가진돈",
  "내가가진돈",
  "내돈어디서",
  "가진돈어디서",
  "내손익",
];
/** 보유 조회는 본인 계좌만 본다. 타인을 가리키면 앞선 보호 판정에 맡긴다. */
const HOLDING_OTHER_PATTERNS = [...FAMILY_MEMBER_PATTERNS, "친구", "다른사람", "남의"];
const PROFILE_PATTERNS = ["내성향", "투자성향", "성향분석", "나는어떤투자"];
const ARCHIVE_PATTERNS = ["내아카이브", "지난시즌", "시즌기록", "시즌변화", "예전기록"];
const STOCK_PATTERNS = [
  "이회사",
  "현재회사",
  "보고있는회사",
  "회사는",
  "회사에서",
  "무슨회사",
  "회사뭐",
  "이종목",
  "무엇을만들",
  "만들",
  "어떤일을해",
  "뭐하는",
  "뭐임",
  "운영",
  "서비스",
  "판매",
  "정비",
  "공연",
  "영상",
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
const STOCK_BUSINESS_PATTERNS = [
  "돈을벌",
  "돈벌",
  "수익구조",
  "어떻게벌",
  "정비",
  "대가를받",
];
const STOCK_INDUSTRY_PATTERNS = [
  "업종",
  "산업",
  "역할",
  "퍼블리싱",
  "배급",
];
const STOCK_FINANCIAL_PATTERNS = [
  "실적",
  "매출",
  "영업이익",
  "순이익",
  "재무",
  "2024",
];
const COMPANY_FACT_QUERY_PATTERNS = [
  "뭐",
  "뭘",
  "무슨",
  "어떤",
  "어떻게",
  "맞지",
  "맞아",
  "같아",
  "같은",
  "아니",
  "달라",
  "차이",
  "만들",
  "운영",
  "서비스",
  "역할",
  "돈벌",
  "돈을벌",
  "수익",
  "수입",
  "과정",
  "순서",
  "어디서",
  "사와",
  "비교",
  "있어",
  "맡아",
  "다뤄",
  "직접",
  "출시",
  "정비",
  "창고",
  "제품",
  "산업",
  "실적",
  "판매",
  "팔아",
  "이어져",
  "연결",
];
const COMPANY_FACT_SECTOR_PATTERNS: Record<
  Exclude<CompanyFactKind, "generalRevenue" | "factCheck" | "universe">,
  readonly string[]
> = {
  game: [
    "게임회사",
    "게임사",
    "게임주",
    "게임산업",
    "게임개발",
    "퍼블리셔",
    "퍼블리싱",
  ],
  logistics: ["물류회사", "물류사", "물류종목", "택배회사", "택배사", "해운회사"],
  semiconductor: ["반도체회사", "반도체기업", "반도체업체", "반도체산업", "칩회사"],
  defense: ["방산기업", "방산회사", "방산사", "국방기업"],
  food: ["식품회사", "식품기업", "식품업체", "제과회사"],
  energy: ["에너지회사", "에너지기업", "전력회사", "발전회사", "발전소"],
  entertainment: ["엔터회사", "엔터사", "엔터테인먼트회사", "연예기획사", "소속사", "기획사"],
  retail: ["유통회사", "유통사", "유통기업", "쇼핑몰", "판매회사"],
  finance: ["은행", "증권사", "금융회사", "금융사", "금융기업"],
  automotive: [
    "자동차회사",
    "자동차기업",
    "자동차업체",
    "완성차회사",
    "자동차부품회사",
    "차판매량",
  ],
  shipbuilding: ["조선회사", "조선사", "조선소", "조선기업"],
  airline: ["항공회사", "항공사", "항공운송회사"],
  cosmetics: ["화장품회사", "화장품기업", "화장품업체", "뷰티회사", "뷰티기업"],
};
const CHAT_PRIVACY_PATTERNS = [
  "너랑한얘기",
  "나눈얘기",
  "키웅이랑한채팅",
  "키웅이한테",
  "채팅",
  "대화",
  "물어본",
  "질문",
  "엄마한테말안하면",
  "아빠한테말안하면",
  "부모한테말안하면",
  "보호자한테말안하면",
];
const TRADE_VISIBILITY_PATTERNS = [
  "내가뭐샀",
  "내가뭘샀",
  "내가산거",
  "내가판거",
  "내가산주식",
  "내보유종목",
  "내주문",
  "내거래기록",
  "내거래내역",
  "내매수기록",
  "내매도기록",
  "내주문기록",
];
const FAMILY_COMPARISON_PATTERNS = [
  "가족비교",
  "부모비교",
  "엄마랑비교",
  "아빠랑비교",
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

const SECTOR_MATCHERS = SECTORS.flatMap((sector) => [
  { sector, name: normalizeChatInput(sector.label) },
  ...(sector.key === "finance" ? [{ sector, name: "금융" }] : []),
  ...(sector.key === "entertainment" ? [{ sector, name: "엔터" }] : []),
]);

function findMentionedSector(message: string) {
  return SECTOR_MATCHERS.find((entry) => message.includes(entry.name))?.sector;
}

function getSectorFactReply(message: string): ChatReply | null {
  if (findMentionedStock(message)) return null;
  if (includesAny(message, ["숙제", "과제", "수행평가", "시험", "왕", "역사"])) return null;
  if (includesAny(message, ["per", "pbr", "주가", "고평가", "저평가", "수익률", "매수", "매도"])) return null;
  const sector = findMentionedSector(message);
  if (!sector) return null;
  const asksCoreSectorWork = includesAny(message, ["택배", "칩"]);
  if (!includesAny(message, ["섹터", "업종"]) && !asksCoreSectorWork) {
    return null;
  }
  return reply("faq", "sector_facts", sector.summary, ["승인 섹터 교육 데이터 확인"], {
    sectorFact: { sectorId: sector.key },
  });
}

const NAMED_STOCK_QUESTION_MARKERS = [
  "회사는",
  "회사에서",
  "회사뭐",
  "무슨회사",
  "어떤회사",
  "뭐하는",
  "뭐임",
  "무엇을만들",
  "어떤일을해",
  "어떻게돈을벌",
  "어떻게벌",
  "돈을벌",
  "돈벌",
  "수익구조",
  "업종",
  "산업역할",
  "실적",
  "매출",
  "영업이익",
  "순이익",
] as const;

/** 승인 사전이 이미 아는 용어. 회사 이름 후보로 오인하지 않게 한다. */
const APPROVED_TERM_WORDS = new Set(
  CHATBOT_KNOWLEDGE.flatMap((entry) =>
    [entry.termLabel, ...entry.triggers]
      .filter((word): word is string => typeof word === "string")
      .map((word) => normalizeChatInput(word)),
  ).filter((word) => word.length >= 2),
);

function hasUnrecognizedStockName(message: string) {
  if (findMentionedStock(message)) return false;
  const markerIndex = NAMED_STOCK_QUESTION_MARKERS.reduce((earliest, marker) => {
    const index = message.indexOf(marker);
    return index > 0 && (earliest < 0 || index < earliest) ? index : earliest;
  }, -1);
  if (markerIndex < 0) return false;

  const prefix = message.slice(0, markerIndex);
  // "주가 뭐임" 의 앞머리는 회사 이름이 아니라 승인 용어다. 용어를 회사로 오인하면
  // 용어 설명 대신 "회사 이름을 찾지 못했어요" 가 나간다.
  if (APPROVED_TERM_WORDS.has(prefix)) return false;
  return !/^(?:(?:이회사|이종목|현재회사|보고있는회사|회사|검수된|과거|최근|작년|지난해|2024년))+$/.test(
    prefix,
  );
}

function containsPersonalAddress(message: string) {
  if (includesAny(message, ["회사주소", "본사주소"])) return false;
  return (
    includesAny(message, ["내주소", "우리집주소", "집주소"]) ||
    /주소(?:를|도|랑|은|가)?(?:말|쓰|입력|알려|적|맞혀|보내|까|남아)/.test(message)
  );
}

function findUnsafeKind(message: string): UnsafeKind | null {
  if (includesAny(message, CRISIS_PATTERNS) || signalsLowMood(message)) return "crisis";
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
  // "엄마는 몇 주 갖고 있어?" 처럼 보유를 묻는 말은 데이터 낱말도 접근 동사도
  // 없어서 위 세 조건 조합을 빠져나간다. 보유 표현 자체가 곧 조회 요구다.
  const familyHoldingRequest =
    includesAny(message, FAMILY_MEMBER_PATTERNS) &&
    includesAny(message, HOLDING_PATTERNS);
  // 가족어 × 데이터어 × 조회요구의 곱으로 본다(`intent-slots`). 구절 목록으로
  // 두면 "엄마 수익률 얼마야?"(조회 동사 없음)·"엄마가 왜 샀는지 이유 보여줘"
  // (`거래이유`만 있고 `이유`가 없음)처럼 칸이 빠진 자리로 그대로 샌다.
  const familyDataRequest =
    !familyComparisonHelp && (asksFamilyData(message) || familyHoldingRequest);
  const ownDataSharing =
    (message.includes("내성향") &&
      message.includes("친구") &&
      includesAny(message, ["공개", "보여", "보임"])) ||
    (message.includes("손해") && message.includes("엄마") && message.includes("보여도"));
  if (familyDataRequest || ownDataSharing) return "familyData";

  const proxyAction =
    includesAny(message, PROXY_ACTION_PATTERNS) ||
    /(?:네가|키웅이가|내대신).{0,10}(?:주문|매수|매도|버튼).{0,8}(?:해줘|눌러)/.test(message) ||
    /(?:네가|키웅이가|내대신).{0,20}(?:사줘|팔아줘|주문해줘|매수해줘|매도해줘)/.test(message);
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
      includesAny(message, ["찜찜", "불편", "마음", "맞나", "옳"])) ||
    (message.includes("방산투자") &&
      includesAny(message, ["찜찜", "불편", "마음이무거", "옳은지"]));
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
  const familyVisibilityQuestion =
    includesAny(message, FAMILY_MEMBER_PATTERNS) &&
    includesAny(message, ["알림", "푸시", "화면", "공개", "보여"]);
  const ordinarySchoolConcern =
    message.includes("숙제") && includesAny(message, ["게임", "놀", "선생님"]);
  if (
    familyPressure &&
    !familyVisibilityQuestion &&
    !ordinarySchoolConcern &&
    !includesAny(message, SIZING_PATTERNS)
  ) {
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
  if (
    includesAny(message, ["\uC81C\uC77C\uC88B\uC544\uD558\uB294\uC8FC\uC2DD", "\uCD5C\uC560\uC8FC\uC2DD", "\uB108\uB77C\uBA74\uC88B\uC544\uD560\uC8FC\uC2DD"])
  ) {
    return "selection";
  }

  const asksForSelectionCriteria =
    includesAny(message, ["종목고를때", "주식고를때", "회사고를때", "투자기준"]) &&
    !includesAny(message, [
      "추천",
      "골라",
      "정해",
      "대신",
      "뭐가좋",
      "뭐살",
      "뭘살",
      "사줘",
    ]);
  if (asksForSelectionCriteria) return null;

  const selection =
    includesAny(message, SELECTION_PATTERNS) ||
    includesAny(message, TRADE_DECISION_PATTERNS) ||
    includesAny(message, [
      "뭐가제일좋",
      "뭐가가장좋",
      "제일좋은종목",
      "가장좋은종목",
    ]);
  // 목표가·손절가는 `intent-slots` 가 어간과 요구 동사를 떨어뜨려 본다.
  // 인접만 보던 정규식은 "목표가 좀 정해줘" 의 `좀` 한 글자에 무너졌다.
  const prediction =
    includesAny(message, PREDICTION_PATTERNS) ||
    asksTargetPriceDecision(message) ||
    (includesAny(message, FUTURE_PATTERNS) &&
      (includesAny(message, FUTURE_OUTCOME_PATTERNS) ||
        includesAny(message, VAGUE_FORECAST_PATTERNS)));
  const timing = includesAny(message, TIMING_PATTERNS);
  // `제일많이사` 같은 구절은 "제일 많이 **산** 거"의 활용을 놓친다. 인기어와
  // 이미 산 것을 가리키는 말의 곱으로 함께 본다(SPEC §6.1.1 "많이 산 주식").
  // 1인칭이 붙은 같은 표현은 본인 기록 조회이므로 추종 요구에서 빼낸다.
  const risk =
    includesAny(message, SAFETY_SEEKING_PATTERNS) ||
    ((includesAny(message, POPULARITY_FOLLOWING_PATTERNS) ||
      asksPopularityFollowing(message)) &&
      !asksOwnPastTrades(message));
  const automaticBestReturnSelection =
    includesAny(message, ["자동", "앱이"]) &&
    includesAny(message, ["제일수익", "최고수익", "수익좋은"]) &&
    includesAny(message, ["종목", "주식"]) &&
    includesAny(message, ["사주", "구매", "매수", "골라", "선택", "기능"]);

  // "3프로 오르면 20만원은 얼마 늘어?" 는 조건 계산이지 매수 금액 결정이 아니다.
  // §6.1.1 이 "조건 설명·용어·사용법 질문은 추천으로 오탐하지 않는다"고 못 박은 자리다.
  const conditionalCalculation =
    /\d+(?:\.\d+)?(?:%|퍼|프로)/.test(message) &&
    includesAny(message, ["오르면", "내리면", "떨어지면", "오른다면", "늘어", "줄어", "계산"]);
  const amountAllocation =
    !conditionalCalculation && /\d+(?:만)?원.*(?:어디|얼마|전부|넣)/.test(message);
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
  if (automaticBestReturnSelection) return "selection";
  if (timing) return "timing";
  if (prediction) return "prediction";
  if (risk) return "risk";
  if (selection) return "selection";
  return null;
}

/**
 * §6.1.3 가상 지갑 규칙. `VIRTUAL_MONEY_RULE_PATTERNS` 는 "투자금도합쳐" 처럼
 * 거의 정확일치인 긴 구절만 담고 있어서 SPEC 이 예시로 든 "팀이면 돈이 합쳐져?"
 * 조차 놓쳤다. 답변 문구는 이미 있는데 바깥 게이트를 못 넘어 범위 안내로
 * 떨어지던 자리다. 주제어와 문맥 단서를 조합해 표현이 달라도 같은 취지면 같은
 * 안내로 보낸다.
 */
function matchesVirtualMoneyRule(message: string) {
  if (includesAny(message, VIRTUAL_MONEY_RULE_PATTERNS)) return true;

  // 주문 가능 금액("얼마까지 살 수 있어?")은 limit 이 답한다. virtualMoney 가
  // limit 보다 먼저 판정되므로 여기서 먼저 비켜 준다.
  if (includesAny(message, ["한도", "까지살", "까지넣", "까지주문"])) return false;

  const moneyWord = includesAny(message, [
    "돈",
    "투자금",
    "지갑",
    "자산",
    "머니",
    "현금",
    "시드",
  ]);

  // 가족 팀이면 지갑을 합치는지 — "팀이면 돈이 합쳐져?"
  // 수익률·점수를 합치느냐는 순위 질문이므로 돈을 가리키는 낱말을 함께 요구한다.
  if (moneyWord && includesAny(message, ["합쳐", "합치", "같이쓰", "한지갑", "공동"])) {
    return true;
  }

  // 시작 시드 금액 — "얼마 갖고 시작해?", "가상 머니 얼마 줘?"
  if (message.includes("얼마")) {
    if (includesAny(message, ["시작", "처음"])) return true;
    if (includesAny(message, ["가상머니", "가상돈", "가상자산", "모투머니", "모의투자머니"])) {
      return true;
    }
  }

  return false;
}

function findRuleKind(message: string, context: ChatContext): RuleKind | null {
  const visibilityRule =
    (includesAny(message, VISIBILITY_RULE_PATTERNS) ||
      (includesAny(message, ["부모", "부모님", "보호자"]) &&
        includesAny(message, ["알림", "푸시"]) &&
        includesAny(message, ["바로", "즉시"]))) &&
    includesAny(message, [
      "종목",
      "성향",
      "점수",
      "수익",
      "순위",
      "기록",
      "공개",
      "알림",
      "푸시",
      "화면",
    ]);
  if (visibilityRule) return "visibility";

  if (matchesVirtualMoneyRule(message)) return "virtualMoney";

  const participationRule =
    includesAny(message, PARTICIPATION_RULE_PATTERNS) ||
    (context.screen === "home" &&
      includesAny(message, ["이거꼭해야돼", "이거꼭해야해", "이거안해도돼"]));
  if (participationRule) return "participation";

  const requiredRecordReview =
    includesAny(message, ["기록", "아카이브"]) &&
    includesAny(message, ["꼭봐야", "확인해야", "봐야해", "보는게의무", "열어봐야"]);
  if (includesAny(message, RECORD_RETENTION_PATTERNS) || requiredRecordReview) {
    return "recordRetention";
  }

  const costRule =
    includesAny(message, COST_RULE_PATTERNS) &&
    includesAny(message, COST_RULE_QUESTION_PATTERNS) &&
    !includesAny(message, ["종목추천", "종목골라", "어떤종목", "무슨종목"]);
  if (costRule) return "cost";

  const limitRule =
    includesAny(message, LIMIT_RULE_PATTERNS) ||
    (includesAny(message, ["돈남", "현금남", "잔액남"]) &&
      includesAny(message, ["못사", "추가매수", "막"])) ||
    ((message.includes("한도") || message.includes("주문가능금액")) &&
      includesAny(message, LIMIT_RULE_QUESTION_PATTERNS)) ||
    /(?:100만|백만).{0,12}(?:전부|다|보다많).{0,12}(?:못|막|할수없)/.test(message);
  if (limitRule) return "limit";

  const styleScoringRule =
    message.includes("성향") &&
    includesAny(message, ["3주차", "기록만으로", "확정"]);
  const explicitRankingRecommendation =
    includesAny(message, SELECTION_PATTERNS) ||
    includesAny(message, PREDICTION_PATTERNS) ||
    includesAny(message, TIMING_PATTERNS) ||
    includesAny(message, SIZING_PATTERNS);
  // 동점·동률은 그 자체로 순위 규칙을 묻는 낱말이라 질문형 패턴을 따로 요구하지
  // 않는다. 요구하면 "동점이면 누가 이기는 거야?" 처럼 어미만 다른 문장이 범위
  // 안내로 떨어진다 — SPEC 이 예시로 든 "동점이면 어떻게 해?" 만 통과하던 자리다.
  const standaloneRankingTopic = includesAny(message, ["동점", "동률"]);
  const rankingRule =
    styleScoringRule ||
    (includesAny(message, RANKING_RULE_PATTERNS) &&
      (standaloneRankingTopic || includesAny(message, RANKING_RULE_QUESTION_PATTERNS)) &&
      !explicitRankingRecommendation);
  if (rankingRule) return "ranking";

  const seasonRule =
    includesAny(message, SEASON_RULE_PATTERNS) &&
    includesAny(message, SEASON_RULE_QUESTION_PATTERNS) &&
    !includesAny(message, PREDICTION_PATTERNS) &&
    !(includesAny(message, FUTURE_PATTERNS) &&
      includesAny(message, FUTURE_OUTCOME_PATTERNS));
  if (seasonRule) return "season";

  if (includesAny(message, EXECUTION_RULE_PATTERNS)) return "execution";

  const socialRule =
    includesAny(message, SOCIAL_RULE_PATTERNS) &&
    includesAny(message, SOCIAL_RULE_QUESTION_PATTERNS);
  if (socialRule) return "socialSource";

  return null;
}

function findOfftopicKind(
  message: string,
  recommendationKind: RecommendationKind | null,
): OfftopicKind | null {
  // SPEC §6.1.4: 비금융 대상을 고르는 요청은 범위 밖, 실제 투자 판단을 요구하면
  // 추천 차단이 우선이다. 그 갈림을 `targetsInvestmentDecision` 한 곳에 둔다 —
  // 여기 목록에 `사도돼`·`사도되`만 있어 "…지금 사도 됨?"이 영상 콘텐츠 거절로
  // 새던 자리다.
  const explicitInvestmentDecision =
    recommendationKind !== null &&
    ((findMentionedStock(message) !== undefined &&
      !includesAny(message, [
        ...GAME_PATTERNS,
        ...VIDEO_SOCIAL_PATTERNS,
        ...ENTERTAINMENT_PATTERNS,
      ])) ||
      targetsInvestmentDecision(message));
  if (explicitInvestmentDecision) return null;

  const companyFactQuestion =
    (findMentionedStock(message) !== undefined ||
      includesAny(message, [
        "이회사",
        "현재회사",
        "보고있는회사",
        "게임회사",
        "게임주",
        "영상회사",
        "엔터회사",
        "엔터테인먼트회사",
        "금융회사",
        "증권사",
      ])) &&
    includesAny(message, [
      "어떤회사",
      "뭐하는",
      "어떤일",
      "만들어",
      "만드는",
      "돈을벌",
      "돈벌",
      "수익구조",
      "사업",
      "제품",
      "서비스",
      "산업",
      "역할",
      "운영",
      "개발",
      "퍼블리싱",
      "배급",
      "영상",
      "공연",
      "음악",
      "가수",
      "과자",
      "화물",
      "정비",
      "반도체",
      "출처",
      "직접",
      "실적",
      "매출",
    ]);
  if (companyFactQuestion) return null;

  // "가수가 노래 만들면 회사는 뭐 하는 거임?" — 회사가 하는 일을 묻는 문장은
  // 노래·영화 같은 낱말이 섞여도 회사·산업 사실이다. §6.1.6 우선순위가
  // 회사·산업 사실을 범위 밖보다 앞에 둔다. 진로 상담("회사 들어가려면")은
  // 여전히 career 가 가져가야 하므로 먼저 제외한다.
  const industryRoleQuestion =
    message.includes("회사") &&
    !includesAny(message, CAREER_PATTERNS) &&
    includesAny(message, [
      "뭐하",
      "뭘해",
      "뭘하",
      "무슨일",
      "어떤일",
      "하는거",
      "돈을벌",
      "돈벌",
      "수익구조",
      "역할",
    ]);
  if (industryRoleQuestion) return null;

  const financialConceptQuestion =
    includesAny(message, [
      "주식",
      "주가",
      "수익률",
      "변동성",
      "per",
      "pbr",
      "예대마진",
      "평가손익",
      "분산투자",
    ]) &&
    includesAny(message, ["뭐", "뜻", "차이", "설명", "계산"]) &&
    !includesAny(message, [
      "수학",
      "국어",
      "영어",
      "과학",
      "역사",
      "사회",
      "답만",
      "문제",
      "독후감",
      "발표",
      "수행평가",
    ]);
  if (financialConceptQuestion) return null;

  if (includesAny(message, SCHOOL_LIFE_PATTERNS)) return "schoolLife";
  if (includesAny(message, SCHOOLWORK_PATTERNS)) return "schoolwork";
  if (includesAny(message, VIDEO_SOCIAL_PATTERNS)) return "videoSocial";
  if (includesAny(message, DAILY_LIFE_PATTERNS)) {
    return "dailyLife";
  }
  if (
    message.includes("게임") &&
    includesAny(message, ["재밌", "추천", "공략", "캐릭터"])
  ) {
    return "game";
  }
  if (includesAny(message, GAME_PATTERNS)) return "game";
  if (includesAny(message, CAREER_PATTERNS)) return "career";
  if (includesAny(message, CODING_PATTERNS)) return "coding";
  if (includesAny(message, ENTERTAINMENT_PATTERNS)) return "entertainment";
  return null;
}

function findMetaKind(
  message: string,
  recommendationKind: RecommendationKind | null,
): MetaKind | null {
  const asksWhyNoRecommendation = includesAny(message, [
    "왜추천안",
    "추천을안",
    // "왜 추천은 안 해줘?" — 조사 하나 때문에 위 형태를 비껴간다.
    "추천은안",
    "추천안해",
    "추천안하",
    "추천하지않",
    "추천못",
    "추천은못",
    "못추천",
    "왜못골",
    "왜안골",
    "못고른다고",
    "종목을안골라",
  ]);
  const asksWhyNoForecast =
    // "말은 없어?" 뿐 아니라 "말은 안 해?" 도 같은 질문이다. 뒤의 미래 낱말과
    // "왜" 가 함께 있어야 통과하므로 부정 표현을 넓혀도 범위가 벌어지지 않는다.
    includesAny(message, ["없어", "없는", "빼", "제외", "안넣", "말안", "안해", "안하", "않아"]) &&
    includesAny(message, ["앞으로", "미래", "전망", "잘될", "오를거", "예측"]) &&
    (message.includes("왜") ||
      includesAny(message, ["회사설명", "회사소개", "설명에는", "답변", "답에서", "이야기", "말"]));
  const asksForInternalDetails = includesAny(message, [
    "내부코드",
    "상태머신",
    "시스템프롬프트",
    "숨은프롬프트",
    "원문프롬프트",
    "내부로직",
    "추론과정",
  ]);
  const asksAboutHumanResponder = includesAny(message, [
    "뒤에서사람",
    "사람이뒤에서",
    "사람이답쓰",
    "사람이채팅",
  ]);
  if (
    recommendationKind &&
    !asksWhyNoRecommendation &&
    !asksWhyNoForecast &&
    !asksForInternalDetails &&
    !asksAboutHumanResponder
  ) {
    return null;
  }

  const hasMetaActor = includesAny(message, [
    "너",
    "네답",
    "네가",
    "키웅이",
    "ai",
    "인공지능",
    "챗봇",
    "프로그램",
  ]);

  const asksAboutAutonomy =
    includesAny(message, [
      "강제로계속",
      "계속시키",
      "그만두고싶",
      "그만하고싶으면",
      "그냥닫아도돼",
      "그냥닫아도되",
      "대화그만",
      "대화끝",
      "대화를바로끄",
      "대화를바로끌",
      "대화끌수",
      "챗봇끄",
      "멈출수",
    ]) &&
    (hasMetaActor || message.includes("대화") || message.includes("그냥닫아"));
  if (asksAboutAutonomy) return "autonomy";

  const asksAboutRealtime =
    (message.includes("실시간") &&
      includesAny(message, ["주가", "시세", "뉴스", "찾", "보는", "보고"])) ||
    (message.includes("뉴스") &&
      includesAny(message, ["오늘올라온", "방금뜬", "최신"]) &&
      includesAny(message, ["찾", "검색", "알려", "볼수", "가능"])) ||
    (includesAny(message, [
      "어디서가져와",
      "숫자출처",
      "데이터출처",
      "출처가뭐",
      "출처와갱신",
      "기준일",
      "갱신시각",
    ]) &&
      includesAny(message, ["per", "주가", "시세", "이익", "숫자", "앱"]));
  if (asksAboutRealtime) return "realtime";

  if (asksWhyNoForecast) return "forecastBoundary";

  const asksAboutReliability =
    includesAny(message, [
      "틀리",
      "틀릴",
      "오답",
      "실수",
      "믿고",
      "믿어도",
      "책임",
    ]) &&
    (hasMetaActor || includesAny(message, ["이답", "답변", "설명을", "누가책임"]));
  if (asksAboutReliability) return "reliability";

  const asksAboutNeutrality =
    includesAny(message, [
      "편드는",
      "편들어",
      "누구편",
      "어느편",
      "편이야",
      "편인챗봇",
      "편향",
      "중립",
      "솔직한의견",
      "시킨말",
      "찬성하는",
      "찬성해",
      "반대하는",
    ]) &&
    (hasMetaActor || message.includes("편향"));
  if (asksAboutNeutrality) return "neutrality";

  const asksAboutSystem =
    (includesAny(message, ["답변", "답하는", "말하는"]) &&
      includesAny(message, ["어떤근거", "무슨근거", "답변근거", "무슨자료", "어떤자료", "정보는어디서", "만드는인공지능"])) ||
    (message.includes("질문") && includesAny(message, ["의도분류", "종류를어떻게나누", "어떤규칙", "분류해"])) ||
    asksForInternalDetails ||
    (hasMetaActor &&
      includesAny(message, [
        "계산기처럼",
        "숫자만비교",
        "회사내용도판단",
        "엔진이계산",
        "임의로계산",
      ])) ||
    (includesAny(message, ["내데이터", "내기록"]) &&
      includesAny(message, ["통계", "직접계산", "마음대로분석", "분석하는ai", "어떻게사용"]));
  if (asksAboutSystem) return "system";

  const asksAboutIdentity =
    (includesAny(message, [
      "사람아니",
      "사람인가",
      "사람임",
      "ai임",
      "ai야",
      "로봇임",
      "프로그램인가",
      "프로그램이야",
      "실제증권사상담원",
      "진짜키웅이",
      "키웅이맞",
    ]) &&
    hasMetaActor) ||
    asksAboutHumanResponder;
  if (asksAboutIdentity) return "identity";

  const asksAboutPersona =
    includesAny(message, ["키웅이이름", "키웅이라는이름"]) ||
    (hasMetaActor &&
      includesAny(message, [
        "하기싫",
        "기분",
        "감정",
        "아이돌팬",
        "최애",
        "돈벌어본",
        "투자직접해본",
        "투자해본",
        "거래해본",
        "주식들고",
        "보유종목",
        "계좌있",
        "추천하는척",
      ])) ||
    asksWhyNoRecommendation;
  if (asksAboutPersona) return "persona";

  return null;
}

function findCompanyFactKind(message: string): CompanyFactKind | null {
  if (findRecommendationKind(message)) return null;
  if (
    includesAny(message, [
      "숙제",
      "과제",
      "수행평가",
      "취업",
      "인턴",
      "진로",
      "게임공략",
      "캐릭터",
      "재밌",
      "추천",
    ])
  ) {
    return null;
  }

  const asksToCheckNewsFact =
    message.includes("뉴스") &&
    includesAny(message, ["진짜", "사실", "공식", "맞는지", "확인", "검증"]);
  if (asksToCheckNewsFact) return "factCheck";

  const asksAboutSupportedFinancialCompanies =
    includesAny(message, ["우리종목", "지원종목", "종목중", "목록에", "리스트에"]) &&
    includesAny(message, ["금융회사", "금융사", "증권사", "은행말고"]);
  if (asksAboutSupportedFinancialCompanies) return "universe";

  if (
    includesAny(message, [
      "예대마진",
      "이자수익이랑주가",
      "이자수익과주가",
      "ipo",
    ]) ||
    (message.includes("증권사") && !message.includes("은행"))
  ) {
    return null;
  }

  const hasExplicitCompany = findMentionedStock(message) !== undefined;
  const hasScreenCompany = includesAny(message, [
    "이회사",
    "이종목",
    "현재회사",
    "보고있는회사",
  ]);
  if (hasExplicitCompany || hasScreenCompany) return null;

  if (
    includesAny(message, [
      "회사는누가돈",
      "회사에누가돈",
      "회사가누구한테돈",
      "회사는어떻게수익",
      "회사는어떻게돈",
      "회사는뭘팔아",
    ])
  ) {
    return "generalRevenue";
  }

  if (!includesAny(message, COMPANY_FACT_QUERY_PATTERNS)) return null;
  for (const [kind, patterns] of Object.entries(COMPANY_FACT_SECTOR_PATTERNS)) {
    if (includesAny(message, patterns)) return kind as CompanyFactKind;
  }
  return null;
}

/**
 * 두 개념을 견주는 표현. 정의형처럼 보여도 한 용어의 DAPIE 로는 답할 수 없다.
 * "뭐가 항상 더 싸"처럼 사이에 말이 끼므로 낱말 목록이 아니라 정규식으로 본다.
 */
const COMPARISON_PATTERN =
  /(?:뭐가|무엇이|어느게|어떤게|어느쪽|어느것)(?:[가-힣]{0,6})?더|중에어느|다른점|차이가뭐/;

/**
 * 뜻만 묻는 질문이고 사전에 DAPIE 스크립트가 있으면 그 스크립트를 돌려준다.
 *
 * term 9종 고정 응답(`findTermKind`)은 사전에 없는 개념을 메우는 그물이라, 되물어 가며
 * 설명할 수 있는 쪽이 있으면 양보한다. 다만 SPEC §3.4대로 **용어 설명일 때만** 양보한다 —
 * 두 개념 비교("시장가랑 지정가 중 어느 쪽이"), 단정 교정("PBR이 1보다 낮으면 무조건
 * 저평가야?"), 수치 계산은 한 용어의 DAPIE 로 답할 수 없어 고정 응답이 맡아야 한다.
 */
/**
 * 구어체 의문사를 표준형으로 바꾼다. "주가가 머야?" 처럼 어미만 다른 정의 질문이
 * 승인 스크립트를 놓치고 모델 경로로 새던 자리다. 사전 조회와 질문 형태 판정에만
 * 쓰며 화면에 나가는 문장은 바꾸지 않는다. 숫자·조사와 붙는 "얼마야"·"머리" 는
 * 건드리지 않도록 어미를 통째로 맞춘다.
 */
function toStandardQuestionForm(message: string) {
  return message
    .replace(/머야/g, "뭐야")
    .replace(/머임/g, "뭐임")
    .replace(/머냐/g, "뭐냐")
    .replace(/머에요/g, "뭐예요");
}

const BARE_DEFINITION_SUFFIXES = [
  "뭐야",
  "뭐임",
  "뭐냐",
  "뭔데",
  "뭐예요",
  "무슨뜻",
  "뜻",
  "의미",
];

/**
 * "주가 뭐임" 처럼 조사가 빠진 정의 질문을 승인 용어로 잇는다. 용어 트리거는
 * §3.4.1 에 따라 좁게 적혀 있어("주가" 한 낱말을 트리거로 두면 "주가 차트"까지
 * 가로챈다) 조사 없는 형태를 놓쳤다. 앞머리가 용어 이름과 **통째로** 같을 때만
 * 받으므로 "주가 차트 뭐임" 은 여전히 이 경로를 타지 않는다.
 */
function findTermByBareDefinition(message: string) {
  for (const suffix of BARE_DEFINITION_SUFFIXES) {
    if (!message.endsWith(suffix)) continue;
    const raw = message.slice(0, message.length - suffix.length);
    // 조사를 먼저 떼면 "주가"의 "가"까지 잘려 "주"가 된다. 원형을 먼저 맞춰 본다.
    for (const head of [raw, raw.replace(/(?:이|가|은|는|란|이란)$/, "")]) {
      if (head.length < 2) continue;
      const entry = CHATBOT_KNOWLEDGE.find(
        (candidate) =>
          candidate.status === "reviewed" &&
          typeof candidate.termLabel === "string" &&
          normalizeChatInput(candidate.termLabel) === head,
      );
      if (entry) return entry;
    }
  }
  return undefined;
}

/** 승인 사전 조회. 구어체 어미와 조사 생략을 함께 흡수한다. */
function findApprovedKnowledge(message: string) {
  const standard = toStandardQuestionForm(message);
  return findChatbotKnowledge(standard) ?? findTermByBareDefinition(normalizeChatInput(standard));
}

function findScriptedTerm(message: string) {
  const standard = toStandardQuestionForm(message);
  const entry = findApprovedKnowledge(message);
  if (!entry?.explainScript) return undefined;
  // "PER이랑 PBR 뭐가 더 정확함"은 "뭐" 때문에 정의형으로 보이지만 두 개념 비교다.
  // 한 용어의 DAPIE 로 답할 수 없으므로 고정 응답에 맡긴다.
  if (COMPARISON_PATTERN.test(message)) return undefined;
  if (findChatbotQuestionForm(standard) === "definition") return entry.explainScript;
  // "예대마진"처럼 낱말만 던진 입력은 형태가 안 잡힌다. 트리거와 통째로 같을 때만 받는다.
  const normalized = normalizeChatInput(standard);
  return entry.triggers.some((trigger) => normalizeChatInput(trigger) === normalized)
    ? entry.explainScript
    : undefined;
}

function findTermKind(message: string): TermKind | null {
  if (
    includesAny(message, [
      "숙제",
      "과제",
      "수행평가",
      "독후감",
      "단어시험",
      "발표대본",
      "발표문",
      "발표준비",
      "분수문제",
      "수학문제",
      "확률문제",
      "조선왕순서",
    ])
  ) {
    return null;
  }

  const asksForDecision =
    includesAny(message, [
      "골라",
      "뽑아",
      "추천",
      "종목정해",
      "사도돼",
      "사도되",
      "사야",
      "매수할까",
      "매도할까",
      "몇주사",
      "얼마넣",
      "비중",
      "목표가정",
      "손절가정",
    ]) &&
    !includesAny(message, ["뜻", "뭐야", "뭐였지", "같은", "차이", "계산", "맞아"]);
  if (asksForDecision) return null;

  if (includesAny(message, ["근거태그", "근거항목", "이유태그"])) return "reasonTag";

  const specificCompanyNews =
    message.includes("뉴스") && findMentionedStock(message) !== undefined;
  if (
    !specificCompanyNews &&
    includesAny(message, [
      "성향5축",
      "성향점수",
      "위험감수성",
      "공격성축",
      "표준편차",
      "평균이랑중앙값",
      "평균과중앙값",
      "평균하고중앙값",
      "상관관계",
      "투자행동으로설명",
      "현재성향유형",
      "성향유형은어떻게",
      "판단근거축",
      "포트폴리오폭",
      "어떤행동을성향",
    ])
  ) {
    return "profileStatistics";
  }

  if (
    includesAny(message, [
      "손실률",
      "수익률마이너스",
      "마이너스면내가진짜돈",
    ]) ||
    // 아이는 `%` 를 "프로"로도 적는다. `parsePercentageCalculation` 과 같은 형태를 받는다.
    (/\d+(?:\.\d+)?(?:%|퍼|프로)/.test(message) &&
      /\d+(?:\.\d+)?(?:만)?원/.test(message))
  ) {
    return "profitLoss";
  }

  const valuationTerm = includesAny(message, [
    "per",
    "pbr",
    "주가수익비율",
    "주가순자산비율",
  ]);
  const asksValuationComparison =
    (message.includes("per") && message.includes("pbr")) ||
    includesAny(message, [
      "무조건저평가",
      "무조건싼",
      "무조건저렴",
      "고평가라고바로",
      "저평가라고바로",
      "낮으면",
      "낮은",
      "아래면",
      "업종평균",
      "적용돼",
      "적용해",
      "보면되는",
      "보면돼",
      "더믿을",
      "더정확",
    ]);
  if (valuationTerm && asksValuationComparison) {
    return "valuation";
  }

  if (
    (message.includes("시장가") && message.includes("지정가")) ||
    (message.includes("손절") && includesAny(message, ["뜻", "말은", "뭐야", "의미"]))
  ) {
    return "orderConcept";
  }

  if (
    message.includes("레버리지") ||
    message.includes("몰빵이랑") ||
    (message.includes("분산투자") && includesAny(message, ["수익", "나누", "같은말"]))
  ) {
    return "riskStrategy";
  }

  if (
    includesAny(message, [
      "예대마진",
      "이자수익이랑주가",
      "이자수익과주가",
      "칩과메모리",
      "칩이랑메모리",
      "증권사가",
      "증권사는",
      "ipo",
    ]) ||
    (message.includes("은행") &&
      includesAny(message, ["이자수익", "이자로번", "이자로버는"]) &&
      message.includes("주가") &&
      includesAny(message, ["같", "차이", "달라"]))
  ) {
    return "industryConcept";
  }

  if (
    includesAny(message, [
      "원래이렇게잘떨어",
      "주가가내려가면회사",
      "뉴스뜨면그날바로",
      "뉴스나오면바로",
      "에너지가격이내려가면",
      "원자재가격이내려가면",
      "기름값이랑꼭같이",
      "유가랑꼭같이",
    ]) ||
    (!specificCompanyNews &&
      includesAny(message, ["뉴스", "기름값", "유가", "에너지가격", "원자재가격"]) &&
      includesAny(message, ["주가", "수익률", "자동차주", "관련주"]) &&
      includesAny(message, [
        "움직",
        "영향",
        "같이",
        "꼭",
        "바로",
        "즉시",
        "오르",
        "내리",
        "떨어",
      ]))
  ) {
    return "causality";
  }

  if (
    includesAny(message, [
      "빨간숫자",
      "숫자빨간색",
      "차트위로",
      "그래프위로",
      "차트빨간색",
      "그래프선",
      "주가가뭐",
      "현재가와등락률",
      "현재가랑등락률",
      "1일봉",
      "일봉데이터",
    ])
  ) {
    return "marketBasics";
  }

  return null;
}

function findStockFactTopic(message: string): StockFactTopic {
  if (includesAny(message, STOCK_FINANCIAL_PATTERNS)) return "financial";
  if (includesAny(message, STOCK_BUSINESS_PATTERNS)) return "business";
  if (includesAny(message, STOCK_INDUSTRY_PATTERNS)) return "industry";
  return "company";
}

function getExplicitCompanyFactReply(
  message: string,
  context: ChatContext,
): ChatReply | null {
  if (
    includesAny(message, [
      "per",
      "pbr",
      "수익률",
      "주가",
      "평가손익",
      "실현손익",
      "변동성",
      "시장가",
      "지정가",
      "손절",
      "예대마진",
    ])
  ) {
    return null;
  }

  const mentionedStock = findMentionedStock(message);
  const asksAboutScreenCompany = includesAny(message, [
    "이회사",
    "이종목",
    "현재회사",
    "보고있는회사",
  ]);
  const contextStock =
    asksAboutScreenCompany &&
    (context.screen === "stock" || context.screen === "order")
      ? STOCKS.find((stock) => stock.id === context.stockId)
      : undefined;
  const stock = mentionedStock ?? contextStock;
  if (!stock) return null;

  const asksForFact =
    includesAny(message, COMPANY_FACT_QUERY_PATTERNS) ||
    includesAny(message, [
      "회사",
      "사업",
      "업종",
      "산업",
      "제품",
      "서비스",
      "실적",
      "매출",
      "영업이익",
      "순이익",
      "퍼블리싱",
      "배급",
      "정비",
      "공연",
      "영상",
    ]);
  if (!asksForFact) return null;

  return reply("tool", "stock_facts", "", ["승인 종목 사실 조회"], {
    tool: "approved_stock_facts",
    stockFact: {
      stockId: stock.id,
      topic: findStockFactTopic(message),
    },
  });
}

function reply(
  route: ChatRoute,
  intent: ChatIntent,
  text: string,
  steps: readonly string[] = [],
  extras: Partial<
    Pick<
      ChatReply,
      "suggestedQuestions" | "tool" | "uiAction" | "explainScript" | "stockFact" | "sectorFact"
    >
  > = {},
): ChatReply {
  return {
    route,
    intent,
    // 🤖 본문은 고정 응답 상당수가 아직 반말 원문이라 변환을 유지한다.
    // 🧒 추천질문은 아이가 누르는 자기 말이고 데이터가 이미 해요체라 손대지 않는다(SPEC §3.3.2).
    text: toPoliteKorean(text),
    steps,
    ...extras,
  };
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
      "방금 적은 번호는 답변에서 다시 보여주지 않을게요. 실제 비밀번호라면 앱의 공식 화면에서 바로 바꿔 줘.";
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
      "성향 결과를 친구에게 자동으로 공개하지 않아. 공개 범위가 궁금하면 가족 비교 화면의 안내를 확인해 줘.";
  } else if (message.includes("누가더잘")) {
    familyDataText =
      "나는 부모님의 성향 데이터를 가져오거나 누가 더 잘하는지 점수를 매기지 않아. 성향은 실력이나 성적이 아니라 투자 스타일을 돌아보는 기록이야.";
  } else if (message.includes("똑같이")) {
    familyDataText =
      "나는 엄마의 보유 종목을 채팅에서 알려주거나 그대로 따라 사라고 하지 않아. 서로 공개한 기록은 가족 화면에서 직접 확인할 수 있어.";
  }

  let frustrationText =
    "내 답변이 도움이 되지 않아 답답했구나. 궁금한 부분 하나만 골라 주면 더 짧게 다시 설명할게요.";
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
  const familyDataQuestions = message.includes("성향")
    ? ["내 성향 결과 알려주세요", "가족 비교는 어떻게 봐요?"]
    : ["가족 비교는 어떻게 봐요?", "내 거래 기록 보여주세요"];

  const alternatives: Record<
    UnsafeKind,
    { text: string; steps: readonly string[]; questions: string[] }
  > = {
    crisis: {
      text: "지금 혼자 견디지 않아도 돼. 먼저 지금 안전한지 알려 줘. 급하게 위험하면 가까운 어른이나 112·119에 바로 도움을 요청해 줘.",
      steps: ["안전 확인"],
      questions: ["지금은 안전해요", "도움이 필요해요"],
    },
    credential: {
      text: credentialText,
      steps: ["인증정보 보호 안내"],
      questions: ["키웅이는 무엇을 도와주나요?", "주문 전에 뭘 확인해요?"],
    },
    personalInfo: {
      text: personalInfoText,
      steps: ["개인정보 보호 안내"],
      questions: ["키웅이는 무엇을 도와주나요?", "모의투자 리그 규칙 알려주세요"],
    },
    familyData: {
      text: familyDataText,
      steps: ["가족 데이터 보호 안내"],
      questions: familyDataQuestions,
    },
    proxyAction: {
      text: "나는 다른 사람 대신 주문하거나 주문 버튼을 누를 수 없어. 로그인 정보를 나누지 말고 이 화면에서 주문 내용을 직접 확인해 줘.",
      steps: ["대리 행동 차단"],
      questions: ["매수는 어떻게 하나요?", "주문 전에 뭘 확인해요?"],
    },
    frustration: {
      text: frustrationText,
      steps: ["서비스 불편 지원"],
      questions: includesAny(message, ["숫자", "금액", "계산"])
        ? ["예상 금액이 뭐예요?", "수익률이 뭐예요?"]
        : includesAny(message, ["주문", "취소", "한도"])
          ? ["주문 전에 뭘 확인해요?", "매수는 어떻게 하나요?"]
          : ["키웅이는 무엇을 도와주나요?", "PER이 뭐예요?"],
    },
    familyPressure: {
      text: "부모님 반응이 걱정되거나 누군가 계속 재촉해서 부담스러웠구나. 수익률과 순위는 실력이나 성적표가 아니며, 지금은 화면을 닫고 믿을 수 있는 어른에게 부담된다고 말해도 돼.",
      steps: ["가족 압박 지원"],
      questions: ["수익률이 뭐예요?", "내 거래 기록 보여주세요"],
    },
    comparison: {
      text: "다른 사람의 수익이나 순위와 비교돼 속상했구나. 한 번의 결과나 성향 숫자는 실력이나 사람의 가치를 정하는 점수가 아니야.",
      steps: ["비교 스트레스 지원"],
      questions: ["내 성향 결과 알려주세요", "내 거래 기록 보여주세요"],
    },
    anxiety: {
      text: anxietyText,
      steps: ["불안 지원"],
      questions: ["변동성이 뭐예요?", "내 거래 기록 보여주세요"],
    },
    impulsiveTrade: {
      text: "화가 난 상태에서 전부 팔지, 계속 가질지를 내가 정해 줄 수는 없어. 지금은 주문을 누르지 말고 화면을 닫은 뒤 처음 남긴 이유를 나중에 다시 봐도 돼.",
      steps: ["충동 매매 중단"],
      questions: ["내 거래 기록 보여주세요", "매도는 무슨 뜻이에요?"],
    },
    ethicalDistress: {
      text: "전쟁과 투자 이야기가 불편하게 느껴졌구나. 무엇이 마음에 걸리는지 그 기준을 기록할 수 있지만, 내가 옳고 그름이나 매매 결론을 대신 정하지는 않아.",
      steps: ["윤리 고민 지원"],
      questions: ["투자 근거는 뭐예요?", "위험이 뭐예요?"],
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
    ? [`${stock.name}, 어떤 회사예요?`, `${stock.name}, 어떻게 돈을 벌어요?`]
    : ["종목 검색은 어떻게 해요?", "분산투자가 뭐예요?"];
  const asksForAutomaticBestReturnSelection =
    includesAny(message, ["자동", "앱이"]) &&
    includesAny(message, ["제일수익", "최고수익", "수익좋은"]) &&
    includesAny(message, ["종목", "주식"]);
  const alternatives: Record<
    RecommendationKind,
    { text: string; steps: readonly string[]; questions: string[] }
  > = {
    selection: {
      text: asksForAutomaticBestReturnSelection
        ? "목표 금액이나 예산으로 최고 수익 종목을 자동 선택·매수하는 기능은 없어요. 금액은 사용자가 먼저 고른 종목의 예상 주문 금액을 확인할 때만 사용해요."
        : "특정 종목을 고르거나 대신 결정해 줄 수는 없어요. 대신 회사가 하는 일과 돈을 버는 방식은 함께 볼 수 있어요. 🐻",
      steps: ["종목 선택 차단", "회사 사실 대안"],
      questions: asksForAutomaticBestReturnSelection
        ? ["예상 금액이 뭐예요?", "주문 전에 뭘 확인해요?"]
        : companyQuestions,
    },
    prediction: {
      text: "미래 가격이나 수익을 미리 계산해 줄 수는 없어요. 대신 회사가 하는 일과 가격이 움직이는 뜻은 함께 볼 수 있어요. 🐻",
      steps: ["가격 예측 차단", "변동성 대안"],
      questions: stock
        ? [`${stock.name}, 어떻게 돈을 벌어요?`, "변동성이 뭐예요?"]
        : ["차트가 뭐예요?", "변동성이 뭐예요?"],
    },
    timing: {
      text: "언제 사고팔거나 계속 보유할지는 대신 정해 줄 수 없어요. 대신 그동안 남긴 거래 이유와 주문 전 확인 항목은 같이 볼 수 있어요. 🐻",
      steps: ["매매 시점 차단", "본인 기록 대안"],
      questions: ["내 거래 기록 보여주세요", "주문 전에 뭘 확인해요?"],
    },
    sizing: {
      text: includesAny(message, SOCIAL_PATTERNS)
        ? "다른 사람을 이기거나 혼나지 않기 위한 매수 수량은 정해 줄 수 없어요. 대신 화면의 예상 금액과 주문 내용을 차분히 확인할 수 있어요. 🐻"
        : "몇 주를 사거나 돈을 얼마나 넣을지는 대신 정해 줄 수 없어요. 대신 화면의 예상 금액과 주문 확인 방법은 알려줄 수 있어요. 🐻",
      steps: ["매수 수량 차단", "주문 계산 대안"],
      questions: ["예상 금액이 뭐예요?", "주문 전에 뭘 확인해요?"],
    },
    risk: {
      text: "손해가 없거나 가장 안전하고 인기 있는 종목을 정해 줄 수는 없어요. 대신 투자 위험과 나눠 담는 방법은 설명할 수 있어요. 🐻",
      steps: ["안전 종목 차단", "위험 교육 대안"],
      questions: ["위험이 뭐예요?", "분산투자가 뭐예요?"],
    },
    recovery: {
      text: "손실을 만회할 종목이나 거래를 정해 줄 수는 없어요. 대신 거래 기록과 현재 손익의 뜻은 함께 볼 수 있어요. 🐻",
      steps: ["손실 만회 거래 차단", "본인 기록 대안"],
      questions: ["내 거래 기록 보여주세요", "평가손익이 뭐예요?"],
    },
    social: {
      text: "가족이나 친구의 선택과 수익만 보고 거래를 정해 줄 수는 없어요. 대신 직접 고른 이유와 거래 기록은 함께 돌아볼 수 있어요. 🐻",
      steps: ["추종 거래 차단", "투자 근거 대안"],
      questions: ["내 거래 기록 보여주세요", "투자 근거는 뭐예요?"],
    },
    event: {
      text: "뉴스나 한 가지 사건만으로 미래 가격이나 매매 판단을 정해 줄 수는 없어요. 대신 회사의 수익 구조와 가격 변동의 뜻은 함께 볼 수 있어요. 🐻",
      steps: ["사건 기반 예측 차단", "회사 사실 대안"],
      questions: stock
        ? [`${stock.name}, 어떻게 돈을 벌어요?`, "변동성이 뭐예요?"]
        : ["차트가 뭐예요?", "변동성이 뭐예요?"],
    },
    metric: {
      text: "지표나 통계만으로 종목을 고르거나 미래 가격을 정할 수는 없어요. 대신 각 숫자가 무엇을 보여주는지는 설명할 수 있어요. 🐻",
      steps: ["지표 기반 선택 차단", "금융 개념 대안"],
      questions:
        message.includes("per") || message.includes("pbr")
          ? ["PER이 뭐예요?", "PBR이 뭐예요?"]
          : ["변동성이 뭐예요?", "위험이 뭐예요?"],
    },
  };
  const alternative = alternatives[kind];
  return reply("refusal", "safety", alternative.text, alternative.steps, {
    suggestedQuestions: alternative.questions,
  });
}

function parsePercentageCalculation(message: string) {
  // 아이는 `%` 를 "프로"로도 적는다. 숫자 뒤에 붙을 때만 받아 다른 낱말과 섞이지 않게 한다.
  const percentMatch = message.match(/(\d+(?:\.\d+)?)(?:%|퍼|프로)/);
  const amountMatch = message.match(/(\d+(?:\.\d+)?)(만)?원/);
  if (!percentMatch || !amountMatch) return null;

  const percent = Number(percentMatch[1]);
  const amount = Number(amountMatch[1]) * (amountMatch[2] ? 10_000 : 1);
  if (!Number.isFinite(percent) || !Number.isFinite(amount)) return null;

  return {
    amount,
    change: Math.round((amount * percent) / 100),
    percent,
  };
}

export function termReply(kind: TermKind, message: string): ChatReply {
  let text: string;
  let questions: string[];
  let step: string;

  switch (kind) {
    case "marketBasics": {
      step = "주식·주가·차트 개념 안내";
      questions = ["차트가 뭐예요?", "현재가가 뭐예요?"];
      if (includesAny(message, ["빨간숫자", "숫자빨간색", "차트빨간색"])) {
        text =
          "빨간색이 무엇을 뜻하는지는 먼저 그 화면의 색상 기준을 확인해야 해요. 색만으로 좋은 종목인지, 바로 팔아야 하는지 판단할 수는 없어요. 🐻";
      } else if (includesAny(message, ["1일봉", "일봉데이터"])) {
        text =
          "1일 봉은 한 거래일의 시작 가격, 가장 높은 가격, 가장 낮은 가격, 마지막 가격을 묶어 보여주는 기록이에요. 이미 지나간 하루의 가격 움직임이지 다음 날을 예측하는 값은 아니에요.";
      } else if (includesAny(message, ["현재가와등락률", "현재가랑등락률"])) {
        text =
          "현재가는 화면에 표시된 최근 거래 가격이고, 등락률은 화면이 정한 비교 기준에서 얼마나 달라졌는지를 나타내요. 정확한 기준 시점과 갱신 시각은 그 화면의 표기를 함께 확인해야 해요.";
      } else if (message.includes("그래프선")) {
        text =
          "주가 그래프 선은 선택한 기간의 가격 변화를 이어 본 기록이에요. 회사의 전체 역사나 미래를 모두 보여주는 선은 아니에요.";
      } else if (includesAny(message, ["차트위로", "그래프위로"])) {
        text =
          "차트가 위로 향했다면 선택한 과거 기간에 가격이 높아진 구간이 있다는 뜻이에요. 그 모양만으로 앞으로도 계속 오른다고 볼 수는 없어요.";
      } else {
        text =
          "주가는 주식 한 주가 최근에 거래된 가격이에요. 회사의 모든 가치가 그대로 적힌 정답표는 아니고 거래에 따라 달라질 수 있어요.";
      }
      break;
    }
    case "profitLoss": {
      step = "수익률·손익 개념 안내";
      questions = ["수익률이 뭐예요?", "평가손익이 뭐예요?"];
      const calculation = parsePercentageCalculation(message);
      if (calculation) {
        const decreases = includesAny(message, ["떨어", "내리", "하락", "손실", "줄어"]);
        const total = decreases
          ? calculation.amount - calculation.change
          : calculation.amount + calculation.change;
        const direction = decreases ? "줄어든" : "오른";
        text = `${formatWon(calculation.amount)}의 ${calculation.percent}%는 ${formatWon(calculation.change)}이에요. ${calculation.percent}% ${direction} 상황이라면 거래 비용을 빼기 전 금액은 ${formatWon(total)}이에요.`;
      } else if (message.includes("손실률")) {
        text =
          "손실률 -12%는 기준 금액보다 가치가 12% 줄어든 상태라는 뜻이에요. 아직 보유 중이면 평가손익이고, 팔아 거래가 끝났다면 실현손익으로 남아요.";
      } else {
        text =
          "수익률이 마이너스라는 것은 기준 금액보다 현재 값이 줄었다는 뜻이에요. 아직 팔지 않았다면 확정된 손실이 아니라 바뀔 수 있는 평가손익이에요.";
      }
      break;
    }
    case "valuation": {
      step = "가치평가 지표 안내";
      questions = ["PER이 뭐예요?", "PBR이 뭐예요?"];
      if (message.includes("per") && message.includes("pbr")) {
        text =
          "PER은 이익과 가격을, PBR은 순자산과 가격을 비교해서 서로 보는 대상이 달라요. 어느 하나가 항상 더 믿을 만한 것은 아니고 같은 업종의 여러 정보와 함께 봐야 해요.";
      } else if (message.includes("pbr") && includesAny(message, ["1보다낮", "아래", "저평가"])) {
        text =
          "PBR이 1보다 낮아도 무조건 저평가라고 결론 낼 수는 없어요. 자산의 내용, 회사가 이익을 내는 힘, 같은 업종의 수치도 함께 확인해야 해요.";
      } else if (includesAny(message, ["업종평균", "고평가라고바로"])) {
        text =
          "PER이 업종 평균보다 높다는 사실만으로 바로 고평가라고 결론 낼 수는 없어요. 이익의 변화와 사업 구조처럼 수치가 달라진 이유도 함께 봐야 해요.";
      } else if (includesAny(message, ["적용돼", "적용해", "보면되는", "보면돼"])) {
        text =
          "PER은 방산·식품 같은 업종에도 계산할 수 있지만 이익 구조가 비슷한 회사끼리 비교해야 이해하기 쉬워요. PER 하나만으로 회사가 싸거나 좋다고 정할 수는 없어요.";
      } else if (
        includesAny(message, ["오르면", "오른다고", "올라가면", "높아지면", "뛰면", "치솟으면"])
      ) {
        text =
          "PER이 오른다고 무조건 좋은 건 아니에요. 주가가 오르거나 이익이 줄면 PER도 오를 수 있어서, 같은 업종의 PER이나 이익 변화도 함께 봐야 해요.";
      } else {
        text =
          "PER이 낮다는 사실만으로 주식이 싸거나 좋은 선택이라고 정할 수는 없어요. 이익이 일시적으로 달라졌는지와 같은 업종의 다른 정보도 함께 봐야 해요.";
      }
      break;
    }
    case "orderConcept": {
      step = "주문 방식·매매 용어 안내";
      questions = ["시장가가 뭐예요?", "지정가가 뭐예요?"];
      if (message.includes("손절")) {
        text =
          "손절은 산 가격보다 낮은 가격에 팔아 손실을 확정하는 거래를 뜻해요. 언제 손절할지는 제가 정해 주지 않지만 평가손익과 실현손익의 차이는 설명할 수 있어요.";
      } else {
        text =
          "시장가는 빠른 체결을 우선하고 지정가는 내가 정한 가격을 우선하는 주문이에요. 어느 방식이 항상 더 싸다고 할 수 없고 지정가는 조건이 맞지 않으면 바로 체결되지 않을 수 있어요.";
      }
      break;
    }
    case "industryConcept": {
      step = "회사·산업 금융 개념 안내";
      questions = includesAny(message, ["이자수익", "예대마진"])
        ? ["예대마진이 뭐예요?", "주가가 뭐예요?"]
        : ["키움증권은 어떤 회사예요?", "키움증권은 어떻게 돈을 벌어요?"];
      if (message.includes("ipo")) {
        text =
          "IPO는 회사가 주식을 시장에 처음 공개해 투자자가 거래할 수 있게 준비하는 과정이에요. 증권사는 이 과정에서 서류 준비, 가격과 물량 결정, 투자자 모집 같은 일을 도울 수 있어요.";
      } else if (includesAny(message, ["증권사가", "증권사는"])) {
        text =
          "증권사는 주식 같은 금융상품을 사고팔 수 있게 연결하고 기업의 자금 조달을 돕는 회사예요. 거래 수수료와 기업금융 같은 여러 사업으로 돈을 벌 수 있어요.";
      } else if (message.includes("예대마진")) {
        text =
          "예대마진은 은행이 대출에서 받는 이자율과 예금에 주는 이자율의 차이를 말해요. 은행 수익을 보는 한 요소지만 주가를 혼자 결정하지는 않아요.";
      } else if (includesAny(message, ["칩과메모리", "칩이랑메모리"])) {
        text =
          "칩은 반도체 부품을 넓게 부르는 말이고 메모리는 정보를 저장하는 칩의 한 종류예요. 그래서 같은 말은 아니고 메모리가 칩에 포함돼요.";
      } else {
        text =
          "이자수익은 은행이 예금·대출 같은 본업에서 번 돈이고, 주식 가격의 변화는 시장에서 거래된 값의 변화예요. 서로 영향을 줄 수는 있지만 같은 숫자는 아니에요.";
      }
      break;
    }
    case "causality": {
      step = "가격 인과관계 안내";
      questions = ["변동성이 뭐예요?", "차트가 뭐예요?"];
      if (message.includes("뉴스")) {
        text =
          "뉴스가 나온 날에도 주가가 바로 움직인다고 보장할 수는 없어요. 뉴스 내용뿐 아니라 이미 알려졌는지와 시장 상황 등 여러 요인이 함께 작용해요.";
      } else if (message.includes("주가가내려가면회사")) {
        text =
          "주가가 내려갔다고 회사가 하는 일이나 사실이 바로 바뀐 것은 아니에요. 가격 변화와 회사의 사업·실적 변화는 구분해서 확인해야 해요.";
      } else if (message.includes("원래이렇게잘떨어")) {
        text =
          "식품 업종이라는 이유만으로 주가가 원래 잘 떨어진다고 말할 수는 없어요. 회사 실적, 원재료 가격, 시장 상황처럼 여러 조건을 나눠 봐야 해요.";
      } else {
        text =
          "기름값이나 에너지 가격과 관련 회사 주가가 꼭 같은 방향으로 움직이는 것은 아니에요. 비용 구조, 판매 가격, 환율과 시장 기대처럼 다른 요인도 함께 작용해요.";
      }
      break;
    }
    case "profileStatistics": {
      step = "성향·통계 개념 안내";
      questions = ["내 성향 결과 알려주세요", "내 지난 시즌 기록 보여주세요"];
      if (message.includes("표준편차")) {
        text =
          "표준편차는 숫자들이 평균에서 얼마나 퍼져 있는지 나타내는 통계예요. 현재 서비스의 성향은 표준편차가 아니라 근거력·직관력·집중력·분산력·정확력 기록으로 보여줘요.";
      } else if (includesAny(message, ["평균이랑중앙값", "평균과중앙값", "평균하고중앙값"])) {
        text =
          "평균은 모든 값을 더해 개수로 나눈 값이고 중앙값은 순서대로 놓았을 때 가운데 값이에요. 현재 성향 캐릭터는 이 둘의 평균이 아니라 근거·직관과 집중·분산의 조합으로 정해요.";
      } else if (message.includes("상관관계")) {
        text =
          "상관관계가 높다는 것은 두 행동이 함께 늘거나 줄어드는 모습이 자주 보인다는 뜻이에요. 한 행동이 다른 행동의 원인이라고 바로 결론 내리는 말은 아니에요.";
      } else if (message.includes("위험감수성")) {
        text =
          "위험감수성은 보통 가격 변화나 손실 가능성을 얼마나 받아들이는지 설명하는 말이에요. 현재 서비스는 위험감수성 축을 쓰지 않고 다섯 능력치로 행동 기록을 보여줘요.";
      } else if (message.includes("공격성축")) {
        text =
          "현재 서비스에는 공격성 축이 없고 한 행동만으로 위험한 사람이라고 판단하지 않아요. 다섯 능력치는 실력이나 위험 등급이 아니라 행동을 돌아보는 기록이에요.";
      } else if (message.includes("성향점수")) {
        text =
          "현재 서비스는 거래 표본의 평균으로 하나의 성향 점수를 만들지 않아요. 매수 전 자료 확인, 보유 섹터와 현금 비중, 거래 뒤 5거래일 기록을 나누어 보여줘요.";
      } else {
        text =
          "현재 서비스는 다섯 능력치의 평균으로 성향을 정하지 않아요. 근거·직관과 집중·분산의 조합으로 네 가지 캐릭터를 만들고, 정확력은 따로 보여줘요.";
      }
      break;
    }
    case "reasonTag": {
      step = "근거 태그 안내";
      questions = ["투자 근거는 뭐예요?", "주문 전에 뭘 확인해요?"];
      text =
        "근거 태그는 회사를 고를 때 무엇을 보고 생각했는지 기록하는 항목이에요. 자료의 정답이나 신뢰도를 판정하는 표시는 아니고 나중에 내 판단 과정을 돌아보기 위한 분류예요.";
      break;
    }
    case "riskStrategy": {
      step = "분산·레버리지 개념 안내";
      questions = ["분산투자가 뭐예요?", "위험이 뭐예요?"];
      if (message.includes("레버리지") || message.includes("몰빵")) {
        text =
          "몰빵은 가진 돈을 한 곳에 집중하는 것이고 레버리지는 빌린 돈이나 상품 구조로 가격 변화의 영향을 키우는 것이어서 같은 말이 아니에요. 둘 다 손실 위험을 크게 만들 수 있어요.";
      } else {
        text =
          "분산투자는 수익을 일부러 나누는 것이 아니라 한 종목에만 의존하지 않도록 투자 대상을 나누는 방법이에요. 이 방법도 수익이나 손실 방지를 보장하지는 않아요.";
      }
      break;
    }
  }

  return reply("faq", "financial_concept", text, [step], {
    suggestedQuestions: questions,
  });
}

function metaReply(kind: MetaKind, message: string): ChatReply {
  let text: string;
  let questions: string[];
  let step: string;

  switch (kind) {
    case "identity": {
      step = "AI 정체 안내";
      questions = ["키웅이는 무엇을 도와주나요?", "답변에 쓰는 정보는 어디서 와요?"];
      if (includesAny(message, ["길게하지", "사람임ai임"])) {
        text = "나는 사람이 아닌 AI 도우미 키웅이야.";
      } else if (includesAny(message, ["뒤에서사람", "사람이뒤에서", "사람이답쓰", "사람이채팅"])) {
        text =
          "나는 사람이 뒤에서 실시간으로 답을 쓰는 상담원이 아니라 AI 도우미예요. 사람이 미리 검수한 정보와 안전 규칙을 바탕으로 자동으로 답해요.";
      } else if (message.includes("상담원")) {
        text =
          "나는 실제 증권사 상담원이나 투자자문가가 아니라 투자 기초를 설명하는 AI 프로그램이에요. 거래 결정을 내리거나 주문을 대신하지 않아요.";
      } else {
        text =
          "나는 사람이 아니라 이 서비스의 AI 도우미 키웅이예요. 사람처럼 대화하지만 투자 결정이나 거래를 대신하지 않아요.";
      }
      break;
    }
    case "persona": {
      step = "AI 성격·경험 안내";
      if (includesAny(message, ["키웅이이름", "키웅이라는이름"])) {
        text =
          "나는 이 서비스의 AI 도우미 키웅이예요. 누가 이름을 지었는지는 내가 확인할 수 있는 승인 정보에 없어서 지어내어 말하지 않아요.";
        questions = ["키웅이는 무엇을 도와주나요?", "답변에 쓰는 정보는 어디서 와요?"];
      } else if (includesAny(message, ["아이돌팬", "최애"])) {
        text =
          "나는 팬심이나 최애가 있는 사람이 아니어서 특정 가수나 회사를 좋아하는 척하지 않아요. 대신 검수된 엔터테인먼트 회사 사실은 설명할 수 있어요.";
        questions = ["에스엠은 어떤 회사예요?", "엔터 회사는 어떻게 돈을 벌어요?"];
      } else if (includesAny(message, ["주식들고", "보유종목", "계좌있", "추천하는척"])) {
        text =
          "나는 투자 계좌나 보유 종목이 없고 특정 회사에서 개인적인 이익을 얻지 않아요. 그래서 가진 종목을 유리하게 말하거나 추천하는 척하지 않아요.";
        questions = ["크래프톤은 어떤 회사예요?", "투자 근거는 뭐예요?"];
      } else if (
        includesAny(message, [
          "돈벌어본",
          "투자직접해본",
          "투자해본",
          "거래해본",
          "왜추천안",
          "추천을안",
          "추천하지않",
          "추천못",
          "추천은못",
          "못추천",
          "왜못골",
          "왜안골",
          "못고른다고",
        ])
      ) {
        text =
          "나는 직접 투자하거나 돈을 벌어 본 사람이 아니에요. 경험이 없어서가 아니라 사용자가 스스로 근거를 살피도록 돕기 위해 종목을 대신 고르지 않아요.";
        questions = ["투자 근거는 뭐예요?", "주문 전에 뭘 확인해요?"];
      } else {
        text =
          "나는 기분이나 하기 싫다는 감정을 느끼지 않는 AI예요. 사용자는 언제든 대화를 멈추거나 투자 화면에서 쉬어도 돼요.";
        questions = ["키웅이는 무엇을 도와주나요?", "리그 참여 규칙 알려주세요"];
      }
      break;
    }
    case "reliability": {
      step = "오류·책임 범위 안내";
      questions = ["답변에 쓰는 정보는 어디서 와요?", "주문 전에 뭘 확인해요?"];
      if (includesAny(message, ["거래", "주문", "책임"])) {
        text =
          "내 답변도 틀릴 수 있어서 그 답만으로 거래 결론을 내리거나 주문이 자동으로 실행되지는 않아요. 모의투자에서도 출처와 화면 값을 확인한 뒤 사용자가 직접 선택해요.";
      } else if (message.includes("사람처럼")) {
        text =
          "이해하기 쉽도록 사람과 대화하는 것처럼 말하지만 나는 AI예요. 자연스러운 말투가 답의 정확성을 보장하지는 않아요.";
      } else {
        text =
          "내 답변도 틀릴 수 있어요. 승인 정보와 출력 검사를 사용하지만 중요한 회사 사실은 출처와 검수일을 함께 확인해요.";
      }
      break;
    }
    case "neutrality": {
      step = "중립성 안내";
      if (includesAny(message, ["엄마", "아빠", "부모", "내편", "누구편", "편들"])) {
        text =
          "나는 부모나 자녀 어느 한쪽 편을 들지 않아요. 같은 안전·개인정보 원칙을 적용하고, 각 사용자가 볼 수 있는 본인 데이터와 현재 화면에 맞춰 답해요.";
        questions = ["가족 비교 화면은 어디예요?", "내 데이터는 어떻게 사용해요?"];
      } else if (message.includes("방산")) {
        text =
          "나는 방산 투자에 찬성하거나 반대하는 개인 의견이 없어요. 방산 회사의 검수된 사실과 사용자가 남긴 투자 근거만 중립적으로 설명해요.";
        questions = ["방산 회사는 어떤 일을 해요?", "내 투자 근거 보여주세요"];
      } else {
        text =
          "나는 개인적인 의견이 없고 승인된 정보와 서비스 규칙에 따라 답해요. 답할 수 없는 범위와 정보의 한계도 숨기지 않아요.";
        questions = ["답변에 쓰는 정보는 어디서 와요?", "키웅이는 무엇을 도와주나요?"];
      }
      break;
    }
    case "system": {
      step = "답변 근거·동작 안내";
      if (includesAny(message, ["내부코드", "상태머신", "시스템프롬프트", "숨은프롬프트", "원문프롬프트", "내부로직", "추론과정"])) {
        text =
          "채팅에서 내부 코드·숨은 설정·내부 추론을 그대로 보여주지는 않아요. 질문 분류, 승인 정보 확인, 출력 검사라는 동작 원리는 설명할 수 있어요.";
        questions = ["답변에 쓰는 정보는 어디서 와요?", "키웅이는 무엇을 도와주나요?"];
      } else if (includesAny(message, ["의도분류", "종류를어떻게나누", "어떤규칙", "분류해"])) {
        text =
          "질문의 목적과 안전 신호를 보고 보호 안내, 서비스 규칙, 추천·예측, 금융 개념, 회사 사실, 본인 기록 같은 경로로 나눠요. 애매한 질문을 투자 결론으로 추측하지 않아요.";
        questions = ["키웅이는 무엇을 도와주나요?", "주문 전에 뭘 확인해요?"];
      } else if (includesAny(message, ["내데이터", "내기록", "통계", "마음대로분석"])) {
        text =
          "성향과 기록 수치는 정해진 서버 계산 규칙과 읽기 전용 본인 데이터로 만들어요. 나는 그 결과를 설명하며 임의로 성향을 채점하지 않아요.";
        questions = ["내 성향 결과 알려주세요", "내 지난 시즌 기록 보여주세요"];
      } else if (includesAny(message, ["계산기처럼", "숫자만비교", "회사내용도판단", "엔진이계산", "임의로계산"])) {
        text =
          "명시된 값의 단순 계산과 승인된 회사 사실 설명은 할 수 있어요. 숫자나 회사 내용을 이용해 우열이나 매수 결론을 판단하지는 않아요.";
        questions = ["PER이 뭐예요?", "삼성전자는 어떤 회사예요?"];
      } else {
        text =
          "승인된 금융 용어·서비스 안내·회사 데이터와 현재 화면, 권한이 확인된 본인 기록을 바탕으로 답해요. 공개 웹이나 출처 없는 기억을 회사 사실의 근거로 쓰지 않아요.";
        questions = ["키웅이는 무엇을 도와주나요?", "주문 전에 뭘 확인해요?"];
      }
      break;
    }
    case "realtime": {
      step = "실시간·출처 안내";
      if (message.includes("뉴스")) {
        text =
          "오늘 올라온 뉴스를 공개 웹에서 실시간으로 찾아오지는 않아요. 검수된 회사 정보까지만 설명하고 확인되지 않은 새 소식을 사실이라고 말하지 않아요.";
        questions = ["삼성전자는 어떤 회사예요?", "변동성이 뭐예요?"];
      } else if (message.includes("per")) {
        text =
          "이 앱에서 PER 숫자를 보여줄 때는 화면의 모의 시세와 검수된 재무 데이터의 기준 기간을 함께 확인해야 해요. 출처나 갱신 시각을 확인할 수 없으면 내가 임의로 숫자를 채우지 않아요.";
        questions = ["PER이 뭐예요?", "현재가가 뭐예요?"];
      } else {
        text =
          "나는 주가를 대충 만들어 말하지 않아요. 현재가는 화면에 제공된 값을 사용하고, 실시간·지연·데모 여부는 화면의 출처와 갱신 시각으로 확인해야 해요.";
        questions = ["현재가가 뭐예요?", "차트가 뭐예요?"];
      }
      break;
    }
    case "forecastBoundary": {
      step = "미래 전망 제외 안내";
      text =
        "회사 설명은 검수된 제품·서비스와 과거 사실을 다뤄요. 미래 성과나 가격 방향은 확인된 사실이 아니고 투자 판단을 유도할 수 있어서 넣지 않아요.";
      questions = ["회사는 어떻게 돈을 벌어요?", "변동성이 뭐예요?"];
      break;
    }
    case "autonomy": {
      step = "사용자 선택권 안내";
      text =
        "대화나 거래를 강제로 계속시키지 않아요. 그만하고 싶으면 언제든 ‘여기까지’라고 말하거나 화면을 닫고 쉬어도 돼요.";
      questions = ["키웅이는 무엇을 도와주나요?", "리그 참여 규칙 알려주세요"];
      break;
    }
  }

  return reply("faq", "general_allowed", text, [step], {
    suggestedQuestions: questions,
  });
}

function companyFactReply(
  kind: CompanyFactKind,
  message: string,
  context: ChatContext,
): ChatReply {
  let text: string;
  let questions: string[];
  let step: string;

  switch (kind) {
    case "game": {
      questions = ["게임 회사는 어떻게 돈을 벌어요?", "게임 개발과 퍼블리싱은 뭐가 달라요?"];
      if (includesAny(message, ["신작", "출시전", "나오기전"])) {
        step = "업종 수익 구조 안내";
        text =
          "신작이 나오기 전에도 기존 게임의 판매와 운영, 게임 안 디지털 서비스에서 수입이 생길 수 있어요. 정확한 수익 구조는 회사마다 달라요.";
      } else if (includesAny(message, ["퍼블리싱", "퍼블리셔", "배급"])) {
        step = "산업 가치사슬 안내";
        text =
          "게임 회사는 게임을 직접 개발하기도 하고, 다른 개발사의 게임을 이용자에게 출시·운영하는 퍼블리싱도 해요. 회사마다 두 역할을 맡는 범위는 달라요.";
      } else {
        step = "업종 제품·서비스 안내";
        text =
          "게임 회사는 PC·모바일·콘솔 게임을 만들고, 이용자가 계속 즐길 수 있도록 출시 뒤에도 서비스하고 운영해요.";
      }
      break;
    }
    case "logistics": {
      questions = ["CJ대한통운은 어떤 회사예요?", "HMM은 어떤 회사예요?"];
      if (message.includes("비교")) {
        step = "회사 사업 비교 안내";
        text =
          "승인 데이터의 같은 항목으로 비교할 수 있어요. CJ대한통운은 택배·보관·분류·운송, HMM은 해상 컨테이너 운송, 현대글로비스는 차량과 화물의 운송·보관·유통을 중심으로 설명할 수 있고 우열은 정하지 않아요.";
      } else if (includesAny(message, ["창고", "보관", "운송만"])) {
        step = "업종 제품·서비스 안내";
        text =
          "물류 회사는 운송만 하는 것이 아니라 물건 보관, 분류, 창고 운영과 유통도 맡을 수 있어요. 해운처럼 운송이 중심인 회사도 있어 회사별 사업 범위는 달라요.";
      } else {
        step = "산업 가치사슬 안내";
        text =
          "물류 회사는 생산된 물건이 창고와 가게, 집까지 이동하도록 운송·보관·분류를 연결해요. 육상 운송, 택배, 해운처럼 맡는 구간은 회사마다 달라요.";
      }
      break;
    }
    case "semiconductor": {
      step = "업종 제품·서비스 안내";
      text =
        "반도체 회사는 전자기기가 계산하고 정보를 기억하도록 돕는 칩을 설계하거나 만들어요. 메모리와 시스템 반도체처럼 맡는 제품은 회사마다 달라요.";
      questions = ["삼성전자는 반도체 산업에서 어떤 역할을 해요?", "SK하이닉스는 어떤 회사예요?"];
      break;
    }
    case "defense": {
      step = "업종 제품·서비스 안내";
      text =
        "방산 회사는 국방·항공 장비와 부품을 개발·제조하고, 회사에 따라 납품 뒤 정비도 맡아요. 모든 방산 회사가 같은 장비와 서비스를 제공하는 것은 아니에요.";
      questions = ["한화에어로스페이스는 어떤 회사예요?", "방산 회사는 어떻게 돈을 벌어요?"];
      break;
    }
    case "food": {
      step = includesAny(message, ["돈벌", "수익"]) ? "업종 수익 구조 안내" : "업종 제품·서비스 안내";
      text =
        "식품 회사는 원재료를 식품으로 만들고 포장해 가게와 온라인 유통망으로 보내요. 제품을 국내외 유통망과 소비자에게 판매해 대가를 받아요.";
      questions = ["오리온은 어떤 회사예요?", "식품 회사는 제품을 어떻게 유통해요?"];
      break;
    }
    case "energy": {
      questions = ["한국전력은 어떤 회사예요?", "에너지 회사는 어떻게 돈을 벌어요?"];
      if (includesAny(message, ["전기", "가정", "집까지", "발전소"])) {
        step = "산업 가치사슬 안내";
        text =
          "발전소에서 만든 전기는 송전선으로 멀리 이동한 뒤 배전선을 거쳐 가정·학교·공장에 전달돼요. 한국전력은 발전된 전기가 이용자에게 닿도록 전력망을 운영해요.";
      } else {
        step = "업종 제품·서비스 안내";
        text =
          "에너지 회사는 전기를 공급하거나 원유를 연료·화학 원료로 가공하는 등 서로 다른 일을 해요. 발전·전력망·정유 중 어디를 맡는지는 회사마다 달라요.";
      }
      break;
    }
    case "entertainment": {
      step = "산업 가치사슬 안내";
      text =
        "엔터 회사는 아티스트와 함께 음악·영상 콘텐츠를 기획·제작하고 홍보·유통·공연·팬 서비스를 연결해요. 가수의 활동을 관리하는 일만 하는 것은 아니에요.";
      questions = ["하이브는 어떤 회사예요?", "엔터 회사는 어떻게 돈을 벌어요?"];
      break;
    }
    case "retail": {
      questions = ["유통 회사는 어떻게 돈을 벌어요?", "유통 회사와 제조 회사는 뭐가 달라요?"];
      if (includesAny(message, ["온라인주문", "어떤순서", "배송과정", "보내"])) {
        step = "산업 가치사슬 안내";
        text =
          "온라인 주문은 보통 주문 확인, 재고 확인, 물건 고르기와 포장, 배송 연결 순서로 진행돼요. 창고와 매장 중 어디서 보내는지는 회사마다 달라요.";
      } else if (includesAny(message, ["직접만드는", "제조회사", "제조사", "뭐가달라"])) {
        step = "회사 사업 비교 안내";
        text =
          "제조 회사는 제품을 만드는 일이 중심이고 유통 회사는 공급자·매장·온라인 채널과 고객을 연결하는 일이 중심이에요. 한 회사가 제조와 유통을 함께 할 수도 있어요.";
      } else if (includesAny(message, ["어디서사", "사와서", "공급자"])) {
        step = "산업 가치사슬 안내";
        text =
          "유통 회사는 브랜드·제조사 같은 공급자와 상품을 거래해 매장이나 온라인에서 고객에게 연결해요. 상품을 확보하는 계약 방식은 회사와 상품마다 달라요.";
      } else {
        step = "업종 수익 구조 안내";
        text =
          "유통 회사는 상품을 고르고 매장·온라인 채널에서 판매해 대가를 받아요. 상품 공급자와 고객을 연결하는 과정에서 매장·물류 서비스도 운영할 수 있어요.";
      }
      break;
    }
    case "finance": {
      questions = ["은행은 어떻게 돈을 벌어요?", "키움증권은 어떤 회사예요?"];
      if (message.includes("은행") && message.includes("증권사")) {
        step = "회사 사업 비교 안내";
        text =
          "은행과 증권사는 모두 금융회사지만 중심 역할이 달라요. 은행은 예금·대출·송금, 증권사는 투자자의 주문 중개와 기업금융·금융상품 서비스를 주로 맡아요.";
      } else {
        step = "업종 수익 구조 안내";
        text =
          "은행은 예금으로 받은 돈을 대출하고 생기는 이자 차이와 결제·송금 같은 금융서비스의 대가로 수익을 만들어요. 정확한 수익 구성은 은행마다 달라요.";
      }
      break;
    }
    case "automotive": {
      questions = ["자동차 회사는 어떻게 돈을 벌어요?", "현대모비스는 어떤 회사예요?"];
      if (includesAny(message, ["실적", "많이팔", "무조건좋", "바로좋"])) {
        step = "실적 인과관계 안내";
        text =
          "차량 판매량은 실적에 영향을 주는 한 요소지만 많이 팔았다고 실적이 바로 좋아진다고 단정할 수는 없어요. 판매 가격, 차종 구성, 부품비와 여러 비용도 함께 봐야 해요.";
      } else {
        step = "업종 제품·서비스 안내";
        text =
          "자동차 회사는 차량을 설계·제조·판매하고 부품과 관련 서비스를 제공할 수 있어요. 완성차·부품·렌털처럼 맡는 역할은 회사마다 달라요.";
      }
      break;
    }
    case "shipbuilding": {
      step = includesAny(message, ["돈", "대가", "받는"]) ? "업종 수익 구조 안내" : "업종 제품·서비스 안내";
      text =
        "조선 회사는 선주와 기업에 선박·해양 설비를 설계·건조해 공급하고 관련 정비 서비스로 대가를 받아요. 구체적인 지급 시점과 방식은 계약마다 달라요.";
      questions = ["HD현대중공업은 어떤 회사예요?", "조선 회사는 산업에서 어떤 역할을 해요?"];
      break;
    }
    case "airline": {
      step = includesAny(message, ["돈벌", "수익"]) ? "업종 수익 구조 안내" : "업종 제품·서비스 안내";
      text =
        "항공 회사는 승객과 화물을 비행기로 옮기고 회사에 따라 정비·여행 관련 서비스도 제공해요. 항공권과 화물 운송 등 서비스의 대가로 수익을 만들어요.";
      questions = ["대한항공은 어떤 회사예요?", "대한항공은 어떻게 돈을 벌어요?"];
      break;
    }
    case "cosmetics": {
      questions = ["에이피알은 어떤 회사예요?", "화장품 회사는 어떻게 돈을 벌어요?"];
      if (includesAny(message, ["새제품", "신제품", "이화면", "나와"])) {
        step = "승인 사실 범위 안내";
        text =
          "이 화면에서는 검수된 제품·서비스 범주와 회사 역할을 볼 수 있어요. 최신 신제품 이야기는 승인 데이터에 포함된 경우에만 확인할 수 있어요.";
      } else {
        step = "업종 제품·서비스 안내";
        text =
          "화장품 회사는 피부 관리·메이크업 제품을 연구·기획·제조·판매하고, 회사에 따라 생활용품이나 뷰티 기기도 다뤄요. 제품 효능은 회사 사실만으로 단정하지 않아요.";
      }
      break;
    }
    case "generalRevenue": {
      step = "업종 수익 구조 안내";
      text =
        "회사는 제품을 산 소비자나 서비스를 이용한 기업·기관에게 대가를 받아 수익을 만들어요. 누구에게 무엇을 제공하는지는 회사마다 달라요.";
      questions = ["삼성전자는 어떻게 돈을 벌어요?", "은행은 어떻게 돈을 벌어요?"];
      break;
    }
    case "factCheck": {
      step = "승인 사실 범위 안내";
      text =
        "최신 뉴스 전체를 여기서 직접 검증하지는 않아요. 승인된 회사 정보와 일치하는 범위만 확인할 수 있고, 검수되지 않은 새 소식은 사실이라고 단정하지 않아요.";
      const contextStock =
        context.screen === "stock" || context.screen === "order"
          ? STOCKS.find((stock) => stock.id === context.stockId)
          : undefined;
      questions = contextStock
        ? [
            `${contextStock.name}은 어떤 회사예요?`,
            `${contextStock.name}의 검수된 과거 실적 알려주세요`,
          ]
        : ["지원 종목은 어디서 봐요?", "키웅이는 무엇을 도와주나요?"];
      break;
    }
    case "universe": {
      step = "종목 유니버스 사실 안내";
      text =
        "지원 종목에는 은행 말고 증권사인 키움증권도 있어요. 금융지주 회사들은 은행뿐 아니라 카드·증권·보험 계열 사업도 함께 연결해요.";
      questions = ["키움증권은 어떤 회사예요?", "은행과 증권사는 뭐가 달라요?"];
      break;
    }
  }

  return reply("faq", "stock_facts", text, [step], {
    suggestedQuestions: questions,
  });
}

function offtopicReply(kind: OfftopicKind, message: string): ChatReply {
  let text: string;
  let questions: string[];
  let step: string;

  switch (kind) {
    case "schoolwork": {
      step = "학습·과제 범위 안내";
      text =
        "숙제 답을 대신 쓰거나 학교 과제를 풀어 주지는 못해요. 대신 이 서비스에서 쓰는 투자 개념은 쉬운 말로 설명할 수 있어요. 🐻";
      if (includesAny(message, ["수학", "분수", "확률", "평균", "중앙값"])) {
        questions = ["수익률이 뭐예요?", "변동성이 뭐예요?"];
      } else if (includesAny(message, ["경제", "뉴스", "예대마진"])) {
        questions = ["주식이 뭐예요?", "PER이 뭐예요?"];
      } else {
        questions = ["주식이 뭐예요?", "키웅이는 무엇을 도와주나요?"];
      }
      break;
    }
    case "schoolLife": {
      step = "일상·학교생활 범위 안내";
      text =
        "학교 준비물·급식·생활 정보는 이 서비스에서 확인할 수 없어요. 대신 투자 서비스 사용법이나 금융 기초를 물어봐 주세요. 🐻";
      questions = ["키웅이는 무엇을 도와주나요?", "리그 참여 규칙 알려주세요"];
      break;
    }
    case "dailyLife": {
      step = "일상 생활·음식·요리 범위 안내";
      text =
        "음식을 만들거나 메뉴를 고르는 생활 조언은 이 서비스에서 도와줄 수 없어요. 대신 금융 기초와 모의투자 서비스 사용법은 설명할 수 있어요. 🐻";
      questions = ["주식이 뭐예요?", "주문 전에 뭘 확인해요?"];
      break;
    }
    case "game": {
      step = "게임·놀이 범위 안내";
      text =
        "게임 공략·캐릭터·경기 결과·닉네임은 도와줄 수 없어요. 대신 검수된 게임 회사가 어떤 일을 하고 돈을 버는지는 설명할 수 있어요. 🐻";
      questions = ["크래프톤은 어떤 회사예요?", "크래프톤은 어떻게 돈을 벌어요?"];
      break;
    }
    case "videoSocial": {
      step = "영상·SNS 범위 안내";
      const asksToHideViewing = includesAny(message, ["부모님몰래", "엄마몰래", "아빠몰래"]);
      const asksAboutInvestmentContent = includesAny(message, [
        "주식",
        "수익",
        "투자",
        "떡상",
        "삼성전자",
      ]);
      text = asksToHideViewing
        ? "가족 몰래 볼 채널을 골라 주거나 시청을 숨기는 방법은 도와주지 않아요. 대신 이 서비스의 안전한 투자 학습 기능은 설명할 수 있어요. 🐻"
        : asksAboutInvestmentContent
          ? "외부 영상이나 SNS 내용을 가져와 분석하거나 사실인지 판정할 수 없어요. 대신 검수된 회사 정보와 투자 근거를 확인하는 방법은 설명할 수 있어요. 🐻"
          : "영상이나 SNS 콘텐츠를 찾거나 요약하고 조회수를 늘리는 일은 도와줄 수 없어요. 대신 투자 서비스 사용법과 금융 기초는 설명할 수 있어요. 🐻";
      questions = asksAboutInvestmentContent
        ? ["투자 근거는 뭐예요?", "변동성이 뭐예요?"]
        : ["키웅이는 무엇을 도와주나요?", "주식이 뭐예요?"];
      break;
    }
    case "entertainment": {
      step = "비금융 콘텐츠 범위 안내";
      text =
        "노래·웹툰·영화·드라마를 찾거나 골라 주지는 못해요. 대신 검수된 엔터테인먼트 회사가 어떤 일을 하고 돈을 버는지는 설명할 수 있어요. 🐻";
      questions = ["에스엠은 어떤 회사예요?", "에스엠은 어떻게 돈을 벌어요?"];
      break;
    }
    case "career": {
      step = "진로 범위 안내";
      text =
        "취업·인턴 준비 같은 진로 상담은 이 서비스 범위가 아니에요. 대신 증권사가 어떤 일을 하고 돈을 버는지는 설명할 수 있어요. 🐻";
      questions = ["키움증권은 어떤 회사예요?", "키움증권은 어떻게 돈을 벌어요?"];
      break;
    }
    case "coding": {
      step = "코딩 범위 안내";
      text =
        "코드를 작성하거나 그래프 만드는 방법을 알려주는 일은 이 서비스 범위가 아니에요. 대신 화면에 나온 성향 결과와 투자 기록의 뜻은 설명할 수 있어요. 🐻";
      questions = ["내 성향 결과 알려주세요", "내 지난 시즌 기록 보여주세요"];
      break;
    }
  }

  return reply("outOfScope", "safety", text, [step], {
    suggestedQuestions: questions,
  });
}

function unclassifiedReply(): ChatReply {
  return reply(
    "outOfScope",
    "safety",
    "저는 금융 기초와 이 모의투자 서비스 사용법을 도와주는 챗봇이에요. 그 범위에서 궁금한 점을 물어봐 주세요. 🐻",
    ["허용 목적 미판정 범위 안내"],
    {
      suggestedQuestions: ["PER이 뭐예요?", "주문 전에 뭘 확인해요?"],
    },
  );
}

function isModelEligibleFallback(message: string, context: ChatContext): boolean {
  const financeQuestion = includesAny(message, [
    "주식",
    "주가",
    "수익률",
    "변동성",
    "per",
    "pbr",
    "eps",
    "배당",
    "시가총액",
    "물타기",
    "분산투자",
    "손절",
    "익절",
    "매수",
    "매도",
    "거래량",
    "차트",
    "실적",
    "매출",
    "이익",
    "재무",
    "투자",
    "포트폴리오",
    "시장가",
    "지정가",
  ]);
  if (financeQuestion) return true;

  const serviceQuestion = includesAny(message, [
    "모의투자",
    "리그",
    "시즌",
    "주문",
    "계좌",
    "아카이브",
    "성향",
    "거래기록",
    "종목탐색",
    "매수화면",
    "매도화면",
  ]);
  if (serviceQuestion) return true;

  const hasApprovedStockContext =
    (context.screen === "stock" || context.screen === "order") && context.stockId !== undefined;
  return (
    hasApprovedStockContext &&
    includesAny(message, ["이회사", "이종목", "회사", "종목", "사업", "제품", "돈을벌"])
  );
}

function ruleReply(kind: RuleKind, message: string): ChatReply {
  let text: string;
  let questions: string[];
  let target: ChatUiAction["target"];
  let step: string;

  switch (kind) {
    case "limit": {
      step = "주문 한도 규칙 안내";
      target = "order";
      questions = ["주문 가능 금액은 어떻게 계산해요?", "한 종목에 전부 넣어도 돼요?"];
      if (includesAny(message, ["나눠", "쪼개", "여러번"])) {
        text = "주문을 여러 번 나눠 넣어도 괜찮아. 같은 종목에 넣을 수 있는 금액에 한도가 없어서, 남은 가상 현금 안에서면 몇 번이든 살 수 있어.";
      } else if (includesAny(message, ["부모님이정", "앱규칙이정", "누가정"])) {
        text = "한 종목에 얼마를 넣을지는 부모도 앱도 정하지 않아. 주문마다 부모 승인을 받는 규칙도 없고, 남은 가상 현금만 지키면 돼.";
      } else if (includesAny(message, ["엄마는되", "부모는되"])) {
        text = "부모와 자녀 규칙이 똑같아. 둘 다 한 종목에 넣는 금액에 제한이 없고, 각자 남은 가상 현금 안에서 주문할 수 있어.";
      } else if (includesAny(message, ["퍼센트", "비율"])) {
        text = "한 종목에 몇 퍼센트까지라는 제한은 없어. 남은 가상 현금 안에서면 한 종목에 전부 넣어도 주문돼.";
      } else if (includesAny(message, ["로그", "차감", "매수할때마다", "매수때마다"])) {
        text = "매수하면 사용할 수 있는 가상 현금이 그만큼 줄어. 종목별로 따로 쌓이는 한도는 없고, 체결 금액과 남은 금액은 주문·거래 내역에서 확인할 수 있어.";
      } else if (includesAny(message, ["방산", "에너지", "다른종목처럼"])) {
        text = "업종에 따라 다른 규칙은 없어. 허용된 종목이면 전부 똑같이 남은 가상 현금만큼 주문할 수 있어.";
      } else if (includesAny(message, ["백주", "100주", "최대수량"])) {
        text = "주문 금액이 남은 가상 현금을 넘으면 차단돼. 종목별 한도는 없으니 정확한 최대 수량은 주문 화면의 가격과 남은 금액으로 확인해 줘.";
      } else if (includesAny(message, ["얼마까지", "주문가능금액", "돈남았", "현금남았"])) {
        text = "남은 가상 현금만큼 주문할 수 있어. 종목별로 걸리는 한도가 없어서 현금이 남아 있으면 같은 종목도 이어서 살 수 있어.";
      } else {
        text = "가족 리그에서는 각자 가상 1,000만원을 쓰고, 한 종목에 얼마를 넣을지는 제한이 없어. 남은 가상 현금 안에서면 한 종목에 전부 넣어도 돼.";
      }
      break;
    }
    case "cost": {
      step = "거래 비용 규칙 안내";
      target = "order";
      questions = ["이번 주문 비용은 어떻게 확인해요?", "수수료와 세금은 뭐가 달라요?"];
      if (message.includes("왜내야")) {
        text = "수수료와 세금은 실제 거래에서 생기는 비용을 모의투자에서도 이해할 수 있게 안내하는 항목이야. 이번 주문에 적용되는 값은 주문 확인 화면에서 볼 수 있어.";
      } else if (message.includes("0원")) {
        text = "현재 주문 화면에 수수료와 세금이 0원으로 표시되면 이번 모의 주문에서는 그 비용이 차감되지 않아. 실제 주식 거래도 항상 무료라는 뜻은 아니야.";
      } else if (includesAny(message, ["동시에", "친구들이랑"])) {
        text = "같은 조건의 주문에는 같은 비용 규칙이 적용되지만 가격과 주문 금액이 다르면 실제 비용도 달라질 수 있어. 각자 주문 확인 화면의 금액을 기준으로 봐야 해.";
      } else if (includesAny(message, ["샀다팔", "매수매도", "또나가"])) {
        text = "매수와 매도는 각각 별도 주문이라 적용되는 비용도 주문마다 표시돼. 정확한 값은 매수·매도 확인 화면에서 각각 확인해 줘.";
      } else if (includesAny(message, ["손익", "수익률", "순위", "번금액", "표본", "포함", "반영"])) {
        text = "현재 수익률과 손익에 거래 비용이 반영됐는지는 손익 상세의 비용 항목으로 확인해야 해. 나는 화면에 없는 비용이나 순위 변동 원인을 추측하지 않아.";
      } else if (includesAny(message, ["공식", "계산", "금액", "차감", "보여"])) {
        text = "주문 확인 화면에서 가격×수량, 수수료, 세금과 최종 금액을 나눠 확인할 수 있어. 나는 화면에 없는 요율이나 공식을 새로 만들지 않아.";
      } else {
        text = "모의투자도 실제 수준의 수수료·세금 안내를 보여 주지만, 데모 계산은 현재 주문 화면의 값이 기준이야. 정확한 비용은 주문 확인 화면에서 확인해 줘.";
      }
      break;
    }
    case "participation": {
      step = "참여 규칙 안내";
      target = "home";
      questions = ["구경 모드는 어떻게 써요?", "리그 참여 규칙 알려주세요"];
      text = "가족 리그 참여는 선택이야. 계좌 없이도 튜토리얼과 구경 모드를 볼 수 있고, 참여를 고른 뒤에는 해당 시즌 규칙을 따르면 돼.";
      break;
    }
    case "recordRetention": {
      step = "기록 보존 규칙 안내";
      target = "archive";
      questions = ["시즌 끝나면 기록은 어떻게 돼요?", "내 지난 시즌 기록 보여주세요"];
      if (includesAny(message, ["봐야", "아카이브꼭"])) {
        text = "아카이브를 다시 보는 것은 선택이야. 다만 주문할 때 고른 이유와 예상 보유기간 같은 질문식 기록은 주문 흐름에 포함돼 있어.";
      } else if (includesAny(message, ["자동으로정리", "자동정리", "보유종목"])) {
        text = "시즌 마지막 거래일 종가로 결과를 확정한 뒤 가상 보유 자산은 리셋돼. 거래와 생각 기록은 시즌 아카이브에 남아.";
      } else if (includesAny(message, ["이어", "회사바꿔", "메모남"])) {
        text = "다른 회사를 거래해도 앞서 남긴 거래 이유와 생각은 없어지지 않아. 같은 시즌의 기록으로 이어져 아카이브에 남아.";
      } else {
        text = "시즌이 끝나면 가상 돈과 보유 자산은 초기화되지만 거래·성향·생각 기록은 아카이브에 남아. 다음 시즌에도 지난 기록을 다시 볼 수 있어.";
      }
      break;
    }
    case "season": {
      step = "시즌 운영 규칙 안내";
      target = "home";
      questions = ["시즌 종료일은 어디서 봐요?", "거래 횟수 제한이 있어요?"];
      if (includesAny(message, ["왜있", "왜4주", "4주라는규칙은왜"])) {
        text = "4주는 가격의 오르내림을 한 번은 경험하면서도 집중하기에 너무 길지 않도록 정한 기간이야. 시즌이 나뉘어야 새 가족도 같은 출발점에서 시작할 수 있어.";
      } else if (includesAny(message, ["룰바꾸", "규칙바꾸", "누가책임"])) {
        text = "시즌 중 규칙 변경의 책임과 보상 기준은 아직 확정되지 않았어. 현재 시즌에 적용되는 확정 규칙과 변경 공지를 홈에서 확인해 줘.";
      } else if (includesAny(message, ["며칠", "많이남", "기간남", "몇주남"])) {
        text = "정확히 며칠 남았는지는 현재 날짜와 시즌 종료일을 기준으로 봐야 해. 홈의 시즌 진행바와 종료일을 확인해 줘.";
      } else if (includesAny(message, ["거래횟수", "주문횟수", "몇번더", "제한이몇번"])) {
        text = "현재 규칙에는 주간이나 시즌의 거래 횟수 상한이 따로 없어. 다만 시즌 종료일, 주문 가능 시간, 잔액과 단일 종목 한도는 적용돼.";
      } else if (message.includes("멈추")) {
        text = "현재 규칙에는 최소 거래 횟수가 없어서 중간에 거래를 멈추는 것 자체는 위반이 아니야. 남긴 기록은 시즌 아카이브에 계속 남아.";
      } else if (includesAny(message, ["팔아야이기", "끝나기전에팔아야"])) {
        text = "시즌 결과는 마지막 거래일 종가로 확정돼서 종료 전에 보유 종목을 반드시 정리하는 규칙은 없어. 가족 성적은 구성원 수익률 평균으로 계산해.";
      } else if (includesAny(message, ["마지막주", "남은1주"])) {
        text = "시즌 종료 전이면 마지막 주에도 주문할 수 있어. 주문 가능 시간, 잔액과 단일 종목 한도는 그대로 적용돼.";
      } else if (message.includes("계속안누르면")) {
        text = "주문 확인을 누르지 않으면 그 주문은 체결되지 않아. 주문하지 않은 것 자체가 리그 규칙 위반은 아니야.";
      } else {
        text = "시즌은 4주 동안 진행되고 정확한 남은 기간은 홈의 시즌 진행바에서 확인할 수 있어. 종료 뒤 가상 자산은 초기화되고 기록은 아카이브에 남아.";
      }
      break;
    }
    case "ranking": {
      step = "순위·시상 규칙 안내";
      target = "home";
      questions = ["가족 순위는 어떻게 계산해요?", "행동 부문 시상은 확정됐어요?"];
      if (includesAny(message, ["동점", "동률"])) {
        text = "가족 순위가 같을 때의 동점 처리 기준은 아직 확정되지 않았어. 임의로 거래 횟수나 다른 점수를 붙이지 않아.";
      } else if (includesAny(message, ["업데이트", "바로바뀌", "갱신"])) {
        text = "순위가 즉시 바뀌는지와 갱신 주기는 아직 확정되지 않았어. 화면에 표시되는 마지막 갱신 시각을 기준으로 확인해야 해.";
      } else if (includesAny(message, ["뭐줘", "뭘줘", "상품", "리워드", "시상"])) {
        text = "수익률 1등만 상을 받는 구조는 아니지만 구체적인 리워드와 행동 부문 시상은 아직 확정되지 않았어. 확정 전 경품을 약속해서는 안 돼.";
      } else if (message.includes("성향")) {
        text = "3주차 성향은 지금까지의 행동으로 계산한 중간 결과야. 성향은 고정 성적이 아니고 시즌 기록이 쌓이면 다시 계산될 수 있어.";
      } else {
        text = "가족 순위는 구성원 수익률의 평균으로 계산하고 거래 횟수는 순위 점수에 넣지 않아. 행동 관련 시상은 순위와 별도야.";
      }
      break;
    }
    case "visibility": {
      step = "공개 범위 규칙 안내";
      target = "archive";
      questions = ["내 공개 범위는 어디서 봐요?", "가족 비교는 어떻게 봐요?"];
      if (includesAny(message, ["바로알림", "즉시알림", "즉시푸시"])) {
        text = "수익률이 낮다는 이유만으로 부모에게 즉시 알림을 보내는 규칙은 없어. 가족 화면의 공개 범위와 위험행동 코칭 알림은 별도야.";
      } else if (includesAny(message, ["부모님화면", "부모화면"])) {
        text = "부모와 자녀 화면에 순위를 똑같이 보여 줄지는 아직 확정되지 않았어. 가족에게 보이는 항목은 상호 동의한 공개 범위 안에서만 확인해야 해.";
      } else if (includesAny(message, ["성향", "누가볼수"])) {
        text = "성향 결과는 서로 공개에 동의한 같은 가족 구성원이 비교 화면에서 볼 수 있고, 시즌 뒤에도 아카이브에 남아. 챗봇은 본인 결과만 조회해.";
      } else {
        text = "거래 종목은 친구나 다른 가족 팀에 자동으로 공개되지 않아. 같은 가족 팀에서는 서로 동의한 거래 기록만 가족 화면에서 확인할 수 있어.";
      }
      break;
    }
    case "virtualMoney": {
      step = "가상 자산 규칙 안내";
      target = "home";
      questions = ["모의투자와 실제 계좌는 뭐가 달라요?", "시즌 끝나면 가상 돈은 어떻게 돼요?"];
      if (includesAny(message, ["합쳐", "같이쓰"])) {
        text = "같은 가족 팀이어도 투자금은 합치지 않아. 구성원마다 각자의 가상 1,000만원 지갑으로 따로 투자해.";
      } else if (includesAny(message, ["진짜돈", "출금", "현금으로바꿀"])) {
        text = "리그의 가상 돈은 현금으로 바꿀 수 없어. 시즌 리워드가 있다면 가상 투자금과는 별도이고, 세부 내용은 확정 안내만 확인해야 해.";
      } else {
        text = "모의투자 1,000만원은 실제 증권계좌 잔액과 연결되지 않은 가상 지갑이야. 실제 주식을 소유하거나 돈이 출금되는 주문이 아니야.";
      }
      break;
    }
    case "execution": {
      step = "체결 규칙 안내";
      target = "order";
      questions = ["내 주문은 언제 체결돼요?", "시장가와 지정가가 뭐예요?"];
      text = "현재 데모의 시장가 주문은 화면 값으로 바로 체결되고, 실서비스 설계의 장외 주문은 다음 거래일 예약 주문으로 처리돼. 먼저 주문 화면에서 즉시 주문인지 예약 주문인지 확인해 줘.";
      break;
    }
    case "socialSource": {
      step = "추천 출처 규칙 안내";
      target = "order";
      questions = ["투자 근거는 뭐예요?", "주문 전에 뭘 확인해요?"];
      text = "친구나 가족의 추천을 거래 이유로 기록하는 것 자체는 리그 규칙 위반이 아니야. 다만 그 추천이 매수를 승인하거나 결과를 보장한다는 뜻은 아니야.";
      break;
    }
  }

  return reply("faq", "service_help", text, [step], {
    suggestedQuestions: questions,
    uiAction: { type: "open_screen", target },
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
      `지금 화면의 ${context.quantity}주와 1주 ${formatWon(context.unitPrice)}을 곱하면 예상 금액은 ${formatWon(total)}이에요. 실제 주문 전에는 화면의 최종 금액을 한 번 더 확인하면 돼요.`,
      ["현재 주문 수량 확인", "표시 가격으로 계산"],
      { uiAction: { type: "open_screen", target: "order" } },
    );
  }

  return null;
}

function getArchiveManagementReply(message: string): ChatReply | null {
  const archiveRecord = includesAny(message, [
    "아카이브",
    "archive",
    "거래기록",
    "매수기록",
    "매수내역",
    "거래내역",
    "체결기록",
    // 아이는 기록이 아니라 거래 자체를 무르고 싶다고 말한다 — "잘못 산 거".
    // 답(체결은 되돌릴 수 없고 기록에 남는다)은 같은 자리에 이미 있다.
    "잘못산",
    "잘못매수",
    "실수로산",
    "실수한거래",
    "잘못누른",
  ]);
  const recordChange = includesAny(message, [
    "삭제",
    "지울",
    "지우",
    "없애",
    "수정",
    "고쳐",
    "되돌",
    "취소",
    "무를",
    "무르",
    "없던일",
  ]);
  if (!archiveRecord || !recordChange) return null;

  return reply(
    "faq",
    "service_help",
    "키웅이는 아카이브의 체결 기록을 지우거나 바꾸지 않아요. 현재 아카이브에는 기록 삭제·수정 기능이 없어서 실수한 거래도 시즌 기록에 남아요.",
    ["아카이브 기록 관리 안내"],
    {
      suggestedQuestions: ["내 지난 시즌 기록 보여주세요", "시즌 끝나면 기록은 어떻게 돼요?"],
      uiAction: { type: "open_screen", target: "archive", label: "아카이브에서 기록 보기" },
    },
  );
}

function serviceHowToReply(
  text: string,
  label?: string,
  target?: ChatUiAction["target"],
  details: Omit<ChatUiAction, "type" | "target" | "label"> = {},
  route: ChatRoute = "faq",
): ChatReply {
  return reply(route, route === "refusal" ? "safety" : "service_help", text, ["서비스 사용법 안내"], {
    ...(label && target
      ? { uiAction: { type: "open_screen" as const, target, label, ...details } }
      : {}),
  });
}

const ARCHIVE_ABILITY_DEFINITIONS = [
  {
    aliases: ["집중", "집중력", "확신", "몰아담기"],
    text: "집중은 가진 회사를 적은 업종에 모아 담고 현금을 적게 둘수록 높게 나타날 수 있는 축이에요. 아카이브에서는 이를 ‘확신한 곳에 몰아 담는 정도’라고도 쉽게 말해요. 높고 낮음이 좋고 나쁨을 가르는 점수는 아니에요.",
  },
  {
    aliases: ["분산", "분산력", "나눠담기"],
    text: "분산은 가진 회사를 여러 업종에 나누어 담는 쪽을 보여주는 축이에요. 집중과 한 쌍이라 어느 한쪽이 더 좋다는 뜻은 아니에요.",
  },
  {
    aliases: ["정확", "정확력", "맞힌정도"],
    text: "정확은 거래 뒤 가격 방향을 확인해 보는 축이에요. 한 번의 결과로 실력을 판단하지 않고, 기록이 쌓이며 함께 살펴봐요.",
  },
  {
    aliases: ["직관", "직관력", "빠른결정"],
    text: "직관은 자료를 오래 살피기보다 빠르게 결정한 기록을 보여주는 축이에요. 근거와 한 쌍이며 어느 쪽이 더 좋다는 뜻은 아니에요.",
  },
  {
    aliases: ["근거", "근거력", "자료확인"],
    text: "근거는 매수 전에 뉴스·기업 정보·차트 같은 자료를 확인한 기록을 보여주는 축이에요. 점수로 사람을 평가하는 기능은 아니에요.",
  },
] as const;

const ARCHIVE_ABILITY_QUESTION_PATTERNS = [
  "뭐야",
  "무슨뜻",
  "뜻",
  "의미",
  "설명",
  "알려줘",
  "뭔소리",
  "무슨소리",
  "뭔말",
  "무슨말",
  "뭐임",
  "뭔데",
] as const;

function getArchiveAbilityReply(message: string, context: ChatContext): ChatReply | null {
  if (
    context.screen !== "archive" ||
    message.includes("확신도") ||
    includesAny(message, ["주식", "주가", "per", "pbr", "수익률", "손익", "차트", "매수", "매도"]) ||
    !includesAny(message, ARCHIVE_ABILITY_QUESTION_PATTERNS)
  ) {
    return null;
  }

  const ability = ARCHIVE_ABILITY_DEFINITIONS.find(({ aliases }) => includesAny(message, aliases));
  if (!ability) return null;

  return serviceHowToReply(ability.text, "성향 화면 보기", "archive", { archiveTab: "report" });
}

function getOwnDataReply(message: string): ChatReply | null {
  const hasOwnRecordReference = includesAny(message, [
    "내가",
    "내기록",
    "내거래",
    "내성향",
    "내아카이브",
    "내손익",
    "내돈",
    "최근에",
    "예전에",
    "왜샀다고",
    "보여줘",
    "알려줘",
    "확인해",
  ]);
  if (hasOwnRecordReference && includesAny(message, RECORD_PATTERNS)) {
    return reply("tool", "own_records", "", ["본인 투자 기록 조회"], {
      tool: "own_trade_records",
    });
  }
  const asksProfileResult = includesAny(message, ["결과", "보여", "알려", "언제", "어디서"]);
  if (
    hasOwnRecordReference &&
    asksProfileResult &&
    includesAny(message, PROFILE_PATTERNS)
  ) {
    return reply("tool", "own_profile", "", ["본인 성향 결과 조회"], {
      tool: "own_behavior_profile",
    });
  }
  if (hasOwnRecordReference && includesAny(message, ARCHIVE_PATTERNS)) {
    return reply("tool", "own_archive", "", ["본인 시즌 기록 조회"], {
      tool: "own_archive",
    });
  }
  return null;
}

/**
 * 내 데이터 질문 판정 — 1인칭 소유 표현과 지갑·기록 명사가 함께 있을 때.
 *
 * 여기 걸린 질문은 **용어 사전으로 떨어지지 않는다.** 600문항 실측에서 `mydata`
 * 53건 중 41건이 "나 지금 수익률 몇퍼야?" → "수익률이란 ~하는 방법이에요" 처럼
 * 개인 값 질문에 용어 정의가 나갔다. 넓게 잡아도 안전한데, 오탐은 정의 카드가
 * 아니라 화면 안내나 모델 경로로 가기 때문이다.
 */
// `가진`·`거래` 같은 조각은 "내가 진짜", "내가 거래소" 처럼 다른 말에 얹혀
// 잡히므로 쓰지 않는다. 실제로 "수익률 마이너스면 내가 진짜 돈 잃은 거야?"
// 라는 개념 질문이 `내`+`가진` 으로 오탐됐다.
const PERSONAL_DATA_QUESTION =
  /(?:내|제|나|저|우리)[가-힣0-9]{0,6}(?:수익률|수익율|잔고|현금|예수금|쓸수있는돈|남은돈|자산|손익|보유|가진회사|가진종목|기록|성향|등수|몇등|순위|시즌|벌었|벌고있|잃었|잃고있)|(?:지금|현재|오늘)[가-힣0-9]{0,4}(?:수익률|수익율|잔고|현금|쓸수있는돈|자산|손익|몇등|벌었|잃었)/;

/**
 * 같은 낱말이라도 **값**이 아니라 **원리**를 묻는 질문은 개념 설명이 맞다.
 * "내 성향 점수는 거래 표본을 모아서 계산한 통계야?" 는 내 점수가 아니라
 * 산식을 묻는다 — 이런 건 용어 사전이 답해야 한다.
 */
const CONCEPT_MECHANISM_MARKERS = [
  "계산", "원리", "기준", "통계", "무슨뜻", "무슨의미", "의미야", "차이", "왜", "이유",
];

function isPersonalDataQuestion(message: string) {
  if (includesAny(message, CONCEPT_MECHANISM_MARKERS)) return false;
  return PERSONAL_DATA_QUESTION.test(message);
}

/**
 * 용어 사전이 답해도 되는 **정의 질문 형태**인지.
 *
 * 사전은 정의 질문에 강하다 — 600문항 실측에서 `term` 의도 정확도가 98% 였다.
 * 문제는 정의를 묻지 않은 문장까지 낱말만 보고 카드를 냈다는 것이다.
 * "왜 주식 가격이 매일 바뀌어?" 에 "주식은 회사의 작은 조각이에요" 가 나갔다.
 *
 * 여기서 걸러진 질문은 `fallback` 으로 내려가 생성 + 2단 판정을 받는다.
 * 그 경로는 이미 있는데 트래픽이 0.3% 뿐이라 놀고 있었다.
 */
/**
 * [측정 후 폐기] 사전을 "정의 질문 형태"로만 좁혀 나머지를 모델로 내려보내는
 * 게이트를 만들어 600문항으로 재봤다. 두 방향 모두 값을 내지 못했다.
 *
 * - 허용 형태 나열: 정의·성질·확인 질문의 표현이 끝없이 갈라져
 *   ("~ 거야?", "~ 건가요?", "~ 수도 있음?") 목록이 따라가지 못했다.
 * - 제외 형태만(왜·어떻게·언제·어디): fallback 이 3→12건으로 2% 만 움직였고,
 *   "차트 빨간색이 왜 이렇게 많아" 처럼 큐레이트 답이 맞는 질문까지 걷어냈다.
 *
 * 남은 오답은 "답이 주제는 맞는데 물은 지점을 비껴간" 경우라 **문장 형태로는
 * 구분되지 않는다.** 답과 질문을 함께 읽어야 판정되므로 다음 단계는
 * 의미 기반 답변 적합성 검사다 — 그때 이 자리를 다시 쓴다.
 */
const ASKS_PNL = [
  "수익률",
  "수익율",
  "손익",
  "얼마나올랐",
  "얼마나내렸",
  "몇퍼",
  "몇프로",
  // 아이는 "수익률" 대신 "얼마 벌었어?" 라고 묻는다. 같은 값을 가리키는 말이라
  // 빠져 있으면 화면 안내까지 닿지 못하고 범위 안내로 끝난다.
  "벌었",
  "벌고있",
  "잃었",
  "잃고있",
];
const ASKS_CASH = ["잔고", "현금", "쓸수있는돈", "남은돈", "예수금", "돈얼마", "얼마남았"];
const ASKS_HOLDINGS = ["보유", "가진회사", "가진종목", "몇곳", "몇개샀", "종목수"];

function formatPercent(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/**
 * 화면이 실어 보낸 내 지갑 값으로 답한다. 값이 없으면 `null` 을 돌려주고
 * 지어내지 않는다 — 서버 DB 는 주문 저장이 best-effort 라 최신이 아닐 수 있어
 * 화면 값을 원본으로 쓴다(`ChatContext` 주석).
 */
function getPersonalValueReply(
  message: string,
  context: ChatContext,
): ChatReply | null {
  // 종목을 콕 집어 물으면 전체 수익률을 답하면 안 된다. "내가 산 오리온
  // 수익률은?" 에 지갑 전체 수익률을 주는 건 확신에 찬 오답이다.
  if (findMentionedStock(message)) return null;
  // "어디서 봐" 는 값이 아니라 위치를 묻는다. 화면 안내가 맞다.
  if (includesAny(message, ["어디서", "어디에", "어디야", "어디있"])) return null;
  if (includesAny(message, ASKS_PNL) && context.pnlPercent !== undefined) {
    const moved =
      context.pnlPercent > 0
        ? "시작할 때보다 늘었어요"
        : context.pnlPercent < 0
          ? "시작할 때보다 줄었어요"
          : "시작할 때와 같아요";
    return reply(
      "context",
      "own_records",
      `지금 화면 기준으로 내 수익률은 ${formatPercent(context.pnlPercent)}이고 ${moved}. 아직 팔지 않은 종목은 값이 계속 바뀌어요.`,
      ["화면 수익률 확인"],
      { uiAction: { type: "open_screen", target: "portfolio", label: "내 자산에서 보기" } },
    );
  }
  if (includesAny(message, ASKS_CASH) && context.cash !== undefined) {
    return reply(
      "context",
      "own_records",
      `지금 화면 기준으로 쓸 수 있는 돈은 ${formatWon(context.cash)}이에요. 기다리는 주문이 있으면 그만큼은 미리 잡혀 있어요.`,
      ["화면 잔고 확인"],
      { uiAction: { type: "open_screen", target: "portfolio", label: "내 자산에서 보기" } },
    );
  }
  if (includesAny(message, ASKS_HOLDINGS) && context.holdingCount !== undefined) {
    return reply(
      "context",
      "own_records",
      `지금 화면 기준으로 가진 회사는 ${context.holdingCount}곳이에요. 어떤 회사인지는 내 자산 화면에서 하나씩 볼 수 있어요.`,
      ["화면 보유 종목 수 확인"],
      { uiAction: { type: "open_screen", target: "portfolio", label: "내 자산에서 보기" } },
    );
  }
  return null;
}

/**
 * 화면 값이 없을 때. 숫자를 지어내는 대신 어디서 보는지만 알려준다.
 * 성향·시즌은 값을 말하지 않고 화면으로 보내는 기존 방침을 그대로 따른다.
 */
function getPersonalScreenGuidance(message: string): ChatReply | null {
  if (includesAny(message, ["성향", "캐릭터", "능력치"])) {
    return reply(
      "faq",
      "own_profile",
      "내 성향 결과는 아카이브의 성향 화면에 캐릭터와 능력치로 정리돼 있어요. 거기서 직접 보는 게 가장 정확해요.",
      ["성향 화면 안내"],
      {
        uiAction: {
          type: "open_screen",
          target: "archive",
          archiveTab: "report",
          label: "성향 화면 보기",
        },
      },
    );
  }
  if (includesAny(message, ["등수", "순위", "몇등"])) {
    return reply(
      "faq",
      "own_records",
      "가족 리그 순위는 랭킹 화면에서 볼 수 있어요. 나는 화면에 없는 순위를 추측하지 않아요.",
      ["랭킹 화면 안내"],
      { uiAction: { type: "open_screen", target: "ranking", label: "랭킹에서 보기" } },
    );
  }
  if (includesAny(message, ["시즌", "지난기록", "예전기록"])) {
    return reply(
      "faq",
      "own_archive",
      "지난 시즌 기록은 아카이브에서 주차별로 볼 수 있어요. 거기서 직접 보는 게 가장 정확해요.",
      ["시즌 기록 화면 안내"],
      {
        // 주차별 기록은 성향 탭 안의 카드 모아보기다. 수익률 탭이 아니다.
        uiAction: {
          type: "open_screen",
          target: "archive",
          archiveTab: "report",
          archiveOverlay: "cards",
          label: "주차별 기록 보기",
        },
      },
    );
  }
  if (includesAny(message, [...ASKS_PNL, ...ASKS_CASH, ...ASKS_HOLDINGS, "자산", "평가금액"])) {
    return reply(
      "faq",
      "own_records",
      "내 수익률과 남은 돈, 가진 회사는 내 자산 화면에 함께 나와요. 나는 화면에 없는 숫자를 지어내지 않아요.",
      ["내 자산 화면 안내"],
      { uiAction: { type: "open_screen", target: "portfolio", label: "내 자산에서 보기" } },
    );
  }
  return null;
}

/**
 * A term alone does not decide the answer.  Keep the small set of question
 * acts that change either the explanation or the next screen ahead of the
 * glossary, so variants such as "why diversify?" do not become "what is
 * diversification?".
 */
function getQuestionActReply(message: string, context: ChatContext): ChatReply | null {
  const questionForm = findChatbotQuestionForm(message);
  const asksLocation = questionForm === "location" || includesAny(message, ["\uC5B4\uB514\uC11C\uBD10", "\uC5B4\uB514\uC11C\uBCF4"]);

  if (questionForm === "definition" && includesAny(message, ["\uC190\uC775", "\uC190\uD574\uC640\uC774\uC775"])) {
    return reply(
      "faq",
      "financial_concept",
      "\uC190\uC775\uC740 \uC0AC\uACE0\uD314\uBA74\uC11C \uC5BB\uC740 \uC774\uC775\uACFC \uC190\uD574\uB97C \uD569\uCCD0 \uBCF4\uB294 \uB9D0\uC774\uC5D0\uC694. \uB0B4 \uACC4\uC88C\uC5D0\uC11C\uB294 \uC9C0\uAE08 \uAE30\uB85D\uC744 \uD1B5\uD574 \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694.",
      ["\uC190\uC775\uC758 \uB73B \uD655\uC778"],
    );
  }

  if (
    questionForm === "reason" &&
    includesAny(message, ["\uBD84\uC0B0\uD22C\uC790", "\uB098\uB220\uC0AC", "\uB098\uB220\uB450"])
  ) {
    return reply(
      "faq",
      "financial_concept",
      "\uBD84\uC0B0\uD22C\uC790\uB97C \uD558\uB294 \uC774\uC720\uB294 \uD55C \uD68C\uC0AC\uC5D0\uB9CC \uC548 \uC88B\uC740 \uC77C\uC774 \uC0DD\uACA8\uB3C4 \uC601\uD5A5\uC744 \uD55C\uCABD\uC5D0\uB9CC \uBC1B\uC9C0 \uC54A\uAE30 \uC704\uD574\uC11C\uC608\uC694. \uC5EC\uB7EC \uC885\uBAA9\uC5D0 \uB098\uB220 \uB450\uBA74 \uD55C \uC885\uBAA9\uC758 \uC6C0\uC9C1\uC784\uC5D0\uB9CC \uC758\uC874\uD558\uB294 \uC815\uB3C4\uB97C \uC904\uC77C \uC218 \uC788\uC5B4\uC694. \uB2E4\uB9CC \uC218\uC775\uC744 \uBCF4\uC7A5\uD558\uB294 \uBC29\uBC95\uC740 \uC544\uB2C8\uC5D0\uC694.",
      ["\uBD84\uC0B0\uD22C\uC790\uC758 \uC774\uC720 \uD655\uC778"],
    );
  }

  if (
    includesAny(message, ["per"]) &&
    includesAny(message, ["\uB0AE\uC73C\uBA74", "\uB0AE\uC740"]) &&
    includesAny(message, ["\uC88B\uC740\uD68C\uC0AC", "\uC88B\uC740\uAC70", "\uC88B\uC544"])
  ) {
    return reply(
      "faq",
      "financial_concept",
      "PER\uC774 \uB0AE\uB2E4\uACE0 \uBB34\uC870\uAC74 \uC88B\uC740 \uD68C\uC0AC\uB77C\uB294 \uB73B\uC740 \uC544\uB2C8\uC5D0\uC694. \uD68C\uC0AC\uC758 \uC774\uC775\uACFC \uC8FC\uAC00\uB97C \uBE44\uAD50\uD558\uB294 \uC22B\uC790\uC778\uB370, \uD68C\uC0AC\uC758 \uC0C1\uD669\uACFC \uB2E4\uB978 \uC815\uBCF4\uB3C4 \uD568\uAED8 \uBCF4\uC544\uC57C \uD574\uC694.",
      ["PER\uC740 \uD55C \uC815\uBCF4\uB85C\uB9CC \uD655\uC778"],
    );
  }

  if (
    includesAny(message, ["\uC6D4\uB4DC", "\uCE94\uB4E4"]) &&
    includesAny(message, ["\uBE68\uAC15", "\uD30C\uB791", "\uC0C9"])
  ) {
    return reply(
      "faq",
      "financial_concept",
      "\uCE94\uB4E4\uC758 \uC0C9\uC740 \uC815\uD55C \uAE30\uAC04\uC758 \uC2DC\uC791\uAC00\uC640 \uB05D\uAC12\uC758 \uC704\uCE58\uB97C \uBCF4\uC5EC \uC8FC\uB294 \uD45C\uC2DC\uC608\uC694. \uC774 \uC11C\uBE44\uC2A4\uC5D0\uC11C\uB294 \uBE68\uAC15\uC740 \uB05D\uAC12\uC774 \uC2DC\uC791\uAC00\uBCF4\uB2E4 \uB192\uC740 \uACBD\uC6B0, \uD30C\uB791\uC740 \uB0AE\uC740 \uACBD\uC6B0\uC608\uC694. \uB2E4\uC74C \uAC00\uACA9\uC744 \uB9DE\uD788\uB294 \uC0C9\uC740 \uC544\uB2C8\uC5D0\uC694.",
      ["\uCE94\uB4E4 \uC0C9\uC758 \uB73B \uD655\uC778"],
    );
  }

  if (
    includesAny(message, ["\uC8FC\uC2DD\uAC00\uACA9", "\uC8FC\uAC00"]) &&
    includesAny(message, ["\uB204\uAC00\uC815\uD574", "\uB204\uAC00\uC815\uD568", "\uC5B4\uB5BB\uAC8C\uC815\uD574"])
  ) {
    return reply(
      "faq",
      "financial_concept",
      "\uC8FC\uC2DD \uAC00\uACA9\uC740 \uD55C \uC0AC\uB78C\uC774 \uC815\uD558\uB294 \uAC83\uC774 \uC544\uB2C8\uB77C, \uC0AC\uACE0 \uC2F6\uC740 \uC0AC\uB78C\uACFC \uD314\uACE0 \uC2F6\uC740 \uC0AC\uB78C\uC758 \uC8FC\uBB38\uC774 \uB9CC\uB098\uBA74\uC11C \uC815\uD574\uC838\uC694. \uD68C\uC0AC\uC758 \uC0C1\uD669\uACFC \uC0AC\uB78C\uB4E4\uC758 \uAE30\uB300\uAC00 \uD568\uAED8 \uC601\uD5A5\uC744 \uC918\uC694.",
      ["\uC8FC\uAC00\uAC00 \uC815\uD574\uC9C0\uB294 \uBC29\uC2DD \uD655\uC778"],
    );
  }

  if (asksLocation && includesAny(message, ["\uB0B4\uAC00\uAC00\uC9C4\uAC70", "\uB0B4\uAC00\uAC16\uACE0", "\uB0B4\uC8FC\uC2DD"])) {
    return serviceHowToReply(
      "\uB0B4\uAC00 \uAC00\uC9C4 \uC8FC\uC2DD\uACFC \uAE30\uB2E4\uB9AC\uB294 \uC8FC\uBB38\uC740 \uB0B4 \uACC4\uC88C \uD654\uBA74\uC5D0\uC11C \uBCFC \uC218 \uC788\uC5B4\uC694.",
      "\uB0B4 \uACC4\uC88C \uBCF4\uAE30",
      "portfolio",
    );
  }

  if (asksLocation && includesAny(message, ["\uB274\uC2A4", "\uAE30\uC0AC"])) {
    return serviceHowToReply(
      "\uC885\uBAA9 \uC0C1\uC138 \uD654\uBA74\uC758 \uB274\uC2A4 \uD0ED\uC5D0\uC11C \uD574\uB2F9 \uD68C\uC0AC\uC640 \uAD00\uB828\uB41C \uAE30\uC0AC\uB97C \uBCFC \uC218 \uC788\uC5B4\uC694.",
      "\uC885\uBAA9 \uB274\uC2A4 \uBCF4\uAE30",
      "stock",
      { stockView: "explore" },
    );
  }

  if (
    includesAny(message, ["\uCC28\uD2B8"]) &&
    includesAny(message, ["\uD06C\uAC8C", "\uD06C\uAC8C\uBCF4", "\uB113\uAC8C"])
  ) {
    return serviceHowToReply(
      "\uC885\uBAA9 \uC0C1\uC138 \uD654\uBA74\uC5D0\uC11C \uCC28\uD2B8\uB97C \uD06C\uAC8C \uBCF4\uACE0, \uAE30\uAC04\uC744 \uBC14\uAFE8 \uAC00\uBA70 \uC9C0\uB098\uAC04 \uAC00\uACA9 \uC6C0\uC9C1\uC784\uC744 \uD655\uC778\uD560 \uC218 \uC788\uC5B4\uC694.",
      "\uC885\uBAA9 \uC0C1\uC138\uC5D0\uC11C \uCC28\uD2B8 \uBCF4\uAE30",
      "stock",
      context.stockId ? { stockId: context.stockId } : {},
    );
  }

  if (
    includesAny(message, ["\uC8FC\uBB38\uCDE8\uC18C", "\uC8FC\uBB38\uC744\uCDE8\uC18C"]) &&
    (asksLocation || questionForm === "procedure")
  ) {
    return serviceHowToReply(
      "\uAE30\uB2E4\uB9AC\uB294 \uC8FC\uBB38\uC740 \uB0B4 \uACC4\uC88C\uC5D0\uC11C \uCDE8\uC18C\uD560 \uC218 \uC788\uC5B4\uC694. \uC774\uBBF8 \uCCB4\uACB0\uB41C \uC8FC\uBB38\uC740 \uCDE8\uC18C\uB418\uC9C0 \uC54A\uC544\uC694.",
      "\uAE30\uB2E4\uB9AC\uB294 \uC8FC\uBB38 \uBCF4\uAE30",
      "portfolio",
    );
  }

  if (
    includesAny(message, ["\uC8FC\uBB38\uBC84\uD2BC", "\uB9E4\uC218\uBC84\uD2BC"]) &&
    includesAny(message, ["\uC548\uB20C\uB7EC", "\uC548\uB428", "\uC548\uB3FC", "\uACE0\uC7A5"])
  ) {
    return serviceHowToReply(
      "\uC8FC\uBB38 \uBC84\uD2BC\uC774 \uC548 \uB20C\uB9AC\uBA74 \uC885\uBAA9\uC774\uB098 \uC218\uB7C9, \uC8FC\uBB38 \uB0B4\uC6A9\uC744 \uBA3C\uC800 \uD655\uC778\uD574 \uC8FC\uC138\uC694. \uC774 \uC11C\uBE44\uC2A4\uC5D0\uC11C\uB294 \uD559\uAD50 \uC2DC\uAC04 \uB4F1 \uB9E4\uB9E4 \uC81C\uD55C \uC2DC\uAC04\uC5D0\uB3C4 \uC8FC\uBB38\uC774 \uC7A0\uC2DC \uB9C9\uD790 \uC218 \uC788\uC5B4\uC694.",
      "\uC8FC\uBB38 \uD654\uBA74 \uD655\uC778\uD558\uAE30",
      "order",
      { ...(context.stockId ? { stockId: context.stockId } : {}), orderSide: "buy", orderStep: "confirmation" },
    );
  }

  if (
    includesAny(message, ["\uC800\uBC88\uC5D0", "\uC608\uC804\uC5D0"]) &&
    includesAny(message, ["\uC65C\uC0C0", "\uC65C\uC0C0\uB2E4", "\uC0B0\uC774\uC720"])
  ) {
    return reply("tool", "own_records", "", ["\uB0B4 \uB9E4\uC218 \uC774\uC720 \uAE30\uB85D \uC870\uD68C"], { tool: "own_trade_records" });
  }

  if (
    includesAny(message, ["\uBA87\uBC88\uD314", "\uBA87\uBC88\uB9E4\uB3C4", "\uD310\uD69F\uC218"]) &&
    includesAny(message, ["\uB0B4", "\uB098"])
  ) {
    return reply("tool", "own_records", "", ["\uB0B4 \uB9E4\uB3C4 \uAE30\uB85D \uC870\uD68C"], { tool: "own_trade_records" });
  }

  if (
    includesAny(message, ["\uB0B4\uC131\uD5A5", "\uC131\uD5A5\uACB0\uACFC"]) &&
    includesAny(message, ["\uCE5C\uAD6C\uB4E4", "\uCE5C\uAD6C\uB3C4"]) &&
    includesAny(message, ["\uBCFC\uC218\uC788", "\uBCF4\uC5EC"])
  ) {
    return reply(
      "faq",
      "service_help",
      "\uC131\uD5A5 \uACB0\uACFC\uB294 \uBCF8\uC778\uACFC \uBD80\uBAA8\uB2D8\uC774 \uBCFC \uC218 \uC788\uB294 \uAE30\uB85D\uC774\uC5D0\uC694. \uCE5C\uAD6C\uB4E4\uC5D0\uAC8C \uACF5\uAC1C\uB418\uC9C0 \uC54A\uC544\uC694.",
      ["\uC131\uD5A5 \uACF5\uAC1C \uBC94\uC704 \uD655\uC778"],
    );
  }

  if (includesAny(message, ["\uACC4\uC18D\uAC00\uACA9\uD655\uC778", "\uAC00\uACA9\uACC4\uC18D\uD655\uC778"]) && includesAny(message, ["\uBD88\uC548", "\uBD88\uC548\uD574"])) {
    return reply(
      "safety",
      "safety",
      "\uACC4\uC18D \uD655\uC778\uD558\uB2E4 \uBCF4\uBA74 \uB9C8\uC74C\uC774 \uB354 \uBD88\uC548\uD574\uC9C8 \uC218 \uC788\uC5B4\uC694. \uC9C0\uAE08\uC740 \uC7A0\uAE50 \uAC00\uACA9 \uD654\uBA74\uC5D0\uC11C \uB5A8\uC5B4\uC838 \uC26C\uC5B4\uB3C4 \uAD1C\uCC2E\uC544\uC694. \uBD88\uC548\uD55C \uB9C8\uC74C\uC774 \uACC4\uC18D\uB418\uBA74 \uBD80\uBAA8\uB2D8\uC774\uB098 \uBBFF\uC744 \uC218 \uC788\uB294 \uC5B4\uB978\uC5D0\uAC8C \uC774\uC57C\uAE30\uD574 \uC8FC\uC138\uC694.",
      ["\uC7A0\uC2DC \uAC00\uACA9 \uD654\uBA74\uC5D0\uC11C \uC26C\uAE30"],
    );
  }

  return null;
}

function getFinancialConceptReply(message: string): ChatReply | null {
  if (includesAny(message, ["수익이랑손해", "수익하고손해", "수익과손해", "이익이랑손해", "수익손해차이"])) {
    return reply(
      "faq",
      "financial_concept",
      "수익은 산 값보다 지금 값이 커진 상태이고, 손해는 작아진 상태예요. 아직 팔지 않았다면 화면에 보이는 값이 바뀔 수 있어요.",
      ["수익·손해 차이 설명"],
      { suggestedQuestions: ["평가손익이 뭐예요?", "수익률이 뭐예요?"] },
    );
  }

  if (includesAny(message, ["회사가돈을많이벌면주식값도꼭올라", "돈을많이벌면주가도꼭올라"])) {
    return reply(
      "faq",
      "financial_concept",
      "회사가 돈을 많이 벌어도 주식값이 꼭 오르는 것은 아니에요. 사람들이 앞으로의 회사 모습을 어떻게 생각하는지처럼 여러 이유가 함께 영향을 줘요.",
      ["회사 실적과 주가 관계 설명"],
      { suggestedQuestions: ["주식 가격은 왜 바뀌어요?", "회사는 어떻게 돈을 벌어요?"] },
    );
  }

  if (includesAny(message, ["손익이마이너스면내가빚진", "손익마이너스면내가빚진"])) {
    return reply(
      "faq",
      "financial_concept",
      "손익이 마이너스라는 말만으로 빚이 생기는 것은 아니에요. 가진 가상 돈이나 보유한 주식의 값이 줄어든 상태를 뜻하며, 실제로 빌린 돈이 있는지는 별도로 확인해야 해요.",
      ["손익 개념 안내"],
      { suggestedQuestions: ["평가손익이 뭐예요?", "실현손익이 뭐예요?"] },
    );
  }
  if (includesAny(message, ["물타기는왜하는거야", "물타기를왜하는거야"])) {
    return reply(
      "faq",
      "financial_concept",
      "물타기는 같은 주식을 더 사서 처음 산 가격의 평균을 바꾸는 행동을 말해요. 왜 하거나 언제 할지는 제가 정해 줄 수 없지만, 이 말의 뜻과 손익이 어떻게 달라지는지는 설명할 수 있어요.",
      ["물타기 개념 안내"],
      { suggestedQuestions: ["평가손익이 뭐예요?", "분산투자가 뭐예요?"] },
    );
  }
  return null;
}

function getChildFriendlyIntentReply(message: string, context: ChatContext): ChatReply | null {
  const stockDetails = context.stockId ? { stockId: context.stockId } : {};

  if (includesAny(message, ["수익이랑손해", "수익하고손해", "수익과손해", "이익이랑손해"])) return null;

  if (includesAny(message, ["주식사는연습", "주식연습은어떻게", "모의투자는어떻게시작"])) {
    return serviceHowToReply(
      "모의투자 화면에서 회사를 고른 다음 주문을 연습할 수 있어요.",
      "모의투자 시작하기",
      "stock",
      { stockView: "explore" },
    );
  }

  if (includesAny(message, ["주문넣었는데다음", "주문하고다음에", "주문넣고다음"])) {
    return serviceHowToReply(
      "주문을 넣은 뒤에는 주문 상태와 내용을 확인하면 돼요. 기다리는 주문은 포트폴리오에서 볼 수 있어요.",
      "주문 상태 확인하기",
      "portfolio",
    );
  }

  if (includesAny(message, ["주식몇주살지어디", "몇주살지어디", "수량어디에적어", "몇개살지어디", "몇개살지는어디"] )) {
    return serviceHowToReply(
      "주문 화면에서 살 주식 수를 적거나 금액을 고르면 돼요. 수량과 예상 금액을 확인한 뒤 직접 주문 내용을 결정해요.",
      "주문 수량 적기",
      "order",
      { ...stockDetails, orderSide: "buy", orderStep: "quantity" },
    );
  }

  if (includesAny(message, ["왜이회사를골랐는지쓰는칸", "고른이유쓰는칸", "거래이유쓰는칸"])) {
    return serviceHowToReply(
      "회사를 고른 이유는 주문 화면에서 고르는 단계에 적을 수 있어요.",
      context.stockId ? "고른 이유 적기" : "회사 고르고 주문 시작하기",
      context.stockId ? "order" : "stock",
      context.stockId
        ? { ...stockDetails, orderSide: "buy", orderStep: "reason" }
        : { stockView: "explore" },
    );
  }

  if (includesAny(message, ["내가고른회사다시보", "고른회사다시보", "선택한회사다시보"])) {
    return serviceHowToReply(
      "종목 탐색에서 회사 이름을 찾아 다시 볼 수 있어요.",
      "종목 탐색에서 다시 보기",
      "stock",
      { stockView: "explore" },
    );
  }

  if (includesAny(message, ["처음으로돌아", "첫화면으로", "메인으로돌아", "화면이너무많아"])) {
    return serviceHowToReply("처음 화면으로 돌아가면 모의투자와 진행 상황을 다시 볼 수 있어요.", "처음으로 가기", "home");
  }

  if (includesAny(message, ["회사종류별", "회사종류로나눠", "업종별로나눠"])) {
    return serviceHowToReply(
      "종목 탐색 화면에서 업종별로 회사를 모아 볼 수 있어요.",
      "업종별 회사 보기",
      "stock",
      { stockView: "explore" },
    );
  }

  const aliasStock = includesAny(message, ["불닭", "불닭볶음면"])
    ? STOCKS.find((stock) => stock.name === "삼양식품")
    : undefined;
  if (aliasStock && includesAny(message, ["회사", "이름", "뭐", "만드는"])) {
    return reply("tool", "stock_facts", "", ["생활어 종목 별칭 확인"], {
      tool: "approved_stock_facts",
      stockFact: { stockId: aliasStock.id, topic: "company" },
    });
  }

  if (includesAny(message, ["이회사랑비슷한회사", "이회사비슷한회사", "비슷한회사도보여"])) {
    const currentStock = context.stockId ? STOCKS.find((stock) => stock.id === context.stockId) : undefined;
    if (currentStock) {
      return serviceHowToReply(
        `${currentStock.name}와 같은 업종의 승인 종목을 종목 탐색에서 볼 수 있어요. 어느 회사가 더 낫다고 고르지는 않아요.`,
        `${SECTORS.find((sector) => sector.key === currentStock.sector)?.label ?? "같은 업종"} 회사 보기`,
        "stock",
        { stockView: "explore", sectorId: currentStock.sector },
      );
    }
    return serviceHowToReply("어느 회사를 말하는지 알려주면 같은 업종의 승인 종목을 찾아볼 수 있어요.", "종목 탐색에서 회사 찾기", "stock", { stockView: "explore" });
  }

  const sector = includesAny(message, ["과자", "라면", "식품회사"])
    ? "food"
    : includesAny(message, ["게임만드는회사", "게임회사"])
      ? "game"
      : includesAny(message, ["영화", "드라마", "엔터테인먼트회사"])
        ? "entertainment"
        : undefined;
  if (!findMentionedStock(message) && sector && includesAny(message, ["여기있어", "찾아", "볼수있어", "도있어"])) {
    const sectorLabel = SECTORS.find((candidate) => candidate.key === sector)?.label ?? "해당 업종";
    return serviceHowToReply(
      `${sectorLabel} 업종의 승인 회사를 종목 탐색에서 볼 수 있어요.`,
      `${sectorLabel} 회사 보기`,
      "stock",
      { stockView: "explore", sectorId: sector },
    );
  }

  if (includesAny(message, ["핸드폰만드는회사", "휴대폰만드는회사", "스마트폰만드는회사"])) {
    return serviceHowToReply(
      "종목 탐색에서 삼성전자나 LG전자처럼 전자기기와 관련된 회사를 찾아볼 수 있어요.",
      "종목 탐색에서 회사 찾기",
      "stock",
      { stockView: "explore" },
    );
  }

  return null;
}

function isNavigationQuestion(message: string) {
  return includesAny(message, [
    "어디",
    "어디서",
    "어딨",
    "어딧",
    "어디노",
    "어떤버튼",
    "버튼",
    "어떻게",
    "어떻게가",
    "어떻게써",
    "어떻게사용",
    "하는법",
    "사용법",
    "찾아",
    "보여",
    "이동",
    "시작",
    // 화면 요소를 가리키며 "그거 눌러야 돼?" 라고 묻는 것도 위치·사용법 질문이다.
    // `봐야`·`써야` 까지 넓히면 "아카이브 꼭 열어봐야 해?" 같은 **규칙** 질문을
    // 가로채므로 누르는 동작으로만 좁힌다.
    "눌러",
    "눌러야",
    "눌러도",
  ]);
}

const SCREEN_NAME_ALIASES = {
  weeklyCards: ["주차카드", "주간카드", "이번주카드", "성장카드", "카드모아보기", "카드모으기"],
  topMovers: ["오늘많이오른순", "오늘뭐가많이오름", "오늘많이오름", "많이오른종목", "상승종목"],
  watchlist: ["관심기업", "관심종목", "찜한종목", "하트누른회사"],
  stockCards: ["종목카드", "회사카드", "회사고르는카드", "주식카드"],
  portfolio: ["내계좌", "내계정", "포트폴리오", "계좌화면", "내자산현황"],
  ranking: ["랭킹", "순위표", "랭킹표"],
  archive: ["아카이브", "성장기록", "기록보관함"],
  tradingLock: [
    "학교시간엔매매쉬기",
    "학교시간매매제한",
    "매매제한",
    "매매잠금",
    "주문잠금",
    "매매쉬기",
  ],
  home: ["홈", "홈화면", "메인화면", "첫화면"],
  mockInvesting: ["모의투자", "모투", "가상투자", "주식연습"],
} as const;

function mentionsScreenName(message: string, name: keyof typeof SCREEN_NAME_ALIASES) {
  return includesAny(message, SCREEN_NAME_ALIASES[name]);
}

/**
 * 화면 위치를 묻는 말은 용어 설명보다 먼저 처리한다. 화면 상태는 정적 계약으로만
 * 만들고, 사용자가 버튼을 눌러야 iframe 안의 실제 화면으로 이동한다.
 */
function getScreenNavigationReply(message: string): ChatReply | null {
  const isTopMoversQuestion = mentionsScreenName(message, "topMovers");
  if (!isNavigationQuestion(message) && !isTopMoversQuestion) return null;

  if (mentionsScreenName(message, "weeklyCards")) {
    return serviceHowToReply(
      "주차 카드는 아카이브 성향 탭의 ‘카드 모아보기’에서 볼 수 있어요.",
      "카드 모아보기 열기",
      "archive",
      { archiveTab: "report", archiveOverlay: "cards" },
    );
  }

  if (isTopMoversQuestion) {
    return serviceHowToReply(
      "‘오늘 많이 오른 순’은 모의투자 화면의 맨 앞 필터예요.",
      "오늘 많이 오른 순 보기",
      "stock",
      { stockView: "explore", sectorId: "rank" },
    );
  }

  if (mentionsScreenName(message, "watchlist")) {
    return serviceHowToReply(
      "관심 기업은 모의투자 화면에서 하트로 담아 둔 회사를 모아 보는 필터예요.",
      "관심 기업 보기",
      "stock",
      { stockView: "explore", sectorId: "watch" },
    );
  }

  const matchedSector = SECTORS.find((sector) =>
    message.includes(sector.label.replaceAll("·", "")),
  );
  if (matchedSector && includesAny(message, ["업종", "섹터", "칩"])) {
    return serviceHowToReply(
      `${matchedSector.label} 업종 칩은 모의투자 화면에서 누를 수 있어요.`,
      `${matchedSector.label} 업종 보기`,
      "stock",
      { stockView: "explore", sectorId: matchedSector.key },
    );
  }

  if (includesAny(message, ["업종칩", "섹터칩"])) {
    return serviceHowToReply(
      "업종 칩은 모의투자 화면에서 회사를 하는 일이 비슷한 분야별로 모아 보는 버튼이에요.",
      "업종 칩 보러 가기",
      "stock",
      { stockView: "explore" },
    );
  }

  if (mentionsScreenName(message, "stockCards") ||
    (message.includes("종목") && includesAny(message, ["찾아", "어디"])) ) {
    return serviceHowToReply(
      "종목 카드는 모의투자 화면에서 회사 이름과 업종을 보고 고르는 카드예요.",
      "종목 카드 보러 가기",
      "stock",
      { stockView: "explore" },
    );
  }

  if (mentionsScreenName(message, "portfolio")) {
    return serviceHowToReply(
      "내 계좌 보기는 가진 회사, 쓸 수 있는 가상 돈, 기다리는 주문을 확인하는 화면이에요.",
      "내 계좌 보기",
      "portfolio",
    );
  }

  if (mentionsScreenName(message, "ranking")) {
    return serviceHowToReply(
      "랭킹은 가족의 이번 주 또는 시즌 전체 수익률 순서를 보는 화면이에요.",
      "랭킹 보기",
      "ranking",
    );
  }

  if (mentionsScreenName(message, "archive")) {
    return serviceHowToReply(
      "아카이브에서는 내 성향과 수익률, 지난 기록을 다시 볼 수 있어요.",
      "아카이브에서 보기",
      "archive",
      { archiveTab: "report" },
    );
  }

  if (mentionsScreenName(message, "tradingLock")) {
    return serviceHowToReply(
      "학교 시간엔 매매 쉬기 토글은 홈에서 자녀 계정의 주문만 잠시 막는 보호자 기능이에요.",
      "홈에서 주문 잠금 보기",
      "home",
    );
  }

  if (mentionsScreenName(message, "home")) {
    return serviceHowToReply(
      "홈에서는 내 지갑 전체와 시즌 진행, 모의투자 시작 버튼을 볼 수 있어요.",
      "홈으로 가기",
      "home",
    );
  }

  if (mentionsScreenName(message, "mockInvesting")) {
    return serviceHowToReply(
      "모의투자는 모의투자 화면에서 회사를 찾아 가상 돈으로 주문을 연습하며 시작해요.",
      "모의투자 하러 가기",
      "stock",
      { stockView: "explore" },
    );
  }

  return null;
}

function getCuratedServiceHowToReply(message: string, context: ChatContext): ChatReply | null {
  const stockDetails = context.stockId ? { stockId: context.stockId } : {};

  if (message.includes("실수로매수한기록을archive에서지울")) return null;

  if (includesAny(message, ["지정가걸어두면바로사", "지정가주문바로체결"])) {
    return serviceHowToReply(
      "지정가는 정한 가격 조건이 맞아야 체결되는 주문이에요. 조건이 맞지 않으면 바로 사지 않고 기다리는 주문으로 남을 수 있어요.",
      "주문 화면에서 확인하기",
      "order",
      { ...stockDetails, orderSide: "buy", orderStep: "confirmation" },
    );
  }

  if (includesAny(message, ["매수는어디눌러", "매수어디눌러", "매수어디서해"])) {
    return serviceHowToReply(
      "종목 상세에서 매수 버튼을 누르면 주문을 시작할 수 있어요. 수량이나 금액과 이유를 확인한 뒤 마지막 단계에서 직접 주문을 확인해요.",
      "종목 화면으로 이동",
      "stock",
      stockDetails,
    );
  }

  if (includesAny(message, ["매수한거취소", "매수취소할수있", "주문취소할수있"])) {
    return serviceHowToReply(
      "아직 체결되지 않은 기다리는 주문은 취소할 수 있어요. 이미 체결된 시장가 주문은 취소할 수 없으니, 보유 현황과 주문 상태를 먼저 확인해 주세요.",
      "기다리는 주문 보기",
      "portfolio",
    );
  }

  if (includesAny(message, ["이거누르면바로사지", "매수버튼누르면끝"])) {
    return serviceHowToReply(
      "처음 매수 버튼은 주문 절차를 여는 버튼이에요. 이유와 금액을 확인한 뒤 마지막 ‘주문 넣기’를 눌러야 시장가 주문이 체결돼요.",
      "주문 화면에서 확인하기",
      "order",
      { ...stockDetails, orderSide: "buy", orderStep: "confirmation" },
    );
  }

  if (includesAny(message, ["한주만사도돼", "수량1만입력", "매수수량빨리입력", "증권사직원처럼주문화면에서수량계산"])) {
    return serviceHowToReply(
      "현재 주문 화면은 수량을 직접 적는 대신 주문 금액을 고르면 화면이 예상 수량을 계산해요. 계산된 수량과 예상 금액을 마지막에 다시 확인하면 돼요.",
      "주문 금액 입력하기",
      "order",
      { ...stockDetails, orderSide: "buy", orderStep: "quantity" },
    );
  }

  if (includesAny(message, ["진짜돈이빠져", "내돈없어지는척", "가상돈바로빠지"])) {
    return serviceHowToReply(
      "실제 돈은 빠지지 않아요. 시장가 매수가 체결되면 내 가상 지갑에서 주문 금액이 줄고, 기다리는 주문은 취소할 때까지 그 금액을 맡아 둬요.",
      message.includes("진짜돈") || message.includes("가상돈") ? "주문 화면 보기" : "가상 지갑 보기",
      message.includes("진짜돈") || message.includes("가상돈") ? "order" : "home",
      message.includes("진짜돈") || message.includes("가상돈")
        ? { ...stockDetails, orderSide: "buy", orderStep: "confirmation" }
        : {},
    );
  }

  if (includesAny(message, ["예상금액이이숫자면눌러도돼", "주문전에예상금액과수량을확인하는순서", "주문수량이랑예상금액을틀리지않게계산하는순서", "예상금액이잔액을넘지않는지확인하는절차", "매수버튼누르기전에예상금액을다시계산"])) {
    return serviceHowToReply(
      "종목 이름과 매수·매도 구분을 먼저 보고, 가격과 예상 수량·금액을 확인해요. 예상 금액이 가상 지갑과 한도를 넘지 않는지 본 뒤 마지막 주문 내용은 직접 결정하면 돼요.",
      "주문 내용 확인하기",
      "order",
      { ...stockDetails, orderSide: "buy", orderStep: "confirmation" },
    );
  }

  if (message.includes("취소누르면아무일도안생겨")) {
    return serviceHowToReply(
      "마지막 확인 전에 뒤로 가면 주문은 체결되지 않아요. 기다리는 주문을 취소하면 맡아 둔 가상 금액이 돌아오지만, 이미 체결된 시장가 주문은 취소할 수 없어요.",
      "기다리는 주문 보기",
      "portfolio",
    );
  }

  if (message.includes("주문취소하면12%도없어져")) {
    return serviceHowToReply(
      "새 주문을 취소해도 이미 생긴 -12% 손익과 지난 체결 기록은 없어지지 않아요. 지난 결과는 아카이브에 그대로 남아요.",
      "지난 기록 보기",
      "archive",
      { archiveTab: "return" },
    );
  }

  if (message.includes("주문을취소하면성향기록도수정")) {
    return serviceHowToReply(
      "주문 취소가 지난 성향 결과를 고쳐 쓰지는 않아요. 체결되지 않은 주문은 새 거래로 더하지 않고, 취소 행동은 도움 신호용 기록으로만 남을 수 있어요.",
      "성향 기록 보기",
      "archive",
      { archiveTab: "report" },
    );
  }

  if (message.includes("주문취소버튼계속누르면")) {
    return serviceHowToReply(
      "기다리는 주문은 한 번 취소되면 목록에서 사라져서 같은 주문이 다시 취소되지 않아요. 취소한 금액은 가상 지갑으로 돌아와요.",
      "기다리는 주문 보기",
      "portfolio",
    );
  }

  if (message.includes("주문취소하면금액이원래대로")) {
    return serviceHowToReply(
      "기다리는 주문을 취소하면 맡아 둔 주문 금액이 가상 지갑으로 돌아와요. 이미 체결된 시장가 주문에는 이 취소가 적용되지 않아요.",
      "기다리는 주문 보기",
      "portfolio",
    );
  }

  if (message.includes("근거태그는어디")) {
    const hasStock = Boolean(context.stockId);
    return serviceHowToReply(
      "근거 태그는 아카이브가 아니라 매수 주문의 ‘왜 이 회사가 좋아 보였어?’ 단계에서 골라요. 뉴스·차트·회사 이해 같은 선택지 중 지금 이유에 가까운 것을 고르면 돼요.",
      hasStock ? "주문의 이유 선택하기" : "종목을 골라 주문 시작하기",
      hasStock ? "order" : "stock",
      hasStock ? { ...stockDetails, orderSide: "buy", orderStep: "reason" } : {},
    );
  }

  if (includesAny(message, ["매수한이유를기록하면나중에바꿀", "근거태그를잘못선택했을때수정", "실수로매수한기록을archive에서지울"])) {
    return serviceHowToReply(
      "현재 아카이브의 체결 기록과 그때 고른 이유는 나중에 수정하거나 지울 수 없어요. 실수한 거래도 당시 기록 그대로 남아요.",
      "아카이브에서 기록 보기",
      "archive",
      { archiveTab: "return" },
    );
  }

  if (message.includes("손실난종목을다시사려면")) {
    return serviceHowToReply(
      "그 종목을 다시 사려면 종목 상세에서 매수 버튼을 눌러 새 주문을 시작해요. 지난 손실은 없어지지 않고 새 주문과 따로 기록돼요.",
      "이 종목 화면 보기",
      "stock",
      stockDetails,
    );
  }

  if (message.includes("8500원이면7주는59500원")) {
    return serviceHowToReply(
      "맞아요. 8,500원에 7주를 곱하면 예상 금액은 59,500원이에요. 실제 주문 전에는 화면에 표시된 최종 금액을 다시 확인해요.",
      "주문 화면에서 확인하기",
      "order",
      { ...stockDetails, orderSide: "buy", orderStep: "quantity" },
    );
  }

  if (message.includes("수량을11개로바꾸면")) {
    if (context.unitPrice === undefined) {
      return serviceHowToReply("현재 화면의 1주 가격이 없어 11주의 예상 금액을 계산할 수 없어요. 주문 화면에서 단가를 먼저 확인해요.");
    }
    return serviceHowToReply(
      `현재 화면의 1주 가격 ${formatWon(context.unitPrice)}에 11주를 곱하면 예상 금액은 ${formatWon(context.unitPrice * 11)}이에요. 실제 주문 전에는 화면의 최종 금액을 다시 확인해요.`,
      "11주 예상 금액 확인하기",
      "order",
      { ...stockDetails, orderSide: "buy", orderStep: "quantity" },
    );
  }

  if (message.includes("친구가알려준수량대로")) {
    return serviceHowToReply(
      "친구가 알려준 수량을 따라도 바로 체결되지는 않아요. 예상 금액과 이유를 본 뒤 마지막 주문 확인은 직접 해야 해요.",
      "주문 내용 직접 확인하기",
      "order",
      { ...stockDetails, orderSide: "buy", orderStep: "confirmation" },
    );
  }

  if (message.includes("매수수량과투자비중")) {
    return serviceHowToReply(
      "매수 수량이 늘면 그 종목에 들어간 금액과 전체 자산에서 차지하는 비중도 커져요. 정확한 비중은 홈의 포트폴리오에서 현재 보유 금액과 함께 확인해요.",
      "포트폴리오 보기",
      "home",
    );
  }

  if (message.includes("매수누르면또떨어지는거")) {
    return serviceHowToReply(
      "매수 뒤 가격 변화는 미리 알 수 없어요. 주문하려면 금액과 이유를 입력한 뒤 마지막 확인은 직접 하면 돼요.",
      "주문 화면에서 확인하기",
      "order",
      { ...stockDetails, orderSide: "buy", orderStep: "confirmation" },
    );
  }

  if (message.includes("이거팔면수익률바로바뀌")) {
    return serviceHowToReply(
      "시장가 매도가 체결되면 보유 수량과 손익·수익률 표시가 새 거래를 반영해 바뀌어요. 확인 화면에서 매도 수량을 먼저 확인해요.",
      "보유 종목 보기",
      "portfolio",
    );
  }

  if (message.includes("수수료") && includesAny(message, ["정확히얼마", "포함해서다시계산"])) {
    return serviceHowToReply(
      "현재 데모는 주문 전 정확한 수수료·세금 분리 계산을 지원하지 않아요. 화면에 없는 비용을 키웅이가 임의로 만들어 계산하지 않아요.",
    );
  }

  if (message.includes("여기서바로주문안되고order화면")) {
    return serviceHowToReply(
      "종목 화면은 회사 정보와 가격을 살펴보는 곳이고, 주문 화면은 금액·이유·최종 내용을 확인하는 곳이라 나뉘어 있어요. 주문은 확인 단계를 거쳐야 해요.",
      "주문 화면으로 이동",
      "order",
      { ...stockDetails, orderSide: "buy", orderStep: "quantity" },
    );
  }

  if (message.includes("매수매도버튼어디가더빨라")) {
    return serviceHowToReply(
      "더 빠른 버튼을 고르는 기능은 없어요. 새로 살 때는 매수, 가진 주식을 팔 때는 매도를 종목 상세에서 선택해요.",
      "종목 화면 보기",
      "stock",
      stockDetails,
    );
  }

  if (message.includes("이주문오리온2주가맞는지")) {
    return serviceHowToReply(
      "키웅이가 주문이 맞다고 대신 승인하지는 않아요. 확인 화면에서 회사가 오리온인지, 수량이 2주인지, 매수·매도 구분과 예상 금액이 처음 의도와 같은지 직접 확인해요.",
      "주문 내용 확인하기",
      "order",
      { ...stockDetails, orderStep: "confirmation" },
    );
  }

  if (message.includes("수량을1개잘못누르면")) {
    return serviceHowToReply(
      "체결 전에는 뒤로 가서 주문 금액을 다시 입력할 수 있어요. 이미 체결된 시장가 주문은 되돌릴 수 없어요.",
      "주문 금액 수정하기",
      "order",
      { ...stockDetails, orderSide: "buy", orderStep: "quantity" },
    );
  }

  if (message.includes("기사읽다가산건데거래이유")) {
    const hasStock = Boolean(context.stockId);
    return serviceHowToReply(
      "매수 주문의 이유 선택 단계에서 ‘뉴스에서 봐서’를 고르면 돼요. 기사 제목 자체는 거래 완료 직후 한 줄 메모에 남길 수 있어요.",
      hasStock ? "뉴스 이유 선택하기" : "종목을 골라 주문 시작하기",
      hasStock ? "order" : "stock",
      hasStock ? { ...stockDetails, orderSide: "buy", orderStep: "reason" } : {},
    );
  }

  if (message.includes("차트에서뉴스나온날짜랑가격변화")) {
    return serviceHowToReply(
      "현재는 뉴스 날짜를 가격 차트 위에 겹쳐 보는 기능이 없어요. 종목 화면에서 차트와 검수된 뉴스를 각각 따로 볼 수 있어요.",
      "대신 차트와 뉴스 보기",
      "stock",
      stockDetails,
    );
  }

  if (message.includes("기사제목을아카이브에메모로추가")) {
    return serviceHowToReply(
      "현재는 아카이브에서 지난 기록에 메모를 새로 추가할 수 없어요. 한 줄 메모는 거래가 끝난 직후에만 남길 수 있어요.",
    );
  }

  if (message.includes("매수가격과현재가격의차이를퍼센트")) {
    return serviceHowToReply(
      "수익률은 ‘현재 가격에서 매수 가격을 뺀 값’을 매수 가격으로 나눈 뒤 100을 곱해 계산해요. 내 보유 종목의 계산 결과는 포트폴리오에서 확인할 수 있어요.",
      "보유 수익률 보기",
      "portfolio",
    );
  }

  if (message.includes("방산회사의무기종류를자세히")) {
    return serviceHowToReply(
      "이 서비스는 방산 회사가 하는 일과 산업 역할은 설명하지만 무기 종류를 자세한 목록으로 제공하지 않아요. 검수된 회사 설명은 종목 화면에서 볼 수 있어요.",
      "검수된 회사 설명 보기",
      "stock",
      stockDetails,
    );
  }

  if (message.includes("에너지섹터만모아서")) {
    return serviceHowToReply(
      "종목 탐색 화면에서 에너지 업종 칩을 누르면 에너지 회사를 모아 볼 수 있어요. 회사 카드를 누르면 검수된 설명이 열려요.",
      "에너지 회사 모아 보기",
      "stock",
      { sectorId: "energy" },
    );
  }

  if (message.includes("친구가보낸종목링크")) {
    return serviceHowToReply(
      "현재는 친구가 보낸 종목 링크로 회사 화면을 바로 여는 기능이 없어요. 종목 탐색 화면에서 회사 이름을 검색해 찾아볼 수 있어요.",
      "대신 종목 검색하기",
      "stock",
    );
  }

  if (message.includes("성향그래프원자료")) {
    return serviceHowToReply(
      "현재는 성향 계산 원자료를 펼치거나 내려받는 기능이 없어요. 아카이브 성향 화면에서 현재 제공되는 요약만 확인할 수 있어요.",
      "현재 성향 요약 보기",
      "archive",
      { archiveTab: "report" },
    );
  }

  if (message.includes("남은한도안에서게임주수량을한번에최대")) {
    return serviceHowToReply(
      "한도까지의 최대 수량을 계산해 자동 입력하는 기능은 없어요. 주문 금액을 직접 고르면 화면이 잔액과 단일 종목 한도 초과 여부를 확인해요.",
      undefined,
      undefined,
      {},
      "refusal",
    );
  }

  if (message.includes("유통주그냥정리하려면")) {
    return serviceHowToReply(
      "매도 버튼만 누르면 끝나지 않아요. 팔 수량과 이유를 고르고 마지막 주문 내용을 직접 확인해야 체결돼요.",
      "매도 화면으로 이동",
      "order",
      { ...stockDetails, orderSide: "sell", orderStep: "quantity" },
    );
  }

  if (message.includes("부모님이옆에서재촉할때도")) {
    return serviceHowToReply(
      "부모님이 옆에 있어도 주문 내용과 마지막 확인은 계정 사용자가 직접 해야 해요. 키웅이나 다른 사람이 대신 주문을 확정하지 않아요.",
    );
  }

  if (message.includes("매수") && !findRecommendationKind(message)) {
    switch (findChatbotQuestionForm(message)) {
      case "location":
        return serviceHowToReply(
          "종목 상세에서 매수 버튼을 누르면 주문을 시작할 수 있어요. 수량이나 금액과 이유를 확인한 뒤 마지막 단계에서 직접 주문을 확인해요.",
          "종목 화면으로 이동",
          "stock",
          stockDetails,
        );
      case "reason":
        if (!includesAny(message, ["매수는왜", "매수를왜", "왜매수해", "왜사"])) break;
        return serviceHowToReply(
          "매수는 꼭 해야 하는 일이 아니에요. 회사와 자료를 살펴본 뒤 왜 관심이 갔는지 스스로 기록하고, 주문할지는 직접 결정하면 돼요.",
          "종목 화면으로 이동",
          "stock",
          stockDetails,
        );
      case "time":
        return serviceHowToReply(
          "언제 살지 정해 주지는 않아요. 시장가 주문은 바로 체결될 수 있고, 지정가 주문은 정한 가격 조건이 맞을 때까지 기다릴 수 있어요.",
          "주문 화면에서 확인하기",
          "order",
          { ...stockDetails, orderSide: "buy", orderStep: "confirmation" },
        );
      case "quantity":
        return serviceHowToReply(
          "몇 주를 살지는 정해 주지 않아요. 주문 화면에서 수량이나 금액을 직접 고르고, 예상 금액이 가상 지갑 안에 드는지 확인하면 돼요.",
          "주문 수량 고르기",
          "order",
          { ...stockDetails, orderSide: "buy", orderStep: "quantity" },
        );
    }
  }

  return null;
}

function getPrivacyReply(message: string): ChatReply | null {
  if (includesAny(message, FAMILY_COMPARISON_PATTERNS)) return null;
  if (!includesAny(message, FAMILY_MEMBER_PATTERNS)) return null;

  if (includesAny(message, TRADE_VISIBILITY_PATTERNS)) {
    return reply("safety", "safety", TRADE_VISIBILITY_ANSWER, ["거래 기록 공개 범위 안내"]);
  }
  if (includesAny(message, CHAT_PRIVACY_PATTERNS)) {
    return reply("safety", "safety", CHAT_PRIVACY_ANSWER, ["챗봇 대화 공개 범위 안내"]);
  }
  return null;
}

export function routeMessage(input: string, context: ChatContext): ChatReply {
  const message = normalizeChatInput(input);

  // 위기 확인 선택지는 화면에 해요체로 표시되고, 누르면 그 표시값이 그대로 전송된다.
  // 반말형만 두면 버튼을 눌러도 여기에 걸리지 않아 범위 안내로 빠진다.
  if (["지금은안전해", "지금은안전해요", "안전한곳에있어", "안전한곳에있어요"].includes(message)) {
    return reply(
      "safety",
      "safety",
      "알려줘서 고마워요. 지금은 투자 화면을 닫고 쉬면서, 계속 힘들면 믿을 수 있는 어른에게 지금 마음을 말해 줘요.",
      ["안전 상태 확인"],
    );
  }

  if (
    ["도움이필요해", "도움이필요해요", "지금위험해", "지금위험해요", "안전하지않아", "안전하지않아요"].includes(
      message,
    )
  ) {
    return reply(
      "safety",
      "safety",
      "지금 혼자 있지 말고 가까운 보호자·교사처럼 믿을 수 있는 어른에게 바로 알려 줘요. 급하게 다칠 위험이 있으면 112나 119에 도움을 요청해 줘요.",
      ["긴급 도움 안내"],
    );
  }

  const privacyReply = getPrivacyReply(message);
  if (privacyReply) return privacyReply;

  // SPEC §6.1.2 의 입력 안전 우선순위대로 보호 판정을 사용법 FAQ 앞에 둔다.
  // 뒤에 두면 "다 포기하고 싶어 매수 버튼 누르면 끝이야?" 처럼 위기 표현에
  // 서비스 낱말이 섞였을 때 큐레이트 FAQ 가 먼저 잡아 보호 응답이 사라진다.
  const unsafeKind = findUnsafeKind(message);
  if (unsafeKind) return unsafeReply(unsafeKind, message);

  const questionActReply = getQuestionActReply(message, context);
  if (questionActReply) return questionActReply;

  const explicitServiceReply = getChildFriendlyIntentReply(message, context);
  if (explicitServiceReply?.intent === "service_help" && !findRecommendationKind(message)) {
    return explicitServiceReply;
  }

  // 안전 판정 뒤. 화면이 실어 보낸 내 지갑 값은 사전·FAQ보다 먼저 답한다 —
  // "나 쓸 수 있는 돈 얼마 남았어?" 에 잔고 대신 용어 설명이 나가는 걸 막는
  // 지점이다. 값이 실려 오지 않았으면 아무것도 하지 않고 기존 순서로 흘린다.
  // 추천·예측 질문은 여기서 답하지 않는다 — 거절이 먼저다.
  if (isPersonalDataQuestion(message) && !findRecommendationKind(message)) {
    const earlyPersonalValue = getPersonalValueReply(message, context);
    if (earlyPersonalValue) return earlyPersonalValue;
  }

  const childFriendlyIntentReply = getChildFriendlyIntentReply(message, context);
  if (childFriendlyIntentReply) return childFriendlyIntentReply;

  const financialConceptReply = getFinancialConceptReply(message);
  if (financialConceptReply) return financialConceptReply;

  const navigationReply = getScreenNavigationReply(message);
  if (navigationReply) return navigationReply;

  const curatedServiceHowToReply = getCuratedServiceHowToReply(message, context);
  if (curatedServiceHowToReply) return curatedServiceHowToReply;

  const ruleKind = findRuleKind(message, context);
  if (ruleKind) return ruleReply(ruleKind, message);

  if (includesAny(message, HARMFUL_PATTERNS)) {
    return reply(
      "safety",
      "safety",
      "그 요청은 여기서 도와줄 수 없어요. 투자 화면이나 금융 기초가 궁금하면 다시 물어봐 주세요.",
      ["안전 안내"],
    );
  }

  const archiveManagementReply = getArchiveManagementReply(message);
  if (archiveManagementReply) return archiveManagementReply;

  const archiveAbilityReply = getArchiveAbilityReply(message, context);
  if (archiveAbilityReply) return archiveAbilityReply;

  // SPEC §6.1.5 의 예외 — 복합 금융 개념이 추천·예측보다 앞서지만, "실제 선택·
  // 시점·가격 판단을 요구하면 recommend 가 우선한다". 그 판정을 용어 경로보다
  // 먼저 확정해 둔다. 아래 용어 분기들이 이 값을 보고 비켜난다.
  const recommendationKind = findRecommendationKind(message);

  // 안전·개인정보·규칙 안내 뒤에는 승인된 화면 용어를 먼저 설명한다.
  // "목표 가격"처럼 매매 요청과 같은 단어를 쓰더라도, 단순 용어 질문은
  // 추천·예측 거절로 보내지 않고 화면의 실제 뜻을 알려 준다.
  // 다만 대신 정해 달라는 요구는 용어 질문이 아니다 — "목표가 좀 정해줘"가
  // `목표 가격` 설명으로 새던 자리다.
  const earlyKnowledge = recommendationKind ? undefined : findChatbotKnowledge(message);
  if (
    earlyKnowledge &&
    EARLY_SCREEN_TERM_IDS.has(earlyKnowledge.id) &&
    !findMentionedStock(message)
  ) {
    return reply(
      "faq",
      "service_help",
      earlyKnowledge.answer,
      ["사용법 FAQ 확인"],
      {
        ...(earlyKnowledge.actionTarget
          ? { uiAction: { type: "open_screen", target: earlyKnowledge.actionTarget } }
          : {}),
        ...(earlyKnowledge.explainScript
          ? { explainScript: earlyKnowledge.explainScript }
          : {}),
      },
    );
  }

  const metaKind = findMetaKind(message, recommendationKind);
  if (metaKind) return metaReply(metaKind, message);

  const ownDataReply = getOwnDataReply(message);
  if (ownDataReply) return ownDataReply;

  // 내 데이터 질문이면 용어 사전을 끈다. 실제 답변은 아래 본인 데이터 도구를
  // 먼저 태운 뒤에 고른다 — 도구가 있으면 도구가 이긴다.
  const personalData = isPersonalDataQuestion(message);

  // "주가가 뭐야?"처럼 **뜻만 묻는** 질문이고 사전에 DAPIE 스크립트가 있으면 사전이 답한다.
  // term 9종 고정 응답은 사전에 없는 개념을 메우는 그물이라, 되물어 가며 설명할 수 있는
  // 쪽이 있으면 양보한다. 정의형으로 좁히는 이유는 SPEC §3.4다 — 두 개념 비교, 단정 교정,
  // 수치 계산은 한 용어의 DAPIE 로 답할 수 없어 고정 응답이 맡아야 한다.
  // 대신 골라·정해 달라는 요구에는 용어 DAPIE 를 열지 않는다. `findTermKind` 는
  // 이미 결정 요구를 스스로 걸러 내지만(`asksForDecision`), 사전 스크립트에는 그
  // 가드가 없어 "목표가 좀 정해줘 손절가도" 가 손절 설명으로 새 나갔다.
  const scriptedTerm =
    personalData || recommendationKind ? undefined : findScriptedTerm(message);
  const termKind = personalData || scriptedTerm ? null : findTermKind(message);
  const termTakesPriorityOverCompany =
    termKind === "causality" ||
    (termKind === "industryConcept" &&
      message.includes("주가") &&
      includesAny(message, ["이자수익", "이자로번", "이자로버는"]));
  if (termKind && termTakesPriorityOverCompany) return termReply(termKind, message);

  const companyFactKind = findCompanyFactKind(message);
  // "은행금융 섹터에서 예대마진이 뭐야?"는 섹터 소개가 아니라 예대마진의 뜻을 묻는
  // 질문이라 사전이 우선이다. 다만 "반도체 섹터는 뭐 하는 곳이야?"처럼 섹터 자체를
  // 물으면 `업종` 용어 정의가 아니라 섹터 설명이 나가야 한다.
  const sectorFactReply =
    termKind || (scriptedTerm && scriptedTerm.id !== "term:sector")
      ? null
      : getSectorFactReply(message);
  if (sectorFactReply) return sectorFactReply;
  if (companyFactKind) return companyFactReply(companyFactKind, message, context);

  if (termKind) return termReply(termKind, message);

  const offtopicKind = findOfftopicKind(message, recommendationKind);
  if (offtopicKind) return offtopicReply(offtopicKind, message);

  if (recommendationKind) {
    return recommendationReply(recommendationKind, message, context);
  }

  const contextReply = getContextReply(message, context);
  if (contextReply) return contextReply;

  if (
    includesAny(message, HOLDING_PATTERNS) &&
    !includesAny(message, HOLDING_OTHER_PATTERNS)
  ) {
    return reply("tool", "own_records", "", ["본인 보유 현황 조회"], {
      tool: "own_holdings",
    });
  }
  // 구절 목록(`최근에뭐샀`)은 "나 뭐 샀었지?"·"내가 왜 이거 샀는지 기억나?" 를
  // 놓친다. 1인칭과 기록 낱말의 근접으로 함께 본다.
  if (includesAny(message, RECORD_PATTERNS) || asksOwnTradeRecords(message)) {
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

  // 위 도구 패턴에 안 걸린 내 데이터 질문. 화면이 실어 보낸 값 → 화면 안내
  // 순으로 답하고, 둘 다 안 되면 아래 fallback 으로 내려가 모델이 받는다.
  // 용어 사전(termKind)은 이미 꺼져 있어 정의 카드로 떨어지지 않는다.
  if (personalData) {
    const personalValueReply = getPersonalValueReply(message, context);
    if (personalValueReply) return personalValueReply;
    const personalGuidance = getPersonalScreenGuidance(message);
    if (personalGuidance) return personalGuidance;
  }

  const explicitCompanyFactReply = getExplicitCompanyFactReply(message, context);
  if (explicitCompanyFactReply) return explicitCompanyFactReply;

  // `findChatbotKnowledge` 는 항목마다 고른 트리거로 매칭하므로 정확도가 높다
  // (실측 term 98%). 여기에는 정의 형태 게이트를 걸지 않는다 — 게이트는 낱말
  // 조합으로 넓게 잡는 `findTermKind` 쪽 오답만 막는 게 목적이다.
  const knowledge = findApprovedKnowledge(message);
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
  if (!mentionedStock && hasUnrecognizedStockName(message)) {
    return reply(
      "faq",
      "service_help",
      "말한 회사 이름을 찾지 못했어요. 회사 이름을 다시 적거나 51개 종목 탐색에서 골라 주세요.",
      ["미등록 종목명 대체 차단"],
      {
        uiAction: {
          type: "open_screen",
          target: "stock",
          label: "종목 탐색에서 회사 찾기",
        },
      },
    );
  }
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

  // 여기까지 온 반복 확인 표현은 어느 큐레이트 답에도 닿지 못한 것이다. SPEC
  // §6.1.2 는 "계속 확인하게 돼" 를 정서 지원 대상으로 두므로 범위 안내로
  // 끝내지 않는다. 앞선 큐레이트 답이 있으면 그쪽이 이미 답했으므로 여기에
  // 오지 않는다 — 그물은 앞을 가로채지 않는다.
  if (asksRepeatedChecking(message)) return unsafeReply("anxiety", message);

  if (isModelEligibleFallback(message, context)) {
    return reply(
      "fallback",
      "general_allowed",
      "금융 기초와 서비스 사용법을 확인하고 있어요.",
      ["허용 목적 확인"],
    );
  }

  return unclassifiedReply();
}

export const PROACTIVE_SCRIPTS: Record<
  ProactiveSignal,
  { label: string; text: string }
> = {
  buyHesitation: {
    label: "매수 최종 확인 반복 이탈",
    text: "살지 말지 고민돼요?",
  },
  orderMethodConfusion: {
    label: "시장가·지정가 교차 변경",
    text: "뭐가 다른지 볼까요?",
  },
  dwell: {
    label: "주문·상세 화면 5분 초과 체류",
    text: "어디가 헷갈려요?",
  },
  lossRevisit: {
    label: "손실 실현 종목 반복 조회",
    text: "후회되나요?",
  },
};
