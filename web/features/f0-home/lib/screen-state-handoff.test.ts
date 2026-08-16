import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * 화면을 옮겨도 **문서를 갈아끼우지 않는다.**
 *
 * 예전에는 옮긴 화면으로 갈 때 `top.location.href` 로 문서를 새로 받았다. 그러면 `app.html`
 * 이 처음부터 다시 뜨는데, `/api/account` 응답이 오기 전까지 아이 계정 데모로 폴백해
 * **로그인한 사람이 아닌 계정의 화면이 잠깐 보였다.** 화면을 옮길 때마다 그랬다.
 *
 * iframe 을 걷어낸 지금 화면은 전부 React 이고 이동은 `history.replaceState` 뿐이다.
 * 그래도 이 계약이 조용히 깨지는 방향은 그대로 둘이다.
 *   - 화면 이동을 `location.href`·`location.assign` 으로 되돌린다 → 문서가 다시 뜬다
 *   - 오래 남는 값(acc·records)을 sessionStorage 로 옮긴다 → 탭을 닫으면 거래가 사라진다
 * 둘 다 화면만 봐서는 한참 뒤에나 드러난다.
 */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const host = read("../ConnectedPrototype.tsx");
const walletStore = read("../../../shared/store/prototype-account.js");

function main() {
  // 이동은 주소만 바꾼다. 문서를 새로 받지 않는다.
  //
  // 화면 이동을 소유한 것은 `ConnectedPrototype` 하나다. 개별 화면은 `onLeave(path)` 로
  // 올리기만 하므로 여기만 지키면 된다. `HomeScreen` 의 로그아웃은 예외로 남긴다 —
  // 세션 쿠키를 지운 뒤 서버가 로그인 화면을 다시 그려야 해서 문서를 새로 받는 것이 맞다.
  assert.match(host, /history\.replaceState\(null, "", path\)/u);
  assert.doesNotMatch(
    host,
    /location\.(href\s*=|assign\(|replace\()/u,
    "화면 이동은 `onLeave` → `openRoute` 하나로만 흐른다",
  );

  // 지갑은 localStorage 그대로다. sessionStorage 로 새면 탭을 닫을 때 거래가 사라진다.
  assert.match(walletStore, /localStorage\.setItem\('kw_proto_v1'/u);
  assert.doesNotMatch(walletStore, /sessionStorage/u);

  // 문서를 갈아끼우지 않으므로 화면 임시값을 넘겨받는 장치는 없어야 한다.
  for (const gone of ["kw_proto_ui_v1", "kw_proto_nav_v1"]) {
    assert.doesNotMatch(
      host + walletStore,
      new RegExp(gone, "u"),
      `${gone} 은 문서 교체 시절의 백업이다. 이동이 문서를 안 바꾸면 남아 있을 이유가 없다`,
    );
  }

  console.log("screen state handoff tests passed");
}

main();
