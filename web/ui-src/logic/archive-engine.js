// >>> archive-engine — GENERATED from shared/engine/archive-profile.js
// 여기를 고치지 말고 원본을 고친 뒤 `node scripts/ui-build.mjs build` 를 돌린다.
// F9 아카이브 성향 계산. 화면은 이 결과를 표시만 한다.
//
// 이 파일은 브라우저(`public/ui/app.html`)와 서버·테스트가 함께 쓴다.
// `scripts/ui-build.mjs` 가 `export` 를 떼고 app.html 안으로 복사하므로
// TypeScript 문법과 import 를 쓰지 않는다. 계산이 바뀌면 이 파일만 고치고
// `node scripts/ui-build.mjs build` 로 화면을 다시 만든다.

// 살 때 뉴스·그래프·아는 회사를 근거로 골랐다고 본다.
const EVIDENCE_REASON_CODES = ["buy_news", "buy_chart", "buy_familiar"];

// 오각형 축 순서. 화면 라벨(집중·분산·정확·직관·근거)과 같은 순서다.
const ABILITY_ORDER = ["focus", "diversification", "accuracy", "intuition", "evidence"];

// 정확은 체결 후 이만큼 거래일이 지난 종가로 채점한다.
const ACCURACY_WAIT_TRADING_DAYS = 5;

// 채점된 거래가 하나도 없으면 이 비율에서 시작한다. [가정]
const ACCURACY_DEFAULT_RATIO = 0.5;

// 레벨 경계. 반올림 전 비율로 판정해 66.7% 경계가 흔들리지 않게 한다.
const ACCURACY_LEVEL_3_RATIO = 2 / 3;
const ACCURACY_LEVEL_2_RATIO = 1 / 3;

// 채점 전 화면에 쓰는 기본 정확 점수.
const ACCURACY_PLACEHOLDER = Math.round(ACCURACY_DEFAULT_RATIO * 100);

// 섹터가 하나 늘 때마다 집중이 이만큼 내려간다. [가정]
const FOCUS_STEP_PER_SECTOR = 22;

const clamp100 = (n) => Math.max(0, Math.min(100, n));

/**
 * 체결 매수 기록에서 능력치 다섯 축을 낸다.
 *
 * @param {Array<{symbol: string, reason_code: string}>} records 한 사람의 매수 기록
 * @param {(symbol: string) => (string|null|undefined)} sectorOf 종목 코드 -> 섹터
 * @param {number} [accuracy] 채점된 정확 점수 0~100. 없으면 채점 전 기본값
 * @returns {{count: number, evidencePct: number, focus: number, scores: number[]}}
 */
function computeAbilityScores(records, sectorOf, accuracy = ACCURACY_PLACEHOLDER) {
  const list = Array.isArray(records) ? records : [];
  const sectors = {};
  list.forEach((r) => {
    const sector = sectorOf ? sectorOf(r.symbol) : null;
    if (sector) sectors[sector] = 1;
  });

  const evidenceCount = list.filter((r) => EVIDENCE_REASON_CODES.indexOf(r.reason_code) >= 0).length;
  const evidencePct = list.length ? Math.round((evidenceCount / list.length) * 100) : 0;

  const sectorCount = Math.max(1, Object.keys(sectors).length);
  const focus = clamp100(100 - (sectorCount - 1) * FOCUS_STEP_PER_SECTOR);

  return {
    count: list.length,
    evidencePct,
    focus,
    // 집중·분산과 근거·직관은 서로 보완쌍이라 합이 100 이다.
    scores: [focus, 100 - focus, clamp100(Math.round(accuracy)), 100 - evidencePct, evidencePct],
  };
}

/**
 * 두 보완쌍의 우세로 캐릭터를, 정확으로 레벨을 정한다.
 * 5:5 동점은 근거·집중 쪽으로 귀속한다.
 *
 * @param {number[]} scores computeAbilityScores 의 scores
 * @param {1|2|3} [level] gradeAccuracy 가 낸 레벨. 없으면 정확 점수로 되짚는다
 * @returns {{key: "sniper"|"strategist"|"fighter"|"explorer", level: 1|2|3}}
 */
function resolveCharacter(scores, level) {
  const focus = scores[0];
  const diversification = scores[1];
  const accuracy = scores[2];
  const intuition = scores[3];
  const evidence = scores[4];

  const key =
    evidence >= intuition
      ? focus >= diversification
        ? "sniper"
        : "strategist"
      : focus >= diversification
        ? "fighter"
        : "explorer";

  return { key, level: level || accuracyLevelOf(accuracy / 100) };
}

// ── 정확 채점 ──────────────────────────────────────────────────────────
// 체결 5거래일 뒤 종가로 맞았는지 본다. 매수는 오르면, 매도는 내리면 적중이다.

/** ISO 시각 → KST 날짜(YYYY-MM-DD). 일봉 `date` 와 같은 축이다. */
function kstDateOf(iso) {
  return new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);
}

/** `date` 다음 거래일부터 세어 `days` 번째 종가. 아직 안 지났으면 null */
function closeAfterTradingDays(closes, date, days) {
  let seen = 0;
  for (const candle of closes) {
    if (candle.date > date && (seen += 1) === days) return candle.close;
  }
  return null;
}

/** `date` 당일 종가, 없으면 직전 거래일 종가 */
function closeOnOrBefore(closes, date) {
  let last = null;
  for (const candle of closes) {
    if (candle.date > date) break;
    last = candle.close;
  }
  return last;
}

/** 적중 비율 → 레벨. 반올림 전 비율로 판정한다 */
function accuracyLevelOf(ratio) {
  if (ratio >= ACCURACY_LEVEL_3_RATIO) return 3;
  if (ratio >= ACCURACY_LEVEL_2_RATIO) return 2;
  return 1;
}

/**
 * 정확 = 채점된 거래의 적중률 퍼센트(0~100, 반올림).
 * 종가가 모자란 거래는 `pending` 으로 빼고 적중률에서 제외한다.
 *
 * @param {Array<{symbol: string, price: number, tradedAt: string}>} buys
 * @param {Array<{symbol: string, tradedAt: string}>} sells
 * @param {Record<string, Array<{date: string, close: number}>>} dailyClosesBySymbol
 * @returns {{accuracy: number, level: 1|2|3, graded: number, pending: number, hits: number}}
 */
function gradeAccuracy(buys, sells, dailyClosesBySymbol) {
  let graded = 0;
  let hits = 0;
  let pending = 0;

  for (const buy of buys || []) {
    const closes = dailyClosesBySymbol[buy.symbol] || [];
    const settle = closeAfterTradingDays(closes, kstDateOf(buy.tradedAt), ACCURACY_WAIT_TRADING_DAYS);
    if (settle === null) {
      pending += 1;
      continue;
    }
    graded += 1;
    if (settle > buy.price) hits += 1;
  }

  for (const sell of sells || []) {
    const closes = dailyClosesBySymbol[sell.symbol] || [];
    const soldDate = kstDateOf(sell.tradedAt);
    // 매도 체결가는 매도 당일(없으면 직전 거래일) 종가로 근사한다 [가정]
    const sellPrice = closeOnOrBefore(closes, soldDate);
    const settle = closeAfterTradingDays(closes, soldDate, ACCURACY_WAIT_TRADING_DAYS);
    if (sellPrice === null || settle === null) {
      pending += 1;
      continue;
    }
    graded += 1;
    if (settle < sellPrice) hits += 1;
  }

  const ratio = graded > 0 ? hits / graded : ACCURACY_DEFAULT_RATIO;
  return { accuracy: Math.round(ratio * 100), level: accuracyLevelOf(ratio), graded, pending, hits };
}
// <<< archive-engine
