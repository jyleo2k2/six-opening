import { EVENTS, getEvent } from '../data';
import { nextFloat, pick } from './rng';
import type { InfoTierDef } from './rules';
import type { EffectRange, GameEvent, GameState, InfoForecast, Sector } from './types';

/**
 * 정보소 예보 생성 (기획서 §3.3).
 *
 * 적중 → 이번 턴 이벤트 기준. 빗나감 → 아직 안 터진 다른 사건 기준(미끼).
 * payload 형태가 동일해서 수신자는 진위를 구별할 수 없다.
 */
export function rollForecast(state: GameState, tier: InfoTierDef): InfoForecast {
  const currentId = state.eventQueue[state.turn - 1];
  const hit = nextFloat(state.rng) < tier.accuracy;

  let eventId = currentId;
  if (!hit) {
    const revealed = new Set(state.eventLog.map((e) => e.eventId));
    const decoys = EVENTS.filter((e) => e.id !== currentId && !revealed.has(e.id));
    // 풀 13 - 현재 1 - 이미 터진 것(최대 4) ≥ 8 — 미끼는 항상 있다
    eventId = pick(state.rng, decoys).id;
  }

  const event = getEvent(eventId);
  return {
    turn: state.turn,
    tier: tier.tier,
    eventId,
    eventName: event.name,
    up: topSector(event, 1),
    down: topSector(event, -1),
  };
}

/** 해당 방향으로 가장 크게 움직이는 섹터. 그 방향 효과가 없으면 null */
function topSector(event: GameEvent, dir: 1 | -1): Sector | null {
  let best: Sector | null = null;
  let bestMagnitude = 0;
  for (const [sector, range] of Object.entries(event.effects) as [Sector, EffectRange][]) {
    const [min, max] = range;
    const magnitude = dir === 1 ? max : -min;
    if ((dir === 1 ? max > 0 : min < 0) && magnitude > bestMagnitude) {
      bestMagnitude = magnitude;
      best = sector;
    }
  }
  return best;
}
