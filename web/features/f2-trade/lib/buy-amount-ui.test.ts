import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../../../public/ui/app.html", import.meta.url),
  "utf8",
);

assert.doesNotMatch(source, /Math\.min\(9999999/u);
assert.match(
  source,
  /const availableCash = Math\.max\(0, Math\.floor\(m\.cash\)\);/u,
);
assert.match(
  source,
  /amount: Math\.min\(availableCash, parseInt\(v \|\| '0', 10\) \|\| 0\), amountSource:'custom'/u,
);

for (const amount of [10_000, 30_000, 50_000]) {
  assert.match(
    source,
    new RegExp(
      `this\\.chip\\(s\\.draft\\.amountSource === 'preset' && amount === ${amount}\\)`,
      "u",
    ),
  );
}

assert.match(source, /chipC: this\.chip\(s\.draft\.amountSource === 'custom'\)/u);

console.log("buy amount prototype UI contract tests passed");
