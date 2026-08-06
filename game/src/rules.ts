/**
 * 룰 상수 — 기획서 §3·§5·§6·§7에서 온 수치. 밸런스 조정은 여기부터 만진다.
 */
export const RULES = {
  /** 시작 자금 (기획서 §3) */
  START_KRW: 1_000_000,
  START_USD: 1_000,

  /** 기준환율 원/$ — 기획서 §8은 고정. TODO(Q9): 경제환경 연동 변동제 검토 */
  FX_RATE: 1_450,

  /** 총 10턴 = 5라운드 (기획서 §7.1) */
  TOTAL_TURNS: 10,
  ROUNDS: 5,

  /** 덱 30장, 동일 종류 최대 5장 (기획서 §5) */
  DECK_SIZE: 30,
  MAX_COPIES: 5,
  /** TODO(Q3): 덱에 스킬/회피 포함 시 종목카드 최소 장수 */
  MIN_STOCK_IN_DECK: 15,

  /** 패는 항상 5'종류' — 장수 기준이 아니다 (기획서 §5) */
  HAND_KINDS: 5,

  /** 종목카드 존 3개 = 최대 3종류 보유 (기획서 §6) */
  FIELD_SLOTS: 3,

  /** TODO(Q1): 스킬카드 턴당 발동 제한. 추천안 = 1 */
  SKILL_PER_TURN: 1,
  /** TODO(Q7): 패↔덱 종류 교체 턴당 횟수. 추천안 = 1 */
  SWAP_PER_TURN: 1,
} as const;
