import type { NextRequest } from "next/server";
import { findProfileByLogin, sessionCookie, SESSION_COOKIE } from "../../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// profiles.login_password 는 현재 평문이다. 실제 배포 전에 Supabase Auth 로 옮긴다.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { login_id: loginId, login_password: password } = (body ?? {}) as Record<string, unknown>;
  if (typeof loginId !== "string" || typeof password !== "string" || !loginId || !password) {
    return Response.json({ error: "아이디와 비밀번호가 필요합니다." }, { status: 400 });
  }

  let profile;
  try {
    profile = await findProfileByLogin(loginId, password);
  } catch (error) {
    console.error(JSON.stringify({ event: "auth_login", result: "error", message: String(error) }));
    return Response.json({ error: "로그인을 처리하지 못했습니다." }, { status: 502 });
  }
  if (!profile) return Response.json({ error: "아이디나 비밀번호가 맞지 않습니다." }, { status: 401 });

  return Response.json(
    { user_id: profile.id, name: profile.name, parent_child: profile.parent_child },
    { headers: { "Set-Cookie": sessionCookie(profile.id) } },
  );
}

export async function DELETE() {
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` } },
  );
}
