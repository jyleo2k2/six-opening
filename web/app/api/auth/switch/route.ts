import type { NextRequest } from "next/server";
import { findFamilyMember, findProfileById, sessionCookie, sessionUserId } from "../../supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 화면의 계정 스위처(민지↔엄마)를 서버 세션에 맞춘다.
 *
 * 지금까지 스위처는 app.html 안의 상태일 뿐이라 서버 세션과 따로 놀았다. 그래서
 * 엄마로 전환하고 거래하면 `dbSyncable()` 이 막아 조용히 사라졌고, 부모 체결이
 * `transactions` 에 한 건도 쌓이지 않았다. 차트 마커가 자녀 것만 나오던 이유다.
 *
 * `login` 과 달리 비밀번호를 받지 않는다. 스위처가 비밀번호를 들고 있을 수 없기
 * 때문이다. 대신 **현재 세션과 같은 `family_tag` 안에서만** 옮겨 준다. 세션이
 * 없으면 아무 데도 못 간다.
 */
const isRole = (value: unknown): value is "parent" | "child" =>
  value === "parent" || value === "child";

export async function POST(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const role = (body as Record<string, unknown> | null)?.to;
  if (!isRole(role)) {
    return Response.json({ error: "parent 나 child 중 하나여야 합니다." }, { status: 400 });
  }

  try {
    const current = await findProfileById(userId);
    if (!current) return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

    // 이미 그 역할이면 세션을 흔들지 않는다.
    if (current.parent_child === role) {
      return Response.json({ user_id: current.id, name: current.name, parent_child: role });
    }
    if (!current.family_tag) {
      return Response.json({ error: "가족이 연결되지 않은 계정입니다." }, { status: 409 });
    }

    const target = await findFamilyMember(current.family_tag, role);
    if (!target) {
      return Response.json({ error: "가족 중에 그 역할이 없습니다." }, { status: 404 });
    }

    return Response.json(
      { user_id: target.id, name: target.name, parent_child: role },
      { headers: { "Set-Cookie": sessionCookie(target.id) } },
    );
  } catch (error) {
    console.error(JSON.stringify({ event: "auth_switch", result: "error", message: String(error) }));
    return Response.json({ error: "계정을 바꾸지 못했습니다." }, { status: 502 });
  }
}
