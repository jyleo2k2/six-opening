"use client";

import { useEffect, useState } from "react";

/**
 * 옮겨 온 화면이 종목 유니버스를 읽는 길. `app.html` 과 **같은 출처**를 쓴다.
 *
 * 이름·설명·로고는 `/api/universe` 스크립트(`window.KW_UNIVERSE`)가 원본이고,
 * 시세·스파크라인은 `/api/universe/data` 를 5초마다 다시 읽는다 — `app.html` 의
 * `liveRefreshTick` 과 같은 주기·같은 경로라 화면을 오갈 때 값이 튀지 않는다.
 */
export type UniverseStock = {
  code: string;
  name: string;
  sector: string;
  desc: string;
  price: number;
  change: number;
  spark?: number[];
};

export type UniverseSector = { id: string; name: string; emoji: string; accent: string };
/** 게임형 카드의 브랜드 표기 — 로고에서 뽑은 색과 카테고리 라벨. */
export type UniverseBrand = { cat?: string; color?: string; dark?: boolean };

export type Universe = {
  sectors: UniverseSector[];
  stocks: UniverseStock[];
  logos: Record<string, string>;
  brands?: Record<string, UniverseBrand>;
};

declare global {
  interface Window {
    KW_UNIVERSE?: Universe;
  }
}

let universePromise: Promise<Universe | null> | null = null;

/** 스크립트는 문서에 한 번만 심는다. `app.html` 이 쓰는 그 파일이다. */
function loadUniverse(): Promise<Universe | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.KW_UNIVERSE) return Promise.resolve(window.KW_UNIVERSE);
  if (!universePromise) {
    universePromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "/api/universe";
      script.onload = () => resolve(window.KW_UNIVERSE ?? null);
      script.onerror = () => resolve(null);
      document.head.appendChild(script);
    });
  }
  return universePromise;
}

/** `app.html` 의 `polyline()` 과 같다. 0~100 정규화 점을 SVG polyline 좌표로 편다. */
export function sparkPolyline(points: number[] | undefined, width: number, height: number) {
  if (!points || !points.length) return "";
  return points
    .map(
      (value, index) =>
        `${(index * (width / (points.length - 1))).toFixed(1)},${(height - (value / 100) * height).toFixed(1)}`,
    )
    .join(" ");
}

export type UniverseLive = {
  /** 유니버스 로드 전이면 `null`. */
  universe: Universe | null;
  /** 종목코드 → 현재가·등락률. 로드 전이거나 아직 못 받은 코드는 픽스처 값을 쓴다. */
  quotes: Record<string, { price: number; rate: number }>;
  /** 종목코드 → 0~100 정규화 스파크라인. */
  sparks: Record<string, number[]>;
};

type LiveSnapshot = Pick<UniverseLive, "quotes" | "sparks">;
type LivePayload = {
  quotes?: Record<string, { price?: number; rate?: number }>;
  sparks?: Record<string, number[]>;
} | null;

function parseLive(data: LivePayload): LiveSnapshot | null {
  if (!data?.quotes) return null;
  return {
    quotes: Object.fromEntries(
      Object.entries(data.quotes).map(([symbol, quote]) => [
        symbol,
        { price: Number(quote?.price) || 0, rate: Number(quote?.rate) || 0 },
      ]),
    ),
    sparks: data.sparks ?? lastLive?.sparks ?? {},
  };
}

/**
 * 5초 폴링 한 벌을 화면 몇 개가 오가든 같이 쓴다.
 *
 * 화면(구독자)마다 타이머를 두면 폴러가 겹치고, 응답이 5초를 넘는 순간 밀린 요청이
 * 서버 큐에 계속 쌓인다. 응답 대기 중이면 그 틱은 건너뛴다(`liveRefreshTick` 의
 * busy 가드와 같다). 마지막 값은 모듈에 남겨 화면에 되돌아오면 즉시 그린다.
 */
const liveListeners = new Set<(snapshot: LiveSnapshot) => void>();
let liveTimer: ReturnType<typeof setInterval> | null = null;
let liveBusy = false;
let lastLive: LiveSnapshot | null = null;

async function pollLive() {
  if (liveBusy) return;
  liveBusy = true;
  try {
    const response = await fetch("/api/universe/data", { cache: "no-store" });
    const parsed = parseLive(response.ok ? ((await response.json()) as LivePayload) : null);
    if (parsed) {
      lastLive = parsed;
      liveListeners.forEach((listener) => listener(parsed));
    }
  } catch {
    // 네트워크 실패면 마지막 값 그대로 둔다.
  } finally {
    liveBusy = false;
  }
}

function subscribeLive(listener: (snapshot: LiveSnapshot) => void) {
  liveListeners.add(listener);
  if (!liveTimer) {
    pollLive();
    liveTimer = setInterval(pollLive, 5000);
  }
  return () => {
    liveListeners.delete(listener);
    if (liveListeners.size === 0 && liveTimer) {
      clearInterval(liveTimer);
      liveTimer = null;
    }
  };
}

/**
 * 전 종목 시세. 탐색 카드 51장이 쓴다 — `app.html` 의 `liveRefreshTick` 과 같은
 * 주기(5초)·같은 경로다. 특정 종목을 데우지 않으므로 `symbol` 없이 부른다.
 */
export function useUniverseLive(): UniverseLive {
  const [universe, setUniverse] = useState<Universe | null>(null);
  const [live, setLive] = useState<LiveSnapshot>(() => lastLive ?? { quotes: {}, sparks: {} });

  useEffect(() => {
    let alive = true;
    loadUniverse().then((loaded) => {
      if (alive) setUniverse(loaded);
    });
    const unsubscribe = subscribeLive(setLive);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return { universe, quotes: live.quotes, sparks: live.sparks };
}

export type StockLive = {
  /** 유니버스 로드 전이면 `null`. 로드 뒤에도 없는 코드면 `stock` 만 `null` 이다. */
  loaded: boolean;
  stock: (UniverseStock & { sectorName: string; logoUrl: string | null }) | null;
  price: number;
  change: number;
  spark: number[];
  /** 전 종목 현재가 — 총자산(수익률) 계산에 쓴다. */
  prices: Record<string, number>;
};

export function useStockLive(code: string): StockLive {
  const [universe, setUniverse] = useState<Universe | null>(null);
  const [quotes, setQuotes] = useState<Record<string, { price: number; rate: number }>>(
    () => lastLive?.quotes ?? {},
  );
  const [spark, setSpark] = useState<number[] | null>(null);

  useEffect(() => {
    let alive = true;
    loadUniverse().then((loaded) => {
      if (alive) setUniverse(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 보고 있는 종목을 먼저 데워야 해서 공유 폴러 대신 `symbol` 을 실어 따로 부른다.
  // 대신 가드는 같다: 응답 대기 중이면 그 틱은 건너뛰어 서버에 요청이 쌓이지 않는다.
  useEffect(() => {
    let alive = true;
    let busy = false;
    setSpark(null);
    const load = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = await fetch(
          `/api/universe/data?symbol=${encodeURIComponent(code)}&chart=1`,
          { cache: "no-store" },
        );
        const data = response.ok ? ((await response.json()) as LivePayload) : null;
        const parsed = parseLive(data);
        if (parsed) lastLive = parsed;
        if (!alive || !parsed) return;
        setQuotes(parsed.quotes);
        const nextSpark = data?.sparks?.[code];
        if (nextSpark?.length) setSpark(nextSpark);
      } catch {
        // 네트워크 실패면 마지막 값 그대로 둔다.
      } finally {
        busy = false;
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [code]);

  const base = universe?.stocks.find((stock) => stock.code === code) ?? null;
  const sectorName = base
    ? (universe?.sectors.find((sector) => sector.id === base.sector)?.name ?? "")
    : "";
  const logoPath = base ? universe?.logos?.[base.code] : undefined;
  const live = quotes[code];

  const prices: Record<string, number> = {};
  for (const stock of universe?.stocks ?? []) {
    prices[stock.code] = quotes[stock.code]?.price ?? stock.price;
  }

  return {
    loaded: universe !== null,
    stock: base
      ? {
          ...base,
          sectorName,
          // universe.js 의 로고 경로는 app.html 기준 상대경로다. 부모 문서에서는 /ui/ 를 붙인다.
          logoUrl: logoPath ? `/ui/${logoPath}` : null,
        }
      : null,
    price: live?.price ?? base?.price ?? 0,
    change: live?.rate ?? base?.change ?? 0,
    spark: spark ?? base?.spark ?? [],
    prices,
  };
}
