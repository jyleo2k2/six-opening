import {
  DiversifyBot,
  GreedyBot,
  IllegalBot,
  SharkBot,
  SignalBot,
  TurtleBot,
  YoloBot,
} from './bots.ts';
import { CARDS, DEFAULT_DECK } from './cards.ts';
import { DIFFICULTY_TIERS } from './difficulty.ts';
import { runGame } from './engine.ts';
import type { Bot, CardId } from './types.ts';

// 어그로 유저가 빌딩할 법한 킬 덱 (쇼크·공매도 몰빵)
const AGGRO_DECK: CardId[] = [
  'semiShock', 'semiShock', 'semiShock',
  'platReg', 'platReg', 'platReg',
  'short', 'short', 'short',
  'buy', 'buy', 'buy',
  'sell', 'sell',
  'watch', 'watch', 'watch',
  'stoploss', 'rateHike', 'gameHit', 'chickenMukbang', 'diversify',
];

const GAMES = Number(process.argv[2] ?? 1000);

interface MatchupResult {
  aWins: number;
  bWins: number;
  draws: number;
  rounds: number;
  reasons: Record<string, number>;
  seatFirstWins: number; // 선공(그 판의 플레이어 0) 승수
  decided: number;
  aAssets: number[]; // a 봇의 최종 자산 표본
}

function quantile(sorted: number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

/** A vs B — 매 판 자리를 번갈아 A가 선공/후공을 오가게 함. */
function matchup(
  a: Bot,
  b: Bot,
  games: number,
  baseSeed: number,
  decks: [CardId[], CardId[]] = [DEFAULT_DECK, DEFAULT_DECK],
): MatchupResult {
  const r: MatchupResult = {
    aWins: 0,
    bWins: 0,
    draws: 0,
    rounds: 0,
    reasons: { bankrupt: 0, target: 0, timeout: 0 },
    seatFirstWins: 0,
    decided: 0,
    aAssets: [],
  };
  for (let i = 0; i < games; i++) {
    const aFirst = i % 2 === 0;
    const bots: [Bot, Bot] = aFirst ? [a, b] : [b, a];
    const gameDecks: [CardId[], CardId[]] = aFirst ? decks : [decks[1], decks[0]];
    const res = runGame(bots, baseSeed + i, {}, gameDecks);
    r.aAssets.push(res.finalAssets[aFirst ? 0 : 1]);
    r.rounds += res.rounds;
    r.reasons[res.reason]++;
    if (res.winner === 'draw') {
      r.draws++;
    } else {
      r.decided++;
      if (res.winner === 0) r.seatFirstWins++;
      const aWon = (res.winner === 0) === aFirst;
      if (aWon) r.aWins++;
      else r.bWins++;
    }
  }
  return r;
}

function pct(n: number, d: number): string {
  return d === 0 ? '-' : ((100 * n) / d).toFixed(1) + '%';
}

function reportMatchup(
  label: string,
  a: Bot,
  b: Bot,
  seed: number,
  decks?: [CardId[], CardId[]],
): MatchupResult {
  const r = matchup(a, b, GAMES, seed, decks);
  console.log(`\n## ${label} (${GAMES}판)`);
  console.log(
    `  ${a.name} 승률: ${pct(r.aWins, r.decided)} | ${b.name}: ${pct(r.bWins, r.decided)} | 무승부 ${r.draws}판`,
  );
  console.log(
    `  평균 라운드: ${(r.rounds / GAMES).toFixed(1)} | 승리 사유 — 파산 ${pct(r.reasons.bankrupt, GAMES)}, 목표 ${pct(r.reasons.target, GAMES)}, 턴종료 ${pct(r.reasons.timeout, GAMES)}`,
  );
  const sorted = [...r.aAssets].sort((x, y) => x - y);
  const fmt = (n: number) => Math.round(n / 10_000) + '만';
  console.log(
    `  ${a.name} 최종 자산 — p10 ${fmt(quantile(sorted, 0.1))} / 중앙값 ${fmt(quantile(sorted, 0.5))} / p90 ${fmt(quantile(sorted, 0.9))}`,
  );
  return r;
}

console.log(`# 셀프플레이 밸런스 리포트 (판당 ${GAMES}게임)`);

// 1. 기준 미러전: 게임 길이, 승리 조건 분포, 선공 이점, 카드 기여도
{
  const r = reportMatchup('기준 미러전 greedy vs greedy', GreedyBot, GreedyBot, 10_000);
  console.log(`  선공 승률(결판 중): ${pct(r.seatFirstWins, r.decided)}`);

  // 카드별 승률 기여 (그 카드를 1회 이상 낸 플레이어의 승률)
  const played = new Map<CardId, number>();
  const won = new Map<CardId, number>();
  for (let i = 0; i < GAMES; i++) {
    const res = runGame([GreedyBot, GreedyBot], 10_000 + i);
    for (const me of [0, 1] as const) {
      for (const card of res.cardPlays[me].keys()) {
        played.set(card, (played.get(card) ?? 0) + 1);
        if (res.winner === me) won.set(card, (won.get(card) ?? 0) + 1);
      }
    }
  }
  console.log('  카드별 승률 기여 (낸 플레이어의 승률 / 표본):');
  const rows = [...played.entries()].sort((x, y) => y[1] - x[1]);
  for (const [card, n] of rows) {
    console.log(`    ${CARDS[card].name.padEnd(7, ' ')} ${pct(won.get(card) ?? 0, n).padStart(6)} (${n})`);
  }
}

// 2. 교육 메시지 검증 ★
console.log('\n# 교육 메시지 = 메타 성립 검증');
reportMatchup('분산 vs 몰빵 (분산이 이겨야 함)', DiversifyBot, YoloBot, 20_000);
reportMatchup('정직 vs 불법스팸 (정직이 이겨야 함)', GreedyBot, IllegalBot, 30_000);
reportMatchup('시그널 활용 vs 무시 (활용이 이겨야 함)', SignalBot, GreedyBot, 40_000);

// 3. 터틀 방지
reportMatchup('일반 vs 현금홀딩 (터틀 승률 < 35%)', GreedyBot, TurtleBot, 50_000);

// 4. 킬 조건(파산) 작동 검증 — 어그로 덱이 있을 때 파산이 실제로 발생하는가
reportMatchup('어그로 vs 일반 (파산 발생률 측정)', SharkBot, GreedyBot, 60_000, [
  AGGRO_DECK,
  DEFAULT_DECK,
]);
reportMatchup('어그로 vs 몰빵 (몰빵은 저격당해야 함)', SharkBot, YoloBot, 70_000, [
  AGGRO_DECK,
  DEFAULT_DECK,
]);

// 5. AI 난이도 3티어 (T5) — 고정 기준 봇(greedy) 대비 승률이 쉬움 > 보통 > 어려움 순 단조 감소
// (해석: "쉬움" 상대로는 기준 봇이 이기기 쉽고, "어려움" 상대로는 이기기 어려워야 한다 —
//  즉 기준 봇 관점에서 [easy, normal, hard]를 상대로 한 승률이 감소해야 함.
//  normal 티어 자체가 기준 봇(greedy)이므로 그 매치업은 자동으로 미러전=50%가 된다.)
console.log('\n# AI 난이도 티어 검증 (기준: greedy, 단조 감소해야 함)');
{
  const tierRates: { label: string; rate: number }[] = [];
  for (const d of DIFFICULTY_TIERS) {
    const r = matchup(GreedyBot, d.bot, GAMES, 80_000);
    const rate = r.decided === 0 ? 0 : (100 * r.aWins) / r.decided;
    tierRates.push({ label: d.label, rate });
    console.log(`  greedy vs ${d.label}(${d.bot.name}): ${rate.toFixed(1)}% (표본 ${r.decided})`);
  }
  let monotonic = true;
  for (let i = 1; i < tierRates.length; i++) {
    if (tierRates[i].rate >= tierRates[i - 1].rate) monotonic = false;
  }
  console.log(`  단조 감소(쉬움>보통>어려움, 기준 봇 승률 기준) 확인: ${monotonic ? '✅' : '❌'}`);
}
