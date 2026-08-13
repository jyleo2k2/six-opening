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
};

const PROFILE_COLUMNS = "id,name,login_id,parent_child,family_tag";

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
 * 같은 가족 안에서 부모·자녀 한 명을 찾는다. 화면의 계정 스위처가 쓴다.
 *
 * 부모가 둘(엄마·아빠)일 수 있어서 `id` 가 낮은 쪽을 기본으로 삼는다. 로그인 화면이
 * 생기면 누구로 들어왔는지가 세션에 담기므로 이 기본값은 필요 없어진다.
 *
 * `familyTag` 가 없는 계정은 넘기지 않는다 — 빈 값으로 훑으면 남의 가족이 섞인다.
 */
export async function findFamilyMember(familyTag: string, role: "parent" | "child") {
  const rows = await selectRows<Profile>("profiles", {
    select: PROFILE_COLUMNS,
    family_tag: `eq.${familyTag}`,
    parent_child: `eq.${role}`,
    order: "id.asc",
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

export function sessionCookie(userId: number) {
  const parts = [
    `${SESSION_COOKIE}=${userId}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 30}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}
