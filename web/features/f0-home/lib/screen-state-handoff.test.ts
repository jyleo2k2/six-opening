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
 *   - 서버가 원본인 값을 다시 브라우저 저장소에 담는다 → 기기마다 다른 잔고·기록이 생긴다
 * 둘 다 화면만 봐서는 한참 뒤에나 드러난다.
 *
 * `kw_proto_v1` 은 이제 **없다.** 현금·보유는 `/api/account`, 매매 기록은 `GET /api/trades`,
 * 관심 종목은 `/api/watchlist` 가 원본이다. 되살리기 쉬운 자리라 여기서 못을 박는다.
 */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const host = read("../ConnectedPrototype.tsx");
const walletStore = read("../../../shared/store/prototype-account.js");
const walletHook = read("./use-wallet.ts");

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

  // 지갑은 브라우저 저장소를 건드리지 않는다. 다시 담기 시작하면 같은 계정이 기기마다
  // 다른 잔고를 보이고, 서버 응답과 어긋난 쪽이 화면에 남는다.
  for (const source of [walletStore, walletHook]) {
    assert.doesNotMatch(source, /localStorage|sessionStorage/u);
  }

  // 문서를 갈아끼우지 않으므로 화면 임시값을 넘겨받는 장치는 없어야 한다.
  // `kw_proto_v1` 도 같은 목록에 들어왔다 — 서버로 다 옮겼다.
  //
  // 따옴표로 감싼 것만 본다. 이 파일들의 주석은 백틱으로 옛 칸 이름을 인용하는데, 그 설명이
  // 있어야 다음 사람이 왜 없앴는지 안다 — 설명을 지우게 만드는 가드는 가드가 아니다.
  for (const gone of ["kw_proto_v1", "kw_proto_ui_v1", "kw_proto_nav_v1"]) {
    assert.doesNotMatch(
      host + walletHook + walletStore,
      new RegExp(`['"]${gone}['"]`, "u"),
      `${gone} 은 서버 없이 돌던 시절의 칸이다. 원본이 서버로 간 뒤에는 남아 있을 이유가 없다`,
    );
  }

  console.log("screen state handoff tests passed");
}

main();
