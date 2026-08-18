import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  clearArchiveSnapshot,
  readArchiveSnapshot,
  writeArchiveSnapshot,
} from "./use-archive-data";

/**
 * **되돌아온 아카이브는 처음부터 다시 그리지 않는다.**
 *
 * `ArchiveScreen` 은 다른 화면으로 나가면 통째로 언마운트된다. 그래서 훅도 매번 다시
 * 마운트되고, 예전에는 그때마다 상태가 빈칸에서 시작해 되돌아올 때마다 `기록을 불러오고
 * 있어요` 부터 다시 봤다 — 화면 하나 다녀오는 값이 매번 API 두 벌이었다.
 *
 * 지난번 화면을 메모리에 남겨 곧바로 다시 그리고 조회는 뒤에서 돌린다. 이 파일은 그
 * 저장소가 실제로 되읽히는지와, 그렇다고 **최신 확인을 건너뛰지는 않는지**를 지킨다.
 */
const source = readFileSync(new URL("./use-archive-data.ts", import.meta.url), "utf8");

const snapshot = {
  season: { cumulative: null, weeks: [] },
  family: null,
  comments: { t1: [] },
  likes: {},
};

clearArchiveSnapshot();
assert.equal(readArchiveSnapshot(), null, "한 번도 안 본 화면은 되그릴 것이 없다");

writeArchiveSnapshot(snapshot);
assert.deepEqual(readArchiveSnapshot(), snapshot);

// 세션이 갈리면 비운다. 로그아웃은 `/` 로 나가며 문서를 새로 받아 모듈째 사라지지만,
// 비우는 길이 없으면 다음 사람 화면에 앞사람 기록이 남을 수 있는 구조가 된다.
clearArchiveSnapshot();
assert.equal(readArchiveSnapshot(), null);

// 첫 상태를 지난번 화면에서 세운다. 세우지 않으면 되돌아온 화면이 다시 빈칸에서 시작한다.
assert.match(source, /useRef\(readArchiveSnapshot\(\)\)\.current/u);
assert.match(
  source,
  /useState\(!seeded\?\.season\)/u,
  "지난번 **카드**가 있을 때만 기다리는 중이 아니다 — 빈 화면을 받아 둔 것으로 치면 깜빡임이 돌아온다",
);
for (const seed of ["seeded?.season", "seeded?.family", "seeded?.comments", "seeded?.likes"]) {
  assert.ok(source.includes(seed), `${seed} 로 첫 상태를 세워야 한다`);
}

// **그래도 마운트마다 서버에 다시 묻는다.** 남겨 둔 화면은 먼저 그리려고 들고 있는 것이지
// 최신이라고 믿는 값이 아니다 — 주문하고 돌아온 화면이 옛 기록을 보여 주면 안 된다.
assert.match(source, /fetch\("\/api\/profile\/season-cards", \{ cache: "no-store" \}\)/u);
assert.match(source, /fetch\("\/api\/family\?offset=0", \{ cache: "no-store" \}\)/u);

// 브라우저 저장소에는 담지 않는다. 담으면 기기마다 다른 기록이 남고 서버 응답과 어긋난
// 쪽이 화면에 남는다 — `screen-state-handoff` 가 지갑에 걸어 둔 것과 같은 못이다.
assert.doesNotMatch(source, /localStorage|sessionStorage/u);

console.log("archive snapshot tests passed");
