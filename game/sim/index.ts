/**
 * 밸런스 시뮬레이터 — 봇 4전략 셀프플레이 (영웅키움 v2).
 *
 *   npm run sim -w game            # 1000판 (정규 5R)
 *   npm run sim -w game -- 3000    # 판수 지정
 *
 * 봇은 치팅하지 않는다: 의사결정은 viewFor()를 거친 자기 뷰로만 한다.
 * (지표 집계만 전체 상태를 읽는다.)
 *
 * 전략:
 *   news    — 내 뉴스 섹터를 믿고 매수 (진짜인지 모른 채 — "절반만 진짜" 체감 지표)
 *   momentum— 직전 사건 상승 섹터 추격
 *   cash    — 관망
 *   mixed   — 뉴스 + 정보소(보고서) + 익절
 */
import { COMPANIES, getCompany } from '../data';
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
  type Sector,
} from '../src/index';

const STRATEGIES = ['news', 'momentum', 'cash', 'mixed'] as const;
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

function buySector(view: GameView, sector: Sector, budget: number, playerId: string): Action[] {
  const targets = COMPANIES.filter((c) => c.sector === sector);
  const per = Math.floor(budget / targets.length / RULES.tradeStep) * RULES.tradeStep;
  if (per < RULES.minTradeAmount) return [];
  return targets.map((c) => ({ type: 'buy' as const, playerId, companyId: c.id, amount: per }));
}

function lastUpSector(view: GameView): Sector | null {
  const last = view.eventLog.at(-1);
  if (!last) return null;
  const bySector = new Map<Sector, number>();
  for (const [companyId, change] of Object.entries(last.changes)) {
    const sector = getCompany(companyId).sector;
    bySector.set(sector, (bySector.get(sector) ?? 0) + change.pct);
  }
  return [...bySector.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function planPrep(strategy: Strategy, view: GameView, rng: RngState): Action[] {
  const me = view.me;
  const actions: Action[] = [];

  switch (strategy) {
    case 'cash':
      return [];

    case 'news': {
      const news = me.news.find((n) => n.turn === view.turn);
      if (!news) return [];
      return buySector(view, news.sector, me.cash * 0.7, me.id);
    }

    case 'momentum': {
      const sector = lastUpSector(view) ?? pick(rng, COMPANIES).sector;
      return buySector(view, sector, me.cash * 0.6, me.id);
    }

    case 'mixed': {
      // 보고서(95%) 힌트를 믿고 갈아탄다 — buyInfo는 playGame에서 먼저 적용된다
      const hint = me.intel.find((iv) => iv.turn === view.turn && iv.hint)?.hint;
      if (hint) {
        let cash = me.cash;
        for (const holding of me.holdings) {
          actions.push({ type: 'sell', playerId: me.id, companyId: holding.companyId, amount: 999_999_999 });
          cash += holding.qty * view.prices[holding.companyId];
        }
        if (hint.up) actions.push(...buySector(view, hint.sector, cash * 0.85, me.id));
        return actions;
      }
      const news = me.news.find((n) => n.turn === view.turn);
      const sector = news && nextFloat(rng) < 0.7 ? news.sector : pick(rng, COMPANIES).sector;
      actions.push(...buySector(view, sector, me.cash * 0.5, me.id));
      return actions;
    }
  }
}

function playGame(seed: number): GameState {
  let state = createInitialState({
    seed,
    players: STRATEGIES.map((s, i) => ({ id: `p-${s}`, nickname: s, color: '#fff', ch: String(i) })),
    turns: RULES.turnsRegular,
  });
  const botRng: RngState = { seed: (seed ^ 0x9e3779b9) | 0 };

  for (let turn = 1; turn <= state.turns; turn++) {
    for (const strategy of STRATEGIES) {
      const playerId = `p-${strategy}`;
      // mixed는 정보를 먼저 사서(적용돼야 힌트가 생긴다) 그걸 보고 매매한다
      if (strategy === 'mixed' && turn <= 2) {
        state = apply(state, { type: 'buyInfo', playerId, tab: 'analysis', tier: 3 });
      }
      for (const action of planPrep(strategy, viewFor(state, playerId), botRng)) {
        state = apply(state, action);
      }
    }
    state = advance(state); // 회의
    // 회의: momentum 봇이 매턴 허풍 거짓말 — 진실의 눈 지표 확인용
    state = apply(state, {
      type: 'chat',
      playerId: 'p-momentum',
      subject: '나는',
      sector: pick(botRng, ['bio', 'cos', 'bat'] as const),
      verb: '샀어',
    });
    state = advance(state); // 사건
    state = advance(state); // 순위
    state = advance(state); // 다음 | 종료
  }
  return state;
}

function percentile(sorted: number[], q: number): number {
  return sorted[Math.floor(q * (sorted.length - 1))];
}

function fmt(n: number): string {
  return n.toLocaleString('ko-KR').padStart(10);
}

function main() {
  const games = Number(process.argv[2] ?? 1000);
  const assets = new Map<Strategy, number[]>(STRATEGIES.map((s) => [s, []]));
  const wins = new Map<Strategy, number>(STRATEGIES.map((s) => [s, 0]));
  const eventCounts = new Map<string, number>();
  let newsRealFollowGain = 0;
  let newsRealFollowN = 0;
  let mdd = 0;

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
    const newsBot = state.players.find((p) => p.id === 'p-news')!;
    const gotReal = newsBot.news.filter((n) => n.real).length;
    newsRealFollowGain += settle(state).standings.find((r) => r.playerId === 'p-news')!.totalAsset;
    newsRealFollowN += gotReal;
    mdd += Math.max(...state.players.map((p) => p.maxDrawdown));
  }

  console.log(`\n══ 영웅키움 sim — ${games}판 · 정규 ${RULES.turnsRegular}R · 시드 ${RULES.seedCash.toLocaleString()}원 ══\n`);
  console.log('전략        승률     평균자산     p10        p50        p90');
  for (const strategy of STRATEGIES) {
    const list = assets.get(strategy)!.slice().sort((a, b) => a - b);
    const mean = Math.round(list.reduce((a, b) => a + b, 0) / list.length);
    const winRate = ((wins.get(strategy)! / games) * 100).toFixed(1).padStart(5);
    console.log(
      `${strategy.padEnd(9)} ${winRate}%  ${fmt(mean)}  ${fmt(percentile(list, 0.1))}  ${fmt(percentile(list, 0.5))}  ${fmt(percentile(list, 0.9))}`,
    );
  }
  console.log(`\n뉴스 봇이 받은 진짜 전조: 평균 ${(newsRealFollowN / games).toFixed(2)}회/판 (기대 ${((RULES.clueHolders / 4) * RULES.turnsRegular).toFixed(2)})`);
  console.log(`판당 최대 MDD 평균: ${((mdd / games) * 100).toFixed(1)}%`);

  console.log('\n사건 등장 빈도 (기대 = 판수 × 5/12):');
  const expected = (games * RULES.turnsRegular) / 12;
  for (const [eventId, count] of [...eventCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${eventId.padEnd(8)} ${String(count).padStart(6)}  (기대 ${Math.round(expected)})`);
  }
}

main();
