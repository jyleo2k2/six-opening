export type PublishedNewsScope = "market" | "company";

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
  };
}
