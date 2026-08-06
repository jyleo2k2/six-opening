// T2 "판정 피드백 UI" 검증: 분산 보유 상태에서 섹터 쇼크를 고정 시드로 재현하고
// 정산 리포트에 해당 피드백 문구가 뜨는지 + window.__match.report 원시 이벤트와 대조.
// 사전 시뮬레이션(game/tmp_scan2.mjs)으로 확인한 사실: seed=1, "분산 우선 -> 저가매수 -> 관망"
// 정책으로 4라운드 정산 시 반도체 섹터 -10%, 내 exposureRatio ≈0.43 (분산 효과) 이벤트 발생.
import { chromium } from 'playwright';
import { passMulligan } from './lib.mjs';

const BASE = process.env.E2E_URL ?? 'http://127.0.0.1:5178/';
const SEED = 1;
const failures = [];
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures.push(label);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));
await page.goto(`${BASE}?seed=${SEED}&difficulty=normal`, { waitUntil: 'networkidle' }); // T5: 난이도 건너뛰기
await passMulligan(page); // T4: 멀리건 화면 통과 (교체 없이 시작)

// 손패 정책: 분산투자 우선 → 매수 → 관망. legalPlays 순서와 무관하게 이름으로 찾는다.
async function playPreferredCard() {
  for (const name of ['분산투자', '매수', '관망']) {
    const card = page
      .locator('.hand .card:not(.dead)')
      .filter({ has: page.locator('.card-name', { hasText: name }) })
      .first();
    if ((await card.count()) === 0) continue;
    await card.click();
    const target = page.locator('.stock-tile.targetable').first();
    try {
      await target.waitFor({ state: 'visible', timeout: 500 });
      await target.click();
    } catch {
      // 타겟 불필요 카드
    }
    return true;
  }
  return false;
}

async function playRoundAndSettle() {
  // 이번 라운드에서 낼 수 있는 만큼 반복 (에너지 소진 또는 더 낼 카드 없을 때까지)
  let guard = 0;
  while (guard++ < 10) {
    const played = await playPreferredCard();
    if (!played) break;
  }
  await page.locator('.end-turn').click();
  await page.locator('.panel').waitFor({ timeout: 25000 });
}

for (let round = 1; round <= 4; round++) {
  await playRoundAndSettle();
  const isOver = (await page.locator('.panel.gameover').count()) > 0;
  if (isOver) break;
  if (round < 4) {
    await page.locator('.panel .primary').click();
    await page.locator('.hand').waitFor({ timeout: 5000 });
  }
}

// ── 4라운드 정산 리포트 확인 (다음 라운드로 넘어가기 전, 패널이 떠 있는 상태) ──
const snap = () =>
  page.evaluate(() => {
    const m = window.__match;
    if (!m?.report) return null;
    return {
      round: m.report.round,
      events: m.report.events.map((t) => ({
        type: t.event.type,
        actingPlayer: t.actingPlayer,
        // sectorHit만 상세 필드 추림
        ...(t.event.type === 'sectorHit'
          ? {
              sector: t.event.sector,
              pct: t.event.pct,
              impacts: t.event.impacts.map((i) => ({
                player: i.player,
                pnlAmount: i.pnlAmount,
                exposureRatio: i.exposureRatio,
              })),
            }
          : {}),
      })),
    };
  });

const s = await snap();
ok(s !== null, 'window.__match.report 노출');
ok(s?.round === 4, '4라운드 정산 리포트', `실제 round=${s?.round}`);

const sectorHit = s?.events.find(
  (e) => e.type === 'sectorHit' && e.sector === '반도체' && e.pct < 0,
);
ok(!!sectorHit, '반도체 하락 섹터 이벤트 발생 (시뮬레이션 사전 확인값과 일치해야 함)');

let diversifyImpact = null;
if (sectorHit) {
  diversifyImpact = sectorHit.impacts.find((i) => i.player === 0);
  ok(!!diversifyImpact, '내 impact 기록 존재');
  ok(
    !!diversifyImpact && diversifyImpact.exposureRatio > 0 && diversifyImpact.exposureRatio < 1,
    '분산 상태 확인 (노출 비중 0~1 사이)',
    `실제 exposureRatio=${diversifyImpact?.exposureRatio}`,
  );
}

// ── 화면에 뜬 피드백 문구가 위 이벤트값을 그대로 반영하는지 ──
const feedbackEls = await page.locator('[data-testid="feedback-line"]').evaluateAll((els) =>
  els.map((e) => ({ text: e.textContent ?? '', cls: e.className })),
);
const feedbackLines = feedbackEls.map((e) => e.text);
console.log('피드백 문구:', feedbackLines);

if (diversifyImpact) {
  const exposurePct = Math.round(diversifyImpact.exposureRatio * 100);
  const diversifyLine = feedbackEls.find(
    (e) => e.text.includes('분산') && e.text.includes('반도체') && e.text.includes(`${exposurePct}%`),
  );
  ok(!!diversifyLine, '"분산 덕분에" 문구 노출 + 노출비중 숫자 일치', `기대 노출 ${exposurePct}%`);
  ok(
    !!diversifyLine && diversifyLine.cls.includes('feedback-mitigated'),
    '손실이지만 분산으로 완화된 톤(mitigated) — 순수 bad 아님',
    diversifyLine?.cls,
  );
}

// ── 회귀: 기존 정산 리포트 요소(이벤트 헤드라인/AI행동/종목등락/자산) 그대로 유지 ──
ok((await page.locator('.report-stocks').count()) > 0, '종목 등락 목록 유지');
ok((await page.locator('.report-assets').count()) > 0, '자산 비교 유지');

await page.screenshot({ path: 'shots/t2-report.png' });

// ── 시나리오 2: 손절 예약 발동 ("손절 발동! N만 지켰다") ──
// 사전 시뮬레이션(game/tmp_scan3.mjs) 확인값: seed=6, 정책(매수→손절예약→관망) 2라운드째 발동, savedAmount≈2.59만
const page2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page2.goto(`${BASE}?seed=6&difficulty=normal`, { waitUntil: 'networkidle' }); // T5: 난이도 건너뛰기
await passMulligan(page2); // T4: 멀리건 화면 통과 (교체 없이 시작)

async function playStopLossPolicy() {
  const buyCard = page2
    .locator('.hand .card:not(.dead)')
    .filter({ has: page2.locator('.card-name', { hasText: '매수' }) })
    .first();
  const stopCard = page2
    .locator('.hand .card:not(.dead)')
    .filter({ has: page2.locator('.card-name', { hasText: '손절 예약' }) })
    .first();
  const watchCard = page2
    .locator('.hand .card:not(.dead)')
    .filter({ has: page2.locator('.card-name', { hasText: '관망' }) })
    .first();
  for (const card of [stopCard, buyCard, watchCard]) {
    if ((await card.count()) === 0) continue;
    await card.click();
    const target = page2.locator('.stock-tile.targetable').first();
    try {
      await target.waitFor({ state: 'visible', timeout: 500 });
      await target.click();
    } catch {
      // no-op
    }
    return true;
  }
  return false;
}

let stopLossReportRound = null;
for (let round = 1; round <= 2; round++) {
  let guard = 0;
  while (guard++ < 10) {
    const played = await playStopLossPolicy();
    if (!played) break;
  }
  await page2.locator('.end-turn').click();
  await page2.locator('.panel').waitFor({ timeout: 25000 });
  const snap2 = await page2.evaluate(() => window.__match?.report ?? null);
  const hasStopLoss = snap2?.events.some((t) => t.event.type === 'stopLossTriggered');
  if (hasStopLoss) {
    stopLossReportRound = snap2.round;
    break;
  }
  if (round < 2) {
    await page2.locator('.panel .primary').click();
    await page2.locator('.hand').waitFor({ timeout: 5000 });
  }
}

ok(stopLossReportRound !== null, '손절 예약 발동 이벤트가 리포트에 기록됨 (사전 시뮬레이션값과 일치해야 함)');
const slLines = await page2.locator('[data-testid="feedback-line"]').allInnerTexts();
console.log('손절 시나리오 피드백:', slLines);
ok(
  slLines.some((t) => t.includes('손절') && t.includes('지켰다') && t.includes('만')),
  '"손절 발동! N만 지켰다" 형태 문구 노출',
);

await browser.close();
console.log(failures.length === 0 ? '\nT2 VERIFY: ALL PASS' : `\nT2 VERIFY: ${failures.length} FAIL`);
process.exit(failures.length === 0 ? 0 : 1);
