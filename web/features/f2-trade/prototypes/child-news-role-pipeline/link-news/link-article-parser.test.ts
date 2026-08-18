import assert from "node:assert/strict";
import test from "node:test";
import {
  blankScripts,
  dropTitleAndDuplicates,
  findArticleBodySegments,
  parseLinkArticleHtml,
  readAmpUrl,
  readJsonLdArticles,
  sliceBalancedElement,
  splitBodySegments,
  stripTitleSuffix,
  toPublishedAt,
} from "./link-article-parser";

const body = (text: string) => `<p>${text}</p>`;

test("본문 컨테이너를 닫는 태그까지만 잘라 관련기사를 섞지 않는다", () => {
  const html = `
    <div id="articleBody">
      ${body("삼성중공업은 유럽 선사로부터 원유 운반선 2척을 2680억원에 수주했다고 3일 공시했다.")}
      <div class="inner">${body("삼성중공업은 2029년 8월 말까지 선박을 인도할 계획이라고 밝혔다.")}</div>
    </div>
    <div class="related">${body("다른 회사의 전혀 관계없는 기사 제목이 여기에 길게 들어 있습니다.")}</div>
  `;
  const segments = findArticleBodySegments(html);
  assert.equal(segments.length, 2);
  assert.ok(segments.every((segment) => segment.includes("삼성중공업")));
});

test("스크립트 안의 태그 문자열은 태그로 세지 않는다", () => {
  // 뉴스1은 `__NEXT_DATA__` 에 `<div>` 가 문자열로 들어 있어 짝이 영영 맞지 않았다.
  const html = `<script>window.data = "<div><div>";</script><div id="articleBody">${body("본문 문장이 여기에 충분히 길게 들어 있습니다.")}</div>`;
  assert.equal(blankScripts(html).length, html.length);
  assert.deepEqual(findArticleBodySegments(html), ["본문 문장이 여기에 충분히 길게 들어 있습니다."]);
});

test("닫는 태그가 없으면 기사 끝 표지에서 자른다", () => {
  const html = `<div id="articleBody">${body("본문 문장이 여기에 충분히 길게 들어 있습니다.")}<p>사업자등록번호 : 101-86-62870</p>`;
  const inner = sliceBalancedElement(html, html.indexOf("<div"));
  assert.ok(inner.includes("본문 문장"));
  assert.ok(!inner.includes("101-86-62870"));
});

test("기사 끝 표지 뒤의 줄은 통째로 버린다", () => {
  const segments = splitBodySegments(
    [
      body("올해 상반기 영업이익은 1016억원으로 집계됐다고 회사가 밝혔다."),
      body("ⓒ 뉴시스"),
      body("관계없는 다른 기사 제목이 목록으로 길게 이어지고 있습니다."),
    ].join(""),
  );
  assert.deepEqual(segments, ["올해 상반기 영업이익은 1016억원으로 집계됐다고 회사가 밝혔다."]);
});

test("JSON-LD 안에 주석이 섞여 있어도 읽는다", () => {
  // KBS 는 JSON 안에 `//` 주석을 남겨 두어 그냥 파싱하면 전부 버려졌다.
  const html = `<script type="application/ld+json">
    {
      "@type": "NewsArticle",
      // substringAndInsert 주석
      "datePublished": "2026-08-17 14:03:54"
    }
  </script>`;
  assert.equal(readJsonLdArticles(html)[0]?.datePublished, "2026-08-17 14:03:54");
});

test("Arc(Fusion) 사이트는 스크립트 안 JSON 에서 본문을 읽는다", () => {
  const globalContent = JSON.stringify({
    content_elements: [
      { type: "text", content: "삼성중공업이 원유 운반선 2척을 추가 수주했다고 공시했습니다." },
      { type: "image", content: "사진 설명" },
    ],
  });
  const html = `<script>Fusion.globalContent=${globalContent};Fusion.globalContentConfig={};</script>`;
  assert.deepEqual(findArticleBodySegments(html), [
    "삼성중공업이 원유 운반선 2척을 추가 수주했다고 공시했습니다.",
  ]);
});

test("제목을 그대로 반복한 줄과 중복 문장은 근거에서 뺀다", () => {
  const title = "오리온, 상반기 영업익 17.9% 증가";
  assert.deepEqual(
    dropTitleAndDuplicates(
      ["오리온, 상반기 영업익 17.9% 증가", "상반기 매출은 1조8239억 원이다.", "상반기 매출은 1조8239억 원이다."],
      title,
    ),
    ["상반기 매출은 1조8239억 원이다."],
  );
});

test("매체 꼬리를 뗀 제목을 쓴다", () => {
  assert.equal(stripTitleSuffix("농심 웰치스, 배틀그라운드와 협업 | 스타뉴스", "스타뉴스"), "농심 웰치스, 배틀그라운드와 협업");
  assert.equal(stripTitleSuffix("통합 대한항공 신규 노선 취항도-경제ㅣ한국일보", "한국일보"), "통합 대한항공 신규 노선 취항도-경제");
});

test("콜론 없는 오프셋과 공백 구분 시각을 모두 읽는다", () => {
  assert.equal(toPublishedAt("2026-08-16T09:00:00+0900"), "2026-08-16T00:00:00.000Z");
  assert.equal(toPublishedAt("2026-08-17 14:03:54"), "2026-08-17T05:03:54.000Z");
  assert.throws(() => toPublishedAt(""), /발행 시각이 비어 있습니다/u);
});

test("AMP 주소를 링크 태그에서 읽는다", () => {
  assert.equal(
    readAmpUrl('<link rel="amphtml" href="https://www.news1.kr/amp/industry/6260484"/>'),
    "https://www.news1.kr/amp/industry/6260484",
  );
  assert.equal(readAmpUrl("<link rel=\"canonical\" href=\"https://example.com\">"), "");
});

test("제목·언론사·발행시각·본문을 함께 읽고 빠지면 실패한다", () => {
  const html = `
    <meta property="og:title" content="오리온, 상반기 영업익 17.9%↑ | 스포츠서울">
    <meta property="og:site_name" content="스포츠서울">
    <meta property="article:published_time" content="2026-08-17T16:58:18+09:00">
    <div class="article-body">${body("오리온의 올해 상반기 영업이익은 2980억 원으로 17.9% 늘었다고 밝혔다.")}</div>
  `;
  const parsed = parseLinkArticleHtml(html, "https://example.com/1");
  assert.equal(parsed.title, "오리온, 상반기 영업익 17.9%↑");
  assert.equal(parsed.publisher, "스포츠서울");
  assert.equal(parsed.publishedAt, "2026-08-17T07:58:18.000Z");
  assert.deepEqual(parsed.bodySegments, [
    "오리온의 올해 상반기 영업이익은 2980억 원으로 17.9% 늘었다고 밝혔다.",
  ]);

  assert.throws(
    () => parseLinkArticleHtml(html.replace(/<div class="article-body">[\s\S]*?<\/div>/u, ""), "https://example.com/1"),
    /기사 본문을 읽지 못했습니다/u,
  );
});
