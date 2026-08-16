import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * 종목 뉴스 화면 계약 가드. 상세·뉴스 화면이 React(`features/f0-home`)로 옮겨 가서
 * 이 가드도 그 소스를 읽는다.
 */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

const detailScreen = read("../../../f0-home/DetailScreen.tsx");
const newsScreen = read("../../../f0-home/NewsScreen.tsx");
const newsContract = read("../../../f0-home/lib/stock-news.ts");

// 목록·상세 조회는 검수 통과분만 주는 서버 경로를 쓴다.
assert.match(detailScreen, /fetch\(`\/api\/news\?stockId=/u);
assert.match(newsScreen, /fetch\(`\/api\/news\//u);
// 상세 카드의 요약은 목록 응답의 headline 그대로다.
assert.match(detailScreen, /newsItem\?\.headline/u);
// 회사 뉴스만 화면에 올린다. 시황(market) 예외를 되살리지 않는다.
assert.match(newsContract, /news\.scope !== "company"/u);
assert.doesNotMatch(newsContract, /scope === "market"/u);
// 최신본을 다시 받아도 같은 뉴스일 때만 갈아끼운다.
assert.match(newsScreen, /fresh\.newsId !== item\.newsId \|\| fresh\.articleId !== item\.articleId/u);
// 3줄 요약과 원문 보기.
assert.match(newsScreen, /news\.summaryLines\.map/u);
assert.match(newsScreen, /3줄 요약/u);
assert.match(newsScreen, /원문 보기 ↗/u);
assert.match(newsContract, /timeZone: "Asia\/Seoul"/u);

console.log("news prototype UI contract tests passed");
