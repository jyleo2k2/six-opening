// 루프 1 "돈 가시성" 검증: 표시값이 엔진 상태와 일치하는지 + 4항목 존재 여부.
// 전제: dev 서버 http://127.0.0.1:5178 실행 중.
import { chromium } from 'playwright';
import { passMulligan } from './lib.mjs';

const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5178/';
const SEED = 20260805;
const failures = [];
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures.push(label);
};

// UI와 동일한 포맷 규칙 (web/src/format.ts와 일치해야 함)
const manwon = (n) => {
  const man = n / 10_000;
  if (Math.abs(man) >= 1000) return `${(man / 10_000).toFixed(2)}억`;
  if (Math.abs(man) >= 100) return `${Math.round(man)}만`;
  return `${man.toFixed(1)}만`;
};
const signedManwon = (n) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${manwon(Math.abs(n))}`;
const pct = (r, d = 1) => {
  const v = r * 100;
  return `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(d)}%`;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));
await page.goto(`${BASE}?seed=${SEED}&difficulty=normal`, { waitUntil: 'networkidle' }); // T5: 난이도 건너뛰기
await passMulligan(page); // T4: 멀리건 화면 통과 (교체 없이 시작)

const text = async (tid) => {
  const loc = page.locator(`[data-testid="${tid}"]`).first();
  return (await loc.count()) > 0 ? (await loc.innerText()).replace(/\s+/g, ' ').trim() : null;
};
const snap = () =>
  page.evaluate(() => {
    const m = window.__match;
    if (!m) return null;
    const { game, history, costBasis } = m;
    const assetsOf = (p) => {
      let v = p.cash;
      for (const s of game.stocks) v += (p.holdings[s.id] ?? 0) * s.price;
      for (const sh of p.shorts) {
        const cur = game.stocks.find((s) => s.id === sh.stockId).price;
        v += (sh.amount * (sh.entryPrice - cur)) / sh.entryPrice;
      }
      return v;
    };
    return {
      startCash: game.config.startCash,
      me: assetsOf(game.players[0]),
      ai: assetsOf(game.players[1]),
      cash: game.players[0].cash,
      stockValue: game.stocks.reduce(
        (a, s) => a + (game.players[0].holdings[s.id] ?? 0) * s.price,
        0,
      ),
      stocks: game.stocks.map((s) => ({
        id: s.id,
        price: s.price,
        basePrice: s.basePrice,
        lastSettle: history[s.id][history[s.id].length - 1],
        myShares: game.players[0].holdings[s.id] ?? 0,
      })),
      costBasis,
    };
  });

let s = await snap();
ok(s !== null, 'window.__match 노출');
if (!s) {
  await browser.close();
  process.exit(1);
}

// ── 1. 상단바: 내 자산 vs AI 자산 + 증감 ──
ok((await text('my-assets'))?.includes(manwon(s.me)) ?? false, '내 자산 표시', `기대 ${manwon(s.me)}`);
ok((await text('ai-assets'))?.includes(manwon(s.ai)) ?? false, 'AI 자산 표시', `기대 ${manwon(s.ai)}`);
ok(
  (await text('my-assets-delta'))?.includes(signedManwon(s.me - s.startCash)) ?? false,
  '내 자산 증감',
);
ok(
  (await text('ai-assets-delta'))?.includes(signedManwon(s.ai - s.startCash)) ?? false,
  'AI 자산 증감',
);

// ── 4. 하단 자산 구성 ──
ok((await text('my-cash'))?.includes(manwon(s.cash)) ?? false, '현금 표시', `기대 ${manwon(s.cash)}`);
ok(
  (await text('my-stock-value'))?.includes(manwon(s.stockValue)) ?? false,
  '주식 평가액 표시',
  `기대 ${manwon(s.stockValue)}`,
);

// ── 2. 종목 등락 2종 (라운드 1: 기준 = 시작가) ──
for (const st of s.stocks) {
  const tile = page.locator(`[data-stock-id="${st.id}"]`);
  const round = await tile.locator('[data-testid="round-change"]').innerText();
  const total = await tile.locator('[data-testid="total-change"]').innerText();
  ok(round.includes(pct(st.price / st.lastSettle - 1)), `${st.id} 라운드 등락`, `기대 ${pct(st.price / st.lastSettle - 1)} 실제 ${round}`);
  ok(total.includes(pct(st.price / st.basePrice - 1)), `${st.id} 누적 등락`);
}

// ── 3. 포지션 수익률: 매수 카드를 내고 검증 ──
// 손패에서 '매수' 카드를 찾아 첫 종목에 사용. 없으면 관망으로 드로우하며 최대 6턴 탐색.
async function playBuy() {
  for (let attempt = 0; attempt < 6; attempt++) {
    const buyCard = page.locator('.hand .card:not(.dead)', { hasText: '매수' }).first();
    if ((await buyCard.count()) > 0) {
      await buyCard.click();
      const target = page.locator('.stock-tile.targetable').first();
      await target.waitFor({ timeout: 2000 });
      const id = await target.getAttribute('data-stock-id');
      await target.click();
      return id;
    }
    // 관망(0코스트 드로우)이 있으면 사용, 없으면 턴 종료 후 다음 라운드로
    const watch = page.locator('.hand .card:not(.dead)', { hasText: '관망' }).first();
    if ((await watch.count()) > 0) await watch.click();
    else {
      await page.locator('.end-turn').click();
      await page.locator('.panel .primary').waitFor({ timeout: 25000 });
      await page.locator('.panel .primary').click();
      await page.locator('.hand').waitFor({ timeout: 5000 });
    }
  }
  return null;
}

const boughtId = await playBuy();
ok(boughtId !== null, '매수 실행 (검증용)');
if (boughtId) {
  s = await snap();
  const st = s.stocks.find((x) => x.id === boughtId);
  const cb = s.costBasis[boughtId];
  ok(!!cb && cb.shares > 0 && cb.invested > 0, 'costBasis 기록됨');
  if (cb) {
    const avg = cb.invested / cb.shares;
    const expectProfit = pct(st.price / avg - 1);
    const tile = page.locator(`[data-stock-id="${boughtId}"]`);
    const posVal = await tile.locator('[data-testid="position-value"]').innerText();
    const posProfit = await tile.locator('[data-testid="position-profit"]').innerText();
    ok(posVal.includes(manwon(st.myShares * st.price)), '포지션 평가액', `기대 ${manwon(st.myShares * st.price)} 실제 ${posVal}`);
    ok(posProfit.includes(expectProfit), '포지션 수익률', `기대 ${expectProfit} 실제 ${posProfit}`);
    // 정산 한 번 지나도 수익률이 원가 기준으로 유지되는지
    await page.locator('.end-turn').click();
    await page.locator('.panel .primary').waitFor({ timeout: 25000 });
    await page.locator('.panel .primary').click();
    await page.locator('.hand').waitFor({ timeout: 5000 });
    s = await snap();
    const st2 = s.stocks.find((x) => x.id === boughtId);
    const cb2 = s.costBasis[boughtId];
    if (st2.myShares > 0 && cb2) {
      const avg2 = cb2.invested / cb2.shares;
      ok(Math.abs(avg2 - avg) < 1e-6, '정산 후 평균단가 유지 (invested 불변)');
      const profit2 = await page
        .locator(`[data-stock-id="${boughtId}"] [data-testid="position-profit"]`)
        .innerText();
      ok(profit2.includes(pct(st2.price / avg2 - 1)), '정산 후 수익률 표시 갱신');
    } else {
      console.log('SKIP  정산 후 검증 (강제 매도로 포지션 소멸 — costBasis 리셋 확인)');
      ok(!cb2 || cb2.shares === 0, '포지션 소멸 시 costBasis 리셋');
    }
  }
}

// ── 겹침 검사: 주요 텍스트 요소들이 서로 침범하지 않는지 (거친 검사) ──
const overlap = await page.evaluate(() => {
  const ids = ['my-assets', 'ai-assets', 'my-cash', 'my-stock-value'];
  const rects = ids
    .map((t) => document.querySelector(`[data-testid="${t}"]`))
    .filter(Boolean)
    .map((el) => el.getBoundingClientRect());
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      if (x > 2 && y > 2) return `${ids[i]} x ${ids[j]}`;
    }
  return null;
});
ok(overlap === null, '텍스트 겹침 없음', overlap ?? '');

await page.screenshot({ path: 'shots/loop1.png' });
await browser.close();
console.log(failures.length === 0 ? '\nLOOP1 VERIFY: ALL PASS' : `\nLOOP1 VERIFY: ${failures.length} FAIL`);
process.exit(failures.length === 0 ? 0 : 1);
