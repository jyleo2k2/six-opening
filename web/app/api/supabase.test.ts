import assert from "node:assert/strict";
import { sessionCookie } from "./supabase";

// 앱을 다시 열 때마다 로그인 화면부터 시작해야 하므로, 로그인 쿠키는 브라우저 세션을
// 넘어 유지되면 안 된다 — Max-Age 를 주면 다음 실행에도 로그인 상태가 남는다.
function main() {
  const cookie = sessionCookie(1);
  assert.match(cookie, /^kw_uid=1;/);
  assert.ok(cookie.includes("HttpOnly"));
  assert.ok(cookie.includes("SameSite=Lax"));
  assert.ok(!cookie.includes("Max-Age"), "세션 쿠키는 Max-Age 가 없어야 브라우저 종료 시 사라진다");

  console.log("supabase session cookie tests passed");
}

main();
