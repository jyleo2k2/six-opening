import type { NextRequest } from "next/server";
import { findProfileById, sessionUserId } from "../supabase";
import { blockedSides, parseRestriction, type TradeRestriction } from "./rule";
import { readRestriction, restrictionKey, writeRestriction } from "./store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 학교 시간 거래 제한의 서버 경계.
 *
 * - `GET` 은 가족 누구나 읽는다. 아이 화면도 지금 왜 막혔는지 알아야 안내를 적을 수 있다.
 * - `PUT` 은 부모만 쓴다. 아이가 자기 제한을 풀 수 있으면 있으나 마나다.
 *
 * 지금 막혔는지(`blocked`)는 **서버가 정해서 내려보낸다**. 화면이 시각을 다시 계산하지
 * 않게 하려는 것이다 — `rule.ts` 머리말 참고.
 */

function payload(rule: TradeRestriction, isChild: boolean, isParent: boolean) {
  return {
    rule,
    // 규칙은 자녀 계정에만 걸린다. 부모 화면에서는 늘 열려 있는 값이 온다.
    blocked: isChild ? blockedSides(rule, new Date()) : { buy: false, sell: false },
    applies: isChild,
    editable: isParent,
  };
}

export async function GET(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const profile = await findProfileById(userId);
    if (!profile) return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    const rule = await readRestriction(restrictionKey(profile.family_tag, userId));
    return Response.json(payload(rule, profile.parent_child === "child", profile.parent_child === "parent"));
  } catch (error) {
    console.error(JSON.stringify({ event: "trade_restriction_read", result: "error", message: String(error) }));
    return Response.json({ error: "거래 제한 설정을 불러오지 못했습니다." }, { status: 502 });
  }
}

export async function PUT(request: NextRequest) {
  const userId = sessionUserId(request);
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const rule = parseRestriction(body);
  if (!rule) return Response.json({ error: "설정 값이 올바르지 않습니다." }, { status: 400 });

  try {
    const profile = await findProfileById(userId);
    if (!profile) return Response.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    if (profile.parent_child !== "parent") {
      return Response.json({ error: "보호자만 바꿀 수 있어요." }, { status: 403 });
    }
    const saved = await writeRestriction(restrictionKey(profile.family_tag, userId), rule, userId);
    console.info(JSON.stringify({ event: "trade_restriction_saved", userId, enabled: saved.enabled }));
    return Response.json(payload(saved, false, true));
  } catch (error) {
    console.error(JSON.stringify({ event: "trade_restriction_saved", result: "error", message: String(error) }));
    return Response.json({ error: "거래 제한 설정을 저장하지 못했습니다." }, { status: 502 });
  }
}
