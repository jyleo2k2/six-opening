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

// 정확은 사고판 시점이 맞았는지라 5거래일 종가가 있어야 채점된다.
// 아직 채점 경로가 화면에 없어 중간값으로 둔다. [가정]
const ACCURACY_PLACEHOLDER = 50;

// 섹터가 하나 늘 때마다 집중이 이만큼 내려간다. [가정]
const FOCUS_STEP_PER_SECTOR = 22;

const clamp100 = (n) => Math.max(0, Math.min(100, n));

/**
 * 체결 매수 기록에서 능력치 다섯 축을 낸다.
 *
 * @param {Array<{symbol: string, reason_code: string}>} records 한 사람의 매수 기록
 * @param {(symbol: string) => (string|null|undefined)} sectorOf 종목 코드 -> 섹터
 * @returns {{count: number, evidencePct: number, focus: number, scores: number[]}}
 */
function computeAbilityScores(records, sectorOf) {
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
    scores: [focus, 100 - focus, ACCURACY_PLACEHOLDER, 100 - evidencePct, evidencePct],
  };
}

/**
 * 두 보완쌍의 우세로 캐릭터를, 정확으로 레벨을 정한다.
 * 5:5 동점은 근거·집중 쪽으로 귀속한다.
 *
 * @param {number[]} scores computeAbilityScores 의 scores
 * @returns {{key: "sniper"|"strategist"|"fighter"|"explorer", level: 1|2|3}}
 */
function resolveCharacter(scores) {
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

  const level = accuracy >= 70 ? 3 : accuracy >= 40 ? 2 : 1;
  return { key, level };
}
// <<< archive-engine
