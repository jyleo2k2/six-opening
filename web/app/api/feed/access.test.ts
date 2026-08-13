import assert from "node:assert/strict";
import { isTransactionId, parseTransactionIds } from "./access";

function main() {
  // 체결 id — 빈 값·공백·과도한 길이는 막고 형식은 좁히지 않는다
  assert.equal(isTransactionId("f47ac10b-58cc-4372-a567-0e02b2c3d479"), true);
  assert.equal(isTransactionId("12345"), true);
  assert.equal(isTransactionId(""), false);
  assert.equal(isTransactionId("   "), false);
  assert.equal(isTransactionId("x".repeat(65)), false);
  assert.equal(isTransactionId(null), false);
  assert.equal(isTransactionId(42), false);

  // 목록 파싱 — 공백 제거·중복 제거
  assert.deepEqual(parseTransactionIds("a,b,c"), ["a", "b", "c"]);
  assert.deepEqual(parseTransactionIds(" a , b "), ["a", "b"]);
  assert.deepEqual(parseTransactionIds("a,a,b"), ["a", "b"]);

  // 빈 입력·전부 공백은 거절
  assert.equal(parseTransactionIds(null), null);
  assert.equal(parseTransactionIds(""), null);
  assert.equal(parseTransactionIds(" , , "), null);

  // 한 건이라도 형식이 깨지면 통째로 거절한다. 일부만 조용히 버리면
  // 화면이 요청한 카드와 응답 개수가 어긋난다.
  assert.equal(parseTransactionIds("a,,b"), null);
  assert.equal(parseTransactionIds(`a,${"x".repeat(65)}`), null);

  // 상한 — 피드가 한 번에 너무 많이 훑지 못하게 막는다
  assert.equal(parseTransactionIds(Array.from({ length: 50 }, (_, i) => `t${i}`).join(","))?.length, 50);
  assert.equal(parseTransactionIds(Array.from({ length: 51 }, (_, i) => `t${i}`).join(",")), null);

  console.log("feed access tests passed");
}

main();
