import type { CardId, CardKind, GameConfig } from '@engine/types.ts';
import { manwon } from './format.ts';

/** 매치 중 ? 툴팁 — 한 줄만 (docs/game-design.md 7절: 몰입 유지). */
export const CARD_TOOLTIP: Record<CardId, string> = {
  buy: '매수: 주식을 사서 주인이 되는 것. 오르면 내 자산도 오른다.',
  sell: '매도: 가진 주식을 팔아 현금으로 바꾸는 것.',
  watch: '관망: 아무것도 안 하고 지켜보는 것도 하나의 선택이다.',
  diversify: '분산투자: 한 곳에 몰지 않고 여러 곳에 나눠 담아 위험을 줄이는 것.',
  dividend: '배당: 회사가 번 돈을 주주에게 나눠주는 것.',
  short: '공매도: 주식을 빌려서 먼저 팔고, 값이 내려가면 싸게 사서 갚는 것.',
  stoploss: '손절: 더 크게 잃기 전에 미리 정한 선에서 파는 것.',
  semiShock: '섹터 리스크: 같은 업종은 같은 사건에 함께 흔들린다.',
  platReg: '규제 리스크: 정부 규제도 주가를 움직이는 큰 사건이다.',
  gameHit: '호재: 회사에 좋은 소식이 나오면 주가가 오르는 힘이 생긴다.',
  chickenMukbang: '소비 트렌드: 사람들이 많이 사면 그 회사 실적도 좋아진다.',
  rateHike: '금리: 금리가 오르면 주가는 눌리고 현금 이자는 늘어난다.',
  insider: '내부자거래: 남만 아는 정보로 돈 버는 불법. 걸리면 다 잃는다.',
  reels: '밈 주식: 입소문으로 뜬 주식은 근거가 약해서 안 오를 수도 있다.',
  allin: '집중투자: 한 종목에 전부 걸면 크게 벌 수도, 크게 잃을 수도 있다.',
};

export const KIND_LABEL: Record<CardKind, string> = {
  action: '행동',
  event: '이벤트',
  trap: '함정',
  fun: '재미',
  illegal: '불법',
};

/** 카드 효과 문구. 금액·확률은 엔진 config에서 파생시켜 수치가 어긋나지 않게 한다. */
export function cardEffectText(id: CardId, cfg: GameConfig): string {
  switch (id) {
    case 'buy':
      return `선택 종목 ${manwon(cfg.buyAmount)} 매수`;
    case 'sell':
      return '선택 종목 전량 매도';
    case 'watch':
      return '카드 1장 드로우';
    case 'diversify':
      return `${manwon(cfg.buyAmount * 2)}을 4종목에 균등 매수`;
    case 'dividend':
      return '보유 평가액의 8%를 현금으로';
    case 'short':
      return `${manwon(cfg.shortAmount)} 규모 숏, 2정산 후 청산`;
    case 'stoploss':
      return `보유 종목 ${Math.round(cfg.stopLossTrigger * 100)}%↑ 급락 시 자동 매도 (피해 절반)`;
    case 'semiShock':
      return '반도체 섹터 -25%';
    case 'platReg':
      return '플랫폼 섹터 -20%';
    case 'gameHit':
      return '게임 섹터 +20%';
    case 'chickenMukbang':
      return '식품 섹터 +10%';
    case 'rateHike':
      return '전 종목 -10%, 다음 정산 시 현금 이자 +5%';
    case 'insider':
      return `즉시 +${manwon(cfg.insiderGain)}, 의혹 +1 (적발 시 자산 ${Math.round(cfg.insiderFinePct * 100)}% 몰수)`;
    case 'reels':
      return '선택 종목 70% 확률 +15%, 30% 노잼';
    case 'allin':
      return '전 현금을 선택 종목에 올인';
  }
}

/** 카드를 낼 때 필요한 것 — 손패에서 왜 못 내는지 알려주기 위한 짧은 문구. */
export const CARD_REQUIREMENT: Partial<Record<CardId, string>> = {
  buy: '현금 필요',
  sell: '보유 주식 필요',
  diversify: '현금 필요',
  dividend: '보유 주식 필요',
  stoploss: '보유 주식 필요',
  allin: '현금 필요',
};
