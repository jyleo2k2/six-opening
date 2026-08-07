import type { RngState } from './types';

/**
 * 결정적 난수 (mulberry32).
 * 시드를 상태에 넣어두면 같은 시드 = 같은 판(이벤트 추첨·뉴스 배정·정보 판정·등락폭 전부)이라
 * 서버가 판을 재현할 수 있고, 시뮬레이터 결과도 재현된다.
 * Math.random()을 룰 엔진 안에서 직접 쓰지 말 것.
 */
export function nextFloat(rng: RngState): number {
  rng.seed = (rng.seed + 0x6d2b79f5) | 0;
  let t = rng.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** [0, max) 정수 */
export function nextInt(rng: RngState, max: number): number {
  return Math.floor(nextFloat(rng) * max);
}

/** [min, max) 실수 */
export function nextRange(rng: RngState, min: number, max: number): number {
  return min + nextFloat(rng) * (max - min);
}

export function pick<T>(rng: RngState, arr: readonly T[]): T {
  return arr[nextInt(rng, arr.length)];
}

/** Fisher–Yates 사본 셔플 — 원본을 건드리지 않는다 */
export function shuffle<T>(rng: RngState, arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
