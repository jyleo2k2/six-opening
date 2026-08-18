/**
 * 언론사 기사 페이지에서 제목·언론사·발행시각·본문 문장을 읽는다.
 *
 * `naver-news-collector.ts` 는 네이버 기사 페이지 하나만 읽는다(`dic_area`,
 * `data-date-time`). 여기서는 대표님이 직접 주신 링크가 30여 개 언론사로 흩어져 있어
 * 그 방식을 쓸 수 없다. 대신 세 곳에서만 값을 읽는다.
 *
 * - 제목·언론사: `og:title`·`og:site_name` (48건 전부 있었다)
 * - 발행시각: `article:published_time` → JSON-LD `datePublished` 순
 * - 본문: 기사 본문 컨테이너를 **닫는 태그까지 정확히 잘라서** 문장으로 나눈다
 *
 * 본문 규칙만 긴 데는 이유가 있다. 처음에는 컨테이너 여는 태그부터 고정 길이로 잘랐는데,
 * 그러면 관련기사 목록과 인라인 스크립트까지 근거 문장으로 딸려 왔다(KBS 807문장,
 * 뉴시스 171문장). 근거 문장이 오염되면 편집자가 그 기사에 없는 사실을 쓰게 된다.
 *
 * 실측 48건에서 걸린 예외도 여기서 함께 처리한다.
 *
 * | 증상 | 매체 | 처리 |
 * |---|---|---|
 * | 본문이 `Fusion.globalContent` JSON 안에만 있음 | 조선비즈 | Arc 전용 경로를 먼저 본다 |
 * | JSON-LD 안에 `//` 주석이 섞여 파싱 실패 | KBS | 주석을 지우고 다시 파싱한다 |
 * | `<div>` 짝이 맞지 않아 균형 스캔 실패 | 뉴스1 | 끝 표지까지만 잘라 쓴다 |
 * | 본문 첫 줄이 기사 제목과 같음 | 다수 | 제목과 같은 줄은 근거에서 뺀다 |
 */

export type ParsedLinkArticle = {
  title: string;
  publisher: string;
  publishedAt: string;
  bodySegments: string[];
};

/** 본문 컨테이너로 볼 id·class·itemprop 조각. 사이트마다 이름이 달라 넓게 잡고 밀도로 고른다. */
const BODY_CONTAINER_HINT =
  /(?:article(?:_|-)?(?:body|view|content|txt|text)|news(?:_|-)?(?:body|content|view|txt)|view(?:_|-)?(?:con|content|text|body)|cont(?:_|-)?(?:body|text)|read(?:_|-)?body|detail(?:_|-)?(?:body|content|txt)|story(?:_|-)?body|articleBody|art_txt|txt_area)/i;

/** 균형 스캔이 실패했을 때 본문이 여기서 끝났다고 보는 표지. */
const BODY_END_MARKERS = [
  "</article>",
  "무단전재",
  "무단 전재",
  "사업자등록번호",
  "관련기사",
  "많이 본 뉴스",
  "저작권자",
];

/** 본문이 아닌 줄. 저작권·기자 메일·안내 문구·목록 제목이 근거 문장이 되면 안 된다. */
const BOILERPLATE = [
  /무단\s*전재|재배포\s*금지|저작권자|Copyright|ⓒ|©/iu,
  /[a-z\d._%+-]+@[a-z\d.-]+\.[a-z]{2,}/iu,
  /^(?:등록|입력|수정|승인|송고)\s*\d{4}[.\-/년]/u,
  /^(?:사진|자료|그래픽|영상|이미지|표)\s*[=:]/u,
  /^▲/u,
  /^(?:업데이트)\s*\d{4}[.\-/]/u,
  /^[■◆●▶]/u,
  /관련\s*기사|관련종목|많이\s*본|인기\s*기사|주요\s*뉴스|구독하기|기사\s*제보|뉴스레터/u,
  /연합뉴스만의 특별한|앱\s*다운로드|카카오톡|구글 플레이|Google 검색에서|네이버에서\s/u,
  /기사의 본문 내용은|글자크기로 변경|AI\s*(?:요약|프리즘)|편집자\s*주/u,
  /독자 유형별|맞춤 뉴스|전체 내용의 이해를 위해|기사 본문을 확인/u,
  /주소\s*:|사업자등록번호|등록번호\s*:|발행인|편집인|청소년보호|대표전화|전화\s*:/u,
  /^\s*[[(【][^\])】]{0,20}(?:기자|특파원|뉴스|일보|경제|신문)[\])】]\s*$/u,
  /^(?:var|function|if|for|document|window|const|let)\b|[{};]\s*$/u,
  /^\s*(?:더보기|닫기|이전|다음|목록|공유|프린트|스크랩|글자크기)\s*$/u,
];

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"',
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  middot: "·", hellip: "…", ndash: "–", mdash: "—",
};

export function decodeHtmlEntities(value: string): string {
  // 이스케이프가 두 번 걸린 페이지가 있어(`&amp;lsquo;`) 더 바뀌지 않을 때까지 푼다.
  let current = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const next = current.replace(
      /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/giu,
      (entity, decimal?: string, hexadecimal?: string, name?: string) => {
        if (decimal) return String.fromCodePoint(Number(decimal));
        if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
        return name ? (NAMED_ENTITIES[name.toLowerCase()] ?? entity) : entity;
      },
    );
    if (next === current) return current;
    current = next;
  }
  return current;
}

export function stripTags(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<!--[\s\S]*?-->/gu, " ")
      .replace(
        /<(script|style|figure|figcaption|aside|table|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/giu,
        " ",
      )
      .replace(/<(?:br|\/p|\/div|\/li|\/h\d|\/tr|\/section)\s*\/?>/giu, "\n")
      .replace(/<[^>]+>/gu, " "),
  )
    .replace(/[\t\f\v ]+/gu, " ")
    .replace(/ *\n */gu, "\n")
    .replace(/\n{2,}/gu, "\n")
    .trim();
}

function readAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "iu"));
  return match ? decodeHtmlEntities(match[2]) : null;
}

export function readMeta(html: string, property: string): string {
  for (const tag of html.match(/<meta\b[^>]*>/giu) ?? []) {
    const key = (readAttribute(tag, "property") ?? readAttribute(tag, "name") ?? "").toLowerCase();
    if (key === property.toLowerCase()) return (readAttribute(tag, "content") ?? "").trim();
  }
  return "";
}

/**
 * JSON-LD 안의 기사 노드. `@graph` 로 감싼 사이트가 있어 한 겹 더 펼친다.
 *
 * KBS 는 JSON 안에 `//` 주석을 남겨 두어 그냥 파싱하면 전부 버려진다. 한 번 실패하면
 * 주석을 지우고 다시 시도한다.
 */
export function readJsonLdArticles(html: string): Array<Record<string, unknown>> {
  const nodes: Array<Record<string, unknown>> = [];
  for (const block of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu,
  )) {
    const raw = block[1].trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        parsed = JSON.parse(raw.replace(/^\s*\/\/[^\n]*$/gmu, ""));
      } catch {
        continue;
      }
    }
    for (const entry of Array.isArray(parsed) ? parsed : [parsed]) {
      if (typeof entry !== "object" || entry === null) continue;
      const record = entry as Record<string, unknown>;
      const graph = Array.isArray(record["@graph"]) ? record["@graph"] : [record];
      for (const node of graph) {
        if (typeof node === "object" && node !== null) nodes.push(node as Record<string, unknown>);
      }
    }
  }
  return nodes;
}

/**
 * `openTagIndex` 의 여는 태그와 짝이 맞는 닫는 태그까지의 안쪽 HTML.
 *
 * 같은 이름의 태그를 세면서 앞으로 간다. 짝을 못 찾으면(뉴스1처럼 `<div>` 를 닫지 않는
 * 페이지) 문서 끝까지 삼키지 않고 본문 끝 표지에서 자른다.
 */
export function sliceBalancedElement(html: string, openTagIndex: number): string {
  const openTag = html.slice(openTagIndex).match(/^<([a-z][\w-]*)\b[^>]*>/iu);
  if (!openTag) return "";
  const name = openTag[1].toLowerCase();
  const contentStart = openTagIndex + openTag[0].length;
  const scanner = new RegExp(`<(/?)${name}\\b[^>]*>`, "giu");
  scanner.lastIndex = contentStart;
  let depth = 1;
  for (let match = scanner.exec(html); match; match = scanner.exec(html)) {
    depth += match[1] === "/" ? -1 : 1;
    if (depth === 0) return html.slice(contentStart, match.index);
  }

  const rest = html.slice(contentStart, contentStart + 60_000);
  const end = BODY_END_MARKERS.map((marker) => rest.indexOf(marker))
    .filter((index) => index > 0)
    .sort((left, right) => left - right)[0];
  return end === undefined ? "" : rest.slice(0, end);
}

function isBoilerplate(segment: string) {
  return BOILERPLATE.some((pattern) => pattern.test(segment));
}

/**
 * 기사가 끝났다고 보는 줄. 여기부터는 통째로 버린다.
 *
 * 거르기만 해서는 부족하다. 뉴시스는 본문 뒤에 관련기사 목록이 100줄 넘게 붙는데,
 * 그 줄들은 하나하나 보면 평범한 문장이라 개별 필터에 걸리지 않는다. 기사 끝 표지를
 * 만나면 뒤를 다 버려야 남의 기사 문장이 근거로 섞이지 않는다.
 */
const ARTICLE_END = [
  /◎공감언론|무단\s*전재|재배포\s*금지|저작권자|Copyright|ⓒ|©/iu,
  /^[a-z\d._%+-]+@[a-z\d.-]+\.[a-z]{2,}$/iu,
  /관련\s*기사|많이\s*본|인기\s*기사|주요\s*뉴스|핫이슈|이시각\s*주요/u,
  /주소\s*:|사업자등록번호|청소년보호|발행인\s*:|편집인\s*:/u,
];

export function splitBodySegments(bodyHtml: string): string[] {
  const lines = stripTags(bodyHtml)
    .split(/\n+|(?<=[.!?。！？])\s+/u)
    .map((segment) => segment.replace(/\s+/gu, " ").trim());
  const end = lines.findIndex((line) => ARTICLE_END.some((pattern) => pattern.test(line)));
  return (end === -1 ? lines : lines.slice(0, end))
    .filter((segment) => segment.length >= 20)
    .filter((segment) => !isBoilerplate(segment));
}

/** 본문을 자바스크립트로 그리는 매체(뉴스1)를 위해 언론사가 직접 알려 준 AMP 주소. */
export function readAmpUrl(html: string): string {
  const match = html.match(/<link\b[^>]*\brel\s*=\s*(["'])amphtml\1[^>]*>/iu);
  return match ? (readAttribute(match[0], "href") ?? "") : "";
}

/** 본문다움 점수. 문장 수만 보면 관련기사 목록이 이기므로 문장 길이 평균을 함께 본다. */
function bodyScore(segments: readonly string[]) {
  if (segments.length === 0) return 0;
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  // 목록 제목은 20~40자로 짧고 개수만 많다. 평균 길이가 40자를 넘을 때만 온전히 인정한다.
  return total * Math.min(1, total / segments.length / 40);
}

/** 조선비즈 등 Arc(Fusion) 사이트는 본문이 화면 HTML 이 아니라 이 JSON 안에만 있다. */
export function readFusionBody(html: string): string[] {
  const match = html.match(/Fusion\.globalContent\s*=\s*(\{[\s\S]*?\});\s*Fusion\./u);
  if (!match) return [];
  let content: unknown;
  try {
    content = JSON.parse(match[1]);
  } catch {
    return [];
  }
  const elements = (content as { content_elements?: unknown }).content_elements;
  if (!Array.isArray(elements)) return [];
  const paragraphs = elements
    .filter((element): element is { type: string; content: string } =>
      typeof element === "object" && element !== null &&
      (element as { type?: unknown }).type === "text" &&
      typeof (element as { content?: unknown }).content === "string")
    .map((element) => element.content);
  return splitBodySegments(paragraphs.join("<br>"));
}

/**
 * 태그 균형 스캔 전에 스크립트를 지운다.
 *
 * 뉴스1은 Next.js 라 `__NEXT_DATA__` 안에 `<div>` 가 문자열로 들어 있다. 그걸 태그로
 * 세면 짝이 영영 안 맞아 본문 대신 회사 정보 푸터가 잡힌다. 길이는 그대로 두어야
 * `matchAll` 의 인덱스가 어긋나지 않으므로 같은 길이의 공백으로 바꾼다.
 */
export function blankScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, (block) => " ".repeat(block.length));
}

export function findArticleBodySegments(rawHtml: string): string[] {
  const html = blankScripts(rawHtml);
  let best: string[] = [];
  let bestScore = 0;
  for (const match of html.matchAll(/<(?:div|section|article)\b[^>]*>/giu)) {
    const identifier = [
      readAttribute(match[0], "id") ?? "",
      readAttribute(match[0], "class") ?? "",
      readAttribute(match[0], "itemprop") ?? "",
    ].join(" ");
    if (!BODY_CONTAINER_HINT.test(identifier)) continue;
    const segments = splitBodySegments(sliceBalancedElement(html, match.index));
    const score = bodyScore(segments);
    if (score > bestScore) {
      best = segments;
      bestScore = score;
    }
  }
  if (best.length > 0) return best;

  // Fusion·JSON-LD 본문은 스크립트 안에 있으므로 지우기 전 원본에서 읽는다.
  const fusion = readFusionBody(rawHtml);
  if (fusion.length > 0) return fusion;

  // 컨테이너 이름이 안 맞는 사이트가 있다. 그때만 JSON-LD 본문과 <p> 모음을 쓴다.
  for (const node of readJsonLdArticles(rawHtml)) {
    const articleBody = node.articleBody;
    if (typeof articleBody === "string" && articleBody.trim().length > 200) {
      const segments = splitBodySegments(articleBody.replace(/\n/gu, "<br>"));
      if (segments.length > 0) return segments;
    }
  }
  const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/giu)].map((match) => match[1]);
  return splitBodySegments(paragraphs.join("<br>"));
}

const compact = (value: string) => value.normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "");

/** 제목을 그대로 반복한 줄과 같은 문장을 뺀다. 근거가 제목뿐이면 편집자가 쓸 사실이 없다. */
export function dropTitleAndDuplicates(segments: readonly string[], title: string): string[] {
  const titleKey = compact(title);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const segment of segments) {
    const key = compact(segment);
    if (!key || seen.has(key)) continue;
    if (key === titleKey || (titleKey.length >= 12 && key.includes(titleKey))) continue;
    seen.add(key);
    kept.push(segment);
  }
  return kept;
}

/** `기아의 달라진 美 위상 | 헤럴드경제` 처럼 붙는 매체 꼬리를 뗀다. */
export function stripTitleSuffix(title: string, publisher: string): string {
  const escaped = publisher.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return title
    .replace(new RegExp(`\\s*[|\\-ㅣ:·]\\s*(?:[^|\\-ㅣ:·]{0,10})?${escaped}\\s*$`, "u"), "")
    .replace(/\s*[|ㅣ]\s*[^|ㅣ]{1,12}(?:뉴스|일보|경제|신문|타임스)\s*$/u, "")
    .trim();
}

export function toPublishedAt(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("발행 시각이 비어 있습니다.");
  // `2026-08-16T09:00:00+0900` 처럼 콜론 없는 오프셋을 Date 가 못 읽는다.
  const normalized = trimmed
    .replace(/([+-]\d{2})(\d{2})$/u, "$1:$2")
    .replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/u, "$1T$2");
  const withZone = /(?:Z|[+-]\d{2}:\d{2})$/u.test(normalized) ? normalized : `${normalized}+09:00`;
  const parsed = new Date(withZone);
  if (Number.isNaN(parsed.getTime())) throw new Error(`기사 발행 시각을 읽을 수 없습니다: ${value}`);
  return parsed.toISOString();
}

export function parseLinkArticleHtml(html: string, sourceUrl: string): ParsedLinkArticle {
  const publisher = stripTags(readMeta(html, "og:site_name")).trim();
  const rawTitle = stripTags(readMeta(html, "og:title"));
  const ldDate = readJsonLdArticles(html)
    .map((node) => node.datePublished)
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  const metaDate =
    readMeta(html, "article:published_time") ||
    readMeta(html, "og:regDate") ||
    readMeta(html, "dc.date.issued") ||
    "";

  const title = stripTitleSuffix(rawTitle, publisher);
  const bodySegments = dropTitleAndDuplicates(findArticleBodySegments(html), title);
  if (!title) throw new Error(`기사 제목을 읽지 못했습니다: ${sourceUrl}`);
  if (!publisher) throw new Error(`언론사 이름을 읽지 못했습니다: ${sourceUrl}`);
  if (bodySegments.length === 0) throw new Error(`기사 본문을 읽지 못했습니다: ${sourceUrl}`);

  return {
    title,
    publisher,
    publishedAt: toPublishedAt(metaDate || ldDate || ""),
    bodySegments,
  };
}
