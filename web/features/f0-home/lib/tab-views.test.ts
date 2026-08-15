import assert from "node:assert/strict";
import test from "node:test";
import { recordTabView, takeTabViews } from "./tab-views";

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
