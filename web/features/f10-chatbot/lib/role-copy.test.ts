import assert from "node:assert/strict";
import { createChatOutcome } from "./orchestrator";
import { routeMessage } from "./routing";
import { applyRoleCopy } from "./role-copy";
import type { ChatSession } from "./session";

const child: ChatSession = {
  userId: "session-child",
  familyId: "demo-family",
  role: "child",
  source: "server_session",
};
const parent: ChatSession = { ...child, userId: "session-parent", role: "parent" };
const home = { screen: "home" as const };

/** 모델이 불리면 즉시 실패한다 — 역할 분기는 전부 고정 응답 경로다. */
const noModel = async () => {
  throw new Error("역할 분기 경로에서 모델을 부르면 안 된다");
};

async function main() {
  // 1. 주문 잠금(스쿨락) 화면 안내 — 원문은 보호자용이다.
  //
  // 문이 둘이다. "주문 잠금이 뭐야?" 는 `shared/data/chatbot-knowledge` 의 정의가
  // 받고, 화면 위치를 물으면 이 라우터 가지가 받아 **홈 버튼까지 붙인다.** 아이가
  // 누를 수 없는 토글이 있는 쪽은 여기다.
  const lockForParent = await createChatOutcome(
    { message: "주문 잠금 어디 있어?", context: home },
    parent,
    { generateAnswer: noModel },
  );
  const lockForChild = await createChatOutcome(
    { message: "주문 잠금 어디 있어?", context: home },
    child,
    { generateAnswer: noModel },
  );

  assert.equal(lockForParent.response.text.includes("보호자 기능"), true);
  assert.equal(lockForParent.response.uiAction?.target, "home");

  // 아이는 자기가 켤 수 없는 기능이다. 설명이 바뀌고 그 화면으로 보내지 않는다.
  assert.equal(lockForChild.response.text.includes("보호자만 할 수 있어요"), true);
  assert.equal(lockForChild.response.uiAction, undefined);
  assert.notEqual(lockForChild.response.text, lockForParent.response.text);

  // 라우트·의도는 역할과 무관하게 같다. 바뀌는 것은 문장뿐이다.
  assert.equal(lockForChild.route, lockForParent.route);
  assert.equal(lockForChild.intent, lockForParent.intent);
  assert.equal(lockForChild.source, "fixed");

  // 2. 개인정보 안내 — 부모에게 "보호자와 함께"는 자기 자신이다.
  const privacyForChild = await createChatOutcome(
    { message: "내 계좌번호 알려줄까?", context: home },
    child,
    { generateAnswer: noModel },
  );
  const privacyForParent = await createChatOutcome(
    { message: "내 계좌번호 알려줄까?", context: home },
    parent,
    { generateAnswer: noModel },
  );

  assert.equal(privacyForChild.route, "safety");
  assert.equal(privacyForParent.route, "safety");
  assert.equal(privacyForChild.response.text.includes("보호자와 함께"), true);
  assert.equal(privacyForParent.response.text.includes("보호자와 함께"), false);
  assert.equal(privacyForParent.response.text.includes("공식 화면에서만 확인해 주세요"), true);

  // 3. 표시가 없는 응답은 어느 역할에서도 그대로다.
  const term = routeMessage("수익률이 뭐야?", home);
  assert.equal(term.roleCopy, undefined);
  assert.equal(applyRoleCopy(term, "parent").text, term.text);
  assert.equal(applyRoleCopy(term, "child").text, term.text);

  // 4. 표시된 갈래만 바뀐다. 같은 개인정보 응답이라도 "보호자"가 없는 갈래는 손대지 않는다.
  const hidden = routeMessage("내 주소 숨겨 줘", home);
  assert.equal(hidden.roleCopy, undefined);
  assert.equal(applyRoleCopy(hidden, "parent").text, hidden.text);

  // 5. 교체문은 이미 해요체다 — reply() 의 변환을 지난 뒤에 갈아끼우기 때문이다.
  assert.equal(/(해요|예요|세요|어요)\.?$/u.test(lockForChild.response.text.trim()), true);

  console.log("role copy tests passed");
}

void main();
