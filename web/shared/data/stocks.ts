import type { SectorKey } from "./sectors";

export type StockEducation = {
  id: `KRX:${string}`;
  symbol: string;
  name: string;
  searchAliases: readonly string[];
  sector: SectorKey;
  market: "KOSPI" | "KOSDAQ";
  companySummary: string;
  offerings: readonly string[];
  everydayTouchpoints: readonly string[];
  status: "draft" | "reviewed";
};

const draft = "draft" as const;
const pendingDescription = "";
const pendingDetails: readonly string[] = [];

export const STOCKS: readonly StockEducation[] = [
  { id: "KRX:259960", symbol: "259960", name: "크래프톤", searchAliases: ["KRAFTON"], sector: "game", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:036570", symbol: "036570", name: "엔씨소프트", searchAliases: ["NC", "NCSoft"], sector: "game", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:251270", symbol: "251270", name: "넷마블", searchAliases: ["Netmarble"], sector: "game", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:263750", symbol: "263750", name: "펄어비스", searchAliases: ["Pearl Abyss"], sector: "game", market: "KOSDAQ", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:000120", symbol: "000120", name: "CJ대한통운", searchAliases: ["CJ 대한통운"], sector: "logistics", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:011200", symbol: "011200", name: "HMM", searchAliases: ["에이치엠엠"], sector: "logistics", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:086280", symbol: "086280", name: "현대글로비스", searchAliases: ["Hyundai Glovis"], sector: "logistics", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:005930", symbol: "005930", name: "삼성전자", searchAliases: ["삼성 전자", "Samsung Electronics"], sector: "semiconductor", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:000660", symbol: "000660", name: "SK하이닉스", searchAliases: ["SK 하이닉스", "SK hynix"], sector: "semiconductor", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:066570", symbol: "066570", name: "LG전자", searchAliases: ["LG 전자", "LG Electronics"], sector: "semiconductor", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:064350", symbol: "064350", name: "현대로템", searchAliases: ["Hyundai Rotem"], sector: "defense", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:012450", symbol: "012450", name: "한화에어로스페이스", searchAliases: ["한화 에어로", "Hanwha Aerospace"], sector: "defense", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:079550", symbol: "079550", name: "LIG넥스원", searchAliases: ["LIG 넥스원", "LIG Nex1"], sector: "defense", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:047810", symbol: "047810", name: "한국항공우주", searchAliases: ["KAI", "한국 항공 우주"], sector: "defense", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:003230", symbol: "003230", name: "삼양식품", searchAliases: ["삼양 식품"], sector: "food", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:271560", symbol: "271560", name: "오리온", searchAliases: ["ORION"], sector: "food", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:097950", symbol: "097950", name: "CJ제일제당", searchAliases: ["CJ 제일제당"], sector: "food", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:004370", symbol: "004370", name: "농심", searchAliases: ["Nongshim"], sector: "food", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:015760", symbol: "015760", name: "한국전력", searchAliases: ["한전", "KEPCO"], sector: "energy", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:010950", symbol: "010950", name: "S-OIL", searchAliases: ["에쓰오일", "S Oil"], sector: "energy", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:078930", symbol: "078930", name: "GS", searchAliases: ["지에스"], sector: "energy", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:096770", symbol: "096770", name: "SK이노베이션", searchAliases: ["SK 이노베이션", "SK Innovation"], sector: "energy", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:047050", symbol: "047050", name: "포스코인터내셔널", searchAliases: ["POSCO인터내셔널", "POSCO International"], sector: "energy", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:352820", symbol: "352820", name: "하이브", searchAliases: ["HYBE"], sector: "entertainment", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:041510", symbol: "041510", name: "에스엠", searchAliases: ["SM", "SM엔터"], sector: "entertainment", market: "KOSDAQ", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:035900", symbol: "035900", name: "JYP Ent.", searchAliases: ["JYP", "JYP엔터", "JYP Ent"], sector: "entertainment", market: "KOSDAQ", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:122870", symbol: "122870", name: "와이지엔터테인먼트", searchAliases: ["YG", "YG엔터"], sector: "entertainment", market: "KOSDAQ", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:021240", symbol: "021240", name: "코웨이", searchAliases: ["Coway"], sector: "retail", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:004170", symbol: "004170", name: "신세계", searchAliases: ["Shinsegae"], sector: "retail", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:282330", symbol: "282330", name: "BGF리테일", searchAliases: ["BGF 리테일"], sector: "retail", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:105560", symbol: "105560", name: "KB금융", searchAliases: ["KB 금융"], sector: "finance", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:055550", symbol: "055550", name: "신한지주", searchAliases: ["신한 지주"], sector: "finance", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:086790", symbol: "086790", name: "하나금융지주", searchAliases: ["하나 금융", "하나금융"], sector: "finance", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:316140", symbol: "316140", name: "우리금융지주", searchAliases: ["우리 금융", "우리금융", "우리은행"], sector: "finance", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:402340", symbol: "402340", name: "SK스퀘어", searchAliases: ["SK 스퀘어", "SK Square"], sector: "finance", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:039490", symbol: "039490", name: "키움증권", searchAliases: ["키움 증권", "영웅문", "Kiwoom Securities"], sector: "finance", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:000270", symbol: "000270", name: "기아", searchAliases: ["KIA"], sector: "automotive", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:005380", symbol: "005380", name: "현대차", searchAliases: ["현대 자동차", "현대차", "Hyundai Motor"], sector: "automotive", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:089860", symbol: "089860", name: "롯데렌탈", searchAliases: ["Lotte Rental"], sector: "automotive", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:012330", symbol: "012330", name: "현대모비스", searchAliases: ["Hyundai Mobis"], sector: "automotive", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:329180", symbol: "329180", name: "HD현대중공업", searchAliases: ["HD 현대중공업"], sector: "shipbuilding", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:009540", symbol: "009540", name: "HD한국조선해양", searchAliases: ["HD 한국조선해양"], sector: "shipbuilding", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:042660", symbol: "042660", name: "한화오션", searchAliases: ["Hanwha Ocean"], sector: "shipbuilding", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:010140", symbol: "010140", name: "삼성중공업", searchAliases: ["삼성 중공업"], sector: "shipbuilding", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:003490", symbol: "003490", name: "대한항공", searchAliases: ["Korean Air"], sector: "airline", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:020560", symbol: "020560", name: "아시아나항공", searchAliases: ["아시아나 항공"], sector: "airline", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:180640", symbol: "180640", name: "한진칼", searchAliases: ["한진 칼", "Hanjin KAL"], sector: "airline", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:278470", symbol: "278470", name: "에이피알", searchAliases: ["APR"], sector: "cosmetics", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:090430", symbol: "090430", name: "아모레퍼시픽", searchAliases: ["아모레 퍼시픽", "Amorepacific"], sector: "cosmetics", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:483650", symbol: "483650", name: "달바글로벌", searchAliases: ["달바 글로벌", "d'Alba Global"], sector: "cosmetics", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
  { id: "KRX:051900", symbol: "051900", name: "LG생활건강", searchAliases: ["LG 생활건강"], sector: "cosmetics", market: "KOSPI", companySummary: pendingDescription, offerings: pendingDetails, everydayTouchpoints: pendingDetails, status: draft },
];

export function findStock(query: string) {
  const normalized = query.replaceAll(" ", "").toLowerCase();
  return STOCKS.find((stock) =>
    [stock.name, ...stock.searchAliases].some((name) => name.replaceAll(" ", "").toLowerCase() === normalized),
  );
}
