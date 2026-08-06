import type { CardId } from '@engine/types.ts';

/**
 * 매치 종료 정산 (T3). 등급은 절대 금액이 아니라 "수익률"로 매긴다 —
 * docs/game-design.md 8절 "AI 시나리오 모드: 별 3개 평가(수익률 기반)" 원칙.
 *
 * 기준값은 docs/game-design.md 11절 밸런스 스냅샷(diversify 최종자산
 * p10 78만/중앙값 114만/p90 154만, 시작 100만)을 근거로 이번 루프에서 정함:
 *   3성 = 수익률 +30%↑ (시뮬 p90인 154만/100만-1=54%보다 낮게 잡아 "잘하면 닿는" 상위권 라인)
 *   2성 = 수익률 0%↑ (원금 이상 — 최소 성공)
 *   1성 = 그 외 (원금 손실 또는 패배)
 * 패배·무승부는 최대 2성으로 캡 — "이겼는데 별점 낮음"의 역설은 허용하되
 * "졌는데 3성"은 방지한다.
 */
export function computeStars(finalAssets: number, startCash: number, won: boolean): 1 | 2 | 3 {
  const returnRatio = finalAssets / startCash - 1;
  let stars: 1 | 2 | 3 = returnRatio >= 0.3 ? 3 : returnRatio >= 0 ? 2 : 1;
  if (!won && stars === 3) stars = 2;
  return stars;
}

/** 골드 = 승패 기본값 + 별점 보너스. 과금·환금 요소 없음(설계 8절). */
export function computeGoldReward(won: boolean, draw: boolean, stars: 1 | 2 | 3): number {
  const base = draw ? 30 : won ? 60 : 20;
  const starBonus = { 1: 0, 2: 15, 3: 40 }[stars];
  return base + starBonus;
}

/** 랭크 티어 — 설계 8절 "새싹 개미 → … → 전설의 투자왕" 네이밍을 5단계로 확정. */
export const RANK_TIERS: { name: string; threshold: number }[] = [
  { name: '새싹 개미', threshold: 0 },
  { name: '용돈 트레이더', threshold: 150 },
  { name: '분산 마스터', threshold: 400 },
  { name: '시장의 매', threshold: 800 },
  { name: '전설의 투자왕', threshold: 1500 },
];

export function rankForGold(totalGold: number): { name: string; index: number; nextThreshold: number | null } {
  let index = 0;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (totalGold >= RANK_TIERS[i].threshold) index = i;
  }
  const next = RANK_TIERS[index + 1] ?? null;
  return { name: RANK_TIERS[index].name, index, nextThreshold: next ? next.threshold : null };
}

const STORAGE_KEY = 'stock-card-battle:progress';

export interface StoredProgress {
  totalGold: number;
  knownCards: CardId[];
}

function isCardId(v: unknown): v is CardId {
  return typeof v === 'string';
}

export function loadProgress(): StoredProgress {
  if (typeof localStorage === 'undefined') return { totalGold: 0, knownCards: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { totalGold: 0, knownCards: [] };
    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    const totalGold = typeof parsed.totalGold === 'number' && Number.isFinite(parsed.totalGold) ? parsed.totalGold : 0;
    const knownCards = Array.isArray(parsed.knownCards) ? parsed.knownCards.filter(isCardId) : [];
    return { totalGold, knownCards };
  } catch {
    return { totalGold: 0, knownCards: [] };
  }
}

export function saveProgress(progress: StoredProgress): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

/** 이번 판 결과를 저장소에 반영하고, 새로 배운 카드 목록과 함께 최신 진행도를 돌려준다. */
export function applyMatchResult(
  goldEarned: number,
  cardsUsedThisMatch: CardId[],
): { progress: StoredProgress; newlyLearned: CardId[] } {
  const prev = loadProgress();
  const knownSet = new Set(prev.knownCards);
  const newlyLearned = cardsUsedThisMatch.filter((c) => !knownSet.has(c));
  for (const c of newlyLearned) knownSet.add(c);
  const progress: StoredProgress = {
    totalGold: prev.totalGold + goldEarned,
    knownCards: [...knownSet],
  };
  saveProgress(progress);
  return { progress, newlyLearned };
}
