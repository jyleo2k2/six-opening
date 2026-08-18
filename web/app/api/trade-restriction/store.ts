import { insertRow, selectRows, updateRow } from "../supabase";
import { DEFAULT_RESTRICTION, type TradeRestriction } from "./rule";

/**
 * 가족 하나의 제한 규칙을 담는 곳. `trade_restrictions` 표가 원본이고, 표가 아직 없는
 * 환경에서는 서버 메모리로 버틴다.
 *
 * 메모리 대체를 둔 이유는 하나다 — 이 기능의 마이그레이션은 `supabase/migrations` 에
 * 파일로만 들어 있고 적용은 사람이 한다. 표가 없다고 500 을 내면 부모 화면의 토글이
 * 통째로 죽는데, 그건 "아직 저장소가 없다" 가 아니라 "기능이 고장났다" 로 보인다.
 * 메모리 값은 **서버 프로세스가 살아 있는 동안만** 남는다(로컬 데모의 수명과 같다).
 * 표를 적용하면 그다음 저장부터 자동으로 DB 가 원본이 된다.
 */

const MEMORY_KEY = Symbol.for("kiwoom.trade-restriction.memory");

function memory(): Map<string, TradeRestriction> {
  const globals = globalThis as Record<symbol, unknown>;
  const existing = globals[MEMORY_KEY];
  if (existing instanceof Map) return existing as Map<string, TradeRestriction>;
  const created = new Map<string, TradeRestriction>();
  globals[MEMORY_KEY] = created;
  return created;
}

/** 표가 아직 없어서 난 실패인지. 그 밖의 실패(네트워크·권한)는 그대로 위로 던진다. */
function tableMissing(error: unknown): boolean {
  const message = String(error);
  return message.includes("PGRST205") || message.includes("42P01") || message.includes("Supabase HTTP 404");
}

/**
 * 규칙은 **가족 단위**다. 부모가 켠 제한이 같은 `family_tag` 의 아이에게 걸려야 하므로
 * 사용자 id 로 담으면 안 된다. 가족이 없는 계정만 자기 자신을 키로 쓴다.
 */
export function restrictionKey(familyTag: string | null, userId: number): string {
  return familyTag ?? `user:${userId}`;
}

type Row = TradeRestriction & { family_tag: string };

const COLUMNS = "family_tag,enabled,weekdays,start_minute,end_minute,block_buy,block_sell";

const fromRow = (row: Row): TradeRestriction => ({
  enabled: Boolean(row.enabled),
  weekdays: Array.isArray(row.weekdays) ? row.weekdays.map(Number) : DEFAULT_RESTRICTION.weekdays,
  start_minute: Number(row.start_minute),
  end_minute: Number(row.end_minute),
  block_buy: Boolean(row.block_buy),
  block_sell: Boolean(row.block_sell),
});

export async function readRestriction(key: string): Promise<TradeRestriction> {
  try {
    const rows = await selectRows<Row>("trade_restrictions", {
      select: COLUMNS,
      family_tag: `eq.${key}`,
      limit: "1",
    });
    return rows[0] ? fromRow(rows[0]) : (memory().get(key) ?? DEFAULT_RESTRICTION);
  } catch (error) {
    if (!tableMissing(error)) throw error;
    return memory().get(key) ?? DEFAULT_RESTRICTION;
  }
}

export async function writeRestriction(
  key: string,
  rule: TradeRestriction,
  userId: number,
): Promise<TradeRestriction> {
  // 어느 쪽으로 저장하든 메모리에도 남긴다. DB 가 원본이 된 뒤에도 해롭지 않고,
  // 표가 없는 동안에는 이 값이 유일한 원본이다.
  memory().set(key, rule);
  const patch = { ...rule, updated_by: userId, updated_at: new Date().toISOString() };
  try {
    const updated = await updateRow<Row>("trade_restrictions", { family_tag: `eq.${key}` }, patch);
    if (!updated) await insertRow<Row>("trade_restrictions", { family_tag: key, ...patch });
  } catch (error) {
    if (!tableMissing(error)) throw error;
  }
  return rule;
}
