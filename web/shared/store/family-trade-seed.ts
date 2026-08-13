import type { FamilyMember, Trade } from "../types/trade";
import type { EvidenceTab } from "../types/behavior-profile";

/**
 * 데모 시드 — 민지·엄마의 2주치 거래. 피드·차트 마커·성향 분석(F9)이 같은 값을 읽는다.
 *
 * 피드 스토어가 아니라 이 파일에 두는 이유: 차트도 이 값을 읽어야 하는데, 차트는
 * app.html 안의 별도 iframe 이다. 피드 스토어를 그대로 import 하면 zustand persist
 * 스토어가 그 iframe 에서도 생성돼 `localStorage` 를 건드린다. 시드는 상태가 아니라
 * 상수이므로 상태와 떼어 둔다.
 *
 * 값은 보관 DB의 실제 종가에 맞춘다. 차트 마커가 체결가를 y 로 쓰므로 시세와 어긋나면
 * 뱃지가 캔들에서 뚝 떨어진 곳에 뜨고, 피드 카드의 금액도 그날 차트와 다르게 보인다.
 * 거래일은 장이 열린 날이어야 한다 — 주말에는 붙일 봉이 없다.
 *
 * 수량은 1인당 가상 100만원 안에서 끝나야 한다.
 * 민지 매수 합계 891,000원 − 매도 회수 230,500원, 엄마 매수 합계 690,750원 − 매도 회수 231,000원.
 *
 * 정확력(체결 후 5거래일 종가 적중)은 이 시드가 표본이다 — 2026-08-13 보관 종가 기준
 * 민지는 채점 5건 중 3적중(6점, ★★☆)이고, 엄마는 채점 2건이라 아직 판정 중이다.
 * 이후 장마감 배치가 캔들을 채우면 보류 거래가 자동으로 채점된다.
 */
export const FAMILY_SEED_TRADES: Trade[] = [
  {
    id: "seed-child-1",
    member: "child",
    symbol: "259960",
    side: "buy",
    quantity: 1,
    // 크래프톤 KST 2026-08-03(월) 종가 235,000원
    price: 235000,
    reason: "내가 아는 회사라서",
    confidence: 75,
    memo: "배그 잘 아니까 자신 있었어!",
    tradedAt: "2026-08-03T01:20:00.000Z",
  },
  {
    id: "seed-parent-4",
    member: "parent",
    symbol: "011200",
    side: "buy",
    quantity: 5,
    // HMM KST 2026-08-03(월) 종가 20,750원
    price: 20750,
    reason: "뉴스에서 봤어",
    confidence: 50,
    memo: "운임이 오르고 있다는 기사를 봤어.",
    tradedAt: "2026-08-03T04:10:00.000Z",
  },
  {
    id: "seed-child-2",
    member: "child",
    symbol: "352820",
    side: "buy",
    quantity: 1,
    // 하이브 KST 2026-08-04(화) 종가 181,000원
    price: 181000,
    reason: "뉴스에서 봤어",
    confidence: 50,
    memo: "새 앨범 소식 보고 골랐어.",
    tradedAt: "2026-08-04T01:05:00.000Z",
  },
  {
    id: "seed-parent-1",
    member: "parent",
    symbol: "005930",
    side: "buy",
    quantity: 2,
    // 삼성전자 KST 2026-08-04(화) 종가 240,000원
    price: 240000,
    reason: "이 회사(제품)를 잘 알아",
    confidence: 75,
    memo: "갤럭시를 오래 써서 사업을 이해하기 쉬웠어.",
    tradedAt: "2026-08-04T01:12:00.000Z",
  },
  {
    id: "seed-child-3",
    member: "child",
    symbol: "259960",
    side: "buy",
    quantity: 1,
    // 크래프톤 KST 2026-08-05(수) 종가 229,000원
    price: 229000,
    reason: "그래프가 좋아 보여서",
    confidence: 75,
    memo: "떨어졌길래 하나 더 담았어.",
    tradedAt: "2026-08-05T02:00:00.000Z",
  },
  {
    id: "seed-child-4",
    member: "child",
    symbol: "005930",
    side: "buy",
    quantity: 1,
    // 삼성전자 KST 2026-08-05(수) 종가 246,000원
    price: 246000,
    reason: "그냥 느낌이 좋아서",
    confidence: 25,
    memo: "다들 사길래 나도!",
    tradedAt: "2026-08-05T05:30:00.000Z",
  },
  {
    id: "seed-child-5",
    member: "child",
    symbol: "005930",
    side: "sell",
    quantity: 1,
    // 삼성전자 KST 2026-08-06(목) 종가 230,500원
    price: 230500,
    reason: "더 떨어질까 봐",
    memo: "떨어지니까 무서워서 팔았어…",
    tradedAt: "2026-08-06T01:40:00.000Z",
  },
  {
    id: "seed-parent-2",
    member: "parent",
    symbol: "011200",
    side: "buy",
    quantity: 5,
    // HMM KST 2026-08-06(목) 종가 21,400원
    price: 21400,
    reason: "뉴스에서 봤어",
    confidence: 50,
    memo: "해외 매출 기사를 봤는데 확신까지는 아니었어.",
    tradedAt: "2026-08-06T04:35:00.000Z",
  },
  {
    id: "seed-parent-3",
    member: "parent",
    symbol: "005930",
    side: "sell",
    quantity: 1,
    // 삼성전자 KST 2026-08-07(금) 종가 231,000원
    price: 231000,
    reason: "목표한 만큼 올랐어",
    memo: "처음 생각한 만큼 와서 절반만 정리했어.",
    tradedAt: "2026-08-07T05:02:00.000Z",
  },
];

export type SeedTabView = {
  member: FamilyMember;
  tab: EvidenceTab;
  symbol: string;
  viewedAt: string;
  dwellMs: number;
};

/**
 * 매수 직전 탭 유효 열람 시드 — 근거력(F9)의 표본이다. 유효 열람 기준은 10초 이상 체류.
 * 민지는 매수 4건 중 3건(크래프톤×2·하이브)을 알아보고 샀고 삼성전자만 느낌으로 샀다.
 * 엄마는 매수 3건 중 2건을 두 탭 이상 확인했다. 기업정보 탭(info)은 화면보다 먼저 시드에 반영한다.
 */
export const FAMILY_SEED_TAB_VIEWS: SeedTabView[] = [
  // 민지 — 크래프톤 첫 매수 전
  { member: "child", tab: "news", symbol: "259960", viewedAt: "2026-08-03T01:00:00.000Z", dwellMs: 21000 },
  { member: "child", tab: "chart", symbol: "259960", viewedAt: "2026-08-03T01:07:00.000Z", dwellMs: 34000 },
  // 민지 — 하이브 매수 전
  { member: "child", tab: "news", symbol: "352820", viewedAt: "2026-08-04T00:50:00.000Z", dwellMs: 18000 },
  { member: "child", tab: "info", symbol: "352820", viewedAt: "2026-08-04T00:56:00.000Z", dwellMs: 15000 },
  // 민지 — 크래프톤 추가 매수 전
  { member: "child", tab: "chart", symbol: "259960", viewedAt: "2026-08-05T01:30:00.000Z", dwellMs: 26000 },
  { member: "child", tab: "news", symbol: "259960", viewedAt: "2026-08-05T01:40:00.000Z", dwellMs: 12000 },
  // 엄마 — HMM 첫 매수 전
  { member: "parent", tab: "news", symbol: "011200", viewedAt: "2026-08-03T03:50:00.000Z", dwellMs: 25000 },
  { member: "parent", tab: "chart", symbol: "011200", viewedAt: "2026-08-03T03:58:00.000Z", dwellMs: 15000 },
  // 엄마 — 삼성전자 매수 전
  { member: "parent", tab: "news", symbol: "005930", viewedAt: "2026-08-04T00:40:00.000Z", dwellMs: 40000 },
  { member: "parent", tab: "info", symbol: "005930", viewedAt: "2026-08-04T00:55:00.000Z", dwellMs: 22000 },
  { member: "parent", tab: "chart", symbol: "005930", viewedAt: "2026-08-04T01:05:00.000Z", dwellMs: 18000 },
  // 엄마 — HMM 추가 매수 전 (한 탭만 훑고 추가 매수)
  { member: "parent", tab: "news", symbol: "011200", viewedAt: "2026-08-06T04:20:00.000Z", dwellMs: 14000 },
];
