import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * 매수 금액 UI 계약 가드. 매수 화면이 React(`features/f0-home`)로 옮겨 가서
 * 이 가드도 그 소스를 읽는다 — 지갑을 넘는 금액을 만들 수 없다는 계약을 지킨다.
 */
const orderView = readFileSync(
  new URL("../../f0-home/lib/order-view.ts", import.meta.url),
  "utf8",
);
const orderScreen = readFileSync(
  new URL("../../f0-home/OrderScreen.tsx", import.meta.url),
  "utf8",
);

assert.doesNotMatch(orderView, /9999999/u);
assert.match(orderView, /const availableCash = Math\.max\(0, Math\.floor\(cash\)\);/u);
assert.match(
  orderScreen,
  /amount: Math\.min\(math\.availableCash, parseInt\(v \|\| "0", 10\) \|\| 0\), amountSource: "custom"/u,
);

for (const [amount, label] of [
  [10000, "1만원"],
  [30000, "3만원"],
  [50000, "5만원"],
] as const) {
  assert.match(orderScreen, new RegExp(`\\[${amount}, "${label}"\\]`, "u"));
}

assert.match(
  orderScreen,
  /chipStyle\(draft\.amountSource === "preset" && draft\.amount === v\)/u,
);
assert.match(orderScreen, /chipStyle\(draft\.amountSource === "custom"\)/u);

console.log("buy amount prototype UI contract tests passed");
