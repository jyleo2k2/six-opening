import { GreedyBot, SharkBot, TurtleBot } from './bots.ts';
import type { Bot } from './types.ts';

export type DifficultyTier = 'easy' | 'normal' | 'hard';

export interface DifficultyDef {
  tier: DifficultyTier;
  label: string;
  bot: Bot;
}

/**
 * T5 AI 난이도 3티어. 봇 7종 중 기준 봇(greedy) 대비 실측 승률로 확정.
 * 실측(기본 덱, 2000판, 자리 교대): turtle 15.0% / (미러전 기준 50%) / shark 67.9% (greedy 상대 승률).
 * 즉 greedy가 turtle을 85%로 압도 -> normal이 easy를 크게 이겨야 함(쉬움) 조건 충족.
 * shark가 greedy를 67.9%로 이김 -> normal이 hard에게 진다(어려움) 조건 충족.
 * 검증: game/src/simulate.ts "AI 난이도 티어" 섹션, npm run sim.
 */
export const DIFFICULTY_TIERS: DifficultyDef[] = [
  { tier: 'easy', label: '쉬움', bot: TurtleBot },
  { tier: 'normal', label: '보통', bot: GreedyBot },
  { tier: 'hard', label: '어려움', bot: SharkBot },
];

export function botForDifficulty(tier: DifficultyTier): Bot {
  return DIFFICULTY_TIERS.find((d) => d.tier === tier)!.bot;
}
