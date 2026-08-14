import type { HeadlineScreeningExample } from "./contracts";

/** 평가 10건과 겹치지 않는 정책 교정용 제목 예시다. */
export const HEADLINE_SCREENING_EXAMPLES: HeadlineScreeningExample[] = [
  {
    title: "코스피, 외국인 순매수에 장중 상승",
    decision: "pass",
    reasonCodes: [],
    reason: "당일 국내 시장 움직임일 가능성이 있어 본문을 확인한다.",
  },
  {
    title: "삼성전자, 2분기 실적 발표",
    decision: "pass",
    reasonCodes: [],
    reason: "선정 기업의 확정 실적 기사일 가능성이 있어 본문을 확인한다.",
  },
  {
    title: "현대차 울산공장 생산 일시 중단",
    decision: "pass",
    reasonCodes: [],
    reason: "생산에 직접 연결되는 운영 사건일 가능성이 있어 본문을 확인한다.",
  },
  {
    title: "대한항공·아시아나항공 합병안 승인",
    decision: "pass",
    reasonCodes: [],
    reason: "선정 기업의 합병·지배구조 사건일 가능성이 있어 본문을 확인한다.",
  },
  {
    title: "삼성전자, 새 반도체 기술 공개",
    decision: "pass",
    reasonCodes: [],
    reason: "제목만으로 단순 홍보인지 실제 생산·판매 사건인지 확정할 수 없어 본문으로 넘긴다.",
  },
  {
    title: "외국인 관광객에 웃은 유통업계 주요 회사들",
    decision: "pass",
    reasonCodes: [],
    reason: "업계 묶음 제목만으로 선정 기업의 직접 사건인지 확정할 수 없어 본문으로 넘긴다.",
  },
  {
    title: "K-윤활기유, 글로벌 핵심 공급망 부상",
    decision: "pass",
    reasonCodes: [],
    reason: "산업 제목만으로 선정 기업의 개별 실적·생산 근거가 있는지 알 수 없어 본문으로 넘긴다.",
  },
  {
    title: "CJ대한통운, 대학생 채용설명회 개최",
    decision: "reject",
    reasonCodes: ["ROUTINE_OR_PROMOTIONAL"],
    reason: "채용 행사는 직접적인 중요 사업 사건이 아니다.",
  },
  {
    title: "KB금융, 취약계층 지원 봉사활동",
    decision: "reject",
    reasonCodes: ["ROUTINE_OR_PROMOTIONAL"],
    reason: "봉사·사회공헌은 직접적인 중요 사업 사건이 아니다.",
  },
  {
    title: "현대차, 임직원 AI 아이디어 경진대회",
    decision: "reject",
    reasonCodes: ["ROUTINE_OR_PROMOTIONAL"],
    reason: "사내 행사는 직접적인 중요 사업 사건이 아니다.",
  },
  {
    title: "방산 3사, 차세대 미사일 수주 경쟁",
    decision: "reject",
    reasonCodes: ["NO_DIRECT_MATERIALITY"],
    reason: "수주 경쟁만으로는 낙찰이나 구속력 있는 계약이 확인되지 않는다.",
  },
  {
    title: "스타트업, 키움증권 고객 대상 새 서비스 출시",
    decision: "reject",
    reasonCodes: ["COMPANY_NOT_PRIMARY_SUBJECT"],
    reason: "선정 기업은 제공 채널일 뿐 제목의 주인공이 아니다.",
  },
];
