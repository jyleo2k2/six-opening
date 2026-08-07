import { EVENTS, getCompany, getEvent, sectorName, SECTOR_INFOS } from '../data';
import { nextFloat, nextRange, pick } from './rng';
import { RULES } from './rules';
import { totalAsset } from './settle';
import type { GameState, InfoTab, PlayerState, Sector } from './types';

/**
 * 정보소 (기획서 §3.3) — 게임당 2회, 해설/정찰 2탭, 꼴찌 50% 할인.
 * "싼 정보는 대개 틀리고, 비싼 정보도 100%는 아닙니다."
 * 결과 텍스트는 구매자 전용(intel) — viewFor가 타인 것을 걸러낸다.
 */

/** 꼴찌(총자산 최하위 단독 또는 공동) 여부 — 할인 판정 */
export function isTrailing(state: GameState, playerId: string): boolean {
  const totals = state.players.map((p) => ({ id: p.id, t: totalAsset(state, p) }));
  const min = Math.min(...totals.map((x) => x.t));
  const me = totals.find((x) => x.id === playerId)!;
  return me.t === min && totals.some((x) => x.t > min);
}

export function infoPrice(state: GameState, playerId: string, tier: 1 | 2 | 3): number {
  const base = RULES.infoPrices[tier - 1];
  return isTrailing(state, playerId) ? Math.round(base * RULES.catchupDiscount) : base;
}

export interface AnalysisIntel {
  text: string;
  hint: { sector: Sector; up: boolean };
}

/**
 * 📊 해설 — 이번 사건이 어디에 영향 주는지. 티어가 낮을수록 미끼일 확률이 높다.
 * hint는 텍스트의 핵심 요지(구매자 전용) — 미끼도 같은 형태라 진위 구별 불가.
 */
export function analysisIntel(state: GameState, tier: 1 | 2 | 3): AnalysisIntel {
  const event = getEvent(state.eventQueue[state.turn - 1]);
  const entries = Object.entries(event.imp).sort(
    (a, b) => Math.abs(b[1]) - Math.abs(a[1]),
  ) as [Sector, number][];
  const accuracy = RULES.analysisAccuracy[tier - 1];
  const hit = nextFloat(state.rng) < accuracy;

  if (tier === 3) {
    if (hit) {
      const body = entries
        .map(([sec, imp]) => {
          const approx = Math.round(imp * 100 + nextRange(state.rng, -1, 1));
          return `${sectorName(sec)} ${approx > 0 ? '+' : ''}${approx}% 안팎`;
        })
        .join(' · ');
      return { text: `거의 정확한 보고서 — ${body}`, hint: { sector: entries[0][0], up: entries[0][1] > 0 } };
    }
    // 5% 미끼 — 다른 사건의 보고서가 잘못 배달된다
    const decoy = pick(state.rng, EVENTSNOT(state));
    const dEntries = Object.entries(decoy.imp).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])) as [Sector, number][];
    const body = dEntries
      .map(([sec, imp]) => `${sectorName(sec)} ${imp > 0 ? '+' : ''}${Math.round(imp * 100)}% 안팎`)
      .join(' · ');
    return { text: `거의 정확한 보고서 — ${body}`, hint: { sector: dEntries[0][0], up: dEntries[0][1] > 0 } };
  }

  if (tier === 2) {
    const [sec, imp] = hit
      ? entries[0]
      : ([pick(state.rng, SECTOR_INFOS).id, nextFloat(state.rng) < 0.5 ? 1 : -1] as [Sector, number]);
    const up = imp > 0;
    return {
      text: `리포트 — 이번 판의 핵심은 [${sectorName(sec)}] 섹터. ${up ? '상승' : '하락'} 압력이 큽니다.`,
      hint: { sector: sec, up },
    };
  }

  const [sec, imp] = hit
    ? pick(state.rng, entries)
    : ([pick(state.rng, SECTOR_INFOS).id, nextFloat(state.rng) < 0.5 ? 1 : -1] as [Sector, number]);
  const up = imp > 0;
  return {
    text: `찌라시 — [${sectorName(sec)}]가 ${up ? '뜬다' : '무너진다'}는 소문이 돕니다.`,
    hint: { sector: sec, up },
  };
}

/** 이번 턴 사건이 아닌 사건들 (미끼 풀) */
function EVENTSNOT(state: GameState) {
  const currentId = state.eventQueue[state.turn - 1];
  const revealed = new Set(state.eventLog.map((e) => e.eventId));
  const pool = EVENTS.filter((e) => e.id !== currentId && !revealed.has(e.id));
  return pool.length > 0 ? pool : EVENTS.filter((e) => e.id !== currentId);
}

function holdingsSummary(player: PlayerState): string {
  if (player.holdings.length === 0) return '전액 현금';
  return player.holdings.map((h) => getCompany(h.companyId).name).join(', ');
}

/** 🔭 정찰 — 남의 패 훔쳐보기. 익명 소문(🥉)은 거짓일 수 있다 */
export function scoutText(state: GameState, buyerId: string, tier: 1 | 2 | 3): string {
  const others = state.players.filter((p) => p.id !== buyerId);
  if (tier === 3) {
    return `전원 보유 현황 — ${others.map((p) => `${p.nickname}: ${holdingsSummary(p)}`).join(' / ')}`;
  }
  const target = pick(state.rng, others);
  if (tier === 2) {
    return `${target.nickname}의 실제 보유 — ${holdingsSummary(target)}`;
  }
  const truthful = nextFloat(state.rng) < RULES.scoutRumorTruth;
  const sector =
    truthful && target.holdings.length > 0
      ? sectorName(getCompany(target.holdings[0].companyId).sector)
      : pick(state.rng, SECTOR_INFOS).name;
  return `익명 소문 — ${target.nickname}이(가) ${sector} 쪽을 만졌다더라…`;
}

export function buildIntel(
  state: GameState,
  buyerId: string,
  tab: InfoTab,
  tier: 1 | 2 | 3,
): { text: string; hint?: { sector: Sector; up: boolean } } {
  if (tab === 'analysis') return analysisIntel(state, tier);
  return { text: scoutText(state, buyerId, tier) };
}
