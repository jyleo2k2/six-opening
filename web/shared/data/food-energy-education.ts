export type FoodEnergyEducationSource = { title: string; url: string; checkedAt: string };
export type FoodEnergyEducation = { stockId: `KRX:${string}`; companySummary: string; businessModel: string; industryRole: string; elementaryExplanation: string; middleSchoolExplanation: string; financialSummary: string; financialSnapshot: { period: "2024"; revenueKrwMillion: number; operatingProfitKrwMillion: number }; sources: readonly FoodEnergyEducationSource[]; status: "reviewed" };
const checkedAt = "2026-08-12";
export const FOOD_AND_ENERGY_EDUCATION: readonly FoodEnergyEducation[] = [
  {
    stockId: "KRX:003230", companySummary: "삼양식품은 라면과 간편식 등 식품을 만들고 판매하는 회사예요.", businessModel: "면·소스·간편식 제품을 만들어 국내외 유통망과 소비자에게 판매해 대가를 받아요.", industryRole: "식품을 기획하고 제조해 포장한 뒤 가게와 온라인으로 공급하는 식품 회사예요.",
    elementaryExplanation: "삼양식품은 라면처럼 집에서 먹는 음식을 만들어 가게와 온라인에서 팔아요.", middleSchoolExplanation: "삼양식품은 식품을 개발·제조·포장하고, 국내외 유통망을 통해 소비자에게 공급해요.",
    financialSummary: "2024년 연결 기준 매출은 1조 7,280억원, 영업이익은 3,446억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 1728015, operatingProfitKrwMillion: 344569 },
    sources: [{ title: "삼양식품 재무정보", url: "https://mdev.samyangfoods.com/kor/ir/finance.do", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:271560", companySummary: "오리온은 과자와 간식, 식품을 만들고 여러 나라에 판매하는 회사예요.", businessModel: "과자와 간식 제품을 제조해 유통망과 소비자에게 판매해 대가를 받아요.", industryRole: "원재료를 식품으로 만들고 포장해 가게와 온라인으로 보내는 제과 식품 회사예요.",
    elementaryExplanation: "오리온은 초코파이와 과자처럼 간식으로 만날 수 있는 식품을 만들어요.", middleSchoolExplanation: "오리온은 여러 나라에서 과자와 간식을 제조·포장하고 유통망을 통해 판매해요.",
    financialSummary: "2024년 연결 기준 매출은 3조 1,043억원, 영업이익은 5,436억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 3104300, operatingProfitKrwMillion: 543600 },
    sources: [{ title: "오리온 2024년 경영실적", url: "https://www.orionworld.com/board/view/87?boardno=1329", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:097950", companySummary: "CJ제일제당은 가공식품과 식품 소재, 바이오 소재를 만드는 회사예요.", businessModel: "식품과 식품 소재를 개발·제조해 가정과 식당, 기업에 판매해 대가를 받아요.", industryRole: "식품 원료부터 가공식품 제조·유통까지 연결하는 종합 식품 회사예요.",
    elementaryExplanation: "CJ제일제당은 밥, 만두, 양념처럼 우리 식탁에서 만나는 식품을 만들고 팔아요.", middleSchoolExplanation: "CJ제일제당은 식품 소재와 가공식품을 개발·생산해 가정·식당·기업에 공급해요.",
    financialSummary: "2024년 CJ대한통운 제외 기준 매출은 17조 8,710억원, 영업이익은 1조 323억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 17871000, operatingProfitKrwMillion: 1032300 },
    sources: [{ title: "CJ제일제당 2024년 실적 발표", url: "https://cjnews.cj.net/cj%EC%A0%9C%EC%9D%BC%EC%A0%9C%EB%8B%B9-%EC%A7%80%EB%82%9C%ED%95%B4-%EB%A7%A4%EC%B6%9C-17%EC%A1%B0-8904%EC%96%B5-%EC%9B%90-%EC%98%81%EC%97%85%EC%9D%B4%EC%9D%B5-8195%EC%96%B5-%EC%9B%90-%EA%B8%B0/", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:004370", companySummary: "농심은 라면·과자·음료 등 식품을 만들고 판매하는 회사예요.", businessModel: "라면과 과자, 음료를 제조·포장해 가게와 온라인 유통망을 통해 판매해요.", industryRole: "식품을 만들어 포장하고 국내외 유통망으로 보내는 종합 식품 회사예요.",
    elementaryExplanation: "농심은 라면과 과자처럼 우리 집이나 가게에서 만나는 식품을 만들어요.", middleSchoolExplanation: "농심은 식품을 개발·제조·포장하고 국내외 유통망으로 소비자에게 공급해요.",
    financialSummary: "2024년 연결 기준 매출은 3조 4,387억원, 영업이익은 1,631억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 3438700, operatingProfitKrwMillion: 163100 },
    sources: [{ title: "농심 2024년 연간 경영실적", url: "https://www.nongshim.com/invest/ir/result?page=2", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:015760", companySummary: "한국전력은 발전된 전기를 가정·학교·공장에 안정적으로 보내는 전력 회사예요.", businessModel: "전기를 사 와 송전선과 배전선을 통해 공급하고 전기요금을 받아요.", industryRole: "발전소에서 만든 전기가 전국의 사용자에게 닿도록 전력망을 운영하는 회사예요.",
    elementaryExplanation: "한국전력은 발전소에서 만든 전기가 우리 집 전등과 학교에 오도록 보내 줘요.", middleSchoolExplanation: "한국전력은 전력을 구매하고 송전·배전망으로 공급해 가정·학교·공장과 발전사를 연결해요.",
    financialSummary: "2024년 연결 기준 매출은 약 94조원, 영업이익은 약 8조 4,000억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 94000000, operatingProfitKrwMillion: 8365000 },
    sources: [{ title: "한국전력 회사 정보", url: "https://home.kepco.co.kr/kepco/EN/F/htmlView/ENFBHP001.do", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:010950", companySummary: "S-OIL은 원유를 정제해 휘발유·경유·항공유 같은 제품과 석유화학 제품을 만드는 회사예요.", businessModel: "원유를 정유 시설에서 가공해 연료와 석유화학 제품을 판매해 대가를 받아요.", industryRole: "원유를 일상에서 쓰는 연료와 원료로 바꾸고 주유소·기업에 공급하는 정유 회사예요.",
    elementaryExplanation: "S-OIL은 땅속에서 나온 원유를 자동차와 비행기에 쓰는 연료로 바꾸는 일을 해요.", middleSchoolExplanation: "S-OIL은 원유를 정제해 연료·윤활기유·석유화학 제품을 만들고 유통망과 기업에 공급해요.",
    financialSummary: "2024년 연결 기준 매출은 36조 6,370억원, 영업이익은 4,606억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 36637000, operatingProfitKrwMillion: 460600 },
    sources: [{ title: "S-OIL 2024년 4분기 및 연간 실적", url: "https://www.s-oil.com/m/relation/ir/Report.aspx", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:078930", companySummary: "GS는 에너지·유통·건설 등 여러 회사를 거느린 지주회사예요.", businessModel: "계열 회사의 지분을 보유하고, 에너지·유통 등 계열 사업에서 나온 성과를 연결해 보여 줘요.", industryRole: "정유·발전·유통 등 여러 사업 회사의 방향과 자원을 연결하는 지주회사예요.",
    elementaryExplanation: "GS는 주유소와 가게, 발전처럼 서로 다른 일을 하는 여러 회사를 한데 묶어 관리해요.", middleSchoolExplanation: "GS는 여러 계열사의 지분을 보유한 지주회사로, 에너지·유통 등 다양한 사업의 연결 성과를 관리해요.",
    financialSummary: "2024년 연결 기준 매출은 25조 2,333억원, 영업이익은 2조 9,922억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 25233000, operatingProfitKrwMillion: 2992200 },
    sources: [{ title: "GS 2024년 경영실적", url: "https://www.gs.co.kr/ko/investors/reports", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:096770", companySummary: "SK이노베이션은 정유·석유화학·배터리 소재 등 에너지 사업을 하는 회사예요.", businessModel: "원유를 정제하고 석유화학 제품과 배터리 관련 제품·서비스를 공급해 대가를 받아요.", industryRole: "연료·화학 소재·배터리 사업을 연결해 에너지를 생산하고 공급하는 회사예요.",
    elementaryExplanation: "SK이노베이션은 자동차와 공장에서 쓰는 에너지와 배터리 관련 재료를 만드는 일을 해요.", middleSchoolExplanation: "SK이노베이션은 정유·석유화학·배터리 사업을 운영해 연료와 소재를 기업과 유통망에 공급해요.",
    financialSummary: "2024년 연결 기준 매출은 74조 2,696억원, 영업이익은 3,557억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 74269600, operatingProfitKrwMillion: 355700 },
    sources: [{ title: "SK이노베이션 손익계산서", url: "https://www.skinnovation.com/ir/income_statement", checkedAt }], status: "reviewed",
  },
  {
    stockId: "KRX:047050", companySummary: "포스코인터내셔널은 무역과 에너지, 식량·소재 사업을 연결하는 종합사업회사예요.", businessModel: "여러 나라의 상품·원료를 거래하고 에너지·소재 사업을 운영해 대가를 받아요.", industryRole: "생산지와 고객을 연결하는 무역에 에너지·소재 사업을 더해 공급망을 운영하는 회사예요.",
    elementaryExplanation: "포스코인터내셔널은 다른 나라의 물건과 원료가 필요한 곳으로 가도록 연결하는 일을 해요.", middleSchoolExplanation: "포스코인터내셔널은 무역을 바탕으로 에너지·소재·식량 사업을 운영하며 생산지와 고객을 연결해요.",
    financialSummary: "2024년 연결 기준 매출은 약 32조 6,000억원, 영업이익은 약 1조 1,700억원이에요.", financialSnapshot: { period: "2024", revenueKrwMillion: 32600000, operatingProfitKrwMillion: 1169000 },
    sources: [{ title: "포스코인터내셔널 2024년 IR 자료", url: "https://www.poscointl.com/irActivity?yyyy=2024", checkedAt }], status: "reviewed",
  },
];
export function findFoodAndEnergyEducation(stockId: string) {
  return FOOD_AND_ENERGY_EDUCATION.find((education) => education.stockId === stockId);
}

