/** 키움 REST 어댑터. 토큰 발급·초당 1건 큐·응답 필드 매핑만 담당한다. */

import { loadDevelopmentEnvironment } from "../../dev-env";
import { chartRetentionCutoff } from "../stock-candles";
import {
  createRequestQueue,
  filledCredential,
  first,
  findRows,
  numeric,
  rowTimestamp,
  seoulDateDigits,
  toChartPoints,
} from "./shared";
import type { ChartPeriod, ChartPoint, LiveQuote, QuoteProvider } from "./types";

/** 키움 초당 1건 제한. 모든 호출이 이 간격으로 한 줄에 선다. */
const REQUEST_INTERVAL_MS = 2600;

const FIELDS = {
  time: ["dt", "stck_bsop_date", "date"],
  minuteTime: ["cntr_tm", "stck_cntg_hour", "time", "dt"],
  open: ["open_pric", "open", "stck_oprc"],
  high: ["high_pric", "high", "stck_hgpr"],
  low: ["low_pric", "low", "stck_lwpr"],
  close: ["cur_prc", "stck_prpr", "close_pric", "close"],
  volume: ["trde_qty", "volume", "acml_vol"],
};

let accessToken = "";
let tokenExpiresAt = 0;

const enqueue = createRequestQueue(REQUEST_INTERVAL_MS);

function baseUrl() {
  loadDevelopmentEnvironment();
  return (process.env.KIWOOM_ENV ?? "real").toLowerCase() === "mock"
    ? "https://mockapi.kiwoom.com"
    : "https://api.kiwoom.com";
}

function hasCredentials() {
  loadDevelopmentEnvironment();
  return (
    filledCredential(process.env.KIWOOM_APP_KEY) &&
    filledCredential(process.env.KIWOOM_SECRET_KEY)
  );
}

/** 키움 연속조회 커서. 한 종목의 과거 캔들은 한 응답에 다 오지 않는다. */
type Continuation = { contYn: string; nextKey: string };

async function requestPage(
  pathname: string,
  body: object,
  apiId?: string,
  continuation?: Continuation,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json;charset=UTF-8",
  };
  if (apiId) {
    headers.authorization = `Bearer ${await getToken()}`;
    headers["api-id"] = apiId;
  }
  if (continuation) {
    headers["cont-yn"] = continuation.contYn;
    headers["next-key"] = continuation.nextKey;
  }
  const response = await fetch(`${baseUrl()}${pathname}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (
    !response.ok ||
    (data.return_code != null && Number(data.return_code) !== 0)
  ) {
    throw new Error(String(data.return_msg ?? `Kiwoom HTTP ${response.status}`));
  }
  return {
    data,
    contYn: response.headers.get("cont-yn") ?? "N",
    nextKey: response.headers.get("next-key") ?? "",
  };
}

async function post(pathname: string, body: object, apiId?: string) {
  return (await requestPage(pathname, body, apiId)).data;
}

async function getToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  const data = await post("/oauth2/token", {
    grant_type: "client_credentials",
    appkey: process.env.KIWOOM_APP_KEY,
    secretkey: process.env.KIWOOM_SECRET_KEY,
  });
  accessToken = String(data.token);
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
  return accessToken;
}

async function fetchQuote(symbol: string, background = false): Promise<LiveQuote> {
  const data = (await enqueue(
    () => post("/api/dostk/stkinfo", { stk_cd: symbol }, "ka10001"),
    background,
  )) as Record<string, unknown>;
  const price = numeric(first(data, ["cur_prc", "stck_prpr", "price"]), true);
  if (!price) throw new Error("현재가가 없습니다.");
  const change = numeric(first(data, ["pred_pre", "change", "prdy_vrss"])) ?? 0;
  const rate =
    numeric(first(data, ["flu_rt", "change_rate", "prdy_ctrt"])) ??
    (price - change ? (change / (price - change)) * 100 : 0);
  return { price, change, rate };
}

async function fetchChart(
  symbol: string,
  period: ChartPeriod,
  stopAtTimestamp?: number,
  background = false,
): Promise<ChartPoint[]> {
  const date = seoulDateDigits();
  const request =
    period === "minute"
      ? { apiId: "ka10080", body: { stk_cd: symbol, tic_scope: "1", upd_stkpc_tp: "1" } }
      : period === "weekly"
        ? { apiId: "ka10082", body: { stk_cd: symbol, base_dt: date, upd_stkpc_tp: "1" } }
        : { apiId: "ka10081", body: { stk_cd: symbol, base_dt: date, upd_stkpc_tp: "1" } };

  const rows: Record<string, unknown>[] = [];
  const seenContinuationKeys = new Set<string>();
  const cutoffTimestamp = chartRetentionCutoff(period);
  const maxPages =
    period === "minute" ? kiwoomProvider.limits.minuteMaxPages : Number.POSITIVE_INFINITY;
  let pages = 0;
  let continuation: Continuation | undefined;

  do {
    const page = await enqueue(
      () => requestPage("/api/dostk/chart", request.body, request.apiId, continuation),
      background,
    );
    pages += 1;
    const pageRows = findRows(page.data);
    rows.push(...pageRows);
    // 이미 가진 구간에 닿으면 더 받지 않는다 — 증분 조회.
    const reachedStop = pageRows.some((row) => {
      const timestamp = rowTimestamp(row, period, FIELDS);
      return timestamp != null && timestamp <= (stopAtTimestamp ?? cutoffTimestamp);
    });
    if (reachedStop || pages >= maxPages) break;
    if (
      page.contYn.toUpperCase() !== "Y" ||
      !page.nextKey ||
      seenContinuationKeys.has(page.nextKey)
    ) {
      break;
    }
    seenContinuationKeys.add(page.nextKey);
    continuation = { contYn: "Y", nextKey: page.nextKey };
  } while (continuation);

  const points = toChartPoints(rows, period, cutoffTimestamp, FIELDS);
  if (!points.length) throw new Error("차트 데이터가 없습니다.");
  return points;
}

export const kiwoomProvider: QuoteProvider = {
  id: "kiwoom",
  limits: {
    requestIntervalMs: REQUEST_INTERVAL_MS,
    /**
     * 카드 51장을 초당 1건으로 다 데우려면 2분이 넘는다. 한 폴링에 한 종목씩만 데우고
     * 나머지는 보관 캔들 종가로 채운다.
     */
    refreshBatchSize: 1,
    /** 요청 간격이 2.6초라 페이지 수가 곧 대기시간이다. 상한을 둬야 최악이 고정된다. */
    minuteMaxPages: 2,
    /** 분봉은 보관 DB가 없어 사용자가 큐를 직접 기다린다. 그 사이 낡은 값을 먼저 보여준다. */
    minuteStaleMs: 10 * 60 * 1000,
  },
  hasCredentials,
  fetchQuote,
  fetchChart,
};
