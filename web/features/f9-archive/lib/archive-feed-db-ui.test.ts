import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const uiRoot = new URL("../../../ui-src/", import.meta.url);
const readUi = (path: string) => readFileSync(new URL(path, uiRoot), "utf8");

test("archive family feed reads and mutates server reactions", () => {
  const manifest = JSON.parse(readUi("manifest.json")) as { files: string[] };
  const familyLoader = readUi("methods/loadFamilyProfiles.js");
  const reactionLoader = readUi("methods/loadArchiveFeedReactions.js");
  const likeAction = readUi("methods/toggleArchiveLike.js");
  const commentAction = readUi("methods/sendArchiveComment.js");
  const deleteAction = readUi("methods/deleteArchiveComment.js");
  const archive = readUi("methods/buildArchive.js");
  for (const method of ["methods/loadArchiveFeedReactions.js", "methods/toggleArchiveLike.js", "methods/sendArchiveComment.js", "methods/deleteArchiveComment.js"])
    assert.ok(manifest.files.includes(method), `${method} must be assembled into app.html`);
  assert.match(familyLoader, /loadArchiveFeedReactions\(d\.trades\)/u);
  assert.match(reactionLoader, /\/api\/comments\?transaction_id=/u);
  assert.match(reactionLoader, /\/api\/likes\?transaction_id=/u);
  assert.match(likeAction, /fetch\('\/api\/likes'/u);
  assert.match(commentAction, /fetch\('\/api\/comments'/u);
  assert.match(deleteAction, /method:'DELETE'/u);
  assert.match(archive, /this\.dbFamily\.trades/u);
  assert.match(archive, /this\.toggleArchiveLike\(id\)/u);
  assert.match(archive, /this\.sendArchiveComment\(id\)/u);
  assert.doesNotMatch(archive, /like:\s*\(\)\s*=>\s*this\.set\(\{\s*arcLikes/u);
});
