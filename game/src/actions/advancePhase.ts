import { applyCurrentEvent } from '../event';
import { dealNews } from '../news';
import type { GameState } from '../types';

/**
 * 페이즈 전환 (기획서 §2) — 준비 → 회의 → 사건 → 순위 → 다음 라운드 준비 (마지막엔 종료).
 * 서버 타이머·전원 준비 완료만 이 액션을 보낸다.
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
      state.phase = 'rank';
      return null;

    case 'rank':
      if (state.turn >= state.turns) {
        state.phase = 'ended';
        return null;
      }
      state.turn += 1;
      state.phase = 'prep';
      for (const player of state.players) {
        player.boughtSectors = [];
      }
      dealNews(state);
      return null;

    case 'ended':
      return '게임이 이미 끝났다';
  }
}
