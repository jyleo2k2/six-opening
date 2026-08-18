import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../F10ChatbotDemo.tsx", import.meta.url), "utf8");

assert.match(source, /duration-1000 ease-out/u);
assert.match(source, /SHEET_ENTER_EASING/u);
assert.match(
  source,
  /transitionTimingFunction: isSheetEntering\s*\?\s*SHEET_ENTER_EASING/u,
);
assert.match(source, /isBackdropVisible/u);
assert.match(source, /transition-opacity duration-200/u);
assert.doesNotMatch(source, /duration-700/u);

console.log("chatbot motion tests passed");
