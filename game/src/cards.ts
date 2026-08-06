import type { CardDef, CardId, Stock, WorldEvent } from './types.ts';

export const CARDS: Record<CardId, CardDef> = {
  buy: { id: 'buy', name: '매수', cost: 1, kind: 'action', needsTarget: true },
  sell: { id: 'sell', name: '매도', cost: 1, kind: 'action', needsTarget: true },
  watch: { id: 'watch', name: '관망', cost: 0, kind: 'action', needsTarget: false },
  diversify: { id: 'diversify', name: '분산투자', cost: 2, kind: 'action', needsTarget: false },
  dividend: { id: 'dividend', name: '배당', cost: 2, kind: 'action', needsTarget: false },
  short: { id: 'short', name: '공매도', cost: 2, kind: 'action', needsTarget: true },
  stoploss: { id: 'stoploss', name: '손절 예약', cost: 1, kind: 'trap', needsTarget: true },
  semiShock: { id: 'semiShock', name: '반도체 쇼크', cost: 3, kind: 'event', needsTarget: false },
  platReg: { id: 'platReg', name: '플랫폼 규제', cost: 3, kind: 'event', needsTarget: false },
  gameHit: { id: 'gameHit', name: '신작 대박', cost: 2, kind: 'event', needsTarget: false },
  chickenMukbang: { id: 'chickenMukbang', name: '치킨 먹방', cost: 1, kind: 'fun', needsTarget: false },
  rateHike: { id: 'rateHike', name: '금리 인상', cost: 4, kind: 'event', needsTarget: false },
  insider: { id: 'insider', name: '내부자거래', cost: 2, kind: 'illegal', needsTarget: false },
  reels: { id: 'reels', name: '릴스 찍기', cost: 1, kind: 'fun', needsTarget: true },
  allin: { id: 'allin', name: '몰빵', cost: 2, kind: 'fun', needsTarget: true },
};

// 기본 덱 22장 (MVP 카드 15종 + 기본 카드 복수 장)
export const DEFAULT_DECK: CardId[] = [
  'buy', 'buy', 'buy', 'buy',
  'sell', 'sell',
  'watch', 'watch',
  'diversify', 'diversify',
  'dividend',
  'short', 'short',
  'stoploss',
  'semiShock',
  'platReg',
  'gameHit',
  'chickenMukbang',
  'rateHike',
  'insider',
  'reels',
  'allin',
];

// 실명 종목 (섹터 단위 이벤트만 — 기업 고유 허구 악재 금지, docs/game-design.md 6절)
export const STOCKS: Omit<Stock, 'basePrice'>[] = [
  { id: 'samsung', name: '삼성전자', sector: '반도체', price: 70_000 },
  { id: 'kakao', name: '카카오', sector: '플랫폼', price: 45_000 },
  { id: 'krafton', name: '크래프톤', sector: '게임', price: 250_000 },
  { id: 'kyochon', name: '교촌에프앤비', sector: '식품', price: 10_000 },
];

// 월드 이벤트 — 실제 역사 사건 기반 (한 라운드 전에 예고됨)
export const WORLD_EVENTS: WorldEvent[] = [
  {
    id: 'covid',
    headline: '전염병 대유행 조짐… 비대면 산업 주목',
    effects: { 반도체: -0.1, 플랫폼: 0.08, 게임: 0.12, 식품: -0.18 },
  },
  {
    id: 'supercycle',
    headline: '반도체 슈퍼사이클 오나… 수요 폭발 전망',
    effects: { 반도체: 0.3 },
  },
  {
    id: 'commodity',
    headline: '국제 원자재 가격 급등 경보',
    effects: { 식품: -0.15, 반도체: -0.05 },
  },
  {
    id: 'rateCut',
    headline: '기준금리 인하 유력… 시장 기대감',
    effects: { 반도체: 0.08, 플랫폼: 0.08, 게임: 0.08, 식품: 0.08 },
  },
  {
    id: 'crisis',
    headline: '글로벌 금융위기 공포 확산',
    effects: { 반도체: -0.2, 플랫폼: -0.2, 게임: -0.2, 식품: -0.2 },
  },
  {
    id: 'bull',
    headline: '외국인 매수세 유입… 대세 상승장 기대',
    effects: { 반도체: 0.1, 플랫폼: 0.1, 게임: 0.1, 식품: 0.1 },
  },
];
