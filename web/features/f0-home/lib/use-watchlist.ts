"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 관심 종목. **원본은 `/api/watchlist` 다** — 지갑(`kw_proto_v1`)에서 걷어냈다.
 *
 * `use-account.ts` 와 같은 이유로 응답을 모듈에 담아 둔다. 상세와 탐색은 오갈 때마다
 * 마운트를 새로 하는데, 그때마다 다시 부르면 하트가 한 번씩 꺼졌다 켜진다.
 *
 * 토글은 서버가 돌려준 목록으로 캐시를 통째로 갈아 끼운다. 화면이 배열을 직접 고치면
 * 저장에 실패한 하트가 켜진 채로 남는다 — 좋아요와 같은 규칙이다.
 */
let codesPromise: Promise<string[]> | null = null;
let cached: string[] = [];

function loadWatchlist(): Promise<string[]> {
  if (!codesPromise) {
    codesPromise = fetch("/api/watchlist", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((data: { codes?: unknown } | null) => {
        // 못 읽었으면 캐시를 세우지 않는다 — 다음 화면이 다시 시도한다.
        if (!Array.isArray(data?.codes)) {
          codesPromise = null;
          return cached;
        }
        cached = data.codes.filter((code): code is string => typeof code === "string");
        return cached;
      });
  }
  return codesPromise;
}

export function useWatchlist() {
  const [codes, setCodes] = useState<string[]>(cached);

  useEffect(() => {
    let alive = true;
    loadWatchlist().then((list) => {
      if (alive) setCodes(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  /** 저장에 실패하면 아무것도 바꾸지 않는다. 하트가 그대로인 것이 곧 "안 담겼다" 는 표시다. */
  const toggle = useCallback(
    (code: string) =>
      fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_code: code }),
      })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null)
        .then((data: { codes?: unknown } | null) => {
          if (!Array.isArray(data?.codes)) return;
          cached = data.codes.filter((entry): entry is string => typeof entry === "string");
          codesPromise = Promise.resolve(cached);
          setCodes(cached);
        }),
    [],
  );

  return { codes, toggle };
}
