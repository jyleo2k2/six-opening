import assert from "node:assert/strict";
import { sessionCookie, sessionUserIdFromCookie } from "./supabase";

// 앱을 다시 실행하면 로그인 화면부터 시작해야 한다. 쿠키를 브라우저 세션 쿠키로 두는 것만으로는
// 부족해서(브라우저가 세션을 복원한다) 서버 부팅 표식을 쿠키 값에 넣고 읽을 때 대조한다.
function main() {
  const cookie = sessionCookie(1);
  assert.match(cookie, /^kw_uid=1\./);
  assert.ok(cookie.includes("HttpOnly"));
  assert.ok(cookie.includes("SameSite=Lax"));
  assert.ok(!cookie.includes("Max-Age"), "세션 쿠키는 Max-Age 가 없어야 브라우저 종료 시 사라진다");

  // 같은 실행 안에서는 로그인이 유지된다. 새로고침·화면 이동마다 로그아웃되면 앱을 못 쓴다.
  const value = cookie.slice("kw_uid=".length, cookie.indexOf(";"));
  assert.equal(sessionUserIdFromCookie(value), 1);
  assert.equal(sessionUserIdFromCookie(sessionCookie(42).slice("kw_uid=".length).split(";")[0]), 42);

  // 다른 실행에서 발급된 쿠키는 무효다 — 이게 재실행 때 로그인 화면을 보장한다.
  assert.equal(sessionUserIdFromCookie("1.deadbeefcafe"), null);
  // 부팅 표식이 붙기 전에 발급된 옛 쿠키도 무효다. 30일 Max-Age 로 디스크에 남아 있어
  // 코드를 고쳐도 저절로 사라지지 않으므로, 서버가 읽을 때 걸러야 한다.
  assert.equal(sessionUserIdFromCookie("1"), null);
  assert.equal(sessionUserIdFromCookie(undefined), null);
  assert.equal(sessionUserIdFromCookie(""), null);
  // 표식은 맞아도 id 가 사용자 id 가 아니면 무효다.
  const boot = value.slice(value.indexOf(".") + 1);
  assert.equal(sessionUserIdFromCookie(`0.${boot}`), null);
  assert.equal(sessionUserIdFromCookie(`-1.${boot}`), null);
  assert.equal(sessionUserIdFromCookie(`abc.${boot}`), null);

  console.log("supabase session cookie tests passed");
}

main();
