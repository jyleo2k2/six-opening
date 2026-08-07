import { getCompany } from '../data';
import { standings, totalAsset } from './settle';
import type { GameState, GameView, Sector } from './types';

/**
 * 플레이어별 상태 필터 — 정보 비대칭 무결성의 관문 (기획서 §9).
 *
 * 서버는 상태를 내보낼 때 반드시 이 함수를 거친다. broadcast(state) 금지.
 * 여기서 빠지는 것:
 *   - eventQueue·rng — 서버만 안다. 새면 미래를 계산할 수 있다
 *   - lies — 거짓말 기록. 새면 "진실의 눈"이 죽는다
 *   - 내 뉴스의 real 플래그 — "절반만 진짜" 설계의 심장
 *   - 타인의 현금·종목·수량·뉴스·정보 내용 — 공개는 총자산·섹터 보유 칩·구매 사실뿐
 */
export function viewFor(state: GameState, playerId: string): GameView {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) throw new Error(`없는 플레이어다: ${playerId}`);

  const mine = structuredClone(me);
  for (const news of mine.news) {
    delete news.real;
  }

  return {
    poolId: state.poolId,
    turn: state.turn,
    turns: state.turns,
    phase: state.phase,
    prices: { ...state.prices },
    eventLog: structuredClone(state.eventLog),
    purchases: [...state.purchases],
    standings: standings(state),
    me: mine,
    others: state.players
      .filter((p) => p.id !== playerId)
      .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        color: p.color,
        ch: p.ch,
        bot: p.bot,
        totalAsset: totalAsset(state, p),
        heldSectors: [...new Set<Sector>(p.holdings.map((h) => getCompany(h.companyId).sector))],
        infoLeft: p.infoLeft,
      })),
  };
}
