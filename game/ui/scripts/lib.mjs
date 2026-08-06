// 검증 스크립트 공용 헬퍼.

/** T4 멀리건 화면을 넘긴다. discardIndices가 있으면 해당 카드를 표시하고 확정, 없으면 바로 시작. */
export async function passMulligan(page, discardIndices = []) {
  await page.waitForSelector('[data-testid="mulligan-screen"]', { timeout: 10000 });
  for (const idx of discardIndices) {
    await page.locator('[data-testid="mulligan-card"]').nth(idx).click();
  }
  await page.locator('.mulligan-confirm').click();
  await page.waitForSelector('.hand .card', { timeout: 10000 });
}
