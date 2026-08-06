import { fail, type Action, type GameState, type Result } from '../types';
import { buy } from './buy';
import { endTurn } from './endTurn';
import { exchange } from './exchange';
import { sell } from './sell';
import { playSkill } from './skill';
import { swapDeck } from './swapDeck';

export { buy } from './buy';
export { endTurn } from './endTurn';
export { exchange } from './exchange';
export { playHedge } from './hedge';
export { sell } from './sell';
export { playSkill } from './skill';
export { swapDeck } from './swapDeck';

/**
 * 액션 디스패처 — **클라와 서버가 함께 쓰는 유일한 진입점**.
 *
 * 입력 상태를 변형하지 않고 사본에 적용한다. 덕분에
 *   · 클라는 결과를 미리 계산해 UI를 즉시 반응시킬 수 있고(낙관적 예측),
 *   · 서버는 같은 함수로 최종 판정을 내린다.
 * 판정 로직을 양쪽에 두 번 구현하지 않는 것이 이 구조의 핵심이다.
 */
export function reduce(state: GameState, action: Action): Result<GameState> {
  if (state.finished) return fail('이미 종료된 게임이다');

  const draft: GameState = structuredClone(state);

  switch (action.type) {
    case 'buy':
      return buy(draft, action.cardId, action.qty);
    case 'sell':
      return sell(draft, action.cardId, action.qty);
    case 'exchange':
      return exchange(draft, action.from, action.amount);
    case 'swapDeck':
      return swapDeck(draft, action.handCardId, action.deckCardId);
    case 'playSkill':
      return playSkill(draft, action.cardId);
    case 'endTurn':
      return endTurn(draft);
  }
}
