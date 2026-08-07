import { NEWS } from '../data';
import { nextFloat, shuffle } from './rng';
import { RULES } from './rules';
import type { GameState } from './types';

/**
 * 준비 페이즈 무료 뉴스 배정 (기획서 §3.1).
 *
 * - 단서 뉴스(이번 턴 이벤트의 전조)와 배경 뉴스(그 시대의 무관한 사실)가 섞인다.
 *   받은 사람은 어느 쪽인지 모른다 — 전부 사실이고, 주가 얘기가 없다.
 * - 같은 턴 안에서 두 플레이어가 같은 뉴스를 받지 않는다 (턴이 다르면 재등장 가능).
 *
 * createInitialState()와 advancePhase()가 만든 사본 위에서만 호출된다.
 */
export function dealNews(state: GameState): void {
  const eventId = state.eventQueue[state.turn - 1];
  const clues = shuffle(state.rng, NEWS.filter((n) => n.eventId === eventId));
  const backgrounds = shuffle(state.rng, NEWS.filter((n) => n.eventId === null));

  for (const player of state.players) {
    const wantsClue = nextFloat(state.rng) < RULES.clueChance;
    const item =
      wantsClue && clues.length > 0
        ? clues.pop()!
        : (backgrounds.pop() ?? clues.pop());
    if (!item) break; // 풀 고갈 — 데이터 팩이 인원수보다 작을 때만 일어난다
    player.news.push({ turn: state.turn, newsId: item.id, text: item.text });
  }
}
