export type FinancialEducationSource = { title: string; url: string; checkedAt: string };
export type FinancialEducation = { stockId: `KRX:${string}`; companySummary: string; businessModel: string; industryRole: string; elementaryExplanation: string; middleSchoolExplanation: string; financialSummary: string; financialSnapshot: { period: "2024"; netProfitKrwMillion: number }; sources: readonly FinancialEducationSource[]; status: "reviewed" };
const checkedAt = "2026-08-12";
export const FINANCIAL_EDUCATION: readonly FinancialEducation[] = [
  {
    stockId: "KRX:105560", companySummary: "KB금융은 은행·카드·증권·보험 등 여러 금융회사를 거느린 금융지주회사예요.", businessModel: "계열 금융회사가 예금·대출·결제·보험·투자 서비스를 제공해 얻는 수익을 연결해 보여 줘요.", industryRole: "은행·카드·증권·보험 등 여러 금융서비스를 한 그룹 안에서 연결하는 금융지주회사예요.",
    elementaryExplanation: "KB금융은 돈을 맡기고 빌리거나 카드·보험·증권 서비스를 이용할 수 있는 여러 회사를 묶어 관리해요.", middleSchoolExplanation: "KB금융은 은행뿐 아니라 카드·증권·보험 계열사를 통해 여러 금융서비스를 제공하는 금융지주회사예요.",
    financialSummary: "2024년 지배주주순이익은 5조 782억원이에요.", financialSnapshot: { period: "2024", netProfitKrwMillion: 5078200 },
    sources: [{ title: "KB금융 2024년 경영실적", url: "https://www.kbfg.com/IR_new/2024_4/player/vod_eng.html", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:055550", companySummary: "신한지주는 은행·카드·증권·보험 등 여러 금융회사를 거느린 금융지주회사예요.", businessModel: "계열 금융회사가 예금·대출·결제·보험·투자 서비스를 제공해 얻는 수익을 연결해 보여 줘요.", industryRole: "은행·카드·증권·보험 등 여러 금융서비스를 한 그룹 안에서 연결하는 금융지주회사예요.",
    elementaryExplanation: "신한지주는 돈을 맡기고 빌리거나 카드·보험·증권 서비스를 이용할 수 있는 여러 회사를 묶어 관리해요.", middleSchoolExplanation: "신한지주는 은행뿐 아니라 카드·증권·보험 계열사를 통해 여러 금융서비스를 제공하는 금융지주회사예요.",
    financialSummary: "2024년 지배주주순이익은 4조 5,175억원이에요.", financialSnapshot: { period: "2024", netProfitKrwMillion: 4517500 },
    sources: [{ title: "신한금융그룹 2024년 경영실적", url: "https://www.shinhangroup.com/kr/ir/financial/financial.do", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:086790", companySummary: "하나금융지주는 은행·카드·증권·보험 등 여러 금융회사를 거느린 금융지주회사예요.", businessModel: "계열 금융회사가 예금·대출·결제·보험·투자 서비스를 제공해 얻는 수익을 연결해 보여 줘요.", industryRole: "은행·카드·증권·보험 등 여러 금융서비스를 한 그룹 안에서 연결하는 금융지주회사예요.",
    elementaryExplanation: "하나금융지주는 돈을 맡기고 빌리거나 카드·보험·증권 서비스를 이용할 수 있는 여러 회사를 묶어 관리해요.", middleSchoolExplanation: "하나금융지주는 은행뿐 아니라 카드·증권·보험 계열사를 통해 여러 금융서비스를 제공하는 금융지주회사예요.",
    financialSummary: "2024년 지배주주순이익은 3조 7,388억원이에요.", financialSnapshot: { period: "2024", netProfitKrwMillion: 3738800 },
    sources: [{ title: "하나금융그룹 2024년 경영실적", url: "https://www.hanafn.com/ir/financial/financialInfo.do", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:316140", companySummary: "우리금융지주는 은행·카드·증권·보험 등 여러 금융회사를 거느린 금융지주회사예요.", businessModel: "계열 금융회사가 예금·대출·결제·보험·투자 서비스를 제공해 얻는 수익을 연결해 보여 줘요.", industryRole: "은행·카드·증권·보험 등 여러 금융서비스를 한 그룹 안에서 연결하는 금융지주회사예요.",
    elementaryExplanation: "우리금융지주는 돈을 맡기고 빌리거나 카드·보험·증권 서비스를 이용할 수 있는 여러 회사를 묶어 관리해요.", middleSchoolExplanation: "우리금융지주는 은행뿐 아니라 카드·증권·보험 계열사를 통해 여러 금융서비스를 제공하는 금융지주회사예요.",
    financialSummary: "2024년 지배주주순이익은 3조 860억원이에요.", financialSnapshot: { period: "2024", netProfitKrwMillion: 3086000 },
    sources: [{ title: "우리금융그룹 2024년 연간 실적", url: "https://www.woorifg.com/kor/pr/news/view.do?seq=701", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:402340", companySummary: "SK스퀘어는 여러 기업의 지분에 투자하고 그 기업들의 가치를 관리하는 투자 지주회사예요.", businessModel: "투자한 회사의 지분에서 생기는 성과와 투자·매각 활동을 통해 수익을 만들 수 있어요.", industryRole: "직접 제품을 많이 파는 회사라기보다 투자한 기업들의 성장과 가치를 관리하는 투자 지주회사예요.",
    elementaryExplanation: "SK스퀘어는 여러 회사에 투자하고, 그 회사들이 잘 운영되도록 돕는 회사예요.", middleSchoolExplanation: "SK스퀘어는 투자한 기업의 지분을 관리하고 투자 포트폴리오를 운영하는 투자 지주회사예요.",
    financialSummary: "2024년 연결 기준 당기순이익은 3조 6,505억원이에요.", financialSnapshot: { period: "2024", netProfitKrwMillion: 3650515 },
    sources: [{ title: "SK스퀘어 2024 지속가능경영보고서", url: "https://www.sksquare.com/assets/download/report/2024_SK_square_ESG_Report_en.pdf", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:039490", companySummary: "키움증권은 앱과 컴퓨터에서 국내외 주식 등 금융상품 거래를 중개하고 기업금융·자산관리 서비스를 하는 증권사야.", businessModel: "고객의 주식·금융상품 주문을 중개해 수수료를 받고, 금융상품 판매·기업금융·자기자본 운용 등에서도 수익을 얻어.", industryRole: "투자자의 주문을 거래소에 연결하고, 기업의 자금 조달과 금융상품 거래를 돕는 증권사야.",
    elementaryExplanation: "키움증권은 사람들이 앱이나 컴퓨터로 주식 주문을 내면 거래소에 연결해 주는 회사야.", middleSchoolExplanation: "키움증권은 온라인으로 국내외 주식과 금융상품 주문을 중개하고 기업금융·자산관리 서비스를 제공하는 증권사야.",
    financialSummary: "2024년 연결 기준 영업이익은 1조 982억원, 당기순이익은 8,349억원이야.", financialSnapshot: { period: "2024", netProfitKrwMillion: 834900 },
    sources: [
      { title: "키움증권 2024년 사업보고서", url: "https://kind.krx.co.kr/external/2025/03/20/001853/20250320007484/11011.htm", checkedAt },
      { title: "키움증권 회사 개요", url: "https://www3.kiwoom.com/h/ir/introduce/VOutlineView", checkedAt },
    ], status: "reviewed",
  },
];
export function findFinancialEducation(stockId: string) {
  return FINANCIAL_EDUCATION.find((education) => education.stockId === stockId);
}

