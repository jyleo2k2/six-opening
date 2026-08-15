import assert from "node:assert/strict";
import { RK_FAMS, RK_LEAGUES, rkPodium, rkRows, rkSeg } from "./ranking-data";

function main() {
  // 시상대는 화면 왼쪽부터 2등 · 1등 · 3등 순으로 그린다. 순서가 바뀌면 1등이 낮은 단에 선다.
  assert.deepEqual(rkPodium("week").map((p) => p.rank), [2, 1, 3]);
  assert.deepEqual(
    rkPodium("week").map((p) => p.name),
    ["초록곰 가족", "별빛 가족", "바다별 가족"],
  );

  // 순위표는 4위부터다. 시상대 3인과 겹치면 같은 가족이 두 번 나온다.
  const rows = rkRows("week");
  assert.equal(rows[0].rank, 4);
  assert.equal(rows.length, RK_LEAGUES.week.length - 3);
  assert.equal(rows[0].name, "우리 가족");

  // 탭을 바꾸면 다른 표를 읽는다. 주에서 4위인 우리 가족이 시즌에서는 7위라 시상대에 없다.
  assert.equal(rkRows("season")[0].rank, 4);
  assert.ok(rkRows("season").some((r) => r.name === "우리 가족"));

  // '우리 가족' 행만 분홍 알약으로 강조하고 계단 배지를 단다.
  const me = rows.find((r) => r.name === "우리 가족");
  assert.ok(me);
  assert.match(me.rowStyle, /#FFF3F8/u);
  assert.equal(me.step, "▲ 2계단");
  assert.doesNotMatch(rows[1].rowStyle, /#FFF3F8/u);

  // 등락색: 오르면 빨강, 내리면 파랑. 강조 행은 흰 글씨라 예외다.
  const down = rows.find((r) => r.pct.startsWith("-"));
  assert.ok(down);
  assert.match(down.pct, /^-/u);
  assert.match(down.pctStyle, /#1668DC/u);
  assert.match(rkRows("season")[1].pctStyle, /#E8322E/u);

  // 사진 가족은 이모지를 쓰지 않는다. 둘 다 나오면 사진 위에 글자가 겹친다.
  const photo = rows.find((r) => RK_FAMS[r.name]?.img);
  assert.ok(photo);
  assert.equal(photo.emoji, "");

  // 이 화면은 `/ranking` 에서 열린다. 상대 경로면 `/assets/…` 를 찾다 사진이 전부 깨진다.
  for (const family of Object.values(RK_FAMS)) {
    if (family.img) assert.match(family.img, /^\/ui\/assets\//u);
  }

  // 고른 탭만 진한 남색으로 뒤집힌다 — 토글 배경 자체가 흰색이라서다.
  assert.match(rkSeg(true), /background:#1E3A6E/u);
  assert.doesNotMatch(rkSeg(false), /background:#1E3A6E/u);

  // 학교별 탭은 학교가 행 주인이고, 3위까지는 시상대에 있어 순위표에 없다.
  assert.deepEqual(rkPodium("school").map((p) => p.name), ["한빛초등학교", "푸른솔초등학교", "해든초등학교"]);
  const schoolRows = rkRows("school");
  assert.equal(schoolRows.length, RK_LEAGUES.school.length - 3);
  assert.ok(schoolRows.some((r) => r.name === "나래초등학교" && r.step === "▲ 1계단"));

  console.log("ranking data tests passed");
}

main();
