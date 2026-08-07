/**
 * 밸런스 시뮬레이터 — 봇 4전략 셀프플레이.
 *
 *   npm run sim -w game            # 1000판
 *   npm run sim -w game -- 3000    # 판수 지정
 *
 * 봇은 치팅하지 않는다: 의사결정은 viewFor()를 거친 자기 뷰로만 한다.
 * (지표 집계만 전체 상태를 읽는다 — 정보소 적중률 실측 등.)
 *
 * 보는 지표:
 *   - 전략별 승률·최종자산 분포 → 정보를 사는 게 이득인가(정보 ROI), 몰빵 vs 분산
 *   - 이벤트 등장 빈도 → 추첨 편향 없음 확인 (기대 5/13 ≈ 38.5%)
 */
import { COMPANIES } from '../data';
import {
  createInitialState,
  nextFloat,
  nextInt,
  pick,
  reduce,
  settle,
  viewFor,
  RULES,
  type Action,
  type GameState,
  type GameView,
  type RngState,
} from '../src/index';

const STRATEGIES = ['random', 'holder', 'info3', 'cash'] as const;
type Strategy = (typeof STRATEGIES)[number];

function apply(state: GameState, action: Action): GameState {
  const result = reduce(state, action);
  return result.ok ? result.value : state;
}

function advance(state: GameState): GameState {
  const result = reduce(state, { type: 'advancePhase' });
  if (!result.ok) throw new Error(`advancePhase 실패: ${result.reason}`);
  return result.value;
}

/** 준비 페이즈 매매 계획 — 뷰 기준으로 잔고를 따라가며 세운다 */
function planTrades(strategy: Strategy, view: GameView, rng: RngState): Action[] {
  const me = view.me;
  const actions: Action[] = [];
  let cash = me.cash;

  switch (strategy) {
    case 'cash':
      return [];

    case 'holder': {
      // 1턴에 전 종목 균등 분산 후 방치
      if (view.turn !== 1) return [];
      const budget = Math.floor(cash / COMPANIES.length);
      for (const company of COMPANIES) {
        const qty = Math.floor(budget / view.prices[company.id]);
        if (qty >= 1) actions.push({ type: 'buy', playerId: me.id, companyId: company.id, qty });
      }
      return actions;
    }

    case 'random': {
      const rounds = 1 + nextInt(rng, 3);
      const holdings = me.holdings.map((h) => ({ ...h }));
      for (let i = 0; i < rounds; i++) {
        if (nextFloat(rng) < 0.6 || holdings.length === 0) {
          const company = pick(rng, COMPANIES);
          const price = view.prices[company.id];
          const maxQty = Math.min(10, Math.floor(cash / price));
          if (maxQty < 1) continue;
          const qty = 1 + nextInt(rng, maxQty);
          actions.push({ type: 'buy', playerId: me.id, companyId: company.id, qty });
          cash -= qty * price;
        } else {
          const holding = pick(rng, holdings);
          const qty = 1 + nextInt(rng, holding.qty);
          actions.push({ type: 'sell', playerId: me.id, companyId: holding.companyId, qty });
          cash += qty * view.prices[holding.companyId];
          holding.qty -= qty;
          if (holding.qty === 0) holdings.splice(holdings.indexOf(holding), 1);
        }
      }
      return actions;
    }

    case 'info3': {
      // 이번 턴 예보를 믿고 갈아탄다 (예보가 없으면 관망)
      const forecast = me.forecasts.find((f) => f.turn === view.turn);
      if (!forecast) return [];
      const targets = forecast.up
        ? COMPANIES.filter((c) => c.sector === forecast.up)
        : COMPANIES.filter((c) => c.sector !== forecast.down);
      const targetIds = new Set(targets.map((c) => c.id));

      for (const holding of me.holdings) {
        if (targetIds.has(holding.companyId)) continue;
        actions.push({ type: 'sell', playerId: me.id, companyId: holding.companyId, qty: holding.qty });
        cash += holding.qty * view.prices[holding.companyId];
      }
      const budget = Math.floor(cash / targets.length);
      for (const company of targets) {
        const qty = Math.floor(budget / view.prices[company.id]);
        if (qty >= 1) actions.push({ type: 'buy', playerId: me.id, companyId: company.id, qty });
      }
      return actions;
    }
  }
}

function playGame(seed: number): GameState {
  let state = createInitialState({
    seed,
    players: STRATEGIES.map((s) => ({ id: `p-${s}`, nickname: s })),
  });
  const botRng: RngState = { seed: (seed ^ 0x9e3779b9) | 0 };

  for (let turn = 1; turn <= RULES.turns; turn++) {
    for (const strategy of STRATEGIES) {
      const playerId = `p-${strategy}`;
      // 정보 구매 먼저 — 예보를 받아야 매매 계획이 선다
      if (strategy === 'info3') {
        state = apply(state, { type: 'buyInfo', playerId, tier: 3 });
      }
      const view = viewFor(state, playerId);
      for (const action of planTrades(strategy, view, botRng)) {
        state = apply(state, action);
      }
    }
    state = advance(state); // 준비 → 채팅 (봇은 침묵)
    state = advance(state); // 채팅 → 이벤트 (사건 적용)
    state = advance(state); // 이벤트 → 다음 턴 준비 | 종료
  }
  return state;
}

function percentile(sorted: number[], q: number): number {
  return sorted[Math.floor(q * (sorted.length - 1))];
}

function main() {
  const games = Number(process.argv[2] ?? 1000);
  const assets = new Map<Strategy, number[]>(STRATEGIES.map((s) => [s, []]));
  const wins = new Map<Strategy, number>(STRATEGIES.map((s) => [s, 0]));
  const eventCounts = new Map<string, number>();
  let forecastHits = 0;
  let forecastTotal = 0;

  for (let i = 0; i < games; i++) {
    const state = playGame(1000 + i);
    const { standings } = settle(state);

    for (const strategy of STRATEGIES) {
      const row = standings.find((r) => r.playerId === `p-${strategy}`)!;
      assets.get(strategy)!.push(row.totalAsset);
      if (row.rank === 1) wins.set(strategy, wins.get(strategy)! + 1);
    }
    for (const applied of state.eventLog) {
      eventCounts.set(applied.eventId, (eventCounts.get(applied.eventId) ?? 0) + 1);
    }
    const infoBot = state.players.find((p) => p.id === 'p-info3')!;
    for (const forecast of infoBot.forecasts) {
      forecastTotal += 1;
      if (forecast.eventId === state.eventQueue[forecast.turn - 1]) forecastHits += 1;
    }
  }

  console.log(`\n══ 히스토리 투자 시뮬 — ${games}판 · ${STRATEGIES.length}봇 · 시드자금 ${RULES.seedCash.toLocaleString()}원 ══\n`);
  console.log('전략      승률     평균자산     p10        p50        p90');
  for (const strategy of STRATEGIES) {
    const list = assets.get(strategy)!.slice().sort((a, b) => a - b);
    const mean = Math.round(list.reduce((a, b) => a + b, 0) / list.length);
    const winRate = ((wins.get(strategy)! / games) * 100).toFixed(1).padStart(5);
    console.log(
      `${strategy.padEnd(8)} ${winRate}%  ${fmt(mean)}  ${fmt(percentile(list, 0.1))}  ${fmt(percentile(list, 0.5))}  ${fmt(percentile(list, 0.9))}`,
    );
  }

  const tier3 = RULES.infoTiers[2];
  console.log(
    `\n정보소(고급 정보) 적중률 실측 ${((forecastHits / forecastTotal) * 100).toFixed(1)}% (설정 ${tier3.accuracy * 100}%)`,
  );

  console.log('\n이벤트 등장 빈도 (기대 = 판수 × 5/13):');
  const expected = (games * RULES.turns) / 13;
  const rows = [...eventCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [eventId, count] of rows) {
    console.log(`  ${eventId.padEnd(18)} ${String(count).padStart(6)}  (기대 ${Math.round(expected)})`);
  }
}

function fmt(n: number): string {
  return n.toLocaleString('ko-KR').padStart(10);
}

main();
