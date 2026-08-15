export type PublishedNewsScope = "market" | "company";

export type NewsTermTreatment = {
  term: string;
  easyText: string;
};

export type PublishedNewsItem = {
  newsId: number;
  articleId: number;
  scope: PublishedNewsScope;
  stockCodes: string[];
  eventType: string;
  originalTitle: string;
  headline: string;
  homeSummary: string;
  summaryLines: [string, string, string];
  publisher: string;
  sourcePublishedAt: string;
  sourceUrl: string;
  publishedAt: string;
  termTreatments: NewsTermTreatment[];
};

export type NewsApiResponse = {
  item: PublishedNewsItem | null;
};

const STOCK_CODE_PATTERN = /^\d{6}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength
    ? value
    : null;
}

function isoDate(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

function httpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

/**
 * 용어 풀이는 한 건이 깨져도 뉴스 자체는 살린다 — 카드의 본체는 제목과 3줄이고,
 * 풀이는 거기에 얹는 설명이다. 길이 상한은 DB 의 `valid_term_treatments_v2` 와 같다.
 */
function parseTermTreatments(value: unknown): NewsTermTreatment[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const treatments: NewsTermTreatment[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const term = nonEmptyText(entry.term, 120);
    const easyText = nonEmptyText(entry.easyText, 500);
    if (!term || !easyText || seen.has(term)) continue;
    seen.add(term);
    treatments.push({ term, easyText });
  }
  return treatments;
}

export const MAX_VISIBLE_TERM_TREATMENTS = 3;

/**
 * 카드에 실제로 띄울 용어 풀이를 고른다.
 *
 * 파이프라인은 선별 문장에 남은 어려운 말을 **전부** 처리해 DB 에 최대 19개까지 쌓여 있다.
 * 그대로 뿌리면 화면에 없는 낱말까지 풀어 주게 되고 — 아이가 본문에서 찾을 수 없는 설명이다 —
 * 카드가 용어 사전이 된다. 그래서 제목과 3줄에 실제로 나온 것만, 나온 순서대로 최대 3개다
 * (파이프라인 README 의 노출 규칙과 같은 판정이다).
 *
 * 한쪽이 다른 쪽에 통째로 들어 있는 낱말은 먼저 나온 것만 남긴다. `매출액`과 `매출`,
 * `나트륨 SMR`과 `SMR` 이 나란히 서면 거의 같은 설명이 두 번 나오면서 세 자리 중 두 자리를
 * 먹는다 — 자리를 다른 낱말에 준다.
 */
export function visibleTermTreatments(news: {
  headline: string;
  summaryLines: readonly string[];
  termTreatments?: readonly NewsTermTreatment[];
}): NewsTermTreatment[] {
  const visible = [news.headline, ...news.summaryLines].join("\n").normalize("NFKC");
  const ordered = (news.termTreatments ?? [])
    .map((treatment, index) => ({
      treatment,
      index,
      term: treatment.term.normalize("NFKC"),
      at: visible.indexOf(treatment.term.normalize("NFKC")),
    }))
    .filter((item) => item.at >= 0)
    .sort((left, right) => left.at - right.at || left.index - right.index);

  const picked: typeof ordered = [];
  for (const item of ordered) {
    if (picked.length >= MAX_VISIBLE_TERM_TREATMENTS) break;
    const overlaps = picked.some(
      (kept) => kept.term.includes(item.term) || item.term.includes(kept.term),
    );
    if (!overlaps) picked.push(item);
  }
  return picked.map((item) => item.treatment);
}

export function parsePublishedNewsRow(value: unknown): PublishedNewsItem | null {
  if (!isRecord(value)) return null;
  if (!Number.isSafeInteger(value.news_id) || (value.news_id as number) <= 0) return null;
  if (!Number.isSafeInteger(value.article_id) || (value.article_id as number) <= 0) return null;
  if (value.scope !== "market" && value.scope !== "company") return null;

  const stockCodes = Array.isArray(value.stock_codes)
    ? value.stock_codes.filter((code): code is string => typeof code === "string")
    : null;
  if (
    stockCodes === null ||
    stockCodes.some((code) => !STOCK_CODE_PATTERN.test(code)) ||
    new Set(stockCodes).size !== stockCodes.length ||
    (value.scope === "market" && stockCodes.length !== 0) ||
    (value.scope === "company" && stockCodes.length === 0)
  ) {
    return null;
  }

  const summaryLines = Array.isArray(value.summary_lines)
    ? value.summary_lines.map((line) => nonEmptyText(line, 36))
    : [];
  if (summaryLines.length !== 3 || summaryLines.some((line) => line === null)) return null;

  const eventType = nonEmptyText(value.event_type, 80);
  const originalTitle = nonEmptyText(value.original_title, 300);
  const headline = nonEmptyText(value.headline, 60);
  const homeSummary = nonEmptyText(value.home_summary, 180);
  const publisher = nonEmptyText(value.publisher, 120);
  const sourcePublishedAt = isoDate(value.source_published_at);
  const sourceUrl = httpUrl(value.source_url);
  const publishedAt = isoDate(value.published_at);
  if (
    !eventType ||
    !originalTitle ||
    !headline ||
    !homeSummary ||
    !publisher ||
    !sourcePublishedAt ||
    !sourceUrl ||
    !publishedAt
  ) {
    return null;
  }

  return {
    newsId: value.news_id as number,
    articleId: value.article_id as number,
    scope: value.scope,
    stockCodes,
    eventType,
    originalTitle,
    headline,
    homeSummary,
    summaryLines: summaryLines as [string, string, string],
    publisher,
    sourcePublishedAt,
    sourceUrl,
    publishedAt,
    termTreatments: parseTermTreatments(value.term_treatments),
  };
}
