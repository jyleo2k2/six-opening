import assert from "node:assert/strict";
import { resolveCommentGate, toComment } from "./route";

// 라우트의 401·502 분기는 세션·DB 에 의존한다. `DEMO_USER_ID` 가 개발용 `.env` 에서
// 늦게 주입되므로 여기서 검사하면 환경에 따라 결과가 달라진다.
// 게이트를 어느 방향으로 거는지만 고정한다 — 이 매핑이 틀리면 게이트가 통째로 무력해진다.
function main() {
  // 부모 → 자녀 기록에 남기는 코멘트만 게이트를 통과시킨다 (SPEC §4.1)
  const scold = resolveCommentGate({ body: "그러니까 내가 뭐랬어", viewerRole: "parent", ownerRole: "child" });
  assert.equal(scold.author, "parent");
  assert.equal(scold.result.ok, false);
  if (!scold.result.ok) assert.equal(scold.result.reason, "scolding");

  const recommend = resolveCommentGate({ body: "이거 지금 사라", viewerRole: "parent", ownerRole: "child" });
  assert.equal(recommend.result.ok, false);

  // 같은 문장이라도 자녀 → 부모 방향은 검사하지 않는다
  const childToParent = resolveCommentGate({ body: "이거 지금 사라", viewerRole: "child", ownerRole: "parent" });
  assert.equal(childToParent.author, "child");
  assert.equal(childToParent.result.ok, true);

  // 부모가 부모 기록에 남기는 것도 검사 대상이 아니다
  assert.equal(
    resolveCommentGate({ body: "이거 지금 사라", viewerRole: "parent", ownerRole: "parent" }).result.ok,
    true,
  );

  // 역할이 비어 있으면 자녀로 본다 — 부모 권한을 기본값으로 주면 게이트가 헐거워진다
  assert.equal(resolveCommentGate({ body: "잘 골랐네", viewerRole: null, ownerRole: "child" }).author, "child");

  // 정상 코멘트는 통과하고 앞뒤 공백이 정리된다
  const fine = resolveCommentGate({ body: "  왜 이 회사를 골랐어?  ", viewerRole: "parent", ownerRole: "child" });
  assert.equal(fine.result.ok, true);
  if (fine.result.ok) assert.equal(fine.result.body, "왜 이 회사를 골랐어?");

  // 부모가 둘이어도 API는 역할명이 아니라 profiles.name 을 그대로 내려 준다.
  const dad = toComment({
    id: "7",
    transaction_id: "t1",
    user_id: 3,
    body: "왜 이 회사를 골랐어?",
    created_at: "2026-08-14T00:00:00.000Z",
    profiles: { name: "찬영아빠", parent_child: "parent" },
  }, 3);
  assert.equal(dad.authorName, "찬영아빠");
  assert.equal(dad.author, "parent");
  assert.equal(dad.mine, true);

  // 빈 코멘트와 200자 초과는 방향과 무관하게 막힌다
  assert.equal(resolveCommentGate({ body: "   ", viewerRole: "child", ownerRole: "parent" }).result.ok, false);
  assert.equal(
    resolveCommentGate({ body: "가".repeat(201), viewerRole: "child", ownerRole: "parent" }).result.ok,
    false,
  );

  console.log("comments route tests passed");
}

main();
