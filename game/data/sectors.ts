import type { Sector, SectorInfo } from '../src/types';

/**
 * 섹터 8종 + 도감 문구 (기획서 §7) — "이기고 싶으면 도감부터".
 * 문구는 아이 노출 편집 텍스트라 검수 대상. 확장은 트랙 ③ 공급 · 트랙 ① 승인.
 */
export const SECTOR_INFOS: readonly SectorInfo[] = [
  { id: 'semi', name: '반도체', emoji: '🔲', up: '전자기기 수요가 폭발할 때', down: '무역 갈등·수출 규제가 있을 때' },
  { id: 'ent', name: '엔터', emoji: '🎤', up: 'K팝이 세계에서 인기 있을 때', down: '중국과 사이가 나빠질 때' },
  { id: 'net', name: '인터넷·게임', emoji: '🎮', up: '사람들이 집에 머물 때', down: '플랫폼 규제 이야기가 나올 때' },
  { id: 'trv', name: '여행·항공', emoji: '✈️', up: '여행 수요가 늘고 유가가 쌀 때', down: '감염병·재해가 있을 때' },
  { id: 'bio', name: '바이오', emoji: '💊', up: '감염병이 유행할 때', down: '임상 실패 소식이 있을 때' },
  { id: 'cos', name: '화장품', emoji: '💄', up: '중국 관광객이 많이 올 때', down: '중국과 사이가 나빠질 때' },
  { id: 'car', name: '자동차', emoji: '🚗', up: '경쟁국 공장이 멈출 때', down: '무역 분쟁·관세가 있을 때' },
  { id: 'bat', name: '배터리', emoji: '🔋', up: '전기차가 잘 팔릴 때', down: '유가가 싸질 때' },
] as const;

const BY_ID = new Map(SECTOR_INFOS.map((s) => [s.id, s]));

export function sectorInfo(id: Sector): SectorInfo {
  return BY_ID.get(id)!;
}

export function sectorName(id: Sector): string {
  return BY_ID.get(id)!.name;
}
