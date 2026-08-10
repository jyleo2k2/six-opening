import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { STOCKS, STOCK_BY_CODE } from "./kiwoom-stocks.mjs";

const CONFIG_PATH = fileURLToPath(new URL("./.env.kiwoom.local", import.meta.url));
const DASHBOARD_PATH = fileURLToPath(new URL("./kiwoom-dashboard.html", import.meta.url));

try {
  loadEnvFile(CONFIG_PATH);
} catch (error) {
  if (error?.code === "ENOENT") {
    console.error(`설정 파일이 없습니다: ${CONFIG_PATH}`);
    process.exit(2);
  }
  throw error;
}

const APP_KEY = process.env.KIWOOM_APP_KEY;
const SECRET_KEY = process.env.KIWOOM_SECRET_KEY;
const KIWOOM_ENV = (process.env.KIWOOM_ENV || "real").trim().toLowerCase();
const PORT = Number(process.env.KIWOOM_DASHBOARD_PORT || "8787");
const REST_INTERVAL_MS = Number(process.env.KIWOOM_REST_INTERVAL_MS || "1100");
const ENVIRONMENTS = {
  real: { restUrl: "https://api.kiwoom.com", wsUrl: "wss://api.kiwoom.com:10000/api/dostk/websocket" },
  mock: { restUrl: "https://mockapi.kiwoom.com", wsUrl: "wss://mockapi.kiwoom.com:10000/api/dostk/websocket" },
};
const environment = ENVIRONMENTS[KIWOOM_ENV];

if (!APP_KEY || !SECRET_KEY || !environment || !Number.isInteger(PORT) || PORT < 1 || PORT > 65535 || !Number.isFinite(REST_INTERVAL_MS) || REST_INTERVAL_MS < 1000) {
  console.error("KIWOOM_APP_KEY, KIWOOM_SECRET_KEY, KIWOOM_ENV(real/mock), KIWOOM_DASHBOARD_PORT를 확인하세요.");
  process.exit(2);
}

const quoteCache = new Map();
const chartCache = new Map();
const sseClients = new Set();
let accessToken = null;
let tokenExpiresAt = 0;
let realtimeSocket = null;
let realtimeConnected = false;
let reconnectTimer = null;
let shuttingDown = false;
let lastRestStartedAt = 0;
let restQueue = Promise.resolve();

function numberValue(value, absolute = false) {
  const parsed = Number(String(value ?? "").replaceAll(",", "").trim());
  if (!Number.isFinite(parsed)) return null;
  return absolute ? Math.abs(parsed) : parsed;
}

function firstValue(object, keys) {
  for (const key of keys) {
    if (object?.[key] != null && object[key] !== "") return object[key];
  }
  return null;
}

function seoulDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${values.month}${values.day}`;
}

function parseExpiry(expires) {
  const digits = String(expires ?? "").replace(/\D/g, "");
  if (digits.length < 14) return Date.now() + 23 * 60 * 60 * 1000;
  const iso = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T${digits.slice(8, 10)}:${digits.slice(10, 12)}:${digits.slice(12, 14)}+09:00`;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : Date.now() + 23 * 60 * 60 * 1000;
}

async function postJson(url, { headers = {}, body }) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=UTF-8", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error(`JSON이 아닌 응답입니다. HTTP ${response.status}`); }
  if (!response.ok || (data.return_code != null && Number(data.return_code) !== 0)) {
    const error = new Error(data.return_msg || `키움 API 오류 HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function getToken(force = false) {
  if (!force && accessToken && Date.now() < tokenExpiresAt - 5 * 60_000) return accessToken;
  const data = await postJson(`${environment.restUrl}/oauth2/token`, {
    body: { grant_type: "client_credentials", appkey: APP_KEY, secretkey: SECRET_KEY },
  });
  accessToken = data.token;
  tokenExpiresAt = parseExpiry(data.expires_dt);
  return accessToken;
}

function enqueueRest(task) {
  const run = async () => {
    const wait = Math.max(0, REST_INTERVAL_MS - (Date.now() - lastRestStartedAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRestStartedAt = Date.now();
    return task();
  };
  const result = restQueue.then(run, run);
  restQueue = result.catch(() => {});
  return result;
}

async function callKiwoom(apiId, path, body) {
  return enqueueRest(async () => {
    let token = await getToken();
    try {
      return await postJson(`${environment.restUrl}${path}`, {
        headers: { authorization: `Bearer ${token}`, "api-id": apiId }, body,
      });
    } catch (error) {
      if (error.status !== 401) throw error;
      token = await getToken(true);
      return postJson(`${environment.restUrl}${path}`, {
        headers: { authorization: `Bearer ${token}`, "api-id": apiId }, body,
      });
    }
  });
}

export function normalizeBasicQuote(code, response) {
  const previous = quoteCache.get(code) || {};
  const change = numberValue(firstValue(response, ["pred_pre", "change", "prdy_vrss"]));
  let rate = numberValue(firstValue(response, ["flu_rt", "change_rate", "prdy_ctrt"]));
  const current = numberValue(firstValue(response, ["cur_prc", "stck_prpr", "price"]), true);
  if (rate == null && current && change != null && current - change !== 0) rate = change / (current - change) * 100;
  return {
    ...previous,
    code,
    name: STOCK_BY_CODE.get(code)?.name || firstValue(response, ["stk_nm", "name"]) || code,
    price: current ?? previous.price ?? null,
    change: change ?? previous.change ?? null,
    rate: rate ?? previous.rate ?? null,
    open: numberValue(firstValue(response, ["open_pric", "open", "stck_oprc"]), true) ?? previous.open ?? null,
    high: numberValue(firstValue(response, ["high_pric", "high", "stck_hgpr"]), true) ?? previous.high ?? null,
    low: numberValue(firstValue(response, ["low_pric", "low", "stck_lwpr"]), true) ?? previous.low ?? null,
    updatedAt: new Date().toISOString(),
    source: "rest",
  };
}

export function normalizeRealtimeQuote(item) {
  const values = item?.values || {};
  const code = String(item?.item || values["9001"] || "").replace(/^A/, "").slice(0, 6);
  if (!STOCK_BY_CODE.has(code)) return null;
  const previous = quoteCache.get(code) || { code, name: STOCK_BY_CODE.get(code).name };
  return {
    ...previous,
    price: numberValue(values["10"], true) ?? previous.price ?? null,
    change: numberValue(values["11"]) ?? previous.change ?? null,
    rate: numberValue(values["12"]) ?? previous.rate ?? null,
    open: numberValue(values["16"], true) ?? previous.open ?? null,
    high: numberValue(values["17"], true) ?? previous.high ?? null,
    low: numberValue(values["18"], true) ?? previous.low ?? null,
    updatedAt: new Date().toISOString(),
    tradeTime: values["20"] || previous.tradeTime || null,
    source: "realtime",
  };
}

function findArray(value, preferredKeys = []) {
  for (const key of preferredKeys) if (Array.isArray(value?.[key])) return value[key];
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const child of Object.values(value)) {
    const found = findArray(child, []);
    if (found.length) return found;
  }
  return [];
}

export function extractChartPoints(response, period) {
  const keys = {
    minute: ["stk_min_pole_chart_qry", "stk_min_chart", "output"],
    daily: ["stk_dt_pole_chart_qry", "stk_day_chart", "output"],
    weekly: ["stk_wk_pole_chart_qry", "stk_week_chart", "output"],
  }[period] || [];
  return findArray(response, keys).map((row) => ({
    time: String(period === "minute"
      ? firstValue(row, ["cntr_tm", "stck_cntg_hour", "time", "dt"])
      : firstValue(row, ["dt", "stck_bsop_date", "date"])
    ).replace(/\D/g, ""),
    price: numberValue(firstValue(row, ["cur_prc", "stck_prpr", "close_pric", "close"]), true),
  })).filter((point) => point.time && point.price != null)
    .sort((a, b) => a.time.localeCompare(b.time));
}

function sendEvent(response, event, data) {
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event, data) {
  for (const client of sseClients) sendEvent(client, event, data);
}

async function loadBasicQuote(code) {
  const response = await callKiwoom("ka10001", "/api/dostk/stkinfo", { stk_cd: code });
  const quote = normalizeBasicQuote(code, response);
  quoteCache.set(code, quote);
  broadcast("quote", quote);
  return quote;
}

async function hydrateQuotes() {
  for (const stock of STOCKS) {
    if (shuttingDown) return;
    try { await loadBasicQuote(stock.code); }
    catch (error) { console.error(`[현재가 실패] ${stock.name}(${stock.code}): ${error.message}`); }
  }
}

async function loadChart(code, period) {
  const cacheKey = `${code}:${period}`;
  const cached = chartCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < 5 * 60_000) return cached.points;
  const api = {
    minute: { id: "ka10080", body: { stk_cd: code, tic_scope: "1", upd_stkpc_tp: "1" } },
    daily: { id: "ka10081", body: { stk_cd: code, base_dt: seoulDate(), upd_stkpc_tp: "1" } },
    weekly: { id: "ka10082", body: { stk_cd: code, base_dt: seoulDate(), upd_stkpc_tp: "1" } },
  }[period];
  if (!api) throw new Error("지원하지 않는 차트 기간입니다.");
  const response = await callKiwoom(api.id, "/api/dostk/chart", api.body);
  const points = extractChartPoints(response, period);
  if (!points.length) throw new Error("차트 데이터가 없습니다.");
  chartCache.set(cacheKey, { createdAt: Date.now(), points });
  return points;
}

function scheduleReconnect() {
  if (shuttingDown || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectRealtime().catch((error) => {
      console.error(`[실시간 재연결 실패] ${error.message}`);
      scheduleReconnect();
    });
  }, 3_000);
}

async function connectRealtime() {
  const token = await getToken();
  if (realtimeSocket) realtimeSocket.close();
  const socket = new WebSocket(environment.wsUrl);
  realtimeSocket = socket;

  socket.addEventListener("open", () => socket.send(JSON.stringify({ trnm: "LOGIN", token })));
  socket.addEventListener("message", (event) => {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    if (message.trnm === "LOGIN") {
      if (Number(message.return_code) !== 0) {
        console.error(`[실시간 로그인 실패] ${message.return_msg || message.return_code}`);
        socket.close();
        return;
      }
      socket.send(JSON.stringify({
        trnm: "REG", grp_no: "1", refresh: "1",
        data: [{ item: STOCKS.map(({ code }) => code), type: ["0B"] }],
      }));
      realtimeConnected = true;
      broadcast("status", { realtime: true });
      console.log(`[실시간 연결] ${STOCKS.length}종목 구독 완료`);
      return;
    }
    for (const item of Array.isArray(message.data) ? message.data : []) {
      if (item.type !== "0B") continue;
      const quote = normalizeRealtimeQuote(item);
      if (!quote) continue;
      quoteCache.set(quote.code, quote);
      broadcast("quote", quote);
    }
  });
  socket.addEventListener("error", () => console.error("[실시간 오류] WebSocket 연결 오류"));
  socket.addEventListener("close", () => {
    if (realtimeSocket === socket) realtimeSocket = null;
    realtimeConnected = false;
    broadcast("status", { realtime: false });
    scheduleReconnect();
  });
}

function json(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(data));
}

async function serveDashboard(response) {
  const info = await stat(DASHBOARD_PATH);
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": info.size,
    "Cache-Control": "no-store",
  });
  createReadStream(DASHBOARD_PATH).pipe(response);
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method !== "GET") return json(response, 405, { error: "GET 요청만 지원합니다." });
  if (url.pathname === "/" || url.pathname === "/index.html") return serveDashboard(response);
  if (url.pathname === "/api/stocks") {
    return json(response, 200, STOCKS.map((stock) => ({ ...stock, quote: quoteCache.get(stock.code) || null })));
  }
  if (url.pathname === "/api/quote") {
    const code = url.searchParams.get("code") || "";
    if (!STOCK_BY_CODE.has(code)) return json(response, 400, { error: "등록되지 않은 종목입니다." });
    try { return json(response, 200, quoteCache.get(code) || await loadBasicQuote(code)); }
    catch (error) { return json(response, 502, { error: error.message }); }
  }
  if (url.pathname === "/api/chart") {
    const code = url.searchParams.get("code") || "";
    const period = url.searchParams.get("period") || "minute";
    if (!STOCK_BY_CODE.has(code)) return json(response, 400, { error: "등록되지 않은 종목입니다." });
    try { return json(response, 200, { code, period, points: await loadChart(code, period) }); }
    catch (error) { return json(response, 502, { error: error.message }); }
  }
  if (url.pathname === "/api/events") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    response.write(": connected\n\n");
    sseClients.add(response);
    sendEvent(response, "status", { realtime: realtimeConnected });
    for (const quote of quoteCache.values()) sendEvent(response, "quote", quote);
    const keepAlive = setInterval(() => response.write(": keep-alive\n\n"), 20_000);
    request.on("close", () => { clearInterval(keepAlive); sseClients.delete(response); });
    return;
  }
  return json(response, 404, { error: "찾을 수 없습니다." });
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => json(response, 500, { error: error.message }));
});

server.listen(PORT, "127.0.0.1", async () => {
  console.log(`[대시보드] http://127.0.0.1:${PORT}`);
  console.log(`[환경] ${KIWOOM_ENV === "real" ? "실전투자" : "모의투자"}, ${STOCKS.length}종목`);
  try {
    await getToken();
    connectRealtime().catch((error) => { console.error(`[실시간 연결 실패] ${error.message}`); scheduleReconnect(); });
    hydrateQuotes().catch((error) => console.error(`[현재가 초기화 실패] ${error.message}`));
  } catch (error) {
    console.error(`[키움 인증 실패] ${error.message}`);
  }
});

const verifyMs = Number(process.env.KIWOOM_DASHBOARD_VERIFY_MS || "0");
if (Number.isFinite(verifyMs) && verifyMs > 0) setTimeout(shutdown, verifyMs);

function shutdown() {
  shuttingDown = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (realtimeSocket) realtimeSocket.close();
  for (const client of sseClients) client.end();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
