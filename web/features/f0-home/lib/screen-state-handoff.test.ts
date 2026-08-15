import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * 화면을 실제 라우트로 나누면 화면을 옮길 때마다 문서가 갈아끼워진다. 앱 입장에선 새로고침과
 * 같아서, 작성 중이던 주문·보던 화면이 메모리와 함께 사라진다.
 *
 * 그래서 화면 임시값을 넘기되 **앱 안에서 넘어온 경우에만** 되살린다.
 * 새로고침·새 탭에서는 버려 "F5 하면 처음부터" 라는 지금 동작을 지킨다 (F2 SPEC §6.2).
 *
 * 이 계약이 조용히 깨지는 방향은 둘이다.
 *   - 표시 없이 되살린다 → 새로고침해도 초기화되지 않아 시연 중 되돌릴 방법이 없다
 *   - 오래 남는 값(acc·records)을 sessionStorage 로 옮긴다 → 탭을 닫으면 거래가 사라진다
 * 둘 다 화면만 봐서는 한참 뒤에나 드러난다.
 */
const appHtml = readFileSync(
  new URL("../../../public/ui/app.html", import.meta.url),
  "utf8",
);

function main() {
  // 오래 남는 것은 localStorage 그대로다.
  assert.match(appHtml, /localStorage\.setItem\('kw_proto_v1'/u);
  assert.match(appHtml, /localStorage\.getItem\('kw_proto_v1'/u);

  // 화면 임시값은 탭 수명만 사는 sessionStorage 에 따로 둔다.
  assert.match(appHtml, /sessionStorage\.setItem\('kw_proto_ui_v1'/u);
  assert.doesNotMatch(
    appHtml,
    /localStorage\.setItem\('kw_proto_ui_v1'/u,
    "화면 임시값을 localStorage 에 넣으면 새로고침해도 남는다",
  );

  // 넘어왔다는 표시가 있어야만 되살린다.
  assert.match(appHtml, /sessionStorage\.setItem\('kw_proto_nav_v1', '1'\)/u);
  assert.match(appHtml, /sessionStorage\.getItem\('kw_proto_nav_v1'\) === '1'/u);
  // 표시는 한 번 쓰고 버린다 — 남겨두면 그 다음 새로고침까지 되살아난다.
  assert.match(appHtml, /sessionStorage\.removeItem\('kw_proto_nav_v1'\)/u);
  // 표시가 없으면 임시값 자체를 지운다.
  assert.match(appHtml, /sessionStorage\.removeItem\('kw_proto_ui_v1'\)/u);

  // 표시를 남기는 유일한 경로가 leaveToRoute 다. 이게 없으면 화면 이동이 곧 초기화가 된다.
  assert.match(appHtml, /leaveToRoute\(path\)\s*\{/u);
  assert.match(appHtml, /top\.location\.href = path;/u);

  // 되살리는 키 목록에 오래 남는 값이 섞이면 안 된다.
  const keys = appHtml.match(/\['screen','account','code','draft','sellDraft','buyStep','sellStep','arcTab'\]/u);
  assert.ok(keys, "되살릴 화면 임시값 키 목록을 찾지 못했다");
  for (const forbidden of ["acc", "records", "sellRecords", "events", "seq", "watchlist"]) {
    assert.doesNotMatch(
      keys[0],
      new RegExp(`'${forbidden}'`, "u"),
      `${forbidden} 는 오래 남아야 하는 값이라 화면 임시값에 넣으면 안 된다`,
    );
  }

  console.log("screen state handoff tests passed");
}

main();
