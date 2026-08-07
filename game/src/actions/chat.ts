import { getCompany } from '../../data';
import { CHAT_SUBJECT_FIXED, CHAT_VERBS, SECTORS, type Action, type GameState } from '../types';

/**
 * 작전 회의 템플릿 발화 (기획서 §4) — 자산에 영향 없음. 텍스트 릴레이는 서버 몫이고,
 * 엔진은 **조합 검증**과 **거짓말 기록**만 한다.
 *
 * 거짓말 = "[나는][X][샀어]"인데 X 섹터 미보유. 벌칙이 아니라 공식 전술이며,
 * 다음 라운드 사건 정산 때 안 넘어간 플레이어들의 "안 속은 횟수"가 올라간다 (event.ts).
 */
export function chat(state: GameState, action: Extract<Action, { type: 'chat' }>): string | null {
  if (state.phase !== 'chat') return '작전 회의에서만 말할 수 있다';

  const player = state.players.find((p) => p.id === action.playerId);
  if (!player) return '없는 플레이어다';

  const subjects: string[] = [...CHAT_SUBJECT_FIXED, ...state.players.map((p) => p.nickname)];
  if (!subjects.includes(action.subject)) return '템플릿에 없는 말이다';
  if (!(SECTORS as readonly string[]).includes(action.sector)) return '없는 섹터다';
  if (!(CHAT_VERBS as readonly string[]).includes(action.verb)) return '템플릿에 없는 말이다';

  if (action.subject === '나는' && action.verb === '샀어') {
    const holds = player.holdings.some((h) => getCompany(h.companyId).sector === action.sector);
    if (!holds) state.lies.push({ playerId: player.id, sector: action.sector, turn: state.turn });
  }
  return null;
}
