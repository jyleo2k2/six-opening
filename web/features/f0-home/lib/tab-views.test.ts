import assert from "node:assert/strict";
import test from "node:test";
import { flushTabViews, recordTabView, takeTabViews } from "./tab-views";

test("열람은 종목별로 쌓이고, 꺼내면 그 종목 버퍼만 비운다", () => {
  recordTabView("259960", "2026-08-15T10:00:00Z", "2026-08-15T10:00:12Z");
  recordTabView("259960", "2026-08-15T10:01:00Z", "2026-08-15T10:01:15Z");
  recordTabView("005930", "2026-08-15T10:02:00Z", "2026-08-15T10:02:11Z");

  const taken = takeTabViews("259960");
  assert.equal(taken.length, 2);
  assert.deepEqual(taken[0], { opened_at: "2026-08-15T10:00:00Z", closed_at: "2026-08-15T10:00:12Z" });

  // 같은 종목을 다시 꺼내면 비어 있고, 다른 종목은 그대로다.
  assert.deepEqual(takeTabViews("259960"), []);
  assert.equal(takeTabViews("005930").length, 1);
});

test("기록 없는 종목을 꺼내면 빈 배열이다", () => {
  assert.deepEqual(takeTabViews("000000"), []);
});

test("서버가 실패하면 열람을 지우지 않는다", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 502 });
  try {
    recordTabView("000001", "2026-08-15T10:00:00Z", "2026-08-15T10:00:12Z");
    assert.equal(await flushTabViews("000001", true), false);
    assert.equal(takeTabViews("000001").length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("서버가 확인한 열람만 지우고 전송 중 새로 쌓인 열람은 남긴다", async () => {
  const originalFetch = globalThis.fetch;
  let finish: ((response: Response) => void) | undefined;
  globalThis.fetch = () => new Promise<Response>((resolve) => { finish = resolve; });
  try {
    recordTabView("000002", "2026-08-15T10:00:00Z", "2026-08-15T10:00:12Z");
    const flushing = flushTabViews("000002", true);
    recordTabView("000002", "2026-08-15T10:01:00Z", "2026-08-15T10:01:15Z");
    finish?.(new Response(null, { status: 204 }));

    assert.equal(await flushing, true);
    assert.deepEqual(takeTabViews("000002"), [
      { opened_at: "2026-08-15T10:01:00Z", closed_at: "2026-08-15T10:01:15Z" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("로그인 역할이 맞지 않으면 보내지 않고 버린다", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response(null, { status: 204 });
  };
  try {
    recordTabView("000003", "2026-08-15T10:00:00Z", "2026-08-15T10:00:12Z");
    assert.equal(await flushTabViews("000003", false), false);
    assert.equal(called, false);
    assert.deepEqual(takeTabViews("000003"), []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
