import { getEvent, NOISE_NEWS } from '../data';
import { shuffle } from './rng';
import { RULES } from './rules';
import type { GameState } from './types';

/**
 * 라운드 뉴스 배정 (기획서 §3.1).
 *
 * - **딱 2명(인원이 적으면 그만큼)만 이번 사건의 진짜 전조**를 받는다.
 * - 나머지는 그 시대 배경 노이즈 — 사건의 clueSector와 같은 섹터는 제외해서
 *   "섹터 배지만 보고" 진짜를 가려낼 수 없게 한다.
 * - 전부 사실 문장. real 플래그는 서버 내부용 — viewFor가 제거한다.
 *
 * createInitialState()와 advancePhase()가 만든 사본 위에서만 호출된다.
 */
export function dealNews(state: GameState): void {
  const event = getEvent(state.eventQueue[state.turn - 1]);
  const order = shuffle(state.rng, state.players);
  const noisePool = shuffle(state.rng, NOISE_NEWS.filter((n) => n.sector !== event.clueSector));

  order.forEach((player, i) => {
    if (i < RULES.clueHolders) {
      player.news.push({ turn: state.turn, sector: event.clueSector, text: event.clueText, real: true });
    } else {
      const noise = noisePool[(i - RULES.clueHolders) % noisePool.length];
      player.news.push({ turn: state.turn, sector: noise.sector, text: noise.text, real: false });
    }
  });
}
