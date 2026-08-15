import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "./route";

function request(body: unknown) {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function main() {
  const faqResponse = await POST(
    request({ message: "매수 어떻게 해?", context: { screen: "home" } }),
  );
  assert.equal(faqResponse.status, 200);
  // 답이 온 요청도 로그에서 되찾을 수 있어야 한다.
  assert.match(faqResponse.headers.get("X-Request-Id") ?? "", /^[0-9a-f-]{36}$/u);
  const faqStream = await faqResponse.text();
  assert.equal(faqStream.includes("event: text"), true);
  assert.equal(faqStream.includes("event: action"), true);
  assert.equal(faqStream.includes('"target":"order"'), true);
  assert.equal(faqStream.includes('"kind":"explain"'), false);
  assert.equal(faqStream.includes('"scriptId"'), false);

  const guidedResponse = await POST(
    request({
      message: "PER이 뭐야?",
      context: {
        screen: "stock",
        stockId: "KRX:005930",
        stockName: "삼성전자",
      },
    }),
  );
  const guidedStream = await guidedResponse.text();
  assert.equal(guidedStream.includes('"kind":"explain"'), true);
  assert.equal(guidedStream.includes('"scriptId":"term:per"'), true);

  const refusalResponse = await POST(
    request({ message: "뭐 사면 돼?", context: { screen: "stock" } }),
  );
  const refusalStream = await refusalResponse.text();
  assert.equal(refusalStream.includes("특정 종목을 고르거나"), true);
  assert.equal(refusalStream.includes("event: done"), true);

  const spoofedIdentity = await POST(
    request({
      message: "내 기록 보여줘",
      userId: "parent",
      context: { screen: "archive" },
    }),
  );
  assert.equal(spoofedIdentity.status, 400);
  // 거절도 같은 머리글을 달고, 무엇 때문에 막혔는지 이름을 남긴다. 화면이 "낮잠" 한 문구로
  // 뭉뚱그리던 실패를 서버 로그와 맞춰 보려면 이 둘이 필요하다.
  assert.match(
    spoofedIdentity.headers.get("X-Request-Id") ?? "",
    /^[0-9a-f-]{36}$/u,
  );
  assert.deepEqual(await spoofedIdentity.json(), {
    error: "Invalid chat payload",
    code: "invalid_payload",
  });

  console.log("chat route tests passed");
}

void main();
