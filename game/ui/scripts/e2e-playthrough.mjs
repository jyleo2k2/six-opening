// 사람 대신 1판 완주하는 스모크 테스트: 카드 몇 장 내고, 매 라운드 턴 종료 → 정산 → 다음 라운드.
// 종료 화면(승리/패배/무승부)이 뜨면 성공.
import { chromium } from 'playwright';
import { passMulligan } from './lib.mjs';

const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5178/';
const shots = process.env.E2E_SHOTS === '1';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`);
});

await page.goto(`${BASE}?difficulty=normal`, { waitUntil: 'networkidle' }); // T5: 난이도 선택 건너뛰기
await passMulligan(page); // T4: 매치 시작 시 멀리건 화면이 먼저 뜬다. 교체 없이 바로 시작.
if (shots) await page.screenshot({ path: 'shots/round1.png' });

async function tryPlayOneCard() {
  // 낼 수 있는(dead 아닌) 카드 하나 탭. 타겟 필요하면 깜빡이는 종목 탭.
  const card = page.locator('.hand .card:not(.dead)').first();
  if ((await card.count()) === 0) return false;
  await card.click();
  const target = page.locator('.stock-tile.targetable').first();
  try {
    await target.waitFor({ state: 'visible', timeout: 700 });
    await target.click();
  } catch {
    // 타겟 불필요 카드였음 (이미 발동)
  }
  return true;
}

let round = 0;
for (let i = 0; i < 20; i++) {
  round = i + 1;
  // 라운드마다 카드 최대 2장 시도
  await tryPlayOneCard();
  await tryPlayOneCard();
  await page.locator('.end-turn').click();
  // 정산 패널 대기 (봇 턴 연출 포함 최대 25초)
  await page.locator('.panel').waitFor({ timeout: 25000 });
  if (shots && (i === 0 || i === 5)) await page.screenshot({ path: `shots/report-r${round}.png` });
  const isOver = (await page.locator('.panel.gameover').count()) > 0;
  if (isOver) break;
  await page.locator('.panel .primary').click();
  // 게임오버 패널로 전환됐을 수도 있음
  await page.waitForTimeout(300);
  if ((await page.locator('.panel.gameover').count()) > 0) break;
  await page.locator('.hand').waitFor({ timeout: 5000 });
}

const over = await page.locator('.panel.gameover').count();
if (shots) await page.screenshot({ path: 'shots/gameover.png' });
const verdict = over > 0 ? await page.locator('.panel.gameover h1').innerText() : null;
await browser.close();

if (errors.length > 0) {
  console.error('BROWSER ERRORS:');
  for (const e of errors) console.error(' ', e);
  process.exit(1);
}
if (over === 0) {
  console.error(`FAIL: game did not finish in ${round} rounds`);
  process.exit(1);
}
console.log(`PASS: game finished at round ${round}, verdict = ${verdict}`);
