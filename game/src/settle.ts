import { RULES } from './rules';
import type { Awards, GameState, PlayerState, Standing } from './types';

/** 총자산(원) = 현금 + Σ 보유 수량 × 현재가 (소수점 주식 → 반올림) */
export function totalAsset(state: GameState, player: PlayerState): number {
  return Math.round(
    player.holdings.reduce((sum, h) => sum + h.qty * (state.prices[h.companyId] ?? 0), player.cash),
  );
}

/** 총자산 순위 — 동점 공동 순위 (기획서 §6) */
export function standings(state: GameState): Standing[] {
  const rows = state.players.map((p) => ({
    playerId: p.id,
    nickname: p.nickname,
    color: p.color,
    ch: p.ch,
    bot: p.bot,
    totalAsset: totalAsset(state, p),
    returnPct: (totalAsset(state, p) / RULES.seedCash - 1) * 100,
  }));
  rows.sort((a, b) => b.totalAsset - a.totalAsset);
  return rows.map((row) => ({
    ...row,
    rank: 1 + rows.filter((other) => other.totalAsset > row.totalAsset).length,
  }));
}

/** 시상식 3관왕 (기획서 §6) — "수익 1등만 상을 받는 게 아니에요" */
export function awards(state: GameState): Awards {
  const board = standings(state);
  const king = board[0];
  const eye = [...state.players].sort((a, b) => b.notFooled - a.notFooled)[0];
  const steady = [...state.players].sort((a, b) => a.maxDrawdown - b.maxDrawdown)[0];
  const row = (p: PlayerState, value: string) => ({
    playerId: p.id,
    nickname: p.nickname,
    color: p.color,
    ch: p.ch,
    value,
  });
  return {
    profitKing: {
      playerId: king.playerId,
      nickname: king.nickname,
      color: king.color,
      ch: king.ch,
      value: `${king.totalAsset.toLocaleString('ko-KR')}원`,
    },
    truthEye: row(eye, `${eye.notFooled}회`),
    steady: row(steady, `MDD ${(steady.maxDrawdown * 100).toFixed(1)}%`),
  };
}

/** 종료 정산 — 순위 + 시상식 */
export function settle(state: GameState): { standings: Standing[]; awards: Awards } {
  return { standings: standings(state), awards: awards(state) };
}
