/**
 * 룰 엔진 공개 API — 룰의 유일한 SSOT.
 * web(클라)·game/server(권위 판정)·game/sim(밸런스)이 전부 여기만 import한다.
 *
 * I/O 의존을 넣지 말 것. 순수 함수로 유지해야 서버·UI 없이 시뮬레이션할 수 있다.
 */
export * from './types';
export { RULES } from './rules';
export { nextFloat, nextInt, pick } from './rng';
export { currentPrice, priceOf, currencyOf, toKRW } from './pricing';
export { handKinds, refillHand } from './hand';
export { expandDomain, applyEvent } from './domain';
export { totalAssetKRW, settle, type Settlement } from './settle';
export { validateDeck } from './deck';
export { createInitialState, currentPlayer, opponent, type NewGameOptions } from './state';
export * from './actions/index';
