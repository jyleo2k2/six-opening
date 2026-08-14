import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./FeedScreen.tsx", import.meta.url), "utf8");

assert.match(source, /fetch\("\/api\/family"/u);
assert.match(source, /fetch\(`\/api\/comments\?transaction_id=/u);
assert.match(source, /fetch\(`\/api\/likes\?transaction_id=/u);
assert.match(source, /method: "POST"/u);
assert.match(source, /method: "DELETE"/u);
assert.match(source, /comment\.authorName/u);
assert.match(source, /aria-pressed=\{like\?\.liked/u);
assert.doesNotMatch(source, /useFamilyFeedStore|readPrototypeTrades|familyTrades/u);

console.log("family feed DB reaction UI contract tests passed");
