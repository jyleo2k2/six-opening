import type { GameState, PlayerState, Standing } from './types';

/** 총자산(원) = 현금 + Σ 보유 수량 × 현재가 */
export function totalAsset(state: GameState, player: PlayerState): number {
  return player.holdings.reduce(
    (sum, h) => sum + h.qty * (state.prices[h.companyId] ?? 0),
    player.cash,
  );
}

/** 총자산 순위 — 동점은 공동 순위 (기획서 §6) */
export function standings(state: GameState): Standing[] {
  const rows = state.players.map((p) => ({
    playerId: p.id,
    nickname: p.nickname,
    totalAsset: totalAsset(state, p),
  }));
  rows.sort((a, b) => b.totalAsset - a.totalAsset);
  return rows.map((row) => ({
    ...row,
    rank: 1 + rows.filter((other) => other.totalAsset > row.totalAsset).length,
  }));
}

/** 5턴 종료 정산 — 총자산 최다가 우승 */
export function settle(state: GameState): { standings: Standing[] } {
  return { standings: standings(state) };
}
