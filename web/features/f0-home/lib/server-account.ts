import type { AccountUser } from "./home-view";
import type { Account, Holding } from "./portfolio-view";

/**
 * `/api/account` 응답으로 지갑의 **로그인한 역할** 칸을 덮는다.
 *
 * `app.html` 의 `applyServerHoldings()` 와 같은 규칙이다. 그런데 그쪽은 자기 메모리
 * 상태에만 쓰고 `persist()` 를 거치지 않아 `localStorage` 에는 서버 값이 남지 않는다.
 * 옮겨 온 화면은 그 메모리를 못 보고 `kw_proto_v1` 만 읽으므로, 이관 뒤로 계좌·상세·탐색이
 * DB 보유 대신 `seedAccounts()` 하드코딩 값을 그렸다. 그래서 여기서 직접 읽어 덮는다.
 *
 * 반대쪽 역할은 건드리지 않는다 — 로컬 데모 값 그대로 둔다(`dbSyncable()` 과 같은 역할 매칭).
 */
export type ServerAccount = AccountUser & {
  name?: string | null;
  balance?: number | null;
};

export function applyServerAccount(
  acc: Record<string, Account>,
  user: ServerAccount | null,
): Record<string, Account> {
  const role = user?.parent_child;
  if (!user?.user_id || (role !== "child" && role !== "parent")) return acc;

  const holdings: Holding[] = (user.holdings ?? [])
    .filter((row) => row.stock_code)
    .map((row) => ({
      code: row.stock_code as string,
      qty: row.quantity,
      avg: row.avg_price,
    }));

  const prev = acc[role];
  // 잔액이 숫자가 아니면 덮지 않는다. 여기서 undefined 가 들어가면 총자산이 통째로 NaN 이 된다.
  const cash = typeof user.balance === "number" ? user.balance : prev?.cash;
  if (typeof cash !== "number") return acc;

  return {
    ...acc,
    [role]: {
      ...prev,
      name: user.name ?? prev?.name,
      cash,
      holdings,
      // 예약 주문은 아직 로컬만 안다(기능명세 §10-7). 서버 응답에 없다고 지우면 안 된다.
      pending: prev?.pending ?? [],
    },
  };
}
