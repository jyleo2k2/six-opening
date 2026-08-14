/** 제공자 어댑터가 같이 쓰는 파싱·시간·요청 큐 도구. */

import type { ChartPeriod, ChartPoint } from "./types";

export function numeric(value: unknown, absolute = false) {
  const parsed = Number(String(value ?? "").replaceAll(",", "").trim());
  if (!Number.isFinite(parsed)) return null;
  return absolute ? Math.abs(parsed) : parsed;
}

export function first(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (data[key] != null && data[key] !== "") return data[key];
  }
  return null;
}

/** 응답 어디에 박혀 있든 첫 배열을 찾는다. 제공자마다 감싸는 키 이름이 다르다. */
export function findRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (!value || typeof value !== "object") return [];
  for (const child of Object.values(value)) {
    const rows = findRows(child);
    if (rows.length) return rows;
  }
  return [];
}

export function koreaTimestamp(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  return Math.floor(
    (Date.UTC(year, month - 1, day, hour, minute, second) - 9 * 60 * 60 * 1000) / 1000,
  );
}

export function seoulDateDigits(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll("-", "");
}

/** `20260812`·`202608120931`·ISO 문자열이 섞여 온다. 자릿수로 갈라 초 epoch 으로 맞춘다. */
export function chartTimestamp(value: unknown, period: ChartPeriod): number | null {
  const raw = String(value ?? "");
  // ISO 8601 은 자리수 규칙으로 자르면 시간대가 틀어진다. 먼저 걸러 낸다.
  if (/^\d{4}-\d{2}-\d{2}[T ]/u.test(raw)) {
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
  }

  const digits = raw.replace(/\D/gu, "");
  if (digits.length >= 8) {
    const timestamp = koreaTimestamp(
      Number(digits.slice(0, 4)),
      Number(digits.slice(4, 6)),
      Number(digits.slice(6, 8)),
      Number(digits.slice(8, 10) || 0),
      Number(digits.slice(10, 12) || 0),
      Number(digits.slice(12, 14) || 0),
    );
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  // 분봉은 날짜 없이 시각만 오는 경우가 있다. 오늘 날짜를 붙인다.
  if (period === "minute" && digits.length >= 4) {
    return chartTimestamp(`${seoulDateDigits()}${digits.padStart(6, "0")}`, period);
  }
  return null;
}

/**
 * 캔들 행 배열을 렌더 가능한 포인트로 정리한다.
 *
 * 제공자마다 필드 이름만 다르고 나머지 처리(음수 부호 제거, 고저 보정, 보관 구간 밖
 * 잘라내기, 시간 정렬, 중복 봉 제거)는 같다. 필드 이름 후보만 어댑터가 넘긴다.
 */
export function toChartPoints(
  rows: Record<string, unknown>[],
  period: ChartPeriod,
  cutoffTimestamp: number,
  fields: {
    time: string[];
    minuteTime?: string[];
    open: string[];
    high: string[];
    low: string[];
    close: string[];
    volume: string[];
  },
): ChartPoint[] {
  return rows
    .map((row) => {
      const close = numeric(first(row, fields.close), true) ?? 0;
      const open = numeric(first(row, fields.open), true) ?? close;
      const high = numeric(first(row, fields.high), true) ?? Math.max(open, close);
      const low = numeric(first(row, fields.low), true) ?? Math.min(open, close);
      return {
        time: rowTimestamp(row, period, fields),
        open,
        high: Math.max(high, open, close),
        low: Math.min(low, open, close),
        close,
        volume: numeric(first(row, fields.volume), true) ?? 0,
        price: close,
      };
    })
    .filter(
      (point): point is ChartPoint =>
        point.time != null && point.time >= cutoffTimestamp && point.close > 0,
    )
    .sort((left, right) => left.time - right.time)
    .filter(
      (point, index, sorted) =>
        index === sorted.length - 1 || point.time !== sorted[index + 1].time,
    );
}

export function rowTimestamp(
  row: Record<string, unknown>,
  period: ChartPeriod,
  fields: { time: string[]; minuteTime?: string[] },
) {
  const keys = period === "minute" ? (fields.minuteTime ?? fields.time) : fields.time;
  return chartTimestamp(first(row, keys), period);
}

type QueuedRequest = { background: boolean; run: () => Promise<void> };

/**
 * 제공자별 요청 큐. 초당 호출 제한이 제공자마다 다르므로 큐도 제공자마다 하나씩 둔다.
 *
 * 화면이 기다리는 요청을 백그라운드 작업 앞에 세운다. 카드 시세 폴링과 보관 캔들 갱신이
 * 큐를 계속 채우기 때문에, 순서가 도착순이면 사용자가 분봉을 눌렀을 때 그 뒤에 줄을 선다.
 */
export function createRequestQueue(intervalMs: number) {
  const pending: QueuedRequest[] = [];
  let lastRequestAt = 0;
  let draining = false;

  async function drain() {
    if (draining) return;
    draining = true;
    try {
      while (pending.length) {
        const wait = Math.max(0, intervalMs - (Date.now() - lastRequestAt));
        // 기다리는 동안 화면 요청이 들어오면 그쪽이 먼저 뽑히도록 대기 후에 꺼낸다.
        if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
        const next = pending.shift();
        if (!next) break;
        lastRequestAt = Date.now();
        await next.run();
      }
    } finally {
      draining = false;
    }
  }

  return function enqueue<T>(task: () => Promise<T>, background = false): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const firstBackground = pending.findIndex((request) => request.background);
      const insertAt =
        background || firstBackground < 0 ? pending.length : firstBackground;
      pending.splice(insertAt, 0, {
        background,
        run: () => task().then(resolve, reject),
      });
      void drain();
    });
  };
}

/** `.env` 값이 자리표시자(`your_app_key`)면 없는 것으로 본다. */
export function filledCredential(value: string | undefined) {
  return Boolean(value && value.trim() && !value.includes("your_"));
}
