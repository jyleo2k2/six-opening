// 서버 전용 Supabase 접근. 키는 절대 클라이언트로 넘기지 않는다.
// app/api/quote/stock-candles.ts 의 REST 호출 방식을 그대로 따른다.
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { loadDevelopmentEnvironment } from "./dev-env";

export const SESSION_COOKIE = "kw_uid";

/**
 * 서버 프로세스가 뜰 때 한 번 만드는 부팅 표식. 로그인 쿠키 값에 같이 넣어 두고 읽을 때 대조한다.
 * 앱을 다시 실행하면 표식이 달라지므로, 브라우저가 쿠키를 들고 와도 로그인 화면부터 시작한다.
 *
 * 쿠키를 브라우저 세션 쿠키로 만드는 것만으로는 부족했다. 크롬·엣지의 "이전에 열었던 페이지
 * 계속 보기" 가 세션 쿠키까지 복원해서, 브라우저를 껐다 켜도 로그인 상태가 남는다.
 * 언제 로그아웃할지를 브라우저 설정에 맡기지 않고 서버가 정한다.
 *
 * `globalThis` 에 두는 이유는 두 가지다. Next 는 서버 컴포넌트와 라우트 핸들러를 서로 다른
 * 모듈 그래프로 불러올 수 있어 모듈 최상단 상수로 두면 값이 갈릴 수 있고, 그러면 로그인이
 * 곧바로 무효가 된다. 또 개발 중 파일을 고쳐 모듈이 다시 평가돼도 표식이 유지돼야
 * 작업하다 말고 로그아웃되지 않는다. 프로세스가 실제로 다시 뜰 때만 바뀐다.
 */
const BOOT_ID_KEY = Symbol.for("kiwoom.session.boot-id");

function bootId(): string {
  const globals = globalThis as Record<symbol, unknown>;
  const existing = globals[BOOT_ID_KEY];
  if (typeof existing === "string") return existing;
  const created = randomUUID().replace(/-/gu, "").slice(0, 12);
  globals[BOOT_ID_KEY] = created;
  return created;
}

/**
 * 로그인 쿠키 값에서 사용자 id 를 읽는다. 부팅 표식이 지금 서버의 것과 다르거나 아예 없으면
 * 로그인하지 않은 것으로 본다. 표식이 없는 쿠키는 이 방식 이전에 발급된 옛 쿠키다 —
 * 그중에는 30일 Max-Age 로 디스크에 저장된 것도 있어서, 무효로 봐야 다음 실행부터 정리된다.
 */
export function sessionUserIdFromCookie(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const separator = raw.lastIndexOf(".");
  if (separator < 0) return null;
  if (raw.slice(separator + 1) !== bootId()) return null;
  const id = Number(raw.slice(0, separator));
  return Number.isInteger(id) && id > 0 ? id : null;
}

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
 * PostgREST 부분 수정. `deleteRows` 와 같은 이유로 `params` 에 필터가 반드시 있어야 한다 —
 * 빈 필터로 부르면 테이블의 모든 행이 같은 값으로 덮인다.
 */
export async function updateRow<T>(
  table: string,
  params: Record<string, string>,
  patch: Record<string, unknown>,
): Promise<T | undefined> {
  if (Object.keys(params).length === 0) throw new Error("updateRow 에는 필터가 필요합니다.");
  const query = new URLSearchParams(params);
  const response = await supabaseFetch(`rest/v1/${table}?${query}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
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
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  // 쿠키를 들고 왔으면 그 판정을 따른다. 부팅 표식이 어긋난 쿠키는 로그아웃된 것이므로
  // DEMO_USER_ID 로 되살리지 않는다 — 화면은 로그인인데 API 만 열려 있으면 안 된다.
  if (raw) return sessionUserIdFromCookie(raw);
  const demo = Number(process.env.DEMO_USER_ID);
  return Number.isInteger(demo) && demo > 0 ? demo : null;
}

// 브라우저를 닫으면 사라지는 세션 쿠키다. Max-Age를 주지 않는다 — 앱을 다시 열 때마다
// 로그인 화면부터 시작해야 하므로 로그인을 브라우저 세션 너머로 유지하지 않는다.
// 값에 부팅 표식을 붙여, 브라우저가 세션 쿠키를 복원해 오더라도 서버가 걸러낸다.
export function sessionCookie(userId: number) {
  const parts = [`${SESSION_COOKIE}=${userId}.${bootId()}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}
