export const SECTORS = [
  { key: "game", label: "게임", summary: "게임을 만들고 운영해 사람들이 즐길 수 있게 하는 산업이야." },
  { key: "logistics", label: "물류", summary: "물건을 만든 곳에서 가게나 집까지 옮기고 전달하는 산업이야." },
  { key: "semiconductor", label: "반도체", summary: "전자기기 안에서 일을 처리하게 돕는 부품을 만들고 공급하는 산업이야." },
  { key: "defense", label: "방산", summary: "국방과 항공 분야에 필요한 장비를 개발하고 만들고 관리하는 산업이야." },
  { key: "food", label: "식품", summary: "먹을거리를 기획하고 만들어 가게와 식당, 가정에 전달하는 산업이야." },
  { key: "energy", label: "에너지", summary: "전기와 연료가 가정과 학교, 공장까지 닿도록 만드는 산업이야." },
  { key: "entertainment", label: "엔터테인먼트", summary: "음악, 영상, 공연 같은 콘텐츠를 기획하고 만들고 전달하는 산업이야." },
  { key: "retail", label: "유통", summary: "여러 상품을 골라 매장이나 온라인에서 고객에게 전달하는 산업이야." },
  { key: "finance", label: "은행·금융", summary: "돈을 보관하고 보내고 빌리거나 거래를 연결하는 서비스를 제공하는 산업이야." },
  { key: "automotive", label: "자동차", summary: "자동차와 자동차에 필요한 부품을 설계하고 만들고 공급하는 산업이야." },
  { key: "shipbuilding", label: "조선", summary: "큰 배를 설계하고 만들고 관리하는 산업이야." },
  { key: "airline", label: "항공", summary: "사람과 물건이 비행기를 이용해 이동하도록 돕는 산업이야." },
  { key: "cosmetics", label: "화장품", summary: "화장품과 생활용품을 연구하고 만들어 고객에게 전달하는 산업이야." },
] as const;

export type SectorKey = (typeof SECTORS)[number]["key"];
