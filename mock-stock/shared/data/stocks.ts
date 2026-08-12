import type { Stock } from "@/shared/types";

type CompanyDefinition = Pick<Stock, "symbol" | "name" | "sector">;

const companies: CompanyDefinition[] = [
  { symbol: "003230", name: "삼양식품", sector: "식품" },
  { symbol: "271560", name: "오리온", sector: "식품" },
  { symbol: "097950", name: "CJ제일제당", sector: "식품" },
  { symbol: "004370", name: "농심", sector: "식품" },

  { symbol: "259960", name: "크래프톤", sector: "게임" },
  { symbol: "036570", name: "NC", sector: "게임" },
  { symbol: "251270", name: "넷마블", sector: "게임" },
  { symbol: "192080", name: "더블유게임즈", sector: "게임" },

  { symbol: "352820", name: "하이브", sector: "엔터" },
  { symbol: "041510", name: "에스엠", sector: "엔터" },
  { symbol: "035900", name: "JYP Ent.", sector: "엔터" },
  { symbol: "122870", name: "와이지엔터테인먼트", sector: "엔터" },

  { symbol: "000270", name: "기아", sector: "자동차" },
  { symbol: "005380", name: "현대차", sector: "자동차" },
  { symbol: "012330", name: "현대모비스", sector: "자동차" },

  { symbol: "005930", name: "삼성전자", sector: "반도체" },
  { symbol: "066570", name: "LG전자", sector: "반도체" },
  { symbol: "000660", name: "SK하이닉스", sector: "반도체" },
  { symbol: "402340", name: "SK스퀘어", sector: "반도체" },

  { symbol: "278470", name: "에이피알", sector: "화장품" },
  { symbol: "090430", name: "아모레퍼시픽", sector: "화장품" },
  { symbol: "483650", name: "달바글로벌", sector: "화장품" },
  { symbol: "051900", name: "LG생활건강", sector: "화장품" },

  { symbol: "021240", name: "코웨이", sector: "유통" },
  { symbol: "089860", name: "롯데렌탈", sector: "유통" },
  { symbol: "004170", name: "신세계", sector: "유통" },
  { symbol: "282330", name: "BGF리테일", sector: "유통" },

  { symbol: "003490", name: "대한항공", sector: "항공" },
  { symbol: "020560", name: "아시아나항공", sector: "항공" },
  { symbol: "180640", name: "한진칼", sector: "항공" },

  { symbol: "064350", name: "현대로템", sector: "방산" },
  { symbol: "012450", name: "한화에어로스페이스", sector: "방산" },
  { symbol: "079550", name: "LIG디펜스앤에어로스페이스", sector: "방산" },
  { symbol: "047810", name: "한국항공우주", sector: "방산" },

  { symbol: "105560", name: "KB금융", sector: "은행·금융" },
  { symbol: "055550", name: "신한지주", sector: "은행·금융" },
  { symbol: "086790", name: "하나금융지주", sector: "은행·금융" },
  { symbol: "316140", name: "우리금융지주", sector: "은행·금융" },
  { symbol: "039490", name: "키움증권", sector: "은행·금융" },

  { symbol: "015760", name: "한국전력", sector: "에너지" },
  { symbol: "010950", name: "S-Oil", sector: "에너지" },
  { symbol: "078930", name: "GS", sector: "에너지" },
  { symbol: "096770", name: "SK이노베이션", sector: "에너지" },

  { symbol: "000120", name: "CJ대한통운", sector: "물류" },
  { symbol: "011200", name: "HMM", sector: "물류" },
  { symbol: "086280", name: "현대글로비스", sector: "물류" },
  { symbol: "047050", name: "포스코인터내셔널", sector: "물류" },

  { symbol: "329180", name: "HD현대중공업", sector: "조선" },
  { symbol: "009540", name: "HD한국조선해양", sector: "조선" },
  { symbol: "042660", name: "한화오션", sector: "조선" },
  { symbol: "010140", name: "삼성중공업", sector: "조선" },
];

const featuredStocks = new Map<string, Partial<Stock>>([
  ["005930", { logo: "삼성", price: 73400, change: 1200, rate: 1.66, description: "휴대폰과 TV를 만들고, 그 안에 들어가는 반도체도 만드는 회사야.", recent: "반도체 생산 시설 투자와 새 제품에 관한 소식이 있었어.", chart: [68100, 69000, 68700, 70400, 69800, 71200, 71900, 71600, 72800, 73400] }],
  ["000660", { logo: "SK", price: 198500, change: 4500, rate: 2.32, description: "컴퓨터와 AI 기기에 필요한 메모리 반도체를 만드는 회사야.", recent: "AI 서버에 쓰이는 고성능 메모리 수요에 관한 소식이 있었어.", chart: [181000, 184000, 182500, 187000, 190000, 188500, 193000, 195000, 194000, 198500] }],
  ["005380", { logo: "현대", price: 241000, change: -3000, rate: -1.23, description: "승용차와 전기차를 만들어 여러 나라에 판매하는 회사야.", recent: "새 전기차 공개와 해외 판매 실적에 관한 소식이 있었어.", chart: [247000, 245000, 249000, 252000, 250000, 246000, 244000, 243500, 242000, 241000] }],
  ["259960", { logo: "K", price: 312000, change: 8000, rate: 2.63, description: "배틀그라운드 같은 게임을 만들고 세계에 서비스하는 회사야.", recent: "새 게임 개발과 이용자 수에 관한 소식이 있었어.", chart: [286000, 291000, 289000, 295000, 301000, 299000, 304000, 308000, 306000, 312000] }],
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
