import { applyCurrentEvent } from '../event';
import { dealNews } from '../news';
import { RULES } from '../rules';
import type { GameState } from '../types';

/**
 * 페이즈 전환 (기획서 §2.2) — 준비 → 채팅 → 이벤트 → 다음 턴 준비 (5턴 후 종료).
 * 서버 타이머·전원 준비 완료만 이 액션을 보낸다.
 *
 * 채팅 페이즈에 엔진이 하는 일은 없다 — 채팅·이모티콘은 자산에 영향이 없어서
 * 룰 밖(서버 릴레이)이다.
 */
export function advancePhase(state: GameState): string | null {
  switch (state.phase) {
    case 'prep':
      state.phase = 'chat';
      return null;

    case 'chat':
      state.phase = 'event';
      applyCurrentEvent(state);
      return null;

    case 'event':
      if (state.turn >= RULES.turns) {
        state.phase = 'ended';
        return null;
      }
      state.turn += 1;
      state.phase = 'prep';
      for (const player of state.players) {
        player.infoBoughtThisTurn = false;
      }
      dealNews(state);
      return null;

    case 'ended':
      return '게임이 이미 끝났다';
  }
}
