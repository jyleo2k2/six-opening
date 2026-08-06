import { fail, type GameState, type Result } from '../types';

/**
 * 회피카드(= 헷지카드) — 기획서 §4.3 / Q2. **미구현**.
 *
 * 확정해야 할 것:
 *   ① "헷지 카드"와 동일 개념인가?
 *   ② 무효화 대상은 상대 스킬만인가, 경제환경(영역 전개)도 포함인가?
 *   ③ 상대 턴에도 발동 가능한 리액션 카드인가?
 *
 * 추천안: 헷지=회피로 통일. 상대 스킬카드에 체인 발동, **자기 필드 한정** 무효화.
 *   경제환경 헷지는 확장판으로.
 *
 * ⚠ 자기 필드 한정 무효화를 도입하면 현재의 '섹터별 글로벌 배율'(GameState.priceMods)
 *   모델로는 표현할 수 없다. 플레이어별 배율로 상태 모델을 바꿔야 한다.
 *   Q2 확정 전에는 구현하지 않는다 — 잘못 만들면 되돌리는 비용이 크다.
 */
export function playHedge(_state: GameState, _cardId: string): Result<GameState> {
  return fail('회피카드는 아직 구현되지 않았다 (기획서 Q2 미확정)');
}
