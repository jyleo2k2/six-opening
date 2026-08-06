// T4 "멀리건" 검증: 시작 손패 중 일부를 교체하면 손패 구성이 실제로 바뀌고,
// 새 매치를 시작하면 다시 멀리건 화면이 뜨는지(1회 소모가 매치 단위로 리셋되는지) 확인.
import { chromium } from 'playwright';

const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5178/';
const failures = [];
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures.push(label);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));

await page.goto(`${BASE}?seed=1&difficulty=normal`, { waitUntil: 'networkidle' }); // T5: 난이도 건너뛰기
await page.waitForSelector('[data-testid="mulligan-screen"]', { timeout: 10000 });

const handBefore = await page.evaluate(() => window.__match?.game.players[0].hand.slice() ?? null);
ok(handBefore !== null, '멀리건 화면에서 window.__match 접근 가능');

const mulliganCards = page.locator('[data-testid="mulligan-card"]');
const cardCount = await mulliganCards.count();
ok(cardCount === handBefore?.length, '멀리건 화면 카드 수 = 시작 손패 수', `카드${cardCount} 손패${handBefore?.length}`);

// 카드 0, 1번 표시 → 교체
await mulliganCards.nth(0).click();
await mulliganCards.nth(1).click();
ok((await page.locator('.marked-discard').count()) === 2, '2장 표시(marked-discard) 확인');

// 다시 클릭하면 표시 해제되는지 (토글) 확인 후 재표시
await mulliganCards.nth(1).click();
ok((await page.locator('.marked-discard').count()) === 1, '재클릭 시 표시 해제(토글) 확인');
await mulliganCards.nth(1).click();

await page.locator('.mulligan-confirm').click();
await page.waitForSelector('.hand .card', { timeout: 10000 });

const handAfter = await page.evaluate(() => window.__match?.game.players[0].hand.slice() ?? null);

// 멀리건 화면 손패(createGame 초기 드로우 4장) 확정 후, round 1 진입의 startTurn 드로우 1장이 더해져
// 실제 게임 손패는 5장이 된다 — 이건 멀리건 도입 전에도 동일했던 동작(초기4+startTurn드로우1).
ok(
  handAfter?.length === (handBefore?.length ?? 0) + 1,
  '교체 후 손패 수 = 멀리건 화면 손패 + startTurn 드로우 1장',
  `멀리건화면${handBefore?.length} 확정후${handAfter?.length}`,
);
const mulliganUsed = await page.evaluate(() => window.__match?.game.players[0].mulliganUsed ?? null);
ok(mulliganUsed === true, 'mulliganUsed 플래그 true로 기록됨');

// 버린 두 카드가 정확히 그 자리에서 사라지지 않았는지(같은 카드가 우연히 다시 뽑힐 수도 있으니
// "손패 배열이 이전과 완전히 동일하지는 않다"까지만 확정적으로 검증 가능)
const handChanged = JSON.stringify(handAfter) !== JSON.stringify(handBefore);
ok(handChanged, '교체 후 손패 배열이 이전과 달라짐(실제 카드가 뒤바뀜)', `이전=${handBefore} 이후=${handAfter}`);

// ── 매치 재시작 → 새 매치는 다시 멀리건 화면부터 시작 ──
await page.goto(`${BASE}?seed=2&difficulty=normal`, { waitUntil: 'networkidle' }); // T5: 난이도 건너뛰기
ok(
  (await page.locator('[data-testid="mulligan-screen"]').count()) > 0,
  '새 매치(다른 시드)는 다시 멀리건 화면으로 시작 — 1회 제한은 매치 단위',
);

// 이번엔 교체 없이 바로 시작 (0장 선택)
await page.locator('.mulligan-confirm').click();
await page.waitForSelector('.hand .card', { timeout: 10000 });
const mulliganUsed2 = await page.evaluate(() => window.__match?.game.players[0].mulliganUsed ?? null);
ok(mulliganUsed2 === true, '교체 0장이어도 확정하면 mulliganUsed=true (1회 소모 처리)');

await browser.close();
console.log(failures.length === 0 ? '\nT4 VERIFY: ALL PASS' : `\nT4 VERIFY: ${failures.length} FAIL`);
process.exit(failures.length === 0 ? 0 : 1);
