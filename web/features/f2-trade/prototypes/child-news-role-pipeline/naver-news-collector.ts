import type { StockEducation } from "../../../../shared/data/stocks";
import type { NewsSourceArticle, NewsSourceUnit } from "./contracts";

const NAVER_SEARCH_ENDPOINT = "https://search.naver.com/search.naver";
// 후보가 마르면 그 종목은 서비스 카드가 아예 없다. 최신성보다 존재가 중요하다는
// 2026-08-15 결정에 따라 검색 면과 종목당 후보 상한을 함께 올린다. 파이프라인은
// 최신 기사부터 검사하고 첫 통과에서 멈추므로, 상한을 올려도 통과 기사가 과거로
// 밀리는 건 앞선 후보가 전부 거부됐을 때뿐이다.
const SEARCH_STARTS = [1, 11, 21, 31, 41, 51] as const;
const MAX_ARTICLE_CANDIDATES = 48;
const MAX_PIPELINE_CANDIDATES = 24;
const MAX_PIPELINE_CANDIDATES_PER_DAY = 3;
const MAX_SOURCE_UNITS = 10;
const REQUEST_TIMEOUT_MS = 20_000;

const MATERIAL_SIGNALS = [
  "실적",
  "매출",
  "영업이익",
  "순이익",
  "흑자",
  "적자",
  "계약",
  "수주",
  "공급",
  "생산",
  "판매",
  "합병",
  "인수",
  "지분",
  "자사주",
  "배당",
  "과징금",
  "리콜",
  "소송",
  "파업",
  "중단",
  "사고",
] as const;

const ROUTINE_OR_PROMOTIONAL_SIGNALS = [
  "출시",
  "공개",
  "행사",
  "캠페인",
  "봉사",
  "협약",
  "파트너십",
  "수상",
  "채용",
  "팝업",
  "기부",
] as const;

const INVESTMENT_CONTENT_SIGNALS = [
  "목표가",
  "목표주가",
  "매수",
  "저평가",
  "주가 전망",
  "증권사",
  "리포트",
] as const;

const MULTI_SUBJECT_SIGNALS = [
  "업계",
  "빅3",
  "3사",
  "순위",
  "제쳤다",
  "게임사",
  "백화점 3사",
] as const;

type FetchLike = typeof fetch;

export type ParsedNaverArticle = {
  articleId: string;
  title: string;
  publisher: string;
  publishedAt: string;
  sourceUrl: string;
  naverUrl: string;
  bodySegments: string[];
};

export type CollectedStockNewsCandidate = {
  stock: {
    stockId: string;
    symbol: string;
    name: string;
    aliases: string[];
    sector: StockEducation["sector"];
    market: StockEducation["market"];
  };
  searchUrl: string;
  inspectedArticleUrls: string[];
  candidateCount: number;
  selectionScore: number;
  selectionSignals: string[];
  article: NewsSourceArticle;
  fallbackCandidates?: CollectedArticleCandidate[];
};

export type CollectedArticleCandidate = {
  selectionScore: number;
  selectionSignals: string[];
  article: NewsSourceArticle;
};

export type UniverseNewsCollection = {
  schemaVersion: 1;
  runId: string;
  runDateKst: string;
  retrievedAt: string;
  sourceBasis: string;
  candidates: CollectedStockNewsCandidate[];
};

function compact(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/[^\p{L}\p{N}]+/gu, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function mentionsName(text: string, name: string) {
  const normalizedText = text.normalize("NFKC").toLocaleLowerCase("ko-KR");
  const normalizedName = name.normalize("NFKC").toLocaleLowerCase("ko-KR").trim();
  if (!normalizedName) return false;
  const pattern = normalizedName
    .split(/[\s·._-]+/u)
    .filter(Boolean)
    .map(escapeRegExp)
    .join("[\\s·._-]*");
  const particle = "(?:은|는|이|가|을|를|에|의|로|으로|와|과|도|만|에서|에게)";
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${pattern}(?=$|[^\\p{L}\\p{N}]|${particle})`,
    "u",
  ).test(normalizedText);
}

function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/giu,
    (entity, decimal: string | undefined, hexadecimal: string | undefined, name: string | undefined) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      return name ? (named[name.toLocaleLowerCase()] ?? entity) : entity;
    },
  );
}

function stripTags(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<!--[\s\S]*?-->/gu, " ")
      .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/giu, " ")
      .replace(/<(?:br|\/p|\/div|\/li|\/h\d)>/giu, "\n")
      .replace(/<[^>]+>/gu, " "),
  )
    .replace(/[\t\f\v ]+/gu, " ")
    .replace(/ *\n */gu, "\n")
    .replace(/\n{2,}/gu, "\n")
    .trim();
}

function readMeta(html: string, property: string) {
  const tags = html.match(/<meta\b[^>]*>/giu) ?? [];
  for (const tag of tags) {
    const propertyValue = readAttribute(tag, "property") ?? readAttribute(tag, "name");
    if (propertyValue === property) return readAttribute(tag, "content") ?? "";
  }
  return "";
}

function readAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "iu"));
  return match ? decodeHtmlEntities(match[2]) : null;
}

function findOriginalUrl(html: string) {
  const tags = html.match(/<a\b[^>]*>/giu) ?? [];
  for (const tag of tags) {
    const className = readAttribute(tag, "class") ?? "";
    if (!className.split(/\s+/u).includes("media_end_head_origin_link")) continue;
    return readAttribute(tag, "href") ?? "";
  }
  return "";
}

function splitBodySegments(bodyHtml: string) {
  const plain = stripTags(bodyHtml);
  return plain
    .split(/\n+|(?<=[.!?。！？])\s+/u)
    .map((segment) => segment.replace(/\s+/gu, " ").trim())
    .filter((segment) => segment.length >= 18)
    .filter((segment) => !/(?:무단 전재|재배포 금지|기자\s*[a-z\d._%+-]+@|▶|Copyright)/iu.test(segment));
}

function parseNaverIdentity(url: string) {
  const match = url.match(/n\.news\.naver\.com\/(?:mnews\/)?article\/(\d+)\/(\d+)/u);
  if (!match) throw new Error(`네이버 기사 식별자를 읽을 수 없습니다: ${url}`);
  return { oid: match[1], aid: match[2] };
}

function toPublishedAt(value: string) {
  const normalized = value.trim().replace(" ", "T");
  const withZone = /(?:Z|[+-]\d\d:\d\d)$/u.test(normalized)
    ? normalized
    : `${normalized}+09:00`;
  const parsed = new Date(withZone);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`기사 발행 시각을 읽을 수 없습니다: ${value}`);
  }
  return parsed.toISOString();
}

export function parseNaverSearchArticleUrls(html: string) {
  const urls = [...html.matchAll(/https:\/\/n\.news\.naver\.com\/(?:mnews\/)?article\/(\d+)\/(\d+)/gu)]
    .map((match) => `https://n.news.naver.com/mnews/article/${match[1]}/${match[2]}`);
  return unique(urls);
}

export function parseNaverArticleHtml(
  html: string,
  naverUrl: string,
): ParsedNaverArticle {
  const { oid, aid } = parseNaverIdentity(naverUrl);
  const title = stripTags(readMeta(html, "og:title"));
  const publisher = stripTags(readMeta(html, "og:article:author"))
    .replace(/\s*\|\s*네이버\s*$/u, "")
    .trim();
  const dateMatch = html.match(/\bdata-date-time\s*=\s*(["'])([^"']+)\1/iu);
  const bodyMatch = html.match(/<article\b[^>]*\bid\s*=\s*(["'])dic_area\1[^>]*>([\s\S]*?)<\/article>/iu);
  const bodySegments = bodyMatch ? splitBodySegments(bodyMatch[2]) : [];
  if (!title || !publisher || !dateMatch || bodySegments.length === 0) {
    throw new Error(`네이버 기사 필수 필드를 읽지 못했습니다: ${naverUrl}`);
  }
  return {
    articleId: `NAVER-${oid}-${aid}`,
    title,
    publisher,
    publishedAt: toPublishedAt(dateMatch[2]),
    sourceUrl: findOriginalUrl(html) || naverUrl,
    naverUrl,
    bodySegments,
  };
}

function stockNames(stock: Pick<StockEducation, "name" | "searchAliases">) {
  return unique([stock.name, ...stock.searchAliases])
    .map((name) => name.trim())
    .filter((name) => compact(name).length >= 2);
}

function textMentionsStock(
  text: string,
  stock: Pick<StockEducation, "name" | "searchAliases">,
) {
  return stockNames(stock).some((name) => mentionsName(text, name));
}

function signalMatches(text: string, signals: readonly string[]) {
  const normalized = compact(text);
  return signals.filter((signal) => normalized.includes(compact(signal)));
}

export function scoreArticleForStock(
  article: ParsedNaverArticle,
  stock: Pick<StockEducation, "name" | "searchAliases">,
  universe: readonly Pick<StockEducation, "name" | "searchAliases">[],
  runDateKst: string,
) {
  const officialNameInTitle = mentionsName(article.title, stock.name);
  const aliasInTitle = stockNames(stock).some((name) => mentionsName(article.title, name));
  const subjectInLead = textMentionsStock(article.bodySegments.slice(0, 3).join(" "), stock);
  const material = signalMatches(`${article.title} ${article.bodySegments.slice(0, 8).join(" ")}`, MATERIAL_SIGNALS);
  const promotional = signalMatches(article.title, ROUTINE_OR_PROMOTIONAL_SIGNALS);
  const investment = signalMatches(article.title, INVESTMENT_CONTENT_SIGNALS);
  const multiSubject = signalMatches(article.title, MULTI_SUBJECT_SIGNALS);
  const otherCompanies = universe.filter((candidate) =>
    compact(candidate.name) !== compact(stock.name) &&
    stockNames(candidate).some((name) => compact(name).length >= 3 && mentionsName(article.title, name)),
  );
  const runDay = new Date(`${runDateKst}T23:59:59+09:00`).getTime();
  const ageDays = Math.max(0, Math.floor((runDay - new Date(article.publishedAt).getTime()) / 86_400_000));

  let score = 0;
  if (officialNameInTitle) score += 100;
  else if (aliasInTitle) score += 65;
  if (subjectInLead) score += 30;
  score += Math.min(material.length, 4) * 18;
  score -= promotional.length * 22;
  score -= investment.length * 45;
  score -= multiSubject.length * 16;
  score -= otherCompanies.length * 24;
  score -= Math.min(ageDays, 30) * 2;

  const signals = [
    officialNameInTitle ? "공식 종목명이 제목에 있음" : aliasInTitle ? "종목 별칭이 제목에 있음" : "종목명이 제목에 없음",
    subjectInLead ? "기사 앞부분에서 종목이 확인됨" : "기사 앞부분에서 종목이 불분명함",
    material.length > 0 ? `직접 사건 신호: ${material.join(", ")}` : "직접 사건 신호 없음",
    ...promotional.map((signal) => `홍보·일상 감점: ${signal}`),
    ...investment.map((signal) => `투자 콘텐츠 감점: ${signal}`),
    ...multiSubject.map((signal) => `여러 주체 감점: ${signal}`),
    ...(otherCompanies.length > 0 ? [`다른 선정 기업도 제목에 있음: ${otherCompanies.map((item) => item.name).join(", ")}`] : []),
  ];
  return { score, signals };
}

function publishedDayKst(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function selectPipelineArticleCandidates(
  articles: readonly ParsedNaverArticle[],
  stock: Pick<StockEducation, "name" | "searchAliases">,
  universe: readonly Pick<StockEducation, "name" | "searchAliases">[],
  runDateKst: string,
) {
  const ranked = articles
    .map((article) => ({
      article,
      publishedDayKst: publishedDayKst(article.publishedAt),
      ...scoreArticleForStock(article, stock, universe, runDateKst),
    }))
    .sort((left, right) =>
      right.publishedDayKst.localeCompare(left.publishedDayKst) ||
      right.score - left.score ||
      new Date(right.article.publishedAt).getTime() - new Date(left.article.publishedAt).getTime(),
    );
  const countByDay = new Map<string, number>();
  const selected: typeof ranked = [];
  for (const candidate of ranked) {
    const dayCount = countByDay.get(candidate.publishedDayKst) ?? 0;
    if (dayCount >= MAX_PIPELINE_CANDIDATES_PER_DAY) continue;
    selected.push(candidate);
    countByDay.set(candidate.publishedDayKst, dayCount + 1);
    if (selected.length >= MAX_PIPELINE_CANDIDATES) break;
  }
  return selected;
}

function sourceUnitScore(segment: string, index: number, stock: Pick<StockEducation, "name" | "searchAliases">) {
  const hasCompany = textMentionsStock(segment, stock);
  const materialCount = signalMatches(segment, MATERIAL_SIGNALS).length;
  const hasNumber = /\d/u.test(segment);
  return (index < 3 ? 40 - index * 5 : 0) + (hasCompany ? 35 : 0) + materialCount * 18 + (hasNumber ? 8 : 0);
}

export function selectSourceUnits(
  article: ParsedNaverArticle,
  stock: Pick<StockEducation, "name" | "searchAliases">,
): NewsSourceUnit[] {
  const selectedIndexes = article.bodySegments
    .map((text, index) => ({ index, text, score: sourceUnitScore(text, index, stock) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, MAX_SOURCE_UNITS)
    .sort((left, right) => left.index - right.index);
  return selectedIndexes.map((item, index) => ({
    id: `S${index + 1}`,
    text: item.text.slice(0, 700),
  }));
}

function wait(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function fetchText(url: string, fetchImpl: FetchLike, attempts = 4) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, {
        headers: {
          "accept-language": "ko-KR,ko;q=0.9,en;q=0.6",
          "user-agent": "Mozilla/5.0 (compatible; KiwoomChildNewsPrototype/1.0)",
        },
        signal: controller.signal,
      });
      if (response.ok) return await response.text();
      lastError = new Error(`${response.status} ${response.statusText}`);
      if (![403, 429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
    await wait(attempt * 1_200);
  }
  throw new Error(`뉴스 요청 실패: ${url} (${lastError instanceof Error ? lastError.message : "알 수 없는 오류"})`);
}

const SECTOR_SEARCH_HINTS: Record<StockEducation["sector"], string> = {
  game: "게임",
  logistics: "물류",
  semiconductor: "전자 반도체",
  defense: "방산",
  food: "식품",
  energy: "에너지",
  entertainment: "엔터테인먼트",
  retail: "유통",
  finance: "금융",
  automotive: "자동차",
  shipbuilding: "조선",
  airline: "항공",
  cosmetics: "화장품",
};

const STOCK_SEARCH_QUERY_OVERRIDES: Record<string, string> = {
  "KRX:000270": "기아 자동차",
  "KRX:004170": "신세계 백화점",
  "KRX:004370": "농심 라면",
  "KRX:010950": "S-OIL 정유",
  "KRX:021240": "코웨이 정수기",
  "KRX:039490": "키움증권 증권사",
  "KRX:041510": "에스엠 엔터테인먼트",
  "KRX:078930": "GS 지주",
  "KRX:089860": "롯데렌탈 렌터카",
  "KRX:105560": "KB금융 금융지주",
  "KRX:180640": "한진칼 항공 지주",
  "KRX:271560": "오리온 식품",
  "KRX:352820": "하이브 실적",
  "KRX:402340": "SK스퀘어 지주",
};

function buildSearchUrl(stock: Pick<StockEducation, "id" | "name" | "sector">, start: number) {
  const url = new URL(NAVER_SEARCH_ENDPOINT);
  url.searchParams.set("where", "news");
  url.searchParams.set("sort", "1");
  url.searchParams.set("start", String(start));
  url.searchParams.set(
    "query",
    STOCK_SEARCH_QUERY_OVERRIDES[stock.id] ?? `${stock.name} ${SECTOR_SEARCH_HINTS[stock.sector]}`,
  );
  return url.toString();
}

async function collectForStock(
  stock: StockEducation,
  universe: readonly StockEducation[],
  runDateKst: string,
  fetchImpl: FetchLike,
): Promise<CollectedStockNewsCandidate> {
  const articleUrls: string[] = [];
  for (const start of SEARCH_STARTS) {
    const html = await fetchText(buildSearchUrl(stock, start), fetchImpl);
    articleUrls.push(...parseNaverSearchArticleUrls(html));
    if (unique(articleUrls).length >= MAX_ARTICLE_CANDIDATES) break;
    await wait(250);
  }
  const inspectedArticleUrls = unique(articleUrls).slice(0, MAX_ARTICLE_CANDIDATES);
  if (inspectedArticleUrls.length === 0) {
    throw new Error(`${stock.name}: 네이버 표준 기사 후보가 없습니다.`);
  }

  const settled = await Promise.allSettled(
    inspectedArticleUrls.map(async (url) => parseNaverArticleHtml(await fetchText(url, fetchImpl), url)),
  );
  const parsed = settled
    .flatMap((result) => result.status === "fulfilled" ? [result.value] : [])
    .filter((article) =>
      textMentionsStock(article.title, stock) ||
      textMentionsStock(article.bodySegments.join(" "), stock),
    );
  if (parsed.length === 0) {
    const errors = settled.flatMap((result) => result.status === "rejected" ? [String(result.reason)] : []);
    throw new Error(`${stock.name}: 기사 본문을 읽지 못했습니다. ${errors.join(" | ")}`);
  }
  const ranked = selectPipelineArticleCandidates(parsed, stock, universe, runDateKst);
  const selected = ranked[0];
  const toArticle = (candidate: typeof selected): NewsSourceArticle => ({
    articleId: candidate.article.articleId,
    runDateKst,
    scope: "company",
    title: candidate.article.title,
    publisher: candidate.article.publisher,
    publishedAt: candidate.article.publishedAt,
    sourceUrl: candidate.article.sourceUrl,
    sourceUnits: selectSourceUnits(candidate.article, stock),
  });
  return {
    stock: {
      stockId: stock.id,
      symbol: stock.symbol,
      name: stock.name,
      aliases: [...stock.searchAliases],
      sector: stock.sector,
      market: stock.market,
    },
    searchUrl: buildSearchUrl(stock, 1),
    inspectedArticleUrls,
    candidateCount: parsed.length,
    selectionScore: selected.score,
    selectionSignals: selected.signals,
    article: toArticle(selected),
    fallbackCandidates: ranked.slice(1).map((candidate) => ({
      selectionScore: candidate.score,
      selectionSignals: candidate.signals,
      article: toArticle(candidate),
    })),
  };
}

export async function collectLatestUniverseNews(
  stocks: readonly StockEducation[],
  options: {
    runDateKst: string;
    runId: string;
    fetchImpl?: FetchLike;
    existingCandidates?: CollectedStockNewsCandidate[];
    onProgress?: (
      completed: number,
      total: number,
      candidate: CollectedStockNewsCandidate,
      candidates: readonly CollectedStockNewsCandidate[],
    ) => Promise<void> | void;
  },
): Promise<UniverseNewsCollection> {
  if (stocks.length !== 51) {
    throw new Error(`뉴스 수집 대상은 정확히 51종목이어야 합니다. 현재 ${stocks.length}종목입니다.`);
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const existingByStock = new Map(
    (options.existingCandidates ?? []).map((item) => [item.stock.stockId, item]),
  );
  if (existingByStock.size !== (options.existingCandidates ?? []).length) {
    throw new Error("재개할 뉴스 수집 결과에 중복 종목이 있습니다.");
  }
  const candidates: CollectedStockNewsCandidate[] = [];
  for (const stock of stocks) {
    const existing = existingByStock.get(stock.id);
    if (existing) {
      candidates.push(existing);
      continue;
    }
    const candidate = await collectForStock(stock, stocks, options.runDateKst, fetchImpl);
    candidates.push(candidate);
    await options.onProgress?.(candidates.length, stocks.length, candidate, candidates);
    await wait(300);
  }
  return {
    schemaVersion: 1,
    runId: options.runId,
    runDateKst: options.runDateKst,
    retrievedAt: new Date().toISOString(),
    sourceBasis: "네이버 뉴스 최신순 검색으로 후보 URL을 찾고, 네이버 표준 기사 페이지에서 제목·언론사·발행 시각·언론사 원문 링크·본문 근거를 다시 확인한 뒤 최신 날짜부터 최대 8개 후보를 과거 순으로 평가함",
    candidates,
  };
}
