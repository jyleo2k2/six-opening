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

/**
 * 한 종목에 검수를 통과한 뉴스가 여러 개 쌓인다. 늘 최신 하나만 보여 주면 나머지는
 * 죽은 데이터가 되고 아이도 같은 카드만 다시 본다. 그래서 최신순 상위 몇 건 중에서
 * 하나를 골라 준다. 무한정 과거로 가지 않도록 후보는 상한을 둔다.
 */
const STOCK_NEWS_POOL_SIZE = 10;

export async function loadPublishedNewsForStock(
  stockId: string,
  selectNewsRows: SelectNewsRows = defaultSelectNewsRows,
  pick: (count: number) => number = (count) => Math.floor(Math.random() * count),
): Promise<PublishedNewsItem | null> {
  const stockCode = stockCodeFromId(stockId);
  if (!stockCode) throw new TypeError("잘못된 종목 ID입니다.");

  const rows = await selectNewsRows({
    select: NEWS_COLUMNS,
    scope: "eq.company",
    stock_codes: `cs.{${stockCode}}`,
    order: "source_published_at.desc,news_id.desc",
    limit: String(STOCK_NEWS_POOL_SIZE),
  });
  if (rows.length === 0) return null;

  const index = pick(rows.length);
  // 고르는 함수가 범위를 벗어나면 최신 것으로 떨어뜨린다. 화면이 빈손으로 끝나지 않게 한다.
  const chosen = rows[Number.isInteger(index) && index >= 0 && index < rows.length ? index : 0];
  const item = parsePublishedNewsRow(chosen);
  if (!item) throw new Error("저장된 뉴스 계약이 올바르지 않습니다.");
  return item;
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
