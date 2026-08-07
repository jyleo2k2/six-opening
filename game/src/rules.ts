/**
 * 룰 상수 — 밸런스 조정은 여기부터. 수치 변경 시 sim 전후표 필수 (game/AGENTS.md).
 * 근거: docs/기획서.md v2 (영웅키움)
 */
export const RULES = {
  minPlayers: 2,
  maxPlayers: 8,
  seedCash: 1_000_000,
  /** 퀵 3라운드 / 정규 5라운드 (기획서 §1) */
  turnsQuick: 3,
  turnsRegular: 5,
  /** 퀵 매치는 봇을 채워 최소 이 인원으로 시작한다 */
  quickMatchSeats: 4,

  /** 페이즈 시간(초) — 서버 타이머가 권위. 초안 【미정: 플레이테스트】 */
  prepFirstSeconds: 60,
  prepSeconds: 45,
  chatSeconds: 25,
  eventSeconds: 13,
  rankSeconds: 14,

  /** 매매 — 금액 기반, 만원 단위 슬라이더 (기획서 §3.2) */
  minTradeAmount: 10_000,
  tradeStep: 10_000,
  /** 잔여 평가액이 이보다 작으면 보유 정리 */
  dustValue: 100,

  /**
   * 정보소 (기획서 §3.3) — 게임당 2회, 꼴찌 50% 할인.
   * 프로토 초안 1/5/20만은 sim에서 확실한 손해(보고서 완벽 활용해도 기대이익 < 가격)라
   * 1/4/10만으로 인하 — 정보가 살 가치 있어야 코어 루프가 산다. sim 전후표는 PR 참조.
   */
  infoUsesPerGame: 2,
  infoPrices: [10_000, 30_000, 80_000] as const,
  /** 해설 탭 적중률 — 찌라시/리포트/보고서 */
  analysisAccuracy: [0.5, 0.75, 0.95] as const,
  /** 정찰 🥉 익명 소문이 진실일 확률 */
  scoutRumorTruth: 0.6,
  catchupDiscount: 0.5,

  /** 뉴스 — 진짜 전조는 라운드마다 딱 2명 (기획서 §3.1) */
  clueHolders: 2,

  /** 사건 — 등락 = imp × 밴드, 무영향 섹터 ±노이즈 (기획서 §5) */
  bandMin: 0.7,
  bandMax: 1.3,
  noisePct: 0.02,
  priceFloor: 100,
} as const;
