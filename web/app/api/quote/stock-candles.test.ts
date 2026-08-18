import assert from "node:assert/strict";
import test from "node:test";
import { chartRetentionCutoff, readDailyCloses, syncStoredCandles } from "./stock-candles";

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

/** Supabase 자격증명과 `fetch` 를 갈아 끼우고 나간 요청 URL 을 모은다. */
async function withStubbedSupabase(
  reply: (url: string) => unknown,
  run: (urls: string[]) => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const urls: string[] = [];
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "server-secret";
  globalThis.fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    const body = reply(url);
    if (body === undefined) return new Response("nope", { status: 500 });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    await run(urls);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl == null) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey == null) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
}

const closeRow = (stockId: number, date: string, close: number) => ({
  stock_id: stockId,
  candle_time: `${date}T00:00:00+09:00`,
  close,
});

const cutoffOf = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

test("여러 종목의 종가를 종목 조회 1번 + 캔들 조회 1번으로 읽는다", async () => {
  await withStubbedSupabase(
    (url) =>
      url.includes("/stocks?")
        ? [
            { stock_id: 11, stock_code: "BATCH1" },
            { stock_id: 12, stock_code: "BATCH2" },
          ]
        : [
            closeRow(11, "2026-08-10", 100),
            closeRow(12, "2026-08-10", 200),
            closeRow(11, "2026-08-11", 110),
          ],
    async (urls) => {
      const closes = await readDailyCloses(["BATCH1", "BATCH2"], cutoffOf("2026-08-01T00:00:00+09:00"));
      // 종목마다 따로 읽지 않는다 — 이게 아카이브 진입 대기시간의 대부분이었다.
      assert.equal(urls.length, 2);
      assert.equal(urls.filter((url) => url.includes("/stock_candles?")).length, 1);
      assert.equal(closes.get("BATCH1")?.map((point) => point.close).join(), "100,110");
      assert.equal(closes.get("BATCH2")?.map((point) => point.close).join(), "200");
    },
  );
});

test("행 수 상한은 종목 수 x 달력 일수라 최신 종가가 잘리지 않는다", async () => {
  await withStubbedSupabase(
    (url) => (url.includes("/stocks?") ? [{ stock_id: 21, stock_code: "LIMIT1" }] : []),
    async (urls) => {
      // 30일 창을 요청하면 한 종목이 가질 수 있는 일봉은 많아야 30여 개다.
      const cutoff = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
      await readDailyCloses(["LIMIT1"], cutoff);
      const candleUrl = urls.find((url) => url.includes("/stock_candles?")) ?? "";
      const limit = Number(new URL(candleUrl).searchParams.get("limit"));
      assert.ok(limit >= 30 && limit <= 40, `상한이 창 크기를 따라가야 한다: ${limit}`);
    },
  );
});

test("같은 종목을 동시에 찾으면 조회는 한 번만 나간다", async () => {
  await withStubbedSupabase(
    (url) =>
      url.includes("/stocks?")
        ? [{ stock_id: 31, stock_code: "SHARED1" }]
        : [closeRow(31, "2026-08-10", 500)],
    async (urls) => {
      // 아카이브 진입 때 `season-cards` 와 `family` 가 같은 종목을 동시에 찾는 상황이다.
      const [a, b] = await Promise.all([
        readDailyCloses(["SHARED1"], cutoffOf("2026-08-01T00:00:00+09:00")),
        readDailyCloses(["SHARED1"], cutoffOf("2026-08-01T00:00:00+09:00")),
      ]);
      assert.equal(urls.length, 2);
      assert.equal(a.get("SHARED1")?.[0].close, 500);
      assert.equal(b.get("SHARED1")?.[0].close, 500);
    },
  );
});

test("캐시가 더 이른 구간을 들고 있으면 다시 읽지 않는다", async () => {
  await withStubbedSupabase(
    (url) =>
      url.includes("/stocks?")
        ? [{ stock_id: 41, stock_code: "CACHED1" }]
        : [closeRow(41, "2026-08-10", 700)],
    async (urls) => {
      await readDailyCloses(["CACHED1"], cutoffOf("2026-08-01T00:00:00+09:00"));
      assert.equal(urls.length, 2);
      // 더 늦게 시작하는 요청은 이미 받은 구간 안에 들어간다.
      const again = await readDailyCloses(["CACHED1"], cutoffOf("2026-08-05T00:00:00+09:00"));
      assert.equal(urls.length, 2);
      assert.equal(again.get("CACHED1")?.[0].close, 700);
    },
  );
});

test("조회가 실패하면 그 종목만 빈 배열이고 캐시에 남지 않는다", async () => {
  await withStubbedSupabase(
    () => undefined,
    async (urls) => {
      const failed = await readDailyCloses(["BROKEN1"], cutoffOf("2026-08-01T00:00:00+09:00"));
      // 종가가 없으면 엔진이 판정 보류로 처리한다. 성향 카드 전체가 막히지 않는다.
      assert.deepEqual(failed.get("BROKEN1"), []);
      assert.equal(urls.length, 1);
    },
  );
  await withStubbedSupabase(
    (url) =>
      url.includes("/stocks?")
        ? [{ stock_id: 51, stock_code: "BROKEN1" }]
        : [closeRow(51, "2026-08-10", 900)],
    async (urls) => {
      // 실패는 기억하지 않는다 — 다음 요청이 다시 시도한다.
      const retried = await readDailyCloses(["BROKEN1"], cutoffOf("2026-08-01T00:00:00+09:00"));
      assert.equal(urls.length, 2);
      assert.equal(retried.get("BROKEN1")?.[0].close, 900);
    },
  );
});
