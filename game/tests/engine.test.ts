import { describe, expect, it } from 'vitest';
import { TurtleBot } from '../src/bots.ts';
import {
  assets,
  createGame,
  holdingsValue,
  legalPlays,
  marketPhase,
  mulligan,
  playCard,
  runGame,
  startTurn,
  stockById,
} from '../src/engine.ts';
import type { CardId, GameState, PlayerState } from '../src/types.ts';

/** 노이즈 0, 이벤트/조사 미발동용 고정 rng. */
const HALF = () => 0.5;

function prep(state: GameState, me: 0 | 1, hand: CardId[], energy = 5): PlayerState {
  const p = state.players[me];
  p.hand = [...hand];
  p.energy = energy;
  return p;
}

// 룰 테스트는 밸런스 튜닝과 무관하게 고정된 수치로 검증
const TEST_CFG = {
  livingCost: 30_000,
  buyAmount: 200_000,
  targetAssets: 2_000_000,
  eventEvery: 3,
  noisePct: 0.04,
  marketDrift: 0,
  bankruptThreshold: 0,
};

function game(): GameState {
  const state = createGame(1, TEST_CFG);
  state.rng = HALF;
  state.round = 1; // 이벤트 라운드(3) 회피
  return state;
}

describe('기본 매매', () => {
  it('매수: 20만어치, 매도: 전량 현금화', () => {
    const s = game();
    const p = prep(s, 0, ['buy', 'sell']);
    playCard(s, 0, 'buy', 'samsung');
    expect(p.cash).toBe(800_000);
    expect(p.holdings.samsung! * stockById(s, 'samsung').price).toBeCloseTo(200_000, 5);
    playCard(s, 0, 'sell', 'samsung');
    expect(p.cash).toBeCloseTo(1_000_000, 5);
    expect(p.holdings.samsung).toBe(0);
  });

  it('몰빵: 전 현금 올인', () => {
    const s = game();
    const p = prep(s, 0, ['allin']);
    playCard(s, 0, 'allin', 'krafton');
    expect(p.cash).toBe(0);
    expect(holdingsValue(s, p)).toBeCloseTo(1_000_000, 5);
  });

  it('분산투자: 40만을 4종목 균등 매수', () => {
    const s = game();
    const p = prep(s, 0, ['diversify']);
    playCard(s, 0, 'diversify');
    expect(p.cash).toBe(600_000);
    expect(holdingsValue(s, p)).toBeCloseTo(400_000, 5);
    for (const st of s.stocks) {
      expect((p.holdings[st.id] ?? 0) * st.price).toBeCloseTo(100_000, 5);
    }
  });

  it('배당: 보유 평가액의 8% 현금 지급', () => {
    const s = game();
    const p = prep(s, 0, ['diversify', 'dividend']);
    playCard(s, 0, 'diversify');
    playCard(s, 0, 'dividend');
    expect(p.cash).toBeCloseTo(600_000 + 32_000, 5);
  });

  it('관망: 카드 1장 드로우', () => {
    const s = game();
    const p = prep(s, 0, ['watch']);
    const deckBefore = p.deck.length;
    playCard(s, 0, 'watch');
    expect(p.hand.length).toBe(1); // watch는 나가고 1장 들어옴
    expect(p.deck.length).toBe(deckBefore - 1);
  });
});

describe('에너지·손패 규칙', () => {
  it('에너지 부족 시 예외', () => {
    const s = game();
    prep(s, 0, ['semiShock'], 2); // cost 3
    expect(() => playCard(s, 0, 'semiShock')).toThrow();
  });

  it('에너지 램프: 라운드 1 = 1, 상한 5', () => {
    const s = game();
    s.round = 1;
    startTurn(s, 0);
    expect(s.players[0].energy).toBe(1);
    s.round = 9;
    startTurn(s, 0);
    expect(s.players[0].energy).toBe(5);
  });

  it('손패 상한 초과 드로우는 버림', () => {
    const s = game();
    const p = prep(s, 0, ['watch', 'watch', 'watch', 'watch', 'watch', 'watch', 'watch'], 0);
    const discardBefore = p.discard.length;
    startTurn(s, 0);
    expect(p.hand.length).toBe(7);
    expect(p.discard.length).toBe(discardBefore + 1);
  });

  it('legalPlays: 에너지 0이면 0코스트만', () => {
    const s = game();
    prep(s, 0, ['buy', 'watch'], 0);
    const plays = legalPlays(s, 0);
    expect(plays).toEqual([{ card: 'watch' }]);
  });
});

describe('공매도·손절·이벤트', () => {
  it('공매도: 하락 시 수익 (2정산 후 청산)', () => {
    const s = game();
    prep(s, 0, ['short']);
    playCard(s, 0, 'short', 'samsung'); // 진입가 70,000
    marketPhase(s); // phasesLeft 2 -> 1
    stockById(s, 'samsung').price = 35_000; // 반토막
    marketPhase(s); // 청산: +200,000 * 0.5 = +100,000
    // 생활비 2회 차감 포함
    expect(s.players[0].cash).toBeCloseTo(1_000_000 + 100_000 - 60_000, 0);
    expect(s.players[0].shorts.length).toBe(0);
  });

  it('손절 예약: 급락 시 피해 절반으로 자동 매도', () => {
    const s = game();
    const p0 = prep(s, 0, ['buy', 'stoploss']);
    playCard(s, 0, 'buy', 'samsung');
    playCard(s, 0, 'stoploss', 'samsung');
    prep(s, 1, ['semiShock']);
    playCard(s, 1, 'semiShock'); // -25% 급락 -> 발동 (-12.5%에 매도)
    expect(p0.holdings.samsung).toBe(0);
    expect(p0.stopLosses.length).toBe(0);
    expect(p0.cash).toBeCloseTo(800_000 + 200_000 * 0.875, 0);
  });

  it('반도체 쇼크: 섹터만 -25%', () => {
    const s = game();
    prep(s, 0, ['semiShock']);
    playCard(s, 0, 'semiShock');
    expect(stockById(s, 'samsung').price).toBeCloseTo(52_500, 5);
    expect(stockById(s, 'kakao').price).toBe(45_000);
  });

  it('금리 인상: 전 종목 -10% + 다음 정산 현금 이자 5% (양측)', () => {
    const s = game();
    prep(s, 0, ['rateHike']);
    playCard(s, 0, 'rateHike');
    for (const st of s.stocks) expect(st.price / st.basePrice).toBeCloseTo(0.9, 5);
    marketPhase(s);
    for (const p of s.players) {
      expect(p.cash).toBeCloseTo(1_000_000 * 1.05 - 30_000, 0);
      expect(p.interestNextPhase).toBe(false);
    }
  });

  it('릴스 찍기: 70% 확률 +15%, 실패 시 무효과', () => {
    const s = game();
    prep(s, 0, ['reels', 'reels'], 5);
    s.rng = () => 0.9; // 실패
    playCard(s, 0, 'reels', 'kakao');
    expect(stockById(s, 'kakao').price).toBe(45_000);
    s.rng = () => 0.1; // 성공
    playCard(s, 0, 'reels', 'kakao');
    expect(stockById(s, 'kakao').price).toBeCloseTo(45_000 * 1.15, 5);
  });

  it('월드 이벤트: 예고된 라운드에 발동 후 다음 이벤트 예고', () => {
    const s = game();
    s.upcomingEvent = { id: 't', headline: 't', effects: { 반도체: -0.5 } };
    s.round = s.nextEventRound;
    marketPhase(s);
    expect(stockById(s, 'samsung').price).toBeCloseTo(35_000, 5);
    expect(s.nextEventRound).toBe(6);
    expect(s.upcomingEvent.id).not.toBe('t');
  });
});

describe('불법 카드', () => {
  it('내부자거래: 즉시 +25만, 의혹 +1', () => {
    const s = game();
    const p = prep(s, 0, ['insider']);
    playCard(s, 0, 'insider');
    expect(p.cash).toBe(1_250_000);
    expect(p.suspicion).toBe(1);
  });

  it('적발 시 자산 40% 몰수, 의혹 초기화', () => {
    const s = game();
    const p = prep(s, 0, ['insider']);
    playCard(s, 0, 'insider');
    s.rng = () => 0; // 조사 확률 무조건 적발
    marketPhase(s);
    expect(p.cash).toBeCloseTo((1_250_000 - 30_000) * 0.6, 0);
    expect(p.suspicion).toBe(0);
  });
});

describe('생활비·승패', () => {
  it('생활비 부족 시 강제 매도', () => {
    const s = game();
    const p = s.players[0];
    p.cash = 10_000;
    p.holdings.samsung = 10; // 70만어치
    marketPhase(s);
    expect(p.holdings.samsung).toBe(0);
    expect(p.cash).toBeCloseTo(10_000 - 30_000 + 700_000, 0);
  });

  it('파산: 자산 0 이하이면 상대 승리', () => {
    const s = game();
    s.players[0].cash = -100;
    marketPhase(s);
    expect(s.winner).toBe(1);
    expect(s.winReason).toBe('bankrupt');
  });

  it('마진콜: 자산이 파산선 이하로 떨어지면 상대 승리', () => {
    const s = createGame(1, { ...TEST_CFG, bankruptThreshold: 150_000 });
    s.rng = HALF;
    s.round = 1;
    s.players[0].cash = 100_000; // 생활비 차감 후 70,000 <= 150,000
    marketPhase(s);
    expect(s.winner).toBe(1);
    expect(s.winReason).toBe('bankrupt');
  });

  it('목표 달성: 목표 자산 도달 시 승리', () => {
    const s = game();
    s.players[1].cash = 2_100_000;
    marketPhase(s);
    expect(s.winner).toBe(1);
    expect(s.winReason).toBe('target');
  });

  it('턴 종료: 터틀 미러전은 무승부 (현금 동일 소진)', () => {
    const res = runGame([TurtleBot, TurtleBot], 42, TEST_CFG);
    expect(res.reason).toBe('timeout');
    expect(res.winner).toBe('draw');
    expect(res.rounds).toBe(15);
    expect(res.finalAssets[0]).toBeCloseTo(1_000_000 - 30_000 * 15, 0);
  });
});

describe('이벤트 로그 (T1)', () => {
  it('손절 예약 발동: 지킨 금액 포함', () => {
    const s = game();
    prep(s, 0, ['buy', 'stoploss']);
    playCard(s, 0, 'buy', 'samsung');
    playCard(s, 0, 'stoploss', 'samsung');
    prep(s, 1, ['semiShock']);
    const events = playCard(s, 1, 'semiShock');
    const ev = events.find((e) => e.type === 'stopLossTriggered');
    expect(ev).toBeDefined();
    if (ev?.type === 'stopLossTriggered') {
      expect(ev.player).toBe(0);
      expect(ev.stockId).toBe('samsung');
      expect(ev.savedAmount).toBeCloseTo(25_000, 0); // 20만 * 25% * 절반
    }
  });

  it('섹터 이벤트 피격: 플레이어별 손익과 섹터 노출 비중을 함께 기록', () => {
    const s = game();
    prep(s, 0, ['buy']);
    playCard(s, 0, 'buy', 'samsung'); // 반도체 100% 노출
    prep(s, 1, ['buy']);
    playCard(s, 1, 'buy', 'kakao'); // 반도체 노출 0%
    prep(s, 0, ['semiShock'], 5);
    const events = playCard(s, 0, 'semiShock');
    const ev = events.find((e) => e.type === 'sectorHit');
    expect(ev).toBeDefined();
    if (ev?.type === 'sectorHit') {
      expect(ev.sector).toBe('반도체');
      expect(ev.pct).toBeCloseTo(-0.25, 5);
      expect(ev.source).toEqual({ kind: 'card', cardId: 'semiShock' });
      const mine = ev.impacts.find((i) => i.player === 0)!;
      const theirs = ev.impacts.find((i) => i.player === 1)!;
      expect(mine.exposureRatio).toBeCloseTo(1, 5); // 몰빵 -> 분산 없음
      expect(mine.pnlAmount).toBeCloseTo(-50_000, 0); // 20만 * -25%
      expect(theirs.exposureRatio).toBe(0); // 반도체 미보유 -> 분산 덕분에 무피해
      expect(theirs.pnlAmount).toBe(0);
    }
  });

  it('공매도 청산: 손익 포함', () => {
    const s = game();
    prep(s, 0, ['short']);
    playCard(s, 0, 'short', 'samsung'); // 진입가 70,000
    marketPhase(s); // phasesLeft 2 -> 1
    stockById(s, 'samsung').price = 35_000;
    const events = marketPhase(s); // 청산
    const ev = events.find((e) => e.type === 'shortClosed');
    expect(ev).toBeDefined();
    if (ev?.type === 'shortClosed') {
      expect(ev.player).toBe(0);
      expect(ev.stockId).toBe('samsung');
      expect(ev.pnl).toBeCloseTo(100_000, 0);
    }
  });

  it('금감원 조사 적발: 몰수액 포함', () => {
    const s = game();
    const p = prep(s, 0, ['insider']);
    playCard(s, 0, 'insider');
    s.rng = () => 0; // 조사 확률 무조건 적발
    const events = marketPhase(s);
    const ev = events.find((e) => e.type === 'insiderCaught');
    expect(ev).toBeDefined();
    if (ev?.type === 'insiderCaught') {
      expect(ev.player).toBe(0);
      expect(ev.fineAmount).toBeCloseTo((1_250_000 - 30_000) * 0.4, 0);
    }
    expect(p.suspicion).toBe(0);
  });

  it('생활비 강제 매도: 매도한 종목·수량·대금 포함', () => {
    const s = game();
    const p = s.players[0];
    p.cash = 10_000;
    p.holdings.samsung = 10; // 70만어치
    const events = marketPhase(s);
    const ev = events.find((e) => e.type === 'forcedSale');
    expect(ev).toBeDefined();
    if (ev?.type === 'forcedSale') {
      expect(ev.player).toBe(0);
      expect(ev.stockId).toBe('samsung');
      expect(ev.shares).toBe(10);
      expect(ev.proceeds).toBeCloseTo(700_000, 0);
    }
  });

  it('월드 이벤트 발동: 헤드라인·효과 통지 후 섹터별 피격 기록', () => {
    const s = game();
    s.upcomingEvent = { id: 't', headline: '테스트 헤드라인', effects: { 반도체: -0.5 } };
    s.round = s.nextEventRound;
    const events = marketPhase(s);
    const ev = events.find((e) => e.type === 'worldEventTriggered');
    expect(ev).toBeDefined();
    if (ev?.type === 'worldEventTriggered') {
      expect(ev.eventId).toBe('t');
      expect(ev.headline).toBe('테스트 헤드라인');
      expect(ev.effects).toEqual({ 반도체: -0.5 });
    }
    const sectorEv = events.find((e) => e.type === 'sectorHit');
    expect(sectorEv).toBeDefined();
    if (sectorEv?.type === 'sectorHit') {
      expect(sectorEv.source).toEqual({ kind: 'worldEvent', eventId: 't' });
    }
  });

  it('승리 조건 충족: 파산 사유로 gameOver 기록', () => {
    const s = game();
    s.players[0].cash = -100;
    const events = marketPhase(s);
    const ev = events.find((e) => e.type === 'gameOver');
    expect(ev).toBeDefined();
    if (ev?.type === 'gameOver') {
      expect(ev.winner).toBe(1);
      expect(ev.reason).toBe('bankrupt');
    }
  });
});

describe('자산 평가', () => {
  it('자산 = 현금 + 평가액 + 숏 미실현 손익', () => {
    const s = game();
    const p = prep(s, 0, ['buy', 'short']);
    playCard(s, 0, 'buy', 'samsung');
    playCard(s, 0, 'short', 'kakao');
    stockById(s, 'kakao').price = 40_500; // -10% -> 숏 +20,000
    expect(assets(s, p)).toBeCloseTo(800_000 + 200_000 + 20_000, 0);
  });
});

describe('멀리건 (T4)', () => {
  it('버린 수만큼 새로 뽑아 손패 수가 그대로 유지된다', () => {
    const s = createGame(1, TEST_CFG);
    const p = s.players[0];
    const handBefore = p.hand.length; // createGame 기본 시작 손패 4장
    mulligan(s, 0, [0, 2]); // 2장 교체
    expect(p.hand.length).toBe(handBefore);
  });

  it('버린 카드는 덱으로 돌아가 셔플된다 (분실되지 않음)', () => {
    const s = createGame(1, TEST_CFG);
    const p = s.players[0];
    const deckBefore = p.deck.length;
    mulligan(s, 0, [0, 1]);
    expect(p.discard.length).toBe(0); // 버린 카드가 discard로 가지 않았는지 확인
    // 덱 크기: (이전 덱 - 새로 뽑은 2장 + 되돌린 2장) = 이전 덱과 동일
    expect(p.deck.length).toBe(deckBefore);
  });

  it('매치당 1회만 허용 — 재사용 시 예외', () => {
    const s = createGame(1, TEST_CFG);
    mulligan(s, 0, [0]);
    expect(() => mulligan(s, 0, [0])).toThrow();
  });

  it('라운드가 시작된 뒤에는 멀리건 불가', () => {
    const s = createGame(1, TEST_CFG);
    s.round = 1;
    startTurn(s, 0);
    expect(() => mulligan(s, 0, [0])).toThrow();
  });

  it('전체 카드 수(덱+손패)는 멀리건 전후 보존된다', () => {
    const s = createGame(1, TEST_CFG);
    const p = s.players[0];
    const totalBefore = p.deck.length + p.hand.length;
    mulligan(s, 0, [0, 1, 2]);
    expect(p.deck.length + p.hand.length).toBe(totalBefore);
  });

  it('버릴 카드가 없으면 RNG를 소비하지 않는다 (교체 없음이 이후 판 전개에 영향 안 줌)', () => {
    const withMulligan = createGame(1, TEST_CFG);
    mulligan(withMulligan, 0, []);
    const without = createGame(1, TEST_CFG);
    // 동일 시드에서 빈 멀리건 이후 손패·덱 구성이 완전히 동일해야 함
    expect(withMulligan.players[0].hand).toEqual(without.players[0].hand);
    expect(withMulligan.players[0].deck).toEqual(without.players[0].deck);
  });
});
