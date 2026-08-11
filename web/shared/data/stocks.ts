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

export const STOCKS: readonly StockEducation[] = [
  { id: "KRX:259960", symbol: "259960", name: "크래프톤", searchAliases: ["KRAFTON"], sector: "game", market: "KOSPI", companySummary: "게임을 개발하고 서비스하는 회사야.", offerings: ["게임 서비스", "게임 콘텐츠"], everydayTouchpoints: ["PC나 모바일 게임을 할 때"], status: draft },
  { id: "KRX:251270", symbol: "251270", name: "넷마블", searchAliases: ["Netmarble"], sector: "game", market: "KOSPI", companySummary: "여러 사람이 즐길 수 있는 게임을 만들고 운영하는 회사야.", offerings: ["모바일 게임", "게임 서비스"], everydayTouchpoints: ["휴대폰 게임을 할 때"], status: draft },
  { id: "KRX:036570", symbol: "036570", name: "엔씨소프트", searchAliases: ["NC", "NCSoft"], sector: "game", market: "KOSPI", companySummary: "온라인 게임을 만들고 오래 운영하는 회사야.", offerings: ["온라인 게임", "게임 서비스"], everydayTouchpoints: ["컴퓨터나 휴대폰으로 게임을 할 때"], status: draft },
  { id: "KRX:000120", symbol: "000120", name: "CJ대한통운", searchAliases: ["CJ 대한통운"], sector: "logistics", market: "KOSPI", companySummary: "물건을 필요한 곳까지 옮기고 전달하는 물류 회사야.", offerings: ["택배", "물류 서비스"], everydayTouchpoints: ["택배 상자를 받을 때"], status: draft },
  { id: "KRX:002320", symbol: "002320", name: "한진", searchAliases: ["HANJIN"], sector: "logistics", market: "KOSPI", companySummary: "택배와 운송처럼 물건의 이동을 돕는 회사야.", offerings: ["택배", "운송 서비스"], everydayTouchpoints: ["물건을 보내거나 받을 때"], status: draft },
  { id: "KRX:011200", symbol: "011200", name: "HMM", searchAliases: ["에이치엠엠"], sector: "logistics", market: "KOSPI", companySummary: "큰 배로 여러 나라 사이의 물건 운송을 돕는 회사야.", offerings: ["해상 운송", "컨테이너 운송"], everydayTouchpoints: ["수입하거나 수출한 물건이 바다를 건널 때"], status: draft },
  { id: "KRX:086280", symbol: "086280", name: "현대글로비스", searchAliases: ["Hyundai Glovis"], sector: "logistics", market: "KOSPI", companySummary: "자동차와 여러 물건의 이동을 계획하고 운송하는 회사야.", offerings: ["자동차 물류", "운송 서비스"], everydayTouchpoints: ["새 자동차가 이동할 때"], status: draft },
  { id: "KRX:005930", symbol: "005930", name: "삼성전자", searchAliases: ["삼성 전자", "Samsung Electronics"], sector: "semiconductor", market: "KOSPI", companySummary: "전자기기와 전자 부품을 만드는 회사야.", offerings: ["전자기기", "반도체"], everydayTouchpoints: ["휴대폰이나 TV 같은 전자기기를 사용할 때"], status: draft },
  { id: "KRX:000660", symbol: "000660", name: "SK하이닉스", searchAliases: ["SK 하이닉스", "SK hynix"], sector: "semiconductor", market: "KOSPI", companySummary: "컴퓨터와 휴대폰에 쓰이는 반도체를 만드는 회사야.", offerings: ["메모리 반도체", "전자 부품"], everydayTouchpoints: ["컴퓨터나 휴대폰이 정보를 기억할 때"], status: draft },
  { id: "KRX:011070", symbol: "011070", name: "LG이노텍", searchAliases: ["LG 이노텍", "LG Innotek"], sector: "semiconductor", market: "KOSPI", companySummary: "전자기기에 들어가는 여러 부품을 만드는 회사야.", offerings: ["카메라 부품", "전자 부품"], everydayTouchpoints: ["휴대폰 카메라를 사용할 때"], status: draft },
  { id: "KRX:064350", symbol: "064350", name: "현대로템", searchAliases: ["Hyundai Rotem"], sector: "defense", market: "KOSPI", companySummary: "철도와 국방 분야에 쓰이는 장비를 만드는 회사야.", offerings: ["철도 차량", "국방 장비"], everydayTouchpoints: ["기차나 지하철을 이용할 때"], status: draft },
  { id: "KRX:012450", symbol: "012450", name: "한화에어로스페이스", searchAliases: ["한화 에어로", "Hanwha Aerospace"], sector: "defense", market: "KOSPI", companySummary: "항공과 국방 분야에 필요한 장비를 만드는 회사야.", offerings: ["항공 장비", "국방 장비"], everydayTouchpoints: ["비행기와 항공 기술을 생각할 때"], status: draft },
  { id: "KRX:047810", symbol: "047810", name: "한국항공우주", searchAliases: ["KAI", "한국 항공 우주"], sector: "defense", market: "KOSPI", companySummary: "비행기와 항공 장비를 개발하고 만드는 회사야.", offerings: ["항공기", "항공 장비"], everydayTouchpoints: ["비행기를 볼 때"], status: draft },
  { id: "KRX:003230", symbol: "003230", name: "삼양식품", searchAliases: ["삼양 식품"], sector: "food", market: "KOSPI", companySummary: "가공식품을 만들어 여러 곳에 공급하는 회사야.", offerings: ["가공식품", "면류 식품"], everydayTouchpoints: ["마트나 편의점에서 식품을 고를 때"], status: draft },
  { id: "KRX:271560", symbol: "271560", name: "오리온", searchAliases: ["ORION"], sector: "food", market: "KOSPI", companySummary: "과자 같은 가공식품을 만들어 판매하는 회사야.", offerings: ["과자", "가공식품"], everydayTouchpoints: ["간식을 먹을 때"], status: draft },
  { id: "KRX:097950", symbol: "097950", name: "CJ제일제당", searchAliases: ["CJ 제일제당"], sector: "food", market: "KOSPI", companySummary: "식품과 식재료를 만들어 가정과 가게에 공급하는 회사야.", offerings: ["가공식품", "식재료"], everydayTouchpoints: ["집에서 음식을 준비할 때"], status: draft },
  { id: "KRX:004370", symbol: "004370", name: "농심", searchAliases: ["Nongshim"], sector: "food", market: "KOSPI", companySummary: "면과 과자 같은 식품을 만드는 회사야.", offerings: ["면류 식품", "과자"], everydayTouchpoints: ["라면이나 간식을 먹을 때"], status: draft },
  { id: "KRX:007310", symbol: "007310", name: "오뚜기", searchAliases: ["Ottogi"], sector: "food", market: "KOSPI", companySummary: "여러 종류의 가공식품을 만드는 회사야.", offerings: ["가공식품", "조미식품"], everydayTouchpoints: ["집에서 음식을 만들 때"], status: draft },
  { id: "KRX:015760", symbol: "015760", name: "한국전력", searchAliases: ["한전", "KEPCO"], sector: "energy", market: "KOSPI", companySummary: "전기가 필요한 곳까지 전달되도록 돕는 회사야.", offerings: ["전력 서비스"], everydayTouchpoints: ["집이나 학교에서 전기를 사용할 때"], status: draft },
  { id: "KRX:078930", symbol: "078930", name: "GS", searchAliases: ["지에스"], sector: "energy", market: "KOSPI", companySummary: "에너지와 유통 등 여러 사업을 하는 회사야.", offerings: ["에너지 관련 서비스", "사업 관리"], everydayTouchpoints: ["에너지와 생활 서비스를 이용할 때"], status: draft },
  { id: "KRX:010950", symbol: "010950", name: "S-OIL", searchAliases: ["에쓰오일", "S Oil"], sector: "energy", market: "KOSPI", companySummary: "원유를 여러 연료와 제품으로 바꾸는 일을 하는 회사야.", offerings: ["연료", "석유 제품"], everydayTouchpoints: ["자동차에 연료를 넣을 때"], status: draft },
  { id: "KRX:096770", symbol: "096770", name: "SK이노베이션", searchAliases: ["SK 이노베이션", "SK Innovation"], sector: "energy", market: "KOSPI", companySummary: "에너지와 배터리 관련 사업을 하는 회사야.", offerings: ["에너지", "배터리 관련 제품"], everydayTouchpoints: ["자동차와 전자기기의 에너지를 생각할 때"], status: draft },
  { id: "KRX:352820", symbol: "352820", name: "하이브", searchAliases: ["HYBE"], sector: "entertainment", market: "KOSPI", companySummary: "음악과 공연 같은 콘텐츠를 기획하고 만드는 회사야.", offerings: ["음악 콘텐츠", "공연"], everydayTouchpoints: ["노래나 공연 콘텐츠를 즐길 때"], status: draft },
  { id: "KRX:041510", symbol: "041510", name: "에스엠", searchAliases: ["SM", "SM엔터"], sector: "entertainment", market: "KOSDAQ", companySummary: "음악과 공연 콘텐츠를 기획하고 만드는 회사야.", offerings: ["음악 콘텐츠", "공연"], everydayTouchpoints: ["노래와 영상을 즐길 때"], status: draft },
  { id: "KRX:035900", symbol: "035900", name: "JYP Ent.", searchAliases: ["JYP", "JYP엔터", "JYP Ent"], sector: "entertainment", market: "KOSDAQ", companySummary: "음악과 공연 콘텐츠를 기획하고 만드는 회사야.", offerings: ["음악 콘텐츠", "공연"], everydayTouchpoints: ["노래와 공연을 즐길 때"], status: draft },
  { id: "KRX:035760", symbol: "035760", name: "CJ ENM", searchAliases: ["CJENM", "씨제이이엔엠"], sector: "entertainment", market: "KOSDAQ", companySummary: "영상과 음악 같은 콘텐츠를 만들고 전달하는 회사야.", offerings: ["영상 콘텐츠", "음악 콘텐츠"], everydayTouchpoints: ["TV나 온라인 영상 콘텐츠를 볼 때"], status: draft },
  { id: "KRX:122870", symbol: "122870", name: "와이지엔터테인먼트", searchAliases: ["YG", "YG엔터"], sector: "entertainment", market: "KOSDAQ", companySummary: "음악과 공연 콘텐츠를 기획하고 만드는 회사야.", offerings: ["음악 콘텐츠", "공연"], everydayTouchpoints: ["음악과 영상을 즐길 때"], status: draft },
  { id: "KRX:021240", symbol: "021240", name: "코웨이", searchAliases: ["Coway"], sector: "retail", market: "KOSPI", companySummary: "생활에 필요한 제품과 관리 서비스를 제공하는 회사야.", offerings: ["생활가전", "관리 서비스"], everydayTouchpoints: ["집에서 생활가전을 사용할 때"], status: draft },
  { id: "KRX:282330", symbol: "282330", name: "BGF리테일", searchAliases: ["BGF 리테일"], sector: "retail", market: "KOSPI", companySummary: "편의점 같은 생활 가까운 가게 운영을 돕는 회사야.", offerings: ["편의점 운영", "유통 서비스"], everydayTouchpoints: ["편의점에서 물건을 살 때"], status: draft },
  { id: "KRX:023530", symbol: "023530", name: "롯데쇼핑", searchAliases: ["롯데 쇼핑"], sector: "retail", market: "KOSPI", companySummary: "여러 상품을 매장과 온라인에서 판매하는 회사야.", offerings: ["매장 유통", "온라인 유통"], everydayTouchpoints: ["백화점이나 마트에서 물건을 살 때"], status: draft },
  { id: "KRX:139480", symbol: "139480", name: "이마트", searchAliases: ["E-Mart", "Emart"], sector: "retail", market: "KOSPI", companySummary: "여러 생활 상품을 매장에서 판매하는 회사야.", offerings: ["마트 운영", "유통 서비스"], everydayTouchpoints: ["마트에서 장을 볼 때"], status: draft },
  { id: "KRX:007070", symbol: "007070", name: "GS리테일", searchAliases: ["GS 리테일"], sector: "retail", market: "KOSPI", companySummary: "편의점과 여러 유통 서비스를 운영하는 회사야.", offerings: ["편의점 운영", "유통 서비스"], everydayTouchpoints: ["편의점에서 물건을 살 때"], status: draft },
  { id: "KRX:105560", symbol: "105560", name: "KB금융", searchAliases: ["KB 금융"], sector: "finance", market: "KOSPI", companySummary: "은행과 금융 서비스를 운영하는 금융 회사야.", offerings: ["은행 서비스", "금융 서비스"], everydayTouchpoints: ["돈을 보내거나 보관하는 서비스를 이용할 때"], status: draft },
  { id: "KRX:055550", symbol: "055550", name: "신한지주", searchAliases: ["신한 지주"], sector: "finance", market: "KOSPI", companySummary: "은행과 여러 금융 서비스를 운영하는 회사야.", offerings: ["은행 서비스", "금융 서비스"], everydayTouchpoints: ["은행 서비스를 이용할 때"], status: draft },
  { id: "KRX:086790", symbol: "086790", name: "하나금융지주", searchAliases: ["하나 금융", "하나금융"], sector: "finance", market: "KOSPI", companySummary: "은행과 여러 금융 서비스를 운영하는 회사야.", offerings: ["은행 서비스", "금융 서비스"], everydayTouchpoints: ["은행 서비스를 이용할 때"], status: draft },
  { id: "KRX:316140", symbol: "316140", name: "우리금융지주", searchAliases: ["우리 금융", "우리금융"], sector: "finance", market: "KOSPI", companySummary: "은행과 여러 금융 서비스를 운영하는 회사야.", offerings: ["은행 서비스", "금융 서비스"], everydayTouchpoints: ["은행 서비스를 이용할 때"], status: draft },
  { id: "KRX:323410", symbol: "323410", name: "카카오뱅크", searchAliases: ["카카오 뱅크"], sector: "finance", market: "KOSPI", companySummary: "앱으로 은행 서비스를 이용하도록 돕는 회사야.", offerings: ["모바일 은행 서비스"], everydayTouchpoints: ["휴대폰 앱으로 돈을 보내거나 확인할 때"], status: draft },
  { id: "KRX:039490", symbol: "039490", name: "키움증권", searchAliases: ["키움 증권"], sector: "finance", market: "KOSDAQ", companySummary: "주식 주문 같은 금융 거래를 연결하는 증권 회사야.", offerings: ["증권 중개", "금융 서비스"], everydayTouchpoints: ["모의투자에서 주문 화면을 사용할 때"], status: draft },
  { id: "KRX:000270", symbol: "000270", name: "기아", searchAliases: ["KIA"], sector: "automotive", market: "KOSPI", companySummary: "사람이 타는 자동차를 설계하고 만드는 회사야.", offerings: ["자동차"], everydayTouchpoints: ["도로에서 자동차를 볼 때"], status: draft },
  { id: "KRX:005380", symbol: "005380", name: "현대차", searchAliases: ["현대 자동차", "현대차", "Hyundai Motor"], sector: "automotive", market: "KOSPI", companySummary: "사람이 타는 자동차를 설계하고 만드는 회사야.", offerings: ["자동차"], everydayTouchpoints: ["도로에서 자동차를 볼 때"], status: draft },
  { id: "KRX:161390", symbol: "161390", name: "한국타이어앤테크놀로지", searchAliases: ["한국타이어", "Hankook Tire"], sector: "automotive", market: "KOSPI", companySummary: "자동차가 달릴 때 필요한 타이어를 만드는 회사야.", offerings: ["타이어", "자동차 부품"], everydayTouchpoints: ["자동차 바퀴를 볼 때"], status: draft },
  { id: "KRX:012330", symbol: "012330", name: "현대모비스", searchAliases: ["Hyundai Mobis"], sector: "automotive", market: "KOSPI", companySummary: "자동차에 들어가는 여러 부품을 만드는 회사야.", offerings: ["자동차 부품"], everydayTouchpoints: ["자동차의 여러 기능을 사용할 때"], status: draft },
  { id: "KRX:329180", symbol: "329180", name: "HD현대중공업", searchAliases: ["HD 현대중공업"], sector: "shipbuilding", market: "KOSPI", companySummary: "큰 배와 바다에서 쓰이는 장비를 만드는 회사야.", offerings: ["선박", "해양 장비"], everydayTouchpoints: ["항구에서 큰 배를 볼 때"], status: draft },
  { id: "KRX:010140", symbol: "010140", name: "삼성중공업", searchAliases: ["삼성 중공업"], sector: "shipbuilding", market: "KOSPI", companySummary: "큰 배와 바다에서 쓰이는 장비를 만드는 회사야.", offerings: ["선박", "해양 장비"], everydayTouchpoints: ["바다를 오가는 큰 배를 볼 때"], status: draft },
  { id: "KRX:009540", symbol: "009540", name: "HD한국조선해양", searchAliases: ["HD 한국조선해양"], sector: "shipbuilding", market: "KOSPI", companySummary: "배를 만드는 사업을 계획하고 관리하는 회사야.", offerings: ["조선 사업 관리", "해양 기술"], everydayTouchpoints: ["큰 배가 만들어지는 과정을 생각할 때"], status: draft },
  { id: "KRX:003490", symbol: "003490", name: "대한항공", searchAliases: ["Korean Air"], sector: "airline", market: "KOSPI", companySummary: "사람과 물건이 비행기로 이동하도록 돕는 회사야.", offerings: ["여객 운송", "화물 운송"], everydayTouchpoints: ["비행기를 타고 여행할 때"], status: draft },
  { id: "KRX:020560", symbol: "020560", name: "아시아나항공", searchAliases: ["아시아나 항공"], sector: "airline", market: "KOSPI", companySummary: "사람과 물건이 비행기로 이동하도록 돕는 회사야.", offerings: ["여객 운송", "화물 운송"], everydayTouchpoints: ["비행기를 타고 이동할 때"], status: draft },
  { id: "KRX:089590", symbol: "089590", name: "제주항공", searchAliases: ["제주 항공"], sector: "airline", market: "KOSPI", companySummary: "사람이 비행기를 이용해 이동하도록 돕는 회사야.", offerings: ["여객 운송"], everydayTouchpoints: ["비행기를 타고 여행할 때"], status: draft },
  { id: "KRX:051900", symbol: "051900", name: "LG생활건강", searchAliases: ["LG 생활건강"], sector: "cosmetics", market: "KOSPI", companySummary: "화장품과 생활용품을 만드는 회사야.", offerings: ["화장품", "생활용품"], everydayTouchpoints: ["세안이나 생활용품을 사용할 때"], status: draft },
  { id: "KRX:278470", symbol: "278470", name: "에이피알", searchAliases: ["APR"], sector: "cosmetics", market: "KOSPI", companySummary: "화장품과 뷰티 관련 제품을 만드는 회사야.", offerings: ["화장품", "뷰티 제품"], everydayTouchpoints: ["화장품을 고를 때"], status: draft },
  { id: "KRX:090430", symbol: "090430", name: "아모레퍼시픽", searchAliases: ["아모레 퍼시픽", "Amorepacific"], sector: "cosmetics", market: "KOSPI", companySummary: "화장품과 생활용품을 연구하고 만드는 회사야.", offerings: ["화장품", "생활용품"], everydayTouchpoints: ["화장품을 사용할 때"], status: draft },
];

export function findStock(query: string) {
  const normalized = query.replaceAll(" ", "").toLowerCase();
  return STOCKS.find((stock) =>
    [stock.name, ...stock.searchAliases].some((name) => name.replaceAll(" ", "").toLowerCase() === normalized),
  );
}
