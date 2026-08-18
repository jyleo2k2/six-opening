"use client";

import { useCallback, useEffect, useState } from "react";
import { pendingFromServerOrders } from "../../f2-trade/lib/scheduled-orders.js";
import { seedAccounts } from "../../../shared/store/prototype-account.js";
import type { Account } from "./portfolio-view";
import { applyServerAccount } from "./server-account";
import { invalidateAccount, loadAccount } from "./use-account";

/**
 * 화면이 읽는 지갑. **브라우저 저장소를 쓰지 않는다.**
 *
 * 마운트마다 `/api/account` 와 `GET /api/orders` 로 세우고, 화면을 떠나면 사라진다.
 * `kw_proto_v1` 은 프로토타입이 서버 없이 돌던 시절의 칸이었고 이제 남은 것이 없다 —
 * 매매 기록은 `GET /api/trades`, 관심 종목은 `/api/watchlist` 가 원본이다.
 *
 * `update()` 는 체결 직후 완료 화면이 잔액을 바로 보여 주기 위한 **메모리 전용** 갱신이다.
 * 곧 `refresh()` 가 서버 값으로 덮으므로 여기 남은 값을 원본으로 믿으면 안 된다.
 */
export type Wallet = {
  acc: Record<string, Account>;
};

export type WalletAccountId = "child" | "parent";

/**
 * 서버에는 저장소가 없다. 마운트 전에는 `null` 이고 화면은 그동안 아무것도 그리지 않는다.
 *
 * **로그인한 역할의 현금·보유는 `/api/account` 가 원본이다.** `seedAccounts()` 는 응답이
 * 오기 전과 서버를 못 읽었을 때만 보이는 자리이고, 반대쪽 역할 칸은 계속 시드로 남는다.
 *
 * 응답을 기다렸다가 **한 번에** 세운다. 시드를 먼저 그리고 나중에 덮으면 데모 지갑이 한
 * 프레임 보였다 바뀐다 — 첫 렌더 전에 되살리기로 한 이유(PR #217)와 같다.
 * 계좌는 `loadAccount()` 모듈 캐시를 같이 쓴다 — 서버 왕복은 세션당 한 번이면 된다.
 *
 * 미체결 주문도 같이 읽는다. `GET /api/orders` 는 만기가 지난 예약을 먼저 정산하므로,
 * 이 조회가 곧 예약 체결 트리거다 — 화면이 따로 시가를 확인하지 않는다. 정산은 잔액을
 * 바꾸므로 그때는 계좌 캐시를 비우고 한 번 더 읽는다.
 */
export type OpenOrders = {
  orders?: Record<string, unknown>[];
  settled?: unknown[];
  /** 이 조회 중 내 요청 또는 동시 요청이 예약을 정산해 계좌가 달라졌는지. */
  accountChanged?: boolean;
};

export function shouldRefreshAccount(open: OpenOrders | null): boolean {
  return Boolean(open?.accountChanged || open?.settled?.length);
}

/**
 * 열린 주문도 계좌처럼 모듈에 한 번만 담아 둔다.
 *
 * 이 조회는 목록을 읽는 김에 **만기 지난 예약을 정산**한다. 화면을 오갈 때마다 다시
 * 부르면 정산할 것이 없는데도 그 왕복을 매번 기다리게 되고, 지갑을 기다리는 화면은
 * 그만큼 늦게 뜬다.
 *
 * 예약이 만기가 되는 것은 하루에 한 번 장이 열릴 때고, 화면을 옮기는 것은 그보다 훨씬
 * 잦다. 그래서 **정산은 페이지를 열 때 한 번**으로 두고, 주문을 넣거나 취소한 쪽이
 * `refresh()` 로 이 캐시까지 비워 다시 돌게 한다. 접수(`POST`)·취소(`DELETE`)는 전부
 * `refresh()` 를 거치므로 목록이 낡은 채 남을 자리가 없다.
 *
 * 못 읽었으면 담아 두지 않는다 — 다음 화면이 다시 시도한다. `loadAccount` 와 같다.
 */
let ordersPromise: Promise<OpenOrders | null> | null = null;

export function invalidateOpenOrders() {
  ordersPromise = null;
}

export function loadOpenOrders(): Promise<OpenOrders | null> {
  if (!ordersPromise) {
    ordersPromise = fetch("/api/orders", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((data: OpenOrders | null) => {
        if (!data) ordersPromise = null;
        return data;
      });
  }
  return ordersPromise;
}

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [reload, setReload] = useState(0);
  /**
   * 주문을 취소한 뒤처럼 서버 상태가 바뀐 것을 아는 쪽에서 다시 읽게 한다.
   * 예약은 잔액도 함께 움직이므로 계좌·주문 캐시를 둘 다 비우고 시작한다.
   */
  const refresh = useCallback(() => {
    invalidateAccount();
    invalidateOpenOrders();
    setReload((n) => n + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    const seeded = seedAccounts();
    // 계좌나 주문을 못 읽어도 화면은 떠야 한다. 그때는 시드 지갑 그대로다.
    Promise.all([loadAccount(), loadOpenOrders()]).then(([user, open]) => {
      if (!alive) return;
      const pending = open?.orders ? pendingFromServerOrders(open.orders) : null;
      setWallet({ acc: applyServerAccount(seeded, user, pending) });
      // 조회가 만기 예약을 정산했으면 방금 읽은 계좌는 이미 낡았다. 한 번 더 돈다 —
      // 두 번째에는 정산할 것이 없으므로 여기서 멈춘다.
      if (shouldRefreshAccount(open)) refresh();
    });
    return () => {
      alive = false;
    };
  }, [reload, refresh]);

  /** 메모리만 바꾼다 — 저장하지 않는다. 다음 `refresh()` 가 서버 값으로 덮는다. */
  const update = useCallback((change: (current: Wallet) => Partial<Wallet>) => {
    setWallet((current) => (current ? { ...current, ...change(current) } : current));
  }, []);

  return { wallet, update, refresh };
}

/**
 * **학교 시간 거래 제한은 이제 부모가 정한다.**
 *
 * 예전에는 `평일 09:00~15:30` 이 코드에 박혀 있었고, 그 창이 정규장 창과 정확히 같아서
 * 켜 두면 자녀 계정으로 즉시 체결을 볼 수 있는 시간대가 아예 없었다. 그래서 상수 하나로
 * 꺼 둔 채였다. 이제 창도 요일도 막을 기능(매수·매도)도 부모가 홈 메뉴에서 고르고,
 * **기본값은 꺼짐**이라 아무도 켜지 않은 가족은 지금까지와 똑같이 언제든 주문한다.
 *
 * 판정은 서버가 한다 — `app/api/trade-restriction` 이 원본이고 화면은
 * `lib/use-trade-restriction.ts` 로 읽는다. 여기 있던 `isSchoolTime`·`canTrade` 는
 * 브라우저 시계로 따로 세던 자리라 함께 걷어냈다. 두 곳이 각자 세면 화면은 열려 있는데
 * 주문만 거절당한다.
 */
