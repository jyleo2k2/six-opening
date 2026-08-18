import { findProfileById } from "../supabase";
import { blockedSides } from "./rule";
import { readRestriction, restrictionKey } from "./store";

/**
 * 주문 경로(`/api/trade`·`/api/orders`)가 부르는 게이트. 자녀 계정이 제한 창 안에서 낸
 * 주문이면 `true` 다.
 *
 * 화면에도 같은 판정이 있지만 그건 안내용이고 **막는 것은 여기다** — 챗봇이 주문 화면을
 * 대신 열어 주는 길이 있어서 화면 하나만 잠그면 새어 나간다.
 *
 * 조회가 실패하면 막지 않는다. 제한을 켠 적 없는 가족까지 서버 사정으로 주문을 잃는 쪽이,
 * 잠깐 제한이 헐거워지는 쪽보다 나쁘다.
 */
export async function blockedBySchoolHours(
  userId: number,
  side: "buy" | "sell",
  now = new Date(),
): Promise<boolean> {
  try {
    const profile = await findProfileById(userId);
    if (!profile || profile.parent_child !== "child") return false;
    const rule = await readRestriction(restrictionKey(profile.family_tag, userId));
    return blockedSides(rule, now)[side];
  } catch (error) {
    console.error(JSON.stringify({ event: "trade_restriction_guard", result: "error", message: String(error) }));
    return false;
  }
}
