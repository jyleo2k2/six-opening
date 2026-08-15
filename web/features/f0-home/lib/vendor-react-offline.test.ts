import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * 프로토타입 화면은 `public/ui/support.js` 가 그린다. 그런데 이 벤더 런타임은
 * `window.React`·`window.ReactDOM` 이 없으면 **unpkg.com 에서 React 를 받아온다.**
 * 네트워크가 막힌 곳(발표장 등)에서는 그대로 화면이 백지가 된다.
 *
 * 그래서 `shell-0.html` 이 로컬 사본을 먼저 싣고, `loadReactUmd` 의
 * `if (w.React && w.ReactDOM) return` 으로 CDN 경로를 건너뛰게 한다.
 *
 * 이 검사가 깨지는 경우는 둘이다.
 *   - 벤더 사본이 support.js 가 기대하는 버전과 어긋났다 → vendor/ 를 다시 받는다
 *   - 스크립트 순서가 바뀌어 support.js 가 먼저 돈다 → shell-0.html 순서를 되돌린다
 * 둘 다 조용히 CDN 을 다시 타게 만들어, 사무실에서는 멀쩡하고 현장에서만 터진다.
 */
const supportSource = readFileSync(
  new URL("../../../public/ui/support.js", import.meta.url),
  "utf8",
);
const appHtml = readFileSync(
  new URL("../../../public/ui/app.html", import.meta.url),
  "utf8",
);

function declared(name: string) {
  const match = supportSource.match(new RegExp(`var ${name} = "([^"]+)"`, "u"));
  assert.ok(match, `support.js 에서 ${name} 를 찾지 못했다`);
  return match[1];
}

function sha384(path: string) {
  const bytes = readFileSync(new URL(path, import.meta.url));
  return createHash("sha384").update(bytes).digest("base64");
}

const VENDORED = [
  { url: "REACT_URL", sri: "REACT_SRI", file: "../../../public/ui/vendor/react.production.min.js" },
  { url: "REACT_DOM_URL", sri: "REACT_DOM_SRI", file: "../../../public/ui/vendor/react-dom.production.min.js" },
];

function main() {
  for (const { url, sri, file } of VENDORED) {
    const expected = declared(sri);
    const actual = sha384(file);
    assert.equal(
      `sha384-${actual}`,
      expected,
      `${file} 가 support.js 의 ${sri} 와 다르다. ${declared(url)} 를 다시 받아야 한다`,
    );
  }

  // 순서: 로컬 React 두 개가 support.js 보다 먼저 실행돼야 한다.
  const reactAt = appHtml.indexOf("vendor/react.production.min.js");
  const reactDomAt = appHtml.indexOf("vendor/react-dom.production.min.js");
  const supportAt = appHtml.indexOf('src="./support.js"');
  assert.ok(reactAt > 0, "app.html 에 로컬 react 스크립트가 없다");
  assert.ok(reactDomAt > 0, "app.html 에 로컬 react-dom 스크립트가 없다");
  assert.ok(supportAt > 0, "app.html 에 support.js 스크립트가 없다");
  assert.ok(reactAt < supportAt, "react 가 support.js 보다 먼저 실행돼야 한다");
  assert.ok(reactDomAt < supportAt, "react-dom 이 support.js 보다 먼저 실행돼야 한다");

  console.log("vendor react offline tests passed");
}

main();
