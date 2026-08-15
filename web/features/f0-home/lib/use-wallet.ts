"use client";

import { useCallback, useEffect, useState } from "react";
import {
  migrateLegacyAccount,
  pendingFromServerOrders,
} from "../../f2-trade/lib/scheduled-orders.js";
import {
  persistWallet,
  readPersistedWallet,
  seedAccounts,
} from "../../../shared/store/prototype-account.js";
import type { Account } from "./portfolio-view";
import { applyServerAccount } from "./server-account";
import { invalidateAccount, loadAccount } from "./use-account";

/**
 * 옮겨 온 화면이 지갑을 읽고 쓴다.
 *
 * `app.html` 과 **같은 칸**(`kw_proto_v1`)을 쓴다. 여기서 예약 주문을 취소하면 아직 옮기지
 * 않은 화면도 그 결과를 본다. 반대로 저장을 빠뜨리면 화면을 옮기는 순간 되돌아간다.
 *
 * 화면 인계 표시는 건드리지 않는다 — 그건 `app.html` 이 한 번 쓰고 버린다.
 */
export type Wallet = {
  acc: Record<string, Account>;
  records: unknown[];
  sellRecords: unknown[];
  events: unknown[];
  seq?: number;
  watchlist: string[];
};

export type WalletAccountId = "child" | "parent";

/**
 * 서버에는 저장소가 없다. 마운트 전에는 `null` 이고 화면은 그동안 아무것도 그리지 않는다.
 *
 * **로그인한 역할의 현금·보유는 `/api/account` 가 원본이다.** `app.html` 도 같은 응답을
 * `applyServerHoldings()` 로 반영하지만 그건 자기 메모리에만 쓰고 `persist()` 를 거치지
 * 않아 `kw_proto_v1` 에는 서버 값이 절대 남지 않는다. 옮겨 온 화면은 그 메모리를 볼 수
 * 없으므로, 저장소만 읽으면 DB 에 무엇이 있든 `seedAccounts()` 하드코딩 값을 그린다.
 *
 * 응답을 기다렸다가 **한 번에** 세운다. 저장소 값을 먼저 그리고 나중에 덮으면 시드 지갑이
 * 한 프레임 보였다 바뀐다 — 첫 렌더 전에 되살리기로 한 이유(PR #217)와 같다.
 * 계좌는 `loadAccount()` 모듈 캐시를 같이 쓴다. 저장소(`kw_proto_v1`)는 iframe 화면이
 * 사이에 쓸 수 있으므로 마운트마다 다시 읽지만, 서버 왕복은 세션당 한 번이면 된다.
 *
 * 미체결 주문도 같이 읽는다. `GET /api/orders` 는 만기가 지난 예약을 먼저 정산하므로,
 * 이 조회가 곧 예약 체결 트리거다 — 화면이 따로 시가를 확인하지 않는다. 정산은 잔액을
 * 바꾸므로 그때는 계좌 캐시를 비우고 한 번 더 읽는다.
 */
type OpenOrders = { orders?: Record<string, unknown>[]; settled?: unknown[] };

const readOpenOrders = (): Promise<OpenOrders | null> =>
  fetch("/api/orders", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [reload, setReload] = useState(0);
  /**
   * 주문을 취소한 뒤처럼 서버 상태가 바뀐 것을 아는 쪽에서 다시 읽게 한다.
   * 예약은 잔액도 함께 움직이므로 계좌 캐시를 비우고 시작한다.
   */
  const refresh = useCallback(() => {
    invalidateAccount();
    setReload((n) => n + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    const seeded: Wallet = {
      acc: seedAccounts(),
      records: [],
      sellRecords: [],
      events: [],
      watchlist: [],
    };
    const local: Wallet = { ...seeded, ...readPersistedWallet(migrateLegacyAccount) };
    // 계좌나 주문을 못 읽어도 화면은 떠야 한다. 그때는 저장소 값 그대로다.
    Promise.all([loadAccount(), readOpenOrders()]).then(([user, open]) => {
      if (!alive) return;
      const pending = open?.orders ? pendingFromServerOrders(open.orders) : null;
      setWallet({ ...local, acc: applyServerAccount(local.acc, user, pending) });
      // 조회가 만기 예약을 정산했으면 방금 읽은 계좌는 이미 낡았다. 한 번 더 돈다 —
      // 두 번째에는 정산할 것이 없으므로 여기서 멈춘다.
      if (open?.settled?.length) refresh();
    });
    return () => {
      alive = false;
    };
  }, [reload, refresh]);

  const update = useCallback((change: (current: Wallet) => Partial<Wallet>) => {
    setWallet((current) => {
      if (!current) return current;
      const next = { ...current, ...change(current) };
      persistWallet(next);
      return next;
    });
  }, []);

  return { wallet, update, refresh };
}

/**
 * **스쿨락은 이 프로토타입에서 꺼 둔다.**
 *
 * 규칙 자체는 "평일 09:00~15:30 자녀 주문 차단" 이었는데, 그 창이 정규장 창
 * (`isRegularMarketOpen`)과 **정확히 같다.** 켜 두면 이렇게 된다.
 *
 * - 평일 09:00~15:30: 자녀는 주문 단계(`locked && step === 2`)에서 막혀 질문식 매매를
 *   끝까지 진행할 수 없다.
 * - 그 밖의 시간: 주문은 되지만 정규장이 아니라 다음 거래일 시가 예약이 된다.
 *
 * 즉 **자녀 계정으로 즉시 체결을 볼 수 있는 시간대가 존재하지 않는다.** 스쿨락은
 * 보여 줄 기능도 아니다 — 중간발표 대본에 없고, 통합문서 v2 에는 문구 불일치
 * 체크리스트로 한 번 나오며, 골든 패스에도 단계가 없다.
 *
 * 판정 자리와 화면의 `locked` 분기(종목 상세·계좌의 안내 문구)는 그대로 둔다.
 * 되살릴 때는 아래 상수만 `true` 로 되돌리면 된다.
 */
const SCHOOL_LOCK_ENABLED = false;

export function isSchoolTime(now = new Date()) {
  if (!SCHOOL_LOCK_ENABLED) return false;
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  return day >= 1 && day <= 5 && hour >= 9 && hour < 15.5;
}

export function canTrade(account: WalletAccountId, now = new Date()) {
  if (account === "parent") return true;
  return !isSchoolTime(now);
}
