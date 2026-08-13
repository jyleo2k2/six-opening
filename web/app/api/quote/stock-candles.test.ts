import assert from "node:assert/strict";
import test from "node:test";
import { chartRetentionCutoff, syncStoredCandles } from "./stock-candles";

test("분봉 조회 시작은 현재 시각 기준 정확히 이틀 전이다", () => {
  const now = new Date("2026-08-12T10:30:00+09:00");
  assert.equal(chartRetentionCutoff("minute", now), Math.floor(new Date("2026-08-10T10:30:00+09:00").getTime() / 1000));
});

test("일봉과 주봉 보관 시작은 한국 날짜의 1년·3년 전 자정이다", () => {
  const now = new Date("2026-08-12T10:30:00+09:00");
  assert.equal(chartRetentionCutoff("daily", now), Math.floor(new Date("2025-08-12T00:00:00+09:00").getTime() / 1000));
  assert.equal(chartRetentionCutoff("weekly", now), Math.floor(new Date("2023-08-12T00:00:00+09:00").getTime() / 1000));
});

test("새 캔들을 upsert한 뒤 보관기간 밖 데이터만 삭제한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const requests: { url: string; init?: RequestInit }[] = [];
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return new Response(null, { status: 204 });
  };

  try {
    const cutoff = Math.floor(new Date("2025-08-12T00:00:00+09:00").getTime() / 1000);
    await syncStoredCandles(7, "daily", [{ time: cutoff, open: 1, high: 2, low: 1, close: 2, volume: 3, price: 2 }], cutoff);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].init?.method, "POST");
    assert.match(requests[0].url, /on_conflict=stock_id%2Ctimeframe%2Ccandle_time/u);
    assert.equal(requests[1].init?.method, "DELETE");
    assert.match(requests[1].url, /stock_id=eq\.7/u);
    assert.match(requests[1].url, /timeframe=eq\.daily/u);
    assert.match(requests[1].url, /candle_time=lt\./u);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl == null) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey == null) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});

test("신규 Supabase secret key는 apikey 헤더로만 보낸다", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalSecret = process.env.SUPABASE_SECRET_KEY;
  let headers: HeadersInit | undefined;
  process.env.SUPABASE_URL = "https://example.supabase.co";
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SECRET_KEY = "sb_secret_example";
  globalThis.fetch = async (_input, init) => {
    headers = init?.headers;
    return new Response(null, { status: 204 });
  };

  try {
    await syncStoredCandles(7, "weekly", [], 0);
    const sent = new Headers(headers);
    assert.equal(sent.get("apikey"), "sb_secret_example");
    assert.equal(sent.has("authorization"), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl == null) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalServiceRole == null) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
    if (originalSecret == null) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecret;
  }
});
