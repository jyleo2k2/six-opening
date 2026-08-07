import { standings, totalAsset } from './settle';
import type { GameState, GameView } from './types';

/**
 * 플레이어별 상태 필터 — 정보 비대칭 무결성의 관문 (기획서 §9).
 *
 * 서버는 상태를 내보낼 때 반드시 이 함수를 거친다. broadcast(state) 금지.
 * 여기서 빠지는 것:
 *   - eventQueue — 이번 판 사건들. 새는 순간 게임이 죽는다
 *   - rng — 시드가 새면 미래(등락폭·판정)를 계산할 수 있다
 *   - 타인의 news·forecasts·cash·holdings — 공개는 총자산과 구매 사실뿐
 */
export function viewFor(state: GameState, playerId: string): GameView {
  const me = state.players.find((p) => p.id === playerId);
  if (!me) throw new Error(`없는 플레이어다: ${playerId}`);

  return {
    poolId: state.poolId,
    turn: state.turn,
    phase: state.phase,
    prices: { ...state.prices },
    eventLog: structuredClone(state.eventLog),
    purchases: [...state.purchases],
    standings: standings(state),
    me: structuredClone(me),
    others: state.players
      .filter((p) => p.id !== playerId)
      .map((p) => ({
        id: p.id,
        nickname: p.nickname,
        totalAsset: totalAsset(state, p),
        infoBoughtThisTurn: p.infoBoughtThisTurn,
      })),
  };
}
