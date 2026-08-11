import type { Stock } from "@/shared/types";

type CompanyDefinition = Pick<Stock, "symbol" | "name" | "sector">;

const companies: CompanyDefinition[] = [
  { symbol: "005930", name: "삼성전자", sector: "반도체" },
  { symbol: "000660", name: "SK하이닉스", sector: "반도체" },
  { symbol: "005380", name: "현대차", sector: "자동차" },
  { symbol: "259960", name: "크래프톤", sector: "게임" },
  { symbol: "035420", name: "NAVER", sector: "인터넷" },
  { symbol: "004370", name: "농심", sector: "식품" },
  { symbol: "015760", name: "한국전력", sector: "에너지" },
  { symbol: "024110", name: "기업은행", sector: "금융" },
  { symbol: "138930", name: "BNK금융지주", sector: "금융" },
  { symbol: "316140", name: "우리금융지주", sector: "금융" },
  { symbol: "016360", name: "삼성증권", sector: "증권" },
  { symbol: "139130", name: "iM금융지주", sector: "금융" },
  { symbol: "175330", name: "JB금융지주", sector: "금융" },
  { symbol: "071050", name: "한국금융지주", sector: "금융" },
  { symbol: "005940", name: "NH투자증권", sector: "증권" },
  { symbol: "030200", name: "KT", sector: "통신" },
  { symbol: "086790", name: "하나금융지주", sector: "금융" },
  { symbol: "002380", name: "KCC", sector: "소재" },
  { symbol: "000270", name: "기아", sector: "자동차" },
  { symbol: "055550", name: "신한지주", sector: "금융" },
  { symbol: "005830", name: "DB손해보험", sector: "보험" },
  { symbol: "086280", name: "현대글로비스", sector: "운송" },
  { symbol: "017800", name: "현대엘리베이터", sector: "산업재" },
  { symbol: "105560", name: "KB금융", sector: "금융" },
  { symbol: "039490", name: "키움증권", sector: "증권" },
  { symbol: "032640", name: "LG유플러스", sector: "통신" },
  { symbol: "012330", name: "현대모비스", sector: "자동차" },
  { symbol: "161390", name: "한국타이어앤테크놀로지", sector: "자동차" },
  { symbol: "009540", name: "HD한국조선해양", sector: "조선" },
  { symbol: "005850", name: "에스엘", sector: "자동차" },
  { symbol: "000810", name: "삼성화재", sector: "보험" },
  { symbol: "267250", name: "HD현대", sector: "산업재" },
  { symbol: "033780", name: "KT&G", sector: "소비재" },
  { symbol: "051600", name: "한전KPS", sector: "에너지" },
  { symbol: "021240", name: "코웨이", sector: "소비재" },
  { symbol: "078930", name: "GS", sector: "에너지" },
  { symbol: "006800", name: "미래에셋증권", sector: "증권" },
  { symbol: "017960", name: "한국카본", sector: "소재" },
  { symbol: "375500", name: "DL이앤씨", sector: "건설" },
  { symbol: "032830", name: "삼성생명", sector: "보험" },
  { symbol: "004490", name: "세방전지", sector: "자동차" },
  { symbol: "030000", name: "제일기획", sector: "미디어" },
  { symbol: "028260", name: "삼성물산", sector: "산업재" },
  { symbol: "103140", name: "풍산", sector: "소재" },
  { symbol: "034730", name: "SK", sector: "지주" },
  { symbol: "003490", name: "대한항공", sector: "운송" },
  { symbol: "241560", name: "두산밥캣", sector: "산업재" },
  { symbol: "001120", name: "LX인터내셔널", sector: "상사" },
  { symbol: "000880", name: "한화", sector: "지주" },
  { symbol: "018260", name: "삼성에스디에스", sector: "IT서비스" },
];

const featuredStocks = new Map<string, Partial<Stock>>([
  ["005930", { logo: "삼성", price: 73400, change: 1200, rate: 1.66, description: "휴대폰과 TV를 만들고, 그 안에 들어가는 반도체도 만드는 회사야.", recent: "반도체 생산 시설 투자와 새 제품에 관한 소식이 있었어.", chart: [68100, 69000, 68700, 70400, 69800, 71200, 71900, 71600, 72800, 73400] }],
  ["000660", { logo: "SK", price: 198500, change: 4500, rate: 2.32, description: "컴퓨터와 AI 기기에 필요한 메모리 반도체를 만드는 회사야.", recent: "AI 서버에 쓰이는 고성능 메모리 수요에 관한 소식이 있었어.", chart: [181000, 184000, 182500, 187000, 190000, 188500, 193000, 195000, 194000, 198500] }],
  ["005380", { logo: "현대", price: 241000, change: -3000, rate: -1.23, description: "승용차와 전기차를 만들어 여러 나라에 판매하는 회사야.", recent: "새 전기차 공개와 해외 판매 실적에 관한 소식이 있었어.", chart: [247000, 245000, 249000, 252000, 250000, 246000, 244000, 243500, 242000, 241000] }],
  ["259960", { logo: "K", price: 312000, change: 8000, rate: 2.63, description: "배틀그라운드 같은 게임을 만들고 세계에 서비스하는 회사야.", recent: "새 게임 개발과 이용자 수에 관한 소식이 있었어.", chart: [286000, 291000, 289000, 295000, 301000, 299000, 304000, 308000, 306000, 312000] }],
  ["035420", { logo: "N", price: 186300, change: -900, rate: -0.48, description: "검색, 쇼핑, 웹툰 같은 인터넷 서비스를 운영하는 회사야.", recent: "AI 검색과 웹툰 서비스에 관한 소식이 있었어.", chart: [190000, 188500, 191000, 189000, 187500, 188200, 187000, 186500, 187200, 186300] }],
  ["004370", { logo: "농심", price: 402500, change: 5500, rate: 1.38, description: "라면과 과자를 만들어 국내외에 판매하는 식품 회사야.", recent: "해외 라면 판매와 새 제품에 관한 소식이 있었어.", chart: [386000, 390000, 389000, 393000, 395000, 394000, 398000, 397000, 400000, 402500] }],
]);

function createFixture(company: CompanyDefinition, index: number): Stock {
  const seed = Number(company.symbol.slice(-4)) + index * 17;
  const price = Math.round((18000 + seed % 360000) / 100) * 100;
  const change = ((seed % 19) - 9 || 1) * 100;
  const rate = change / (price - change) * 100;
  const offsets = [-4, -2, -3, 0, -1, 2, 1, 3, 2, 4];
  return {
    symbol: company.symbol,
    name: company.name,
    sector: company.sector,
    logo: company.name.slice(0, 2),
    price,
    change,
    rate,
    description: `${company.name}는 ${company.sector} 분야에서 제품과 서비스를 제공하는 회사야.`,
    recent: `${company.sector} 분야의 사업 현황과 실적 발표에 관한 소식이 있었어.`,
    chart: offsets.map((offset) => Math.max(100, Math.round(price * (1 + offset / 100) / 100) * 100)),
    ...featuredStocks.get(company.symbol),
  };
}

export const stocks: Stock[] = companies.map(createFixture);

export const stockBySymbol = new Map(stocks.map((stock) => [stock.symbol, stock]));
