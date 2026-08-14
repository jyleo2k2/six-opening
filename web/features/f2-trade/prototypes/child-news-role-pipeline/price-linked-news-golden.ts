import type { MaterialEventType, NewsArticleScope } from "./contracts";

export type GoldenArticleRef =
  | { fixture: "daily-2026-08-12" | "daily-2026-08-13"; caseId: string }
  | { fixture: "universe-2026-08-13"; stockName: string };

export type CitedGoldenText = {
  text: string;
  sourceIds: string[];
};

export type PriceConnectionKind =
  | "market_index"
  | "observed_price_move"
  | "production_capacity"
  | "business_combination"
  | "operational_continuity"
  | "shareholder_return"
  | "recurring_sales"
  | "ownership_and_credit"
  | "business_performance";

export type GoldenReadyCase = {
  caseId: string;
  status: "ready_for_human_review";
  articleRef: GoldenArticleRef;
  scope: NewsArticleScope;
  stockIds: string[];
  companyNames: string[];
  eventType: MaterialEventType;
  headline: CitedGoldenText;
  summaryLines: Array<CitedGoldenText & { factKey: string }>;
  priceConnection: CitedGoldenText & {
    kind: PriceConnectionKind;
    basis: "article_fact" | "event_education";
  };
  termExplanations: Array<CitedGoldenText & { term: string }>;
};

export type GoldenRejectedCase = {
  caseId: string;
  status: "rejected";
  articleRef: GoldenArticleRef;
  scope: NewsArticleScope;
  stockIds: string[];
  companyNames: string[];
  eventType: MaterialEventType;
  reasonCodes: string[];
  reasons: string[];
  reasonSourceIds: string[];
};

export type PriceLinkedGoldenCase = GoldenReadyCase | GoldenRejectedCase;

export const PRICE_LINKED_GOLDEN_CASES: PriceLinkedGoldenCase[] = [
  {
    caseId: "market-kospi-close",
    status: "ready_for_human_review",
    articleRef: { fixture: "daily-2026-08-13", caseId: "01-market-close-kospi-definition" },
    scope: "market",
    stockIds: [],
    companyNames: [],
    eventType: "observed_market_move",
    headline: { text: "코스피, 3.56% 올라 6813.34로 마감", sourceIds: ["S1"] },
    summaryLines: [
      { factKey: "kospi_points", text: "전날보다 234.30포인트 올랐어요.", sourceIds: ["S1"] },
      { factKey: "kosdaq_close", text: "코스닥도 0.29% 오른 1419.4였어요.", sourceIds: ["S2"] },
      { factKey: "exchange_rate", text: "원·달러 환율은 7.7원 내렸어요.", sourceIds: ["S3"] },
    ],
    priceConnection: {
      kind: "market_index",
      basis: "event_education",
      text: "코스피는 국내 대표 기업들의 주가 흐름을 모아 보여주는 숫자예요.",
      sourceIds: ["S1"],
    },
    termExplanations: [
      { term: "코스피", text: "국내 대표 기업들의 주가 흐름을 모은 숫자", sourceIds: ["S1"] },
      { term: "코스닥", text: "성장 기업이 많이 모인 국내 주식시장의 숫자", sourceIds: ["S2"] },
      { term: "환율", text: "서로 다른 나라 돈을 바꾸는 비율", sourceIds: ["S3"] },
    ],
  },
  {
    caseId: "samsung-pune-production",
    status: "ready_for_human_review",
    articleRef: { fixture: "daily-2026-08-13", caseId: "02-samsung-pune-production-line" },
    scope: "company",
    stockIds: ["KRX:005930"],
    companyNames: ["삼성전자"],
    eventType: "sales_or_production",
    headline: { text: "삼성전자, 인도에 AI 냉방 설비 생산라인 완공", sourceIds: ["S1"] },
    summaryLines: [
      { factKey: "facility_area", text: "생산시설 면적은 1만3826제곱미터예요.", sourceIds: ["S2"] },
      { factKey: "annual_capacity", text: "한 해 최대 6500대를 생산할 수 있어요.", sourceIds: ["S2"] },
      { factKey: "construction_period", text: "설비 구축을 시작한 지 약 6개월 만이에요.", sourceIds: ["S3"] },
    ],
    priceConnection: {
      kind: "production_capacity",
      basis: "event_education",
      text: "생산할 수 있는 제품 수가 늘면 앞으로의 판매 규모와 연결될 수 있어요.",
      sourceIds: ["S1", "S2"],
    },
    termExplanations: [
      { term: "데이터센터", text: "많은 컴퓨터가 데이터를 저장하고 처리하는 시설", sourceIds: ["S1"] },
      { term: "생산라인", text: "제품을 순서대로 만드는 설비와 작업 공간", sourceIds: ["S1"] },
      { term: "제곱미터", text: "가로 1미터와 세로 1미터로 만든 넓이의 단위", sourceIds: ["S2"] },
    ],
  },
  {
    caseId: "korean-air-asiana-merger",
    status: "ready_for_human_review",
    articleRef: { fixture: "daily-2026-08-12", caseId: "02-airline-merger" },
    scope: "company",
    stockIds: ["KRX:003490", "KRX:020560"],
    companyNames: ["대한항공", "아시아나항공"],
    eventType: "merger_or_ownership",
    headline: { text: "대한항공·아시아나항공, 12월 합병 예정", sourceIds: ["S1", "S3"] },
    summaryLines: [
      { factKey: "shareholder_vote", text: "아시아나 주주총회에서 합병안이 통과됐어요.", sourceIds: ["S1"] },
      { factKey: "approval_rate", text: "참석 주주의 99.3%가 찬성했어요.", sourceIds: ["S2"] },
      { factKey: "launch_date", text: "통합 대한항공은 12월 17일 출범할 예정이에요.", sourceIds: ["S3"] },
    ],
    priceConnection: {
      kind: "business_combination",
      basis: "event_education",
      text: "합병은 회사의 크기와 운영 방식을 크게 바꾸는 일이어서 주가와 연결돼요.",
      sourceIds: ["S1", "S3"],
    },
    termExplanations: [
      { term: "합병", text: "둘 이상의 회사가 하나의 회사로 합쳐지는 일", sourceIds: ["S1"] },
      { term: "주주총회", text: "주식을 가진 사람들이 회사의 중요한 일을 결정하는 회의", sourceIds: ["S1"] },
    ],
  },
  {
    caseId: "hyundai-partial-strike",
    status: "ready_for_human_review",
    articleRef: { fixture: "daily-2026-08-12", caseId: "06-automaker-strike" },
    scope: "company",
    stockIds: ["KRX:005380"],
    companyNames: ["현대차"],
    eventType: "material_operational_risk",
    headline: { text: "현대차 노조, 네 번째 부분파업 시작", sourceIds: ["S1"] },
    summaryLines: [
      { factKey: "strike_start", text: "노조가 12일부터 네 번째 부분파업에 들어갔어요.", sourceIds: ["S1"] },
      { factKey: "production_risk", text: "파업은 자동차 생산 일정에 영향을 줄 수 있어요.", sourceIds: ["S2"] },
      { factKey: "outcome_unknown", text: "하반기 판매 결과는 아직 확인되지 않았어요.", sourceIds: ["S3"] },
    ],
    priceConnection: {
      kind: "operational_continuity",
      basis: "event_education",
      text: "생산이 멈추거나 늦어지면 판매할 차량 수와 비용에 영향을 줄 수 있어요.",
      sourceIds: ["S1", "S2"],
    },
    termExplanations: [
      { term: "노동조합", text: "일하는 사람들이 근무 조건을 함께 논의하려 만든 모임", sourceIds: ["S1"] },
      { term: "부분파업", text: "일부 시간이나 업무만 멈추는 파업", sourceIds: ["S1"] },
    ],
  },
  {
    caseId: "samyang-interim-dividend",
    status: "ready_for_human_review",
    articleRef: { fixture: "universe-2026-08-13", stockName: "삼양식품" },
    scope: "company",
    stockIds: ["KRX:003230"],
    companyNames: ["삼양식품"],
    eventType: "capital_or_dividend",
    headline: { text: "삼양식품, 올해 중간배당 결정", sourceIds: ["S1"] },
    summaryLines: [
      { factKey: "dividend_per_share", text: "보통주 1주마다 현금 3200원을 지급해요.", sourceIds: ["S1"] },
      { factKey: "dividend_yield", text: "주가와 비교한 배당 비율은 0.3%예요.", sourceIds: ["S2"] },
      { factKey: "total_dividend", text: "전체 배당금은 약 241억 원이에요.", sourceIds: ["S2"] },
    ],
    priceConnection: {
      kind: "shareholder_return",
      basis: "event_education",
      text: "배당은 회사가 가진 돈을 주주에게 나누는 결정이라 주가와 연결돼요.",
      sourceIds: ["S1", "S2"],
    },
    termExplanations: [
      { term: "중간배당", text: "한 해가 끝나기 전에 주주에게 먼저 주는 배당", sourceIds: ["S1"] },
      { term: "보통주", text: "회사의 주인이 될 권리를 나타내는 일반적인 주식", sourceIds: ["S1"] },
    ],
  },
  {
    caseId: "jyp-price-reaction",
    status: "ready_for_human_review",
    articleRef: { fixture: "universe-2026-08-13", stockName: "JYP Ent." },
    scope: "company",
    stockIds: ["KRX:035900"],
    companyNames: ["JYP Ent."],
    eventType: "observed_market_move",
    headline: { text: "JYP Ent., 실적 발표 뒤 주가 11.20% 하락", sourceIds: ["S1", "S2"] },
    summaryLines: [
      { factKey: "closing_price", text: "13일 주가는 4만850원에 마감했어요.", sourceIds: ["S2"] },
      { factKey: "operating_profit", text: "2분기 영업이익은 310억 원이었어요.", sourceIds: ["S3"] },
      { factKey: "profit_change", text: "지난해 같은 기간보다 41.4% 줄었어요.", sourceIds: ["S3"] },
    ],
    priceConnection: {
      kind: "observed_price_move",
      basis: "article_fact",
      text: "기사에서는 실적 부진과 재계약 불확실성을 하락 배경으로 전했어요.",
      sourceIds: ["S1"],
    },
    termExplanations: [
      { term: "영업이익", text: "회사가 본업으로 벌어 사업 비용을 빼고 남긴 금액", sourceIds: ["S3"] },
      { term: "재계약", text: "끝나가는 계약을 다시 이어서 맺는 일", sourceIds: ["S1"] },
    ],
  },
  {
    caseId: "coway-thailand-rental",
    status: "ready_for_human_review",
    articleRef: { fixture: "universe-2026-08-13", stockName: "코웨이" },
    scope: "company",
    stockIds: ["KRX:021240"],
    companyNames: ["코웨이"],
    eventType: "sales_or_production",
    headline: { text: "코웨이, 태국 렌탈 제품 50만 대 눈앞", sourceIds: ["S4"] },
    summaryLines: [
      { factKey: "sales_background", text: "정수기 판매와 브랜드 인지도가 함께 늘었어요.", sourceIds: ["S3"] },
      { factKey: "us_revenue_gap", text: "미국 법인과 매출 차이는 9억 원까지 줄었어요.", sourceIds: ["S5"] },
      { factKey: "growth_hub", text: "회사는 태국을 두 번째 해외 성장 거점으로 키울 계획이에요.", sourceIds: ["S7"] },
    ],
    priceConnection: {
      kind: "recurring_sales",
      basis: "event_education",
      text: "렌탈 계약 수는 매달 반복해서 들어오는 매출 규모와 연결돼요.",
      sourceIds: ["S4", "S5"],
    },
    termExplanations: [
      { term: "렌탈 계정", text: "고객이 제품을 빌려 쓰기로 맺은 계약 수", sourceIds: ["S4"] },
      { term: "법인", text: "회사가 다른 나라에서 사업하려고 세운 별도 회사", sourceIds: ["S5"] },
    ],
  },
  {
    caseId: "lotte-rental-owner-change",
    status: "ready_for_human_review",
    articleRef: { fixture: "universe-2026-08-13", stockName: "롯데렌탈" },
    scope: "company",
    stockIds: ["KRX:089860"],
    companyNames: ["롯데렌탈"],
    eventType: "merger_or_ownership",
    headline: { text: "롯데렌탈 최대주주, TPG로 바뀔 예정", sourceIds: ["S3", "S4"] },
    summaryLines: [
      { factKey: "stake_sale", text: "호텔롯데 등은 지분 61.17%를 팔기로 계약했어요.", sourceIds: ["S7"] },
      { factKey: "deal_value", text: "계약 금액은 1조3105억 원이에요.", sourceIds: ["S7"] },
      { factKey: "credit_view", text: "신용평가사는 등급 영향이 제한적이라고 봤어요.", sourceIds: ["S4"] },
    ],
    priceConnection: {
      kind: "ownership_and_credit",
      basis: "event_education",
      text: "최대주주 변경은 회사의 중요한 결정 방식과 자금 조달에 연결될 수 있어요.",
      sourceIds: ["S3", "S4", "S7"],
    },
    termExplanations: [
      { term: "최대주주", text: "회사 주식을 가장 많이 가진 주주", sourceIds: ["S3", "S4"] },
      { term: "지분", text: "회사 전체 주식 가운데 누가 가진 몫", sourceIds: ["S7"] },
      { term: "신용등급", text: "회사가 빌린 돈을 갚을 힘을 나타낸 등급", sourceIds: ["S4"] },
    ],
  },
  {
    caseId: "dalba-quarterly-growth",
    status: "ready_for_human_review",
    articleRef: { fixture: "universe-2026-08-13", stockName: "달바글로벌" },
    scope: "company",
    stockIds: ["KRX:483650"],
    companyNames: ["달바글로벌"],
    eventType: "earnings",
    headline: { text: "달바글로벌, 2분기 영업이익 61.6% 증가", sourceIds: ["S4"] },
    summaryLines: [
      { factKey: "operating_profit", text: "영업이익은 472억4100만 원이었어요.", sourceIds: ["S4"] },
      { factKey: "revenue", text: "매출은 1868억6100만 원으로 45.6% 늘었어요.", sourceIds: ["S5"] },
      { factKey: "overseas_revenue", text: "해외 매출은 1415억 원으로 74% 늘었어요.", sourceIds: ["S9"] },
    ],
    priceConnection: {
      kind: "business_performance",
      basis: "event_education",
      text: "판매와 영업이익이 함께 늘었는지는 회사의 사업 흐름과 연결돼요.",
      sourceIds: ["S4", "S5", "S9"],
    },
    termExplanations: [
      { term: "매출", text: "제품이나 서비스를 팔아 받은 전체 금액", sourceIds: ["S5"] },
      { term: "영업이익", text: "회사가 본업으로 벌어 사업 비용을 빼고 남긴 금액", sourceIds: ["S4"] },
      { term: "연결 기준", text: "본사와 자회사의 실적을 합쳐 계산한 기준", sourceIds: ["S4"] },
    ],
  },
  {
    caseId: "hanwha-ocean-tender-not-awarded",
    status: "rejected",
    articleRef: { fixture: "universe-2026-08-13", stockName: "한화오션" },
    scope: "company",
    stockIds: ["KRX:042660"],
    companyNames: ["한화오션"],
    eventType: "binding_contract",
    reasonCodes: ["CONTRACT_NOT_AWARDED", "MULTI_COMPANY_TENDER"],
    reasons: [
      "한화오션이 입찰에 참여했지만 수주가 확정되지 않았습니다.",
      "여섯 회사가 경쟁하는 기사라 한화오션의 계약 성과로 바꾸면 안 됩니다.",
    ],
    reasonSourceIds: ["S3", "S4", "S10"],
  },
];
