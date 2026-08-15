/**
 * 어린이 뉴스 계약 검증. `ui-src/methods/validNewsItem.js` 를 그대로 옮겨 왔다.
 *
 * 서버 응답을 화면이 다시 검사하는 이유: 뉴스는 외부 기사에서 만든 값이라, 계약이
 * 어긋난 항목이 한 건이라도 화면에 오르면 안 된다(3줄 요약 아니면 버린다).
 */
import type { NewsTermTreatment } from "../../f2-trade/lib/news/contracts";

export type NewsItem = {
  newsId: number;
  articleId: number;
  scope: "company";
  stockCodes: string[];
  headline: string;
  homeSummary: string;
  summaryLines: string[];
  publisher: string;
  sourcePublishedAt: string;
  sourceUrl: string;
  /** 서버가 안 보내던 시절의 응답도 화면에 오를 수 있어 없을 수 있다. */
  termTreatments?: NewsTermTreatment[];
};

const STOCK_CODE = /^\d{6}$/u;

function validTermTreatments(value: unknown): value is NewsTermTreatment[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as NewsTermTreatment).term === "string" &&
        (entry as NewsTermTreatment).term.trim().length > 0 &&
        typeof (entry as NewsTermTreatment).easyText === "string" &&
        (entry as NewsTermTreatment).easyText.trim().length > 0,
    )
  );
}

export function validNewsItem(item: unknown, stockCode: string): item is NewsItem {
  if (typeof item !== "object" || item === null) return false;
  const news = item as Record<string, unknown>;
  if (!Number.isSafeInteger(news.newsId) || (news.newsId as number) <= 0) return false;
  if (!Number.isSafeInteger(news.articleId) || (news.articleId as number) <= 0) return false;
  if (news.scope !== "company") return false;
  if (
    !Array.isArray(news.stockCodes) ||
    news.stockCodes.some((code) => typeof code !== "string" || !STOCK_CODE.test(code))
  ) {
    return false;
  }
  if (!news.stockCodes.includes(stockCode)) return false;
  if (typeof news.headline !== "string" || !news.headline.trim()) return false;
  if (typeof news.homeSummary !== "string" || !news.homeSummary.trim()) return false;
  if (
    !Array.isArray(news.summaryLines) ||
    news.summaryLines.length !== 3 ||
    news.summaryLines.some(
      (line) => typeof line !== "string" || !line.trim() || line.length > 36,
    )
  ) {
    return false;
  }
  if (news.termTreatments !== undefined && !validTermTreatments(news.termTreatments)) return false;
  if (typeof news.publisher !== "string" || !news.publisher.trim()) return false;
  if (
    typeof news.sourcePublishedAt !== "string" ||
    !Number.isFinite(Date.parse(news.sourcePublishedAt))
  ) {
    return false;
  }
  try {
    const source = new URL(String(news.sourceUrl));
    return source.protocol === "http:" || source.protocol === "https:";
  } catch {
    return false;
  }
}

/** `2026. 08. 15.` 형태. `ui-src/methods/formatNewsDate.js` 와 같다. */
export function formatNewsDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
