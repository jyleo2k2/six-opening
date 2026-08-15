import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * `web/public/ui/app.html` 은 `web/ui-src/` 에서 조립되는 산출물이다. 둘이 어긋난 채로
 * 누군가 `ui-build.mjs build` 를 돌리면 **app.html 에만 있던 화면이 조용히 사라진다.**
 *
 * 실제로 그렇게 홈 화면 전체(아바타 헤더·햄버거 메뉴의 로그아웃·목표 이미지·보유종목 카드)가
 * 한 번 날아갔다. app.html 을 직접 고치고 `split` 을 돌리지 않아 ui-src 가 낡아 있었고,
 * 다른 작업이 build 를 돌리면서 낡은 쪽으로 덮어썼다.
 *
 * 그래서 "두 쪽이 같다" 를 CI 에서 항상 확인한다. 이 검사가 깨지면 둘 중 하나다.
 *   - app.html 을 직접 고쳤다  → `node scripts/ui-build.mjs split` 로 ui-src 에 반영한다
 *   - ui-src 를 고치고 안 합쳤다 → `node scripts/ui-build.mjs build` 를 돌린다
 *
 * 어느 쪽이든 **build 를 돌리기 전에 verify 를 먼저 돌린다.** build 직후의 verify 는
 * 방금 만든 파일과 비교하는 것이라 언제나 통과해 아무것도 잡아내지 못한다.
 */
function main() {
  const webRoot = fileURLToPath(new URL("../../../", import.meta.url));

  const output = execFileSync("node", ["scripts/ui-build.mjs", "verify"], {
    cwd: webRoot,
    encoding: "utf8",
  });

  assert.match(
    output,
    /바이트 동일/u,
    `ui-src 와 app.html 이 어긋났다. build 전에 어느 쪽이 최신인지 확인한다:\n${output}`,
  );

  console.log("ui-src ↔ app.html sync test passed");
}

main();
