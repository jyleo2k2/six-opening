export type FinancialEducationSource = { title: string; url: string; checkedAt: string };
export type FinancialEducation = { stockId: `KRX:${string}`; companySummary: string; businessModel: string; industryRole: string; elementaryExplanation: string; middleSchoolExplanation: string; financialSummary: string; financialSnapshot: { period: "2024"; netProfitKrwMillion: number }; sources: readonly FinancialEducationSource[]; status: "reviewed" };
const checkedAt = "2026-08-12";
export const FINANCIAL_EDUCATION: readonly FinancialEducation[] = [
  {
    stockId: "KRX:105560", companySummary: "KB금융은 은행·카드·증권·보험 등 여러 금융회사를 거느린 금융지주회사야.", businessModel: "계열 금융회사가 예금·대출·결제·보험·투자 서비스를 제공해 얻는 수익을 연결해 보여 줘.", industryRole: "은행·카드·증권·보험 등 여러 금융서비스를 한 그룹 안에서 연결하는 금융지주회사야.",
    elementaryExplanation: "KB금융은 돈을 맡기고 빌리거나 카드·보험·증권 서비스를 이용할 수 있는 여러 회사를 묶어 관리해.", middleSchoolExplanation: "KB금융은 은행뿐 아니라 카드·증권·보험 계열사를 통해 여러 금융서비스를 제공하는 금융지주회사야.",
    financialSummary: "2024년 지배주주순이익은 5조 782억원이야.", financialSnapshot: { period: "2024", netProfitKrwMillion: 5078200 },
    sources: [{ title: "KB금융 2024년 경영실적", url: "https://www.kbfg.com/IR_new/2024_4/player/vod_eng.html", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:055550", companySummary: "신한지주는 은행·카드·증권·보험 등 여러 금융회사를 거느린 금융지주회사야.", businessModel: "계열 금융회사가 예금·대출·결제·보험·투자 서비스를 제공해 얻는 수익을 연결해 보여 줘.", industryRole: "은행·카드·증권·보험 등 여러 금융서비스를 한 그룹 안에서 연결하는 금융지주회사야.",
    elementaryExplanation: "신한지주는 돈을 맡기고 빌리거나 카드·보험·증권 서비스를 이용할 수 있는 여러 회사를 묶어 관리해.", middleSchoolExplanation: "신한지주는 은행뿐 아니라 카드·증권·보험 계열사를 통해 여러 금융서비스를 제공하는 금융지주회사야.",
    financialSummary: "2024년 지배주주순이익은 4조 5,175억원이야.", financialSnapshot: { period: "2024", netProfitKrwMillion: 4517500 },
    sources: [{ title: "신한금융그룹 2024년 경영실적", url: "https://www.shinhangroup.com/kr/ir/financial/financial.do", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:086790", companySummary: "하나금융지주는 은행·카드·증권·보험 등 여러 금융회사를 거느린 금융지주회사야.", businessModel: "계열 금융회사가 예금·대출·결제·보험·투자 서비스를 제공해 얻는 수익을 연결해 보여 줘.", industryRole: "은행·카드·증권·보험 등 여러 금융서비스를 한 그룹 안에서 연결하는 금융지주회사야.",
    elementaryExplanation: "하나금융지주는 돈을 맡기고 빌리거나 카드·보험·증권 서비스를 이용할 수 있는 여러 회사를 묶어 관리해.", middleSchoolExplanation: "하나금융지주는 은행뿐 아니라 카드·증권·보험 계열사를 통해 여러 금융서비스를 제공하는 금융지주회사야.",
    financialSummary: "2024년 지배주주순이익은 3조 7,388억원이야.", financialSnapshot: { period: "2024", netProfitKrwMillion: 3738800 },
    sources: [{ title: "하나금융그룹 2024년 경영실적", url: "https://www.hanafn.com/ir/financial/financialInfo.do", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:316140", companySummary: "우리금융지주는 은행·카드·증권·보험 등 여러 금융회사를 거느린 금융지주회사야.", businessModel: "계열 금융회사가 예금·대출·결제·보험·투자 서비스를 제공해 얻는 수익을 연결해 보여 줘.", industryRole: "은행·카드·증권·보험 등 여러 금융서비스를 한 그룹 안에서 연결하는 금융지주회사야.",
    elementaryExplanation: "우리금융지주는 돈을 맡기고 빌리거나 카드·보험·증권 서비스를 이용할 수 있는 여러 회사를 묶어 관리해.", middleSchoolExplanation: "우리금융지주는 은행뿐 아니라 카드·증권·보험 계열사를 통해 여러 금융서비스를 제공하는 금융지주회사야.",
    financialSummary: "2024년 지배주주순이익은 3조 860억원이야.", financialSnapshot: { period: "2024", netProfitKrwMillion: 3086000 },
    sources: [{ title: "우리금융그룹 2024년 연간 실적", url: "https://www.woorifg.com/kor/pr/news/view.do?seq=701", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:402340", companySummary: "SK스퀘어는 여러 기업의 지분에 투자하고 그 기업들의 가치를 관리하는 투자 지주회사야.", businessModel: "투자한 회사의 지분에서 생기는 성과와 투자·매각 활동을 통해 수익을 만들 수 있어.", industryRole: "직접 제품을 많이 파는 회사라기보다 투자한 기업들의 성장과 가치를 관리하는 투자 지주회사야.",
    elementaryExplanation: "SK스퀘어는 여러 회사에 투자하고, 그 회사들이 잘 운영되도록 돕는 회사야.", middleSchoolExplanation: "SK스퀘어는 투자한 기업의 지분을 관리하고 투자 포트폴리오를 운영하는 투자 지주회사야.",
    financialSummary: "2024년 연결 기준 당기순이익은 3조 6,505억원이야.", financialSnapshot: { period: "2024", netProfitKrwMillion: 3650515 },
    sources: [{ title: "SK스퀘어 2024 지속가능경영보고서", url: "https://www.sksquare.com/assets/download/report/2024_SK_square_ESG_Report_en.pdf", checkedAt }], status: "reviewed",
  },
];
export function findFinancialEducation(stockId: string) {
  return FINANCIAL_EDUCATION.find((education) => education.stockId === stockId);
}

