/**
 * 룰 엔진 공개 API — web·server·sim은 여기만 import한다.
 * 판정을 다른 곳에 복제하지 말 것.
 */
export * from './types';
export { RULES } from './rules';
export { createInitialState, type SetupOptions, type SetupPlayer } from './state';
export { reduce } from './actions';
export { settle, standings, awards, totalAsset } from './settle';
export { infoPrice, isTrailing } from './info';
export { viewFor } from './view';
export { nextFloat, nextInt, nextRange, pick, shuffle } from './rng';
