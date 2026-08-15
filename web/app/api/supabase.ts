// 서버 전용 Supabase 접근. 키는 절대 클라이언트로 넘기지 않는다.
// app/api/quote/stock-candles.ts 의 REST 호출 방식을 그대로 따른다.
import type { NextRequest } from "next/server";
import { loadDevelopmentEnvironment } from "./dev-env";

export const SESSION_COOKIE = "kw_uid";

function configuration() {
  loadDevelopmentEnvironment();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase 서버 환경변수가 없습니다.");
  return { url: url.replace(/\/$/u, ""), key, legacyJwt: !key.startsWith("sb_secret_") };
}

async function supabaseFetch(path: string, init?: RequestInit) {
  const { url, key, legacyJwt } = configuration();
  const response = await fetch(`${url}/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key,
      ...(legacyJwt ? { Authorization: `Bearer ${key}` } : {}),
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${await response.text()}`);
  return response;
}

/** PostgREST 테이블 조회. `params` 는 PostgREST 문법 그대로 넘긴다. */
export async function selectRows<T>(table: string, params: Record<string, string>): Promise<T[]> {
  const query = new URLSearchParams(params);
  return (await (await supabaseFetch(`rest/v1/${table}?${query}`)).json()) as T[];
}

/**
 * 체결된 거래만 읽는다.
 *
 * `transactions` 는 이제 체결분과 미체결 주문(pending·scheduled)과 끝난 주문(cancelled·rejected)을
 * 함께 담는다. 거래를 세는 곳이 이 구분을 놓치면 예약 주문이 가족 피드·차트 마커·성향 계산에
 * 진짜 거래로 새어 든다. 호출부마다 필터를 적는 대신 한 곳에서 강제한다 —
 * 주문 자체를 다루는 곳(`api/orders`)만 `selectRows` 를 직접 쓴다.
 */
export function selectFilledTrades<T>(params: Record<string, string>): Promise<T[]> {
  return selectRows<T>("transactions", { ...params, order_status: "eq.filled" });
}

export async function insertRow<T>(table: string, row: Record<string, unknown>): Promise<T> {
  const response = await supabaseFetch(`rest/v1/${table}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([row]),
  });
  return ((await response.json()) as T[])[0];
}

/**
 * PostgREST 삭제. `params` 는 반드시 대상을 좁히는 필터를 담아야 한다 —
 * 빈 필터로 부르면 테이블 전체가 지워진다.
 */
export async function deleteRows(table: string, params: Record<string, string>): Promise<void> {
  const keys = Object.keys(params);
  if (keys.length === 0) throw new Error("deleteRows 에는 필터가 필요합니다.");
  const query = new URLSearchParams(params);
  await supabaseFetch(`rest/v1/${table}?${query}`, { method: "DELETE" });
}

/** SECURITY DEFINER 함수 호출. 잔액·보유수량·거래기록을 한 트랜잭션에서 처리한다. */
export async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const response = await supabaseFetch(`rest/v1/rpc/${fn}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
  return (await response.json()) as T;
}

export type Profile = {
  id: number;
  name: string;
  login_id: string;
  parent_child: "parent" | "child" | null;
  family_tag: string | null;
  /** 엄마·아빠 구분(홈 화면 개인화 전용). parent_child 는 권한 판단에 쓰이므로 건드리지 않는다. */
  guardian_role: "mom" | "dad" | null;
};

const PROFILE_COLUMNS = "id,name,login_id,parent_child,family_tag,guardian_role";

export async function findProfileByLogin(loginId: string, password: string) {
  const rows = await selectRows<Profile>("profiles", {
    select: PROFILE_COLUMNS,
    login_id: `eq.${loginId}`,
    login_password: `eq.${password}`,
    limit: "1",
  });
  return rows[0] ?? null;
}

export async function findProfileById(id: number) {
  const rows = await selectRows<Profile>("profiles", {
    select: PROFILE_COLUMNS,
    id: `eq.${id}`,
    limit: "1",
  });
  return rows[0] ?? null;
}

/**
 * 요청 쿠키에서 로그인한 사용자 id 를 읽는다.
 * 로그인 기능을 붙이기 전까지는 DEMO_USER_ID 환경변수로 대신 지정할 수 있다.
 */
export function sessionUserId(request: NextRequest): number | null {
  // 쿠키가 없을 때 볼 DEMO_USER_ID 도 개발용 env 파일에 있다. 먼저 읽어 둔다.
  loadDevelopmentEnvironment();
  const raw = request.cookies.get(SESSION_COOKIE)?.value ?? process.env.DEMO_USER_ID;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// 브라우저를 닫으면 사라지는 세션 쿠키다. Max-Age를 주지 않는다 — 앱을 다시 열 때마다
// 로그인 화면부터 시작해야 하므로 로그인을 브라우저 세션 너머로 유지하지 않는다.
export function sessionCookie(userId: number) {
  const parts = [`${SESSION_COOKIE}=${userId}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}
