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
  const faqStream = await faqResponse.text();
  assert.equal(faqStream.includes("event: text"), true);
  assert.equal(faqStream.includes("event: action"), true);
  assert.equal(faqStream.includes('"target":"order"'), true);

  const explainResponse = await POST(
    request({
      message: "PER이 뭐야?",
      context: {
        screen: "stock",
        stockId: "KRX:005930",
        stockName: "삼성전자",
      },
    }),
  );
  const explainStream = await explainResponse.text();
  assert.equal(explainStream.includes('"kind":"explain"'), true);
  assert.equal(explainStream.includes('"scriptId":"term:per"'), true);
  assert.equal(explainStream.includes('"stage":"brief"'), true);

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

  console.log("chat route tests passed");
}

void main();
