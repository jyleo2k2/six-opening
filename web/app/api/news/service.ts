import { parsePublishedNewsRow, type PublishedNewsItem } from "../../../features/f2-trade/lib/news/contracts";
import { selectRows } from "../supabase";

const NEWS_COLUMNS = [
  "news_id",
  "article_id",
  "scope",
  "stock_codes",
  "event_type",
  "original_title",
  "headline",
  "home_summary",
  "summary_lines",
  "publisher",
  "source_published_at",
  "source_url",
  "published_at",
].join(",");

export type SelectNewsRows = (params: Record<string, string>) => Promise<unknown[]>;

const defaultSelectNewsRows: SelectNewsRows = (params) =>
  selectRows<unknown>("news_feed_items", params);

export function stockCodeFromId(stockId: string | null) {
  return stockId && /^KRX:\d{6}$/u.test(stockId) ? stockId.slice(4) : null;
}

export function parseNewsId(value: string) {
  if (!/^\d+$/u.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseSingleRow(rows: unknown[]) {
  if (rows.length === 0) return null;
  const item = parsePublishedNewsRow(rows[0]);
  if (!item) throw new Error("저장된 뉴스 계약이 올바르지 않습니다.");
  return item;
}

async function latest(
  filters: Record<string, string>,
  selectNewsRows: SelectNewsRows,
): Promise<PublishedNewsItem | null> {
  return parseSingleRow(
    await selectNewsRows({
      select: NEWS_COLUMNS,
      ...filters,
      order: "source_published_at.desc,news_id.desc",
      limit: "1",
    }),
  );
}

export async function loadPublishedNewsForStock(
  stockId: string,
  selectNewsRows: SelectNewsRows = defaultSelectNewsRows,
) {
  const stockCode = stockCodeFromId(stockId);
  if (!stockCode) throw new TypeError("잘못된 종목 ID입니다.");

  return latest(
    { scope: "eq.company", stock_codes: `cs.{${stockCode}}` },
    selectNewsRows,
  );
}

export async function loadPublishedNewsById(
  newsId: number,
  selectNewsRows: SelectNewsRows = defaultSelectNewsRows,
) {
  if (!Number.isSafeInteger(newsId) || newsId <= 0) throw new TypeError("잘못된 뉴스 ID입니다.");
  return parseSingleRow(
    await selectNewsRows({ select: NEWS_COLUMNS, news_id: `eq.${newsId}`, limit: "1" }),
  );
}
