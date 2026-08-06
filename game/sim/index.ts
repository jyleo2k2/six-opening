/**
 * 밸런스 시뮬레이터 — 서버·UI 없이 룰 엔진만으로 수천 판을 돌린다.
 *
 * 목적은 기획서 Q5(이벤트 13 × 섹터 7 매트릭스)를 감이 아니라 수치로 검증하는 것이다.
 * 확인할 것: 선공 유불리, 무승부율, 자산 분포, 특정 이벤트가 판을 결정해버리지 않는지.
 *
 *   npm run sim -w game
 *   npm run sim -w game -- 5000
 */
import { getCard } from '../data/index';
import {
  RULES,
  createInitialState,
  currencyOf,
  currentPlayer,
  nextFloat,
  nextInt,
  priceOf,
  reduce,
  settle,
  type Action,
  type GameState,
  type RngState,
} from '../src/index';

function apply(state: GameState, action: Action): GameState {
  const r = reduce(state, action);
  return r.ok ? r.value : state;
}

/** 무작위 봇 — 전략이 아니라 '룰이 굴러가는지'와 분포를 보기 위한 기준선이다 */
function botTurn(state: GameState, rng: RngState): GameState {
  let s = state;

  // 1) 스킬카드가 있으면 절반 확률로 발동
  const skill = currentPlayer(s).hand.find((id) => getCard(id).kind === 'skill');
  if (skill && nextFloat(rng) < 0.5) {
    s = apply(s, { type: 'playSkill', cardId: skill });
  }

  // 2) 보유 중이면 30% 확률로 전량 매도
  const field = currentPlayer(s).field;
  if (field.length > 0 && nextFloat(rng) < 0.3) {
    const target = field[nextInt(rng, field.length)];
    s = apply(s, { type: 'sell', cardId: target.cardId, qty: target.qty });
  }

  // 3) 패의 종목카드 하나를 살 수 있는 만큼 매수 (최대 3주)
  const stocks = currentPlayer(s).hand.filter((id) => getCard(id).kind === 'stock');
  if (stocks.length > 0) {
    const cardId = stocks[nextInt(rng, stocks.length)];
    const cash = currentPlayer(s).cash[currencyOf(cardId)];
    const price = priceOf(cardId, s);
    const owned = currentPlayer(s).hand.filter((id) => id === cardId).length;
    const qty = Math.min(3, owned, Math.floor(cash / price));
    if (qty > 0) s = apply(s, { type: 'buy', cardId, qty });
  }

  return apply(s, { type: 'endTurn' });
}

function playOne(seed: number) {
  const rng: RngState = { seed };
  let s = createInitialState({ seed });
  while (!s.finished) s = botTurn(s, rng);
  return { ...settle(s), eventLog: s.eventLog };
}

function main() {
  const games = Number(process.argv[2] ?? 2000);
  const totals: number[] = [];
  const wins = [0, 0];
  let draws = 0;
  const eventCount = new Map<string, number>();

  for (let i = 0; i < games; i++) {
    const { totals: t, winner, eventLog } = playOne(i + 1);
    totals.push(t[0], t[1]);
    if (winner === null) draws++;
    else wins[winner]++;
    for (const id of eventLog) eventCount.set(id, (eventCount.get(id) ?? 0) + 1);
  }

  const start = RULES.START_KRW + RULES.START_USD * RULES.FX_RATE;
  const sorted = [...totals].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(sorted.length * p)];
  const pct = (a: number) => `${((a / games) * 100).toFixed(1)}%`;

  console.log(`\n[밸런스 시뮬레이션] ${games}판 · 무작위 봇 대전`);
  console.log(`  시작 총자산 ${start.toLocaleString()}원\n`);
  console.log(`  선공 승률   ${pct(wins[0])}`);
  console.log(`  후공 승률   ${pct(wins[1])}`);
  console.log(`  무승부      ${pct(draws)}\n`);
  console.log(`  최종 총자산  p10 ${q(0.1).toLocaleString()}원`);
  console.log(`              p50 ${q(0.5).toLocaleString()}원`);
  console.log(`              p90 ${q(0.9).toLocaleString()}원\n`);

  console.log('  경제환경 등장 빈도 (판당 5회 발동)');
  for (const [id, n] of [...eventCount].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${id.padEnd(20)} ${pct(n)}`);
  }
  console.log();
}

main();
