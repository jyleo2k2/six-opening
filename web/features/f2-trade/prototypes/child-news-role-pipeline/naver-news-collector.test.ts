import assert from "node:assert/strict";
import test from "node:test";
import {
  parseNaverArticleHtml,
  parseNaverSearchArticleUrls,
  scoreArticleForStock,
  selectPipelineArticleCandidates,
  selectSourceUnits,
} from "./naver-news-collector";

const stock = {
  name: "삼성전자",
  searchAliases: ["Samsung Electronics"],
};

test("검색 HTML에서 네이버 기사 URL을 정규화하고 중복을 없앤다", () => {
  const html = `
    <a href="https://n.news.naver.com/mnews/article/001/0000000001?sid=101">첫 기사</a>
    <a href="https://n.news.naver.com/article/001/0000000001">중복 기사</a>
    <a href="https://n.news.naver.com/mnews/article/002/0000000002">둘째 기사</a>
  `;
  assert.deepEqual(parseNaverSearchArticleUrls(html), [
    "https://n.news.naver.com/mnews/article/001/0000000001",
    "https://n.news.naver.com/mnews/article/002/0000000002",
  ]);
});

test("기사 HTML에서 원문 링크와 실제 본문 근거를 읽는다", () => {
  const html = `
    <meta property="og:title" content="삼성전자, 새 생산라인 완공&amp;가동">
    <meta property="og:article:author" content="테스트경제 | 네이버">
    <span data-date-time="2026-08-13 10:20:30"></span>
    <a href="https://news.example.com/a?x&#x3D;1&amp;y&#x3D;2" class="media_end_head_origin_link">원문</a>
    <article id="dic_area">
      <p>삼성전자는 새 생산라인을 완공하고 이날부터 제품 생산을 시작했다.</p>
      <p>회사는 이곳에서 연간 6500대를 만들 수 있다고 밝혔다.</p>
      <p>새 시설에는 1200억원이 들어갔다.</p>
    </article>
  `;
  const article = parseNaverArticleHtml(
    html,
    "https://n.news.naver.com/mnews/article/001/0000000001",
  );
  assert.equal(article.articleId, "NAVER-001-0000000001");
  assert.equal(article.title, "삼성전자, 새 생산라인 완공&가동");
  assert.equal(article.publisher, "테스트경제");
  assert.equal(article.publishedAt, "2026-08-13T01:20:30.000Z");
  assert.equal(article.sourceUrl, "https://news.example.com/a?x=1&y=2");
  assert.equal(article.bodySegments.length, 3);
});

test("직접 사건 기사는 홍보·투자 제목보다 높은 점수를 받는다", () => {
  const base = {
    articleId: "NAVER-001-0000000001",
    publisher: "테스트경제",
    publishedAt: "2026-08-13T01:20:30.000Z",
    sourceUrl: "https://news.example.com/a",
    naverUrl: "https://n.news.naver.com/mnews/article/001/0000000001",
  };
  const material = {
    ...base,
    title: "삼성전자, 2분기 영업이익 확정",
    bodySegments: ["삼성전자는 2분기 매출과 영업이익을 발표했다."],
  };
  const promotion = {
    ...base,
    title: "삼성전자, 팝업 행사 공개…증권사 목표가 상향",
    bodySegments: ["삼성전자는 체험 행사를 열었다."],
  };
  const universe = [stock, { name: "SK하이닉스", searchAliases: [] }];
  assert.ok(
    scoreArticleForStock(material, stock, universe, "2026-08-13").score >
      scoreArticleForStock(promotion, stock, universe, "2026-08-13").score,
  );
});

test("원문 근거는 기사 순서를 유지하며 최대 10개만 고른다", () => {
  const article = {
    articleId: "NAVER-001-0000000001",
    title: "삼성전자 실적",
    publisher: "테스트경제",
    publishedAt: "2026-08-13T01:20:30.000Z",
    sourceUrl: "https://news.example.com/a",
    naverUrl: "https://n.news.naver.com/mnews/article/001/0000000001",
    bodySegments: Array.from(
      { length: 14 },
      (_, index) => `삼성전자의 ${index + 1}번째 실적 근거 문장에는 매출 ${index + 1}억원이 적혀 있다.`,
    ),
  };
  const units = selectSourceUnits(article, stock);
  assert.equal(units.length, 10);
  assert.deepEqual(units.map((unit) => unit.id), ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"]);
  const sourceIndexes = units.map((unit) => Number(unit.text.match(/(\d+)번째/u)?.[1]));
  assert.deepEqual(sourceIndexes, [...sourceIndexes].sort((left, right) => left - right));
});

test("폴백 후보는 최신 날짜부터 고르고 같은 날짜는 3건까지만 둔다", () => {
  const articles = [
    ...Array.from({ length: 4 }, (_, index) => ({ day: "2026-08-14", index })),
    ...Array.from({ length: 4 }, (_, index) => ({ day: "2026-08-13", index: index + 4 })),
    ...Array.from({ length: 4 }, (_, index) => ({ day: "2026-08-12", index: index + 8 })),
    ...Array.from({ length: 4 }, (_, index) => ({ day: "2026-08-11", index: index + 12 })),
    ...Array.from({ length: 4 }, (_, index) => ({ day: "2026-08-10", index: index + 16 })),
  ].map(({ day, index }) => ({
    articleId: `NAVER-001-${String(index).padStart(10, "0")}`,
    title: `삼성전자, ${index + 1}번째 실적 발표`,
    publisher: "테스트경제",
    publishedAt: `${day}T01:00:00.000Z`,
    sourceUrl: `https://news.example.com/${index}`,
    naverUrl: `https://n.news.naver.com/mnews/article/001/${String(index).padStart(10, "0")}`,
    bodySegments: ["삼성전자는 매출과 영업이익을 발표했다."],
  }));

  const selected = selectPipelineArticleCandidates(
    articles,
    stock,
    [stock],
    "2026-08-14",
  );
  // 하루 4건씩 5일 = 20건 입력. 하루 상한 3건이 먼저 걸려 15건이 남는다.
  assert.equal(selected.length, 15);
  assert.deepEqual(
    selected.map((item) => item.publishedDayKst),
    [
      "2026-08-14", "2026-08-14", "2026-08-14",
      "2026-08-13", "2026-08-13", "2026-08-13",
      "2026-08-12", "2026-08-12", "2026-08-12",
      "2026-08-11", "2026-08-11", "2026-08-11",
      "2026-08-10", "2026-08-10", "2026-08-10",
    ],
  );
});

test("종목당 후보는 24건에서 끊는다", () => {
  const articles = Array.from({ length: 40 }, (_, index) => ({
    articleId: `NAVER-001-${String(index).padStart(10, "0")}`,
    title: `삼성전자, ${index + 1}번째 실적 발표`,
    publisher: "테스트경제",
    // 하루 상한(3건)이 아니라 종목당 상한(24건)이 걸리도록 날짜를 모두 다르게 둔다.
    publishedAt: `2026-0${index < 20 ? 8 : 7}-${String((index % 20) + 10).padStart(2, "0")}T01:00:00.000Z`,
    sourceUrl: `https://news.example.com/${index}`,
    naverUrl: `https://n.news.naver.com/mnews/article/001/${String(index).padStart(10, "0")}`,
    bodySegments: ["삼성전자는 매출과 영업이익을 발표했다."],
  }));

  assert.equal(selectPipelineArticleCandidates(articles, stock, [stock], "2026-08-29").length, 24);
});
