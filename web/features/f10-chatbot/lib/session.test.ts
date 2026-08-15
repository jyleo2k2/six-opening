import assert from "node:assert/strict";
import { resolveChatSession } from "./session";

function main() {
  // 프로필이 없으면 데모 세션이다. 로그인 전 요청도 답은 받는다.
  const demo = resolveChatSession(null);
  assert.equal(demo.source, "server_demo");
  assert.equal(demo.role, "child");

  // 부모 계정으로 로그인하면 부모 세션이 된다. 이 값이 고정 'child' 로 새는 것이
  // 역할 분기를 넣는 순간 조용히 터지던 문제였다.
  const parent = resolveChatSession({ id: 7, parent_child: "parent", family_tag: "찬영가족" });
  assert.deepEqual(parent, {
    userId: "7",
    familyId: "찬영가족",
    role: "parent",
    source: "server_session",
  });

  const child = resolveChatSession({ id: 3, parent_child: "child", family_tag: "찬영가족" });
  assert.equal(child.role, "child");
  assert.equal(child.userId, "3");

  // 역할·가족이 비어 있으면 더 좁은 쪽으로 잡는다.
  const unknown = resolveChatSession({ id: 9, parent_child: null, family_tag: null });
  assert.equal(unknown.role, "child");
  assert.equal(unknown.familyId, "demo-family");

  console.log("chat session tests passed");
}

main();
