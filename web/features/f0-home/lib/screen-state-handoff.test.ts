import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * 화면을 옮겨도 **문서를 갈아끼우지 않는다.**
 *
 * 예전에는 옮긴 화면으로 갈 때 `top.location.href` 로 문서를 새로 받았다. 그러면 app.html 이
 * 처음부터 다시 뜨는데, `/api/account` 응답이 오기 전까지 `renderVals-compute.js` 가 아이 계정
 * 데모로 폴백해 **로그인한 사람이 아닌 계정의 화면이 잠깐 보였다.** 화면을 옮길 때마다 그랬다.
 * 그래서 화면 임시값을 sessionStorage 로 넘겨받는 장치도 따로 필요했다.
 *
 * 지금은 부모가 iframe 을 살려 둔 채 그 위에 옮긴 화면을 얹는다. 메모리가 안 죽으니 백업할
 * 이유도 없다. 이 계약이 조용히 깨지는 방향은 둘이다.
 *   - 다시 `location.href` 로 넘어간다 → 이동할 때마다 남의 계좌가 스친다
 *   - 오래 남는 값(acc·records)을 sessionStorage 로 옮긴다 → 탭을 닫으면 거래가 사라진다
 * 둘 다 화면만 봐서는 한참 뒤에나 드러난다.
 */
const appHtml = readFileSync(
  new URL("../../../public/ui/app.html", import.meta.url),
  "utf8",
);

function main() {
  // 지갑은 localStorage 그대로다.
  assert.match(appHtml, /localStorage\.setItem\('kw_proto_v1'/u);
  assert.match(appHtml, /localStorage\.getItem\('kw_proto_v1'/u);

  // 화면 이동은 부모에게 올린다.
  assert.match(appHtml, /leaveToRoute\(path\)\s*\{/u);
  assert.match(appHtml, /type:'kiwoom:open-route', path:path/u);

  // 단독으로 연 app.html 에는 부모가 없다. 그때만 주소를 직접 바꾼다.
  assert.match(appHtml, /window\.parent !== window/u);
  assert.match(appHtml, /top\.location\.href = path;/u);

  // 문서를 갈아끼우지 않으므로 화면 임시값을 넘겨받는 장치는 없어야 한다.
  for (const gone of ["kw_proto_ui_v1", "kw_proto_nav_v1"]) {
    assert.doesNotMatch(
      appHtml,
      new RegExp(gone, "u"),
      `${gone} 은 문서 교체 시절의 백업이다. 이동이 문서를 안 바꾸면 남아 있을 이유가 없다`,
    );
  }

  // 오래 남는 값이 sessionStorage 로 새면 탭을 닫을 때 거래가 사라진다.
  assert.doesNotMatch(appHtml, /sessionStorage\.setItem\('kw_proto_v1'/u);

  console.log("screen state handoff tests passed");
}

main();
