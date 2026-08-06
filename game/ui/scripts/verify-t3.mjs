// T3 "매치 종료 정산" 검증: 승리/패배 각각에서 별점·골드·신규카드 요소 확인,
// 같은 브라우저 컨텍스트(localStorage 공유)에서 재시작 후 골드 누적 유지 확인.
// 사전 확인(scripts/tmp_scan_verdict.mjs, 삭제됨): seed=4 승리, seed=1 패배
// (둘 다 e2e-playthrough와 동일한 "카드 최대 2장/라운드" 정책 기준).
import { chromium } from 'playwright';
import { passMulligan } from './lib.mjs';

const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5178/';
const failures = [];
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures.push(label);
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));

// localStorage를 이 검증 전용으로 한 번만 비운다.
// (addInitScript는 매 navigation마다 재실행되어 시나리오2 진입 시 골드를 다시 지워버리므로 쓰지 않는다.)
await page.goto(`${BASE}?difficulty=normal`, { waitUntil: 'domcontentloaded' }); // T5: 난이도 건너뛰기
await page.evaluate(() => localStorage.removeItem('stock-card-battle:progress'));

async function tryPlayOneCard() {
  const card = page.locator('.hand .card:not(.dead)').first();
  if ((await card.count()) === 0) return false;
  await card.click();
  const target = page.locator('.stock-tile.targetable').first();
  try {
    await target.waitFor({ state: 'visible', timeout: 700 });
    await target.click();
  } catch {
    // no-op
  }
  return true;
}

async function playToGameOver() {
  for (let i = 0; i < 20; i++) {
    await tryPlayOneCard();
    await tryPlayOneCard();
    await page.locator('.end-turn').click();
    await page.locator('.panel').waitFor({ timeout: 25000 });
    if ((await page.locator('.panel.gameover').count()) > 0) return;
    await page.locator('.panel .primary').click();
    await page.waitForTimeout(200);
    if ((await page.locator('.panel.gameover').count()) > 0) return;
    await page.locator('.hand').waitFor({ timeout: 5000 });
  }
  throw new Error('game did not end in 20 rounds');
}

// ── 시나리오 1: 승리(seed=4) — 별점/골드/랭크/신규카드 요소 존재 확인 ──
await page.goto(`${BASE}?seed=4&difficulty=normal`, { waitUntil: 'networkidle' }); // T5: 난이도 건너뛰기
await passMulligan(page); // T4: 멀리건 화면 통과 (교체 없이 시작)
await playToGameOver();

const verdict1 = await page.locator('.panel.gameover h1').innerText();
ok(verdict1 === '승리!', '시나리오1: seed=4가 승리로 재현됨', `실제=${verdict1}`);

const settlement1 = await page.evaluate(() => window.__match?.settlement ?? null);
ok(settlement1 !== null, 'window.__match.settlement 노출');
ok((await page.locator('[data-testid="star-rating"]').count()) > 0, '별점 요소 존재');
ok((await page.locator('[data-testid="gold-earned"]').count()) > 0, '획득 골드 요소 존재');
ok((await page.locator('[data-testid="rank-row"]').count()) > 0, '랭크(다음 등급까지) 요소 존재');

const goldEarnedText = await page.locator('[data-testid="gold-earned"]').innerText();
ok(
  settlement1 !== null && goldEarnedText.includes(String(settlement1.goldEarned)),
  '표시된 획득 골드 숫자가 settlement 값과 일치',
  `settlement=${settlement1?.goldEarned} text=${goldEarnedText}`,
);

const goldTotalText = await page.locator('[data-testid="gold-total"]').innerText();
ok(
  settlement1 !== null && goldTotalText.includes(String(settlement1.progress.totalGold)),
  '누적 골드 표시가 settlement.progress와 일치',
);

// 승리했으니 별점은 1~3 사이여야 하고, 패배 캡 로직(승리 시 3성 가능)도 확인
ok(
  settlement1 !== null && settlement1.stars >= 1 && settlement1.stars <= 3,
  '별점이 1~3 범위',
  `실제=${settlement1?.stars}`,
);

const learnedCount = await page.locator('[data-testid="learned-cards"]').count();
if (learnedCount > 0) {
  const chips = await page.locator('.learned-chip').allInnerTexts();
  ok(chips.length > 0, '"새로 배운 카드" 칩이 최소 1개 존재', chips.join(','));
} else {
  console.log('SKIP  이번 판에 새 카드 없음 (모두 이전에 배운 카드) — learned-cards 미노출은 정상 분기');
}

const goldAfterFirstMatch = settlement1?.progress.totalGold ?? 0;

// ── 시나리오 2: 재시작 → 같은 컨텍스트(localStorage 공유)에서 골드 누적 유지 확인 ──
// restart 버튼은 랜덤 시드라 결과를 특정할 수 없으므로, seed=1(패배 확정)으로 직접 이동해
// 재현성을 확보한다. localStorage는 같은 컨텍스트(페이지)를 유지하므로 골드는 그대로 누적된다.
await page.goto(`${BASE}?seed=1&difficulty=normal`, { waitUntil: 'networkidle' }); // T5: 난이도 건너뛰기
await passMulligan(page); // T4: 멀리건 화면 통과 (교체 없이 시작)
await playToGameOver();

const verdict2 = await page.locator('.panel.gameover h1').innerText();
ok(verdict2 === '패배', '시나리오2: seed=1이 패배로 재현됨', `실제=${verdict2}`);

const settlement2 = await page.evaluate(() => window.__match?.settlement ?? null);
ok(
  settlement2 !== null && settlement2.progress.totalGold === goldAfterFirstMatch + settlement2.goldEarned,
  '골드 누적 유지 — 이전 판 골드 + 이번 판 획득 골드 = 새 누적',
  `이전=${goldAfterFirstMatch} 이번획득=${settlement2?.goldEarned} 새누적=${settlement2?.progress.totalGold}`,
);
ok(
  settlement2 !== null && !settlement2.won && settlement2.stars <= 2,
  '패배 시 별점 상한 2성 캡 적용',
  `won=${settlement2?.won} stars=${settlement2?.stars}`,
);

// ── 회귀: 새 게임 후 새로고침해도 localStorage 골드가 남아있는지 (진짜 영속 확인) ──
await page.reload({ waitUntil: 'networkidle' });
const persisted = await page.evaluate(() => {
  const raw = localStorage.getItem('stock-card-battle:progress');
  return raw ? JSON.parse(raw).totalGold : null;
});
ok(
  persisted === settlement2?.progress.totalGold,
  '새로고침 후에도 localStorage 골드 유지',
  `persisted=${persisted}`,
);

await browser.close();
console.log(failures.length === 0 ? '\nT3 VERIFY: ALL PASS' : `\nT3 VERIFY: ${failures.length} FAIL`);
process.exit(failures.length === 0 ? 0 : 1);
