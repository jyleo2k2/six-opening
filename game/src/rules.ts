/**
 * 룰 상수 — 밸런스 조정은 여기부터.
 * 수치를 바꾸면 sim 전후표를 PR에 붙인다 (game/AGENTS.md §밸런스).
 */
export const RULES = {
  minPlayers: 2,
  maxPlayers: 8,
  /** 시드 자금(원) — 기획서 §2.1 */
  seedCash: 1_000_000,
  /** 총 턴 수. 1턴 = 1년 — 기획서 §2.2 */
  turns: 5,
  /** 페이즈 시간(초). 서버 타이머가 권위, 클라는 표시만 — 초안, 플레이테스트로 조정 */
  prepSeconds: 90,
  chatSeconds: 60,
  eventSeconds: 20,
  /** 채팅 한 줄 최대 길이 — 기획서 §4 */
  chatMaxLength: 200,
  /** 준비턴 무료 뉴스가 이번 턴 이벤트의 단서일 확률 (나머지는 시대 배경 뉴스) */
  clueChance: 0.5,
  /** 가격 바닥(원) */
  priceFloor: 100,
  /**
   * 정보소 3티어 — 기획서 §3.3. 가격·적중률은 시뮬 튜닝 대상.
   * 5/15/30만 초안은 sim에서 정보 추종 봇이 압도적 꼴찌(평균 -23%)라 인하했다 —
   * 정보를 사는 플레이가 이겨야 코어 루프가 산다.
   */
  infoTiers: [
    { tier: 1, label: '찌라시', price: 30_000, accuracy: 0.4 },
    { tier: 2, label: '소식통', price: 80_000, accuracy: 0.7 },
    { tier: 3, label: '고급 정보', price: 150_000, accuracy: 0.95 },
  ],
} as const;

export type InfoTierDef = (typeof RULES.infoTiers)[number];

export function infoTier(tier: 1 | 2 | 3): InfoTierDef {
  const def = RULES.infoTiers.find((t) => t.tier === tier);
  if (!def) throw new Error(`없는 정보 티어: ${tier}`);
  return def;
}
