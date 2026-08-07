import { fail, ok, type Action, type GameState, type Result } from '../types';
import { advancePhase } from './advancePhase';
import { buyInfo } from './buyInfo';
import { chat } from './chat';
import { buy, sell } from './trade';

/**
 * 룰의 유일한 진입점 — 클라(미리 돌려 즉시 반응)·서버(권위 판정)·시뮬이 전부 이 함수를 쓴다.
 * 입력 상태를 변형하지 않고 사본에 적용한다.
 */
export function reduce(state: GameState, action: Action): Result<GameState> {
  const draft = structuredClone(state);

  let error: string | null;
  switch (action.type) {
    case 'buy':
      error = buy(draft, action);
      break;
    case 'sell':
      error = sell(draft, action);
      break;
    case 'buyInfo':
      error = buyInfo(draft, action);
      break;
    case 'chat':
      error = chat(draft, action);
      break;
    case 'advancePhase':
      error = advancePhase(draft);
      break;
  }

  return error === null ? ok(draft) : fail(error);
}
