import { expandDomain } from '../domain';
import { refillHand } from '../hand';
import { RULES } from '../rules';
import { currentPlayer } from '../state';
import { ok, type GameState, type Result } from '../types';

/**
 * 턴 종료 — 기획서 §7.1.
 *   내 턴 → 상대 턴 = 1라운드. 총 5라운드(10턴) 후 정산.
 *
 * 라운드가 넘어가는 순간 영역 전개가 발동한다(§7.3, Q4 추천안).
 * 마지막 턴(10턴째) 종료 시에는 발동하지 않는다 — 정산 직전 운빨을 막기 위함.
 */
export function endTurn(state: GameState): Result<GameState> {
  state.turn += 1;

  if (state.turn >= RULES.TOTAL_TURNS) {
    state.finished = true;
    return ok(state);
  }

  state.current = (state.turn % 2) as 0 | 1;

  const nextRound = Math.floor(state.turn / 2) + 1;
  if (nextRound !== state.round) {
    state.round = nextRound;
    expandDomain(state);
  }

  const next = currentPlayer(state);
  next.swapUsedThisTurn = false;
  next.skillUsedThisTurn = false;
  refillHand(next, state);

  return ok(state);
}
